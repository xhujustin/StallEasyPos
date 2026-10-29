#!/usr/bin/env python3
"""Host-side ESC/POS bridge for network and USB receipt printers."""
import json
import os
import socket
import stat
import subprocess
import sys
import time
import concurrent.futures
import ipaddress
import fcntl
import struct
import base64
import io
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

ESC = b"\x1b"
GS = b"\x1d"


def money(value):
    return f"${float(value or 0):,.0f}"


FONT_PATHS = (
    "/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
)
LATIN_FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"


def receipt_font(size):
    cjk = None
    for path in FONT_PATHS:
        if Path(path).exists():
            cjk = ImageFont.truetype(path, size=size)
            break
    if cjk is None:
        cjk = ImageFont.load_default()
    latin = ImageFont.truetype(LATIN_FONT_PATH, size=size) if Path(LATIN_FONT_PATH).exists() else cjk
    return cjk, latin


def char_font(char, fonts):
    return fonts[1] if ord(char) < 256 else fonts[0]


def text_dimensions(draw, value, fonts):
    width = 0
    height = 0
    for char in str(value):
        box = draw.textbbox((0, 0), char, font=char_font(char, fonts))
        width += box[2] - box[0]
        # Pillow draws with the font's top offset; use the absolute lower bound
        # so descenders and the last line are never cropped.
        height = max(height, box[3])
    return width, height


def draw_mixed(draw, xy, value, fonts):
    x, y = xy
    for char in str(value):
        font = char_font(char, fonts)
        draw.text((x, y), char, fill=0, font=font)
        box = draw.textbbox((0, 0), char, font=font)
        x += box[2] - box[0]


def paste_logo(canvas, logo_base64, width, y):
    if not logo_base64:
        return y
    try:
        source = Image.open(io.BytesIO(base64.b64decode(logo_base64))).convert("RGBA")
        white = Image.new("RGBA", source.size, "white")
        white.alpha_composite(source)
        logo = white.convert("L")
        # Improve weak colors when converted to thermal-printer monochrome.
        logo = logo.point(lambda value: 0 if value < 185 else 255, mode="1").convert("L")
        # Remove transparent/white padding embedded in the uploaded file so the
        # first visible logo pixels start at the top of the receipt.
        ink = logo.point(lambda value: 255 - value)
        bounds = ink.getbbox()
        if not bounds:
            return y
        logo = logo.crop(bounds)
        logo.thumbnail((min(330, width - 16), 145), Image.Resampling.LANCZOS)
        canvas.paste(logo, ((width - logo.width) // 2, y))
        return y + logo.height + 6
    except Exception as exc:
        print(f"logo render failed: {exc}", file=sys.stderr, flush=True)
        return y


def wrap_text(draw, value, font, max_width):
    lines, current = [], ""
    for char in str(value):
        candidate = current + char
        if current and text_dimensions(draw, candidate, font)[0] > max_width:
            lines.append(current)
            current = char
        else:
            current = candidate
    if current or not lines:
        lines.append(current)
    return lines


def render_receipt(receipt, width, logo_base64=None):
    margin = 8
    normal = receipt_font(26)
    small = receipt_font(22)
    title = receipt_font(32)
    canvas = Image.new("L", (width, 3000), 255)
    draw = ImageDraw.Draw(canvas)
    y = paste_logo(canvas, logo_base64, width, 0)

    def centered(value, font, gap=4):
        nonlocal y
        text_width, text_height = text_dimensions(draw, value, font)
        draw_mixed(draw, ((width - text_width) // 2, y), value, font)
        y += text_height + gap

    def line(left, right="", font=normal, gap=4):
        nonlocal y
        draw_mixed(draw, (margin, y), left, font)
        if right:
            right_width, _ = text_dimensions(draw, right, font)
            draw_mixed(draw, (width - margin - right_width, y), right, font)
        _, text_height = text_dimensions(draw, f"{left}{right}Ag", font)
        y += text_height + gap

    def rule():
        nonlocal y
        y += 3
        draw.line((margin, y, width - margin, y), fill=0, width=3)
        y += 7

    line(f"單號：{receipt.get('order_no', '')}", f"店家：{receipt.get('store_name', '')}", font=small)
    if receipt.get("shift_number"):
        line(f"班次：{receipt['shift_number']}", font=small)
    if receipt.get("business_id"):
        line(f"統一編號：{receipt['business_id']}", font=small)
    line(f"時間：{receipt.get('created_at', '')}", font=small)
    if receipt.get("pickup_at"):
        line(f"預計取餐：{receipt['pickup_at']}", font=small)
    if receipt.get("cashier"):
        line(f"收銀員：{receipt['cashier']}", font=small)
    payment_labels = {
        "cash": "現金",
        "linepay": "LINE Pay",
        "platform_collect": "平台代收",
    }
    payment_method = str(receipt.get("payment_method") or "")
    if payment_method:
        payment_name = receipt.get("delivery_platform") or receipt.get("payment_provider") or payment_labels.get(payment_method, payment_method)
        line(f"結帳方式：{payment_name}", font=small)
    rule()
    inner_width = width - margin * 2
    numeric_width = int(inner_width * 0.15)
    price_width = numeric_width
    quantity_width = numeric_width
    amount_width = numeric_width
    name_width = inner_width - price_width - quantity_width - amount_width - 4
    price_x = margin + name_width + 4
    quantity_x = price_x + price_width
    amount_x = quantity_x + quantity_width

    draw_mixed(draw, (margin, y), "品項", small)
    for label, column_x, column_width in (("售價", price_x, price_width), ("數量", quantity_x, quantity_width), ("金額", amount_x, amount_width)):
        label_width, _ = text_dimensions(draw, label, small)
        label_x = column_x + (column_width - label_width) // 2
        draw_mixed(draw, (label_x, y), label, small)
    _, header_height = text_dimensions(draw, "品項售價數量金額Ag", small)
    y += header_height + 4
    rule()
    option_font = receipt_font(20)
    for item in receipt.get("lines", []):
        quantity = float(item.get("quantity", 1))
        amount = float(item.get("amount", 0))
        unit_price = float(item.get("unit_price") if item.get("unit_price") is not None else amount / max(quantity, 1))
        name_lines = wrap_text(draw, item.get("name", ""), normal, max(60, name_width))
        first_name = name_lines[0] if name_lines else ""
        draw_mixed(draw, (margin, y), first_name, normal)
        columns = ((money(unit_price), price_x, price_width), (f"{quantity:g}", quantity_x, quantity_width), (money(amount), amount_x, amount_width))
        for value, column_x, column_width in columns:
            value_width, _ = text_dimensions(draw, value, small)
            value_x = column_x + (column_width - value_width) // 2
            draw_mixed(draw, (value_x, y), value, small)
        _, row_height = text_dimensions(draw, f"{first_name}Ag", normal)
        y += row_height + 3
        for extra_name in name_lines[1:]:
            line(extra_name, font=normal, gap=3)
        custom_parts = [str(option) for option in item.get("options", [])]
        if item.get("note"):
            custom_parts.append(str(item["note"]))
        if custom_parts:
            custom_text = "- " + " ".join(custom_parts)
            for custom_line in wrap_text(draw, custom_text, option_font, inner_width):
                _, custom_height = text_dimensions(draw, custom_line, option_font)
                draw_mixed(draw, (margin, y), custom_line, option_font)
                y += custom_height + 2
        y += 5
    rule()
    discount_amount = float(receipt.get("discount_amount") or 0)
    service_fee = float(receipt.get("service_fee") or 0)
    tax_amount = float(receipt.get("tax_amount") or 0)
    tax_rate = float(receipt.get("tax_rate") or 0)
    tax_mode = receipt.get("tax_mode") or "inclusive"
    # Keep the receipt summary explicit so discounted orders are easy to audit.
    line("小計", money(receipt.get("subtotal", receipt.get("total"))))
    if service_fee > 0:
        line("服務費", money(service_fee))
    if discount_amount > 0:
        line("優惠折扣名稱", str(receipt.get("discount_note") or "優惠"), font=small)
        line("折扣金額", f"-{money(discount_amount)}", font=small)
    line(f"營業稅 ({tax_rate:g}% {'內含' if tax_mode == 'inclusive' else '外加'})", money(tax_amount), font=small)
    total_label = "折後總計" if discount_amount > 0 else "總計"
    line(total_label, money(receipt.get("total")), font=title, gap=7)
    if receipt.get("receipt_footer"):
        rule()
        for footer_line in str(receipt["receipt_footer"]).splitlines():
            if footer_line.strip():
                centered(footer_line.strip(), small, 2)
    return canvas.crop((0, 0, width, max(1, y + 8)))


def raster_command(image):
    mono = image.convert("L")
    width_bytes = (mono.width + 7) // 8
    data = bytearray()
    pixels = mono.load()
    for y in range(mono.height):
        for byte_x in range(width_bytes):
            value = 0
            for bit in range(8):
                x = byte_x * 8 + bit
                if x < mono.width and pixels[x, y] < 160:
                    value |= 1 << (7 - bit)
            data.append(value)
    return (
        GS + b"v0\x00"
        + bytes((width_bytes & 0xFF, width_bytes >> 8, mono.height & 0xFF, mono.height >> 8))
        + bytes(data)
    )


def compact_text_image(value, max_width, start_size):
    """Render one tightly-cropped CJK line, shrinking instead of wrapping."""
    value = str(value).strip()
    size = start_size
    while size > 14:
        fonts = receipt_font(size)
        probe = Image.new("L", (max_width, size * 2), 255)
        draw = ImageDraw.Draw(probe)
        text_width, text_height = text_dimensions(draw, value, fonts)
        if text_width <= max_width:
            image = Image.new("L", (max(1, text_width), max(1, text_height)), 255)
            draw_mixed(ImageDraw.Draw(image), (0, 0), value, fonts)
            bounds = Image.eval(image, lambda pixel: 255 - pixel).getbbox()
            return image.crop(bounds) if bounds else image
        size -= 2
    return compact_text_image(value[:max(1, len(value) - 1)], max_width, start_size) if value else Image.new("L", (1, 1), 255)


def page_bit_image(image, x, y):
    """Place raster glyphs at an exact page-mode position using ESC * bands."""
    mono = image.convert("L")
    pixels = mono.load()
    out = bytearray()
    for band_y in range(0, mono.height, 24):
        out += ESC + b"$" + bytes((x & 0xFF, x >> 8))
        absolute_y = y + band_y
        out += GS + b"$" + bytes((absolute_y & 0xFF, absolute_y >> 8))
        out += ESC + b"*\x21" + bytes((mono.width & 0xFF, mono.width >> 8))
        for pixel_x in range(mono.width):
            for group in range(3):
                value = 0
                for bit in range(8):
                    pixel_y = band_y + group * 8 + bit
                    if pixel_y < mono.height and pixels[pixel_x, pixel_y] < 160:
                        value |= 1 << (7 - bit)
                out.append(value)
    return bytes(out)


def render_number_ticket(receipt, width, logo_base64=None):
    canvas = Image.new("L", (width, 700), 255)
    draw = ImageDraw.Draw(canvas)
    small = receipt_font(23)
    heading = receipt_font(30)
    number = receipt_font(104 if width <= 384 else 140)
    y = paste_logo(canvas, logo_base64, width, 0)

    def centered(value, fonts, gap=8):
        nonlocal y
        text_width, text_height = text_dimensions(draw, value, fonts)
        draw_mixed(draw, ((width - text_width) // 2, y), value, fonts)
        y += text_height + gap

    if y:
        draw.line((8, y, width - 8, y), fill=0, width=2)
        y += 18
    centered("取餐號碼", heading, 4)
    centered(str(receipt.get("order_no", "")), number, 10)
    centered("請憑號取餐", heading, 12)
    if receipt.get("created_at"):
        centered(receipt["created_at"], small, 2)
    return canvas.crop((0, 0, width, max(1, y + 8)))


def render_kitchen_ticket(receipt, width):
    margin = 8
    small = receipt_font(22)
    normal = receipt_font(29)
    heading = receipt_font(40)
    canvas = Image.new("L", (width, 5000), 255)
    draw = ImageDraw.Draw(canvas)
    y = 4

    def centered(value, fonts, gap=6):
        nonlocal y
        text_width, text_height = text_dimensions(draw, value, fonts)
        draw_mixed(draw, ((width - text_width) // 2, y), value, fonts)
        y += text_height + gap

    def row(value, fonts=normal, indent=0, gap=4):
        nonlocal y
        for wrapped in wrap_text(draw, value, fonts, width - margin * 2 - indent):
            draw_mixed(draw, (margin + indent, y), wrapped, fonts)
            _, text_height = text_dimensions(draw, f"{wrapped}Ag", fonts)
            y += text_height + gap

    centered("內場製作單", heading)
    centered(f"單號 {receipt.get('order_no', '')}", heading, 10)
    if receipt.get("created_at"):
        centered(receipt["created_at"], small, 8)
    if receipt.get("pickup_at"):
        centered(f"預計取餐 {receipt['pickup_at']}", small, 8)
    draw.line((margin, y, width - margin, y), fill=0, width=4)
    y += 10
    for item in receipt.get("lines", []):
        quantity = float(item.get("quantity", 1))
        row(f"{quantity:g} × {item.get('name', '')}")
        for option in item.get("options", []):
            row(f"＋ {option}", small, 16, 2)
        if item.get("note"):
            row(f"客製：{item['note']}", small, 16, 2)
        y += 8
    return canvas.crop((0, 0, width, max(1, y + 8)))


def render_product_label(receipt, item, width, item_sequence, item_total):
    margin = 10
    small = receipt_font(21)
    heading = receipt_font(35)
    price_font = receipt_font(38)
    canvas = Image.new("L", (width, 900), 255)
    draw = ImageDraw.Draw(canvas)
    # Start at the first printable dot; label stock already has its own margin.
    y = 0

    def left(value, fonts, gap=4):
        nonlocal y
        draw_mixed(draw, (margin, y), value, fonts)
        _, text_height = text_dimensions(draw, f"{value}Ag", fonts)
        y += text_height + gap

    order_type_labels = {"dine_in": "內用", "take_out": "外帶", "delivery": "外送"}
    order_type = order_type_labels.get(str(receipt.get("order_type") or "take_out"), "外帶")
    header = f"{order_type} {receipt.get('order_no', '')}"
    draw_mixed(draw, (margin, y), header, small)
    quantity_text = f"{item_sequence}/{item_total}"
    quantity_width, quantity_height = text_dimensions(draw, quantity_text, heading)
    draw_mixed(draw, (width - margin - quantity_width, y), quantity_text, heading)
    _, header_height = text_dimensions(draw, f"{header}Ag", small)
    y += max(quantity_height, header_height) + 7

    left(item.get("name", ""), heading, 5)
    unit_price = item.get("unit_price")
    if unit_price is None:
        quantity = max(1, float(item.get("quantity", 1)))
        unit_price = float(item.get("amount", 0)) / quantity
    option_parts = [str(option).strip() for option in item.get("options", []) if str(option).strip()]
    if item.get("note"):
        option_parts.append(str(item["note"]).strip())
    if option_parts:
        # Keep customizations on one compact line, as on the reference label.
        option_text = " ".join(option_parts)
        option_font = receipt_font(21)
        for size in (21, 19, 17, 15):
            candidate = receipt_font(size)
            if text_dimensions(draw, option_text, candidate)[0] <= width - margin * 2:
                option_font = candidate
                break
        left(option_text, option_font, 2)

    y += 16
    created_at = str(receipt.get("pickup_at") or receipt.get("created_at") or "")
    draw_mixed(draw, (margin, y), created_at, small)
    price_text = money(unit_price)
    price_width, price_height = text_dimensions(draw, price_text, price_font)
    draw_mixed(draw, (width - margin - price_width, y - 3), price_text, price_font)
    _, time_height = text_dimensions(draw, f"{created_at}Ag", small)
    y += max(price_height, time_height) + 5
    cropped = canvas.crop((0, 0, width, max(1, y + 4)))
    ink_bounds = Image.eval(cropped, lambda value: 255 - value).getbbox()
    if ink_bounds and ink_bounds[1] > 0:
        cropped = cropped.crop((0, ink_bounds[1], width, cropped.height))
    # Hard threshold keeps fonts and rules crisp on thermal label stock.
    return cropped.point(lambda value: 0 if value < 210 else 255, mode="1").convert("L")


def render_shift_report(report, width, logo_base64=None):
    margin = 8
    small = receipt_font(19)
    normal = receipt_font(22)
    heading = receipt_font(31)
    section = receipt_font(25)
    canvas = Image.new("L", (width, 8000), 255)
    draw = ImageDraw.Draw(canvas)
    y = paste_logo(canvas, logo_base64, width, 0)

    def centered(value, fonts, gap=5):
        nonlocal y
        text_width, text_height = text_dimensions(draw, value, fonts)
        draw_mixed(draw, ((width - text_width) // 2, y), value, fonts)
        y += text_height + gap

    def line(left, right="", fonts=normal, gap=3):
        nonlocal y
        draw_mixed(draw, (margin, y), left, fonts)
        if right:
            right_width, _ = text_dimensions(draw, right, fonts)
            draw_mixed(draw, (width - margin - right_width, y), right, fonts)
        _, text_height = text_dimensions(draw, f"{left}{right}Ag", fonts)
        y += text_height + gap

    def rule():
        nonlocal y
        y += 3
        draw.line((margin, y, width - margin, y), fill=0, width=3)
        y += 7

    centered("班次明細", heading, 6)
    centered(f"班次 {report.get('shift_number') or report.get('shift_id', '')}", section, 8)
    line("開班", report.get("start_time", ""), fonts=small)
    line("結班", report.get("end_time", ""), fonts=small)
    if report.get("opened_by"):
        line("開班人員", report["opened_by"], fonts=small)
    if report.get("closed_by"):
        line("結班人員", report["closed_by"], fonts=small)

    rule()
    line("訂單統計", fonts=section)
    line("成交筆數", f"{report.get('order_count', 0)} 筆")
    line("作廢筆數", f"{report.get('void_count', 0)} 筆")

    rule()
    line("各品項銷售", fonts=section)
    product_sales = report.get("product_sales", [])
    if not product_sales:
        line("無銷售品項", fonts=small)
    for product in product_sales:
        quantity = float(product.get("quantity") or 0)
        right_text = f"x{quantity:g}  {money(product.get('amount'))}"
        right_width, _ = text_dimensions(draw, right_text, small)
        name_width = max(80, width - margin * 2 - right_width - 10)
        name_lines = wrap_text(draw, product.get("name", ""), normal, name_width)
        first_name = name_lines[0] if name_lines else ""
        draw_mixed(draw, (margin, y), first_name, normal)
        draw_mixed(draw, (width - margin - right_width, y), right_text, small)
        _, row_height = text_dimensions(draw, f"{first_name}{right_text}Ag", normal)
        y += row_height + 2
        for extra_name in name_lines[1:]:
            line(extra_name, fonts=normal, gap=2)

    rule()
    line("銷售彙總", fonts=section)
    line("總銷售", money(report.get("total_sales")))
    line("現金銷售", money(report.get("cash_sales")))
    line("多元支付", money(report.get("non_cash_sales")))
    line("商品成本", f"-{money(report.get('total_cost'))}")
    line("毛利", money(report.get("total_net_profit")), fonts=section, gap=6)

    rule()
    line("現金盤點", fonts=section)
    line("起始現金", money(report.get("initial_cash")))
    line("補錢", money(report.get("cash_added")))
    line("取款", f"-{money(report.get('cash_removed'))}")
    line("預計現金", money(report.get("expected_cash")))
    line("實點現金", money(report.get("final_cash")))
    shortage = float(report.get("shortage") or 0)
    line("短溢", f"{'+' if shortage > 0 else ''}{money(shortage)}", fonts=section, gap=7)
    return canvas.crop((0, 0, width, max(1, y + 8)))


def number_ticket_bytes(job):
    receipt = job.get("receipt") or {}
    printer = job["printer"]
    dot_width = 384 if printer.get("paper_width") in {"57mm", "58mm"} else 576
    out = bytearray(ESC + b"@" + ESC + b"2")
    out += GS + b"L\x00\x00" + GS + b"W" + bytes((dot_width & 0xFF, dot_width >> 8))
    out += raster_command(render_number_ticket(receipt, dot_width, job.get("logo_base64")))
    out += ESC + b"d\x05" + GS + b"V\x00"
    return bytes(out)


def kitchen_ticket_bytes(job):
    receipt = job.get("receipt") or {}
    printer = job["printer"]
    dot_width = 384 if printer.get("paper_width") in {"57mm", "58mm"} else 576
    out = bytearray(ESC + b"@" + ESC + b"2")
    out += raster_command(render_kitchen_ticket(receipt, dot_width))
    out += ESC + b"d\x05" + GS + b"V\x00"
    return bytes(out)


def label_bytes(job):
    receipt = job.get("receipt") or {}
    printer = job["printer"]
    dot_width = 384 if printer.get("paper_width") in {"57mm", "58mm"} else 576
    expanded = []
    for item in receipt.get("lines", []):
        item_total = max(1, int(float(item.get("quantity", 1))))
        expanded.extend((item, item_sequence, item_total) for item_sequence in range(1, item_total + 1))
    out = bytearray()
    for item, item_sequence, item_total in expanded:
        out += ESC + b"@" + ESC + b"2"
        out += raster_command(render_product_label(
            receipt,
            item,
            dot_width,
            item_sequence,
            item_total,
        ))
        out += ESC + b"d\x03" + GS + b"V\x00"
    return bytes(out)


def native_text_width(value):
    return sum(1 if ord(char) < 128 else 2 for char in str(value))


def fit_native_line(value, columns):
    value = str(value).strip()
    if native_text_width(value) <= columns:
        return value
    suffix = ".."
    result = ""
    for char in value:
        if native_text_width(result + char + suffix) > columns:
            break
        result += char
    return result.rstrip() + suffix


def native_label_bytes(job):
    receipt = job.get("receipt") or {}
    printer = job["printer"]
    encoding = printer.get("encoding", "cp950")
    columns = 32 if printer.get("paper_width") in {"57mm", "58mm"} else 48
    order_type_labels = {"dine_in": "內用", "take_out": "外帶", "delivery": "外送"}
    order_type = order_type_labels.get(str(receipt.get("order_type") or "take_out"), "外帶")
    expanded = []
    for item in receipt.get("lines", []):
        item_total = max(1, int(float(item.get("quantity", 1))))
        expanded.extend((item, item_sequence, item_total) for item_sequence in range(1, item_total + 1))

    def encoded(value):
        return str(value).encode(encoding, errors="replace")

    def paired(left, right):
        gap = max(1, columns - native_text_width(left) - native_text_width(right))
        return encoded(left + (" " * gap) + right) + b"\n"

    out = bytearray()
    for item, item_sequence, item_total in expanded:
        unit_price = item.get("unit_price")
        if unit_price is None:
            quantity = max(1, float(item.get("quantity", 1)))
            unit_price = float(item.get("amount", 0)) / quantity
        header = f"{order_type} {receipt.get('order_no', '')}"
        progress = f"{item_sequence}/{item_total}"
        options = [str(option) for option in item.get("options", [])]
        if item.get("note"):
            options.append(str(item["note"]))
        option_text = " ".join(option.strip() for option in options if option.strip())
        created_at = str(receipt.get("pickup_at") or receipt.get("created_at") or "")

        out += ESC + b"@" + b"\x1c&" + ESC + b"E\x01"
        out += paired(header, progress)
        out += GS + b"!\x11" + encoded(item.get("name", "")) + b"\n" + GS + b"!\x00"
        if option_text:
            compact_columns = 42 if columns == 32 else 64
            out += ESC + b"M\x01" + ESC + b"E\x00" + encoded(fit_native_line(option_text, compact_columns)) + b"\n" + ESC + b"M\x00"
        out += b"\n\n" + ESC + b"E\x00"
        price = money(unit_price)
        price_width = native_text_width(price) * 2
        time_width = native_text_width(created_at)
        gap = max(1, columns - time_width - price_width)
        out += encoded(created_at + (" " * gap))
        out += GS + b"!\x11" + ESC + b"E\x01" + encoded(price) + GS + b"!\x00" + b"\n"
        out += ESC + b"E\x00" + b"\x1c." + ESC + b"d\x03" + GS + b"V\x00"
    return bytes(out)


def hybrid_label_bytes(job):
    """Rasterize CJK text while keeping numeric and symbolic fields native."""
    receipt = job.get("receipt") or {}
    printer = job["printer"]
    dot_width = 384 if printer.get("paper_width") in {"57mm", "58mm"} else 576
    margin = 10
    order_type_labels = {"dine_in": "內用", "take_out": "外帶", "delivery": "外送"}
    order_type = order_type_labels.get(str(receipt.get("order_type") or "take_out"), "外帶")
    expanded = []
    for item in receipt.get("lines", []):
        item_total = max(1, int(float(item.get("quantity", 1))))
        expanded.extend((item, sequence, item_total) for sequence in range(1, item_total + 1))

    out = bytearray()
    for item, sequence, item_total in expanded:
        unit_price = item.get("unit_price")
        if unit_price is None:
            quantity = max(1, float(item.get("quantity", 1)))
            unit_price = float(item.get("amount", 0)) / quantity
        options = [str(option).strip() for option in item.get("options", []) if str(option).strip()]
        if item.get("note"):
            options.append(str(item["note"]).strip())

        order_image = compact_text_image(order_type, 90, 21)
        name_image = compact_text_image(item.get("name", ""), dot_width - margin * 2, 35)
        option_image = compact_text_image(" ".join(options), dot_width - margin * 2, 21) if options else None
        name_y = 34
        option_y = name_y + name_image.height + 7
        bottom_y = option_y + (option_image.height + 12 if option_image else 16)
        page_height = bottom_y + 42

        # Use one 203-dpi printer dot as one page-coordinate unit. Without
        # this, many C58H firmwares default to 180 units/inch and progressively
        # push right-aligned content toward the paper's right edge.
        out += ESC + b"@" + GS + b"P\xcb\xcb" + ESC + b"L"
        out += ESC + b"W\x00\x00\x00\x00" + bytes((dot_width & 0xFF, dot_width >> 8, page_height & 0xFF, page_height >> 8))
        out += page_bit_image(order_image, margin, 0)
        order_x = margin + order_image.width + 8
        out += ESC + b"$" + bytes((order_x & 0xFF, order_x >> 8)) + GS + b"$\x00\x00"
        out += ESC + b"E\x01" + str(receipt.get("order_no", "")).encode("ascii", errors="replace")
        progress = f"{sequence}/{item_total}"
        progress_x = max(margin, dot_width - margin - len(progress) * 24)
        out += ESC + b"$" + bytes((progress_x & 0xFF, progress_x >> 8)) + GS + b"$\x00\x00"
        out += GS + b"!\x11" + progress.encode("ascii") + GS + b"!\x00"
        out += page_bit_image(name_image, margin, name_y)
        if option_image:
            out += page_bit_image(option_image, margin, option_y)

        created_at = str(receipt.get("created_at") or "")
        out += ESC + b"$" + bytes((margin, 0)) + GS + b"$" + bytes((bottom_y & 0xFF, bottom_y >> 8))
        out += ESC + b"E\x00" + created_at.encode("ascii", errors="replace")
        price = money(unit_price)
        price_x = max(margin, dot_width - margin - len(price) * 24)
        out += ESC + b"$" + bytes((price_x & 0xFF, price_x >> 8)) + GS + b"$" + bytes((max(0, bottom_y - 4) & 0xFF, max(0, bottom_y - 4) >> 8))
        out += GS + b"!\x11" + ESC + b"E\x01" + price.encode("ascii") + GS + b"!\x00"
        out += b"\x0c" + ESC + b"S" + ESC + b"d\x03" + GS + b"V\x00"
    return bytes(out)


def shift_report_bytes(job):
    report = job.get("receipt") or {}
    printer = job["printer"]
    dot_width = 384 if printer.get("paper_width") in {"57mm", "58mm"} else 576
    out = bytearray(ESC + b"@" + ESC + b"2")
    out += GS + b"L\x00\x00" + GS + b"W" + bytes((dot_width & 0xFF, dot_width >> 8))
    out += raster_command(render_shift_report(report, dot_width, job.get("logo_base64")))
    out += ESC + b"d\x05" + GS + b"V\x00"
    return bytes(out)


def receipt_bytes(job):
    receipt = job.get("receipt") or {}
    printer = job["printer"]
    dot_width = 384 if printer.get("paper_width") in {"57mm", "58mm"} else 576
    # Reset and use the printer's compact default line spacing. Do not add a
    # leading feed: on cutterless 58 mm models that becomes a large top margin.
    out = bytearray(ESC + b"@" + ESC + b"2")
    out += GS + b"L\x00\x00" + GS + b"W" + bytes((dot_width & 0xFF, dot_width >> 8))
    out += raster_command(render_receipt(receipt, dot_width, job.get("logo_base64")))
    # Feed past the cutter before cutting so the final receipt lines are not
    # clipped. C58H installations with a cutter accept GS V after this feed.
    out += ESC + b"d\x05"
    out += GS + b"V\x00"
    return bytes(out)


def command_bytes(job):
    action = job["action"]
    if action == "open_drawer":
        return ESC + b"@" + ESC + b"p\x00\x19\xfa"
    if action == "print_number_ticket":
        return number_ticket_bytes(job)
    if action == "print_kitchen":
        return kitchen_ticket_bytes(job)
    if action == "print_label":
        render_mode = job["printer"].get("label_render_mode", "native")
        if render_mode == "native":
            return native_label_bytes(job)
        if render_mode == "hybrid":
            return hybrid_label_bytes(job)
        return label_bytes(job)
    if action == "print_shift_report":
        return shift_report_bytes(job)
    if action == "test_print":
        sample = {
            "store_name": "StallEasy POS 中文測試",
            "order_no": "TEST",
            "created_at": time.strftime("%Y/%m/%d %H:%M"),
            "total": 100,
            "cash_received": 500,
            "change": 400,
            "lines": [{"name": "紅茶（正常甜度）", "quantity": 2, "amount": 100}],
        }
        return receipt_bytes({**job, "receipt": sample})
    return receipt_bytes(job)


def send_to_printer(job, printer):
    job = {**job, "printer": printer}
    data = command_bytes(job)
    if printer["type"] == "network":
        with socket.create_connection((printer["ip"], int(printer.get("port", 9100))), timeout=5) as sock:
            sock.sendall(data)
    else:
        path = Path(printer.get("usb_path", "/dev/usb/lp0"))
        ensure_usb_device_node(path)
        try:
            device_mode = path.stat().st_mode
        except FileNotFoundError as exc:
            raise RuntimeError(f"找不到 USB 印表機裝置：{path}") from exc
        if not stat.S_ISCHR(device_mode):
            raise RuntimeError(f"USB 路徑不是實體印表機裝置：{path}")
        with open(path, "wb", buffering=0) as device:
            device.write(data)


def ensure_usb_device_node(path):
    """Recreate a missing usblp device node after a USB reconnect.

    Some kiosk images load the kernel usblp driver correctly but do not run a
    device manager that recreates /dev/usb/lpN.  The hardware bridge runs as a
    system service, so it can safely restore the node from the kernel-exposed
    major/minor pair before printing.
    """
    path = Path(path)
    if path.exists() or path.parent != Path("/dev/usb") or not path.name.startswith("lp"):
        return

    device_number_path = Path("/sys/class/usbmisc") / path.name / "dev"
    try:
        major_text, minor_text = device_number_path.read_text(encoding="ascii").strip().split(":", 1)
        path.parent.mkdir(parents=True, exist_ok=True)
        os.mknod(
            path,
            stat.S_IFCHR | 0o666,
            os.makedev(int(major_text), int(minor_text)),
        )
        os.chmod(path, 0o666)
    except FileExistsError:
        return
    except (OSError, ValueError) as exc:
        raise RuntimeError(f"USB 印表機已連接，但無法建立裝置節點：{path} ({exc})") from exc


def send(job):
    printers = job.get("printers") or [job["printer"]]
    errors = []
    for printer in printers:
        try:
            send_to_printer(job, printer)
        except Exception as exc:
            errors.append(f"{printer.get('name', printer.get('id', '印表機'))}: {exc}")
    if errors:
        raise RuntimeError("；".join(errors))


def usb_devices():
    # Restore nodes for every usblp device currently known by the kernel before
    # scanning /dev. This also makes a reconnected printer selectable again.
    for sys_device in sorted(Path("/sys/class/usbmisc").glob("lp*")):
        ensure_usb_device_node(Path("/dev/usb") / sys_device.name)

    devices = []
    for path in sorted(Path("/dev/usb").glob("lp*")):
        try:
            if not stat.S_ISCHR(path.stat().st_mode):
                continue
        except OSError:
            continue
        label = f"USB 印表機 ({path})"
        sys_device = Path("/sys/class/usbmisc") / path.name / "device"
        details = []
        for field in ("manufacturer", "product"):
            candidate = sys_device / field
            try:
                value = candidate.read_text(encoding="utf-8").strip()
                if value:
                    details.append(value)
            except OSError:
                pass
        if details:
            label = " ".join(details) + f" ({path})"
        devices.append({"type": "usb", "value": str(path), "label": label})
    return devices


def local_networks():
    addresses = set()
    try:
        for interface in Path("/sys/class/net").iterdir():
            if interface.name == "lo" or interface.name.startswith(("docker", "br-", "veth")):
                continue
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as probe:
                packed = struct.pack("256s", interface.name[:15].encode("ascii"))
                address = socket.inet_ntoa(fcntl.ioctl(probe.fileno(), 0x8915, packed)[20:24])
                if not address.startswith("127."):
                    addresses.add(address)
    except (OSError, UnicodeEncodeError):
        pass
    # A UDP connect does not send traffic; it asks the OS which local address
    # would be used for the default route. This also works when the hostname
    # only resolves to 127.0.1.1 (common on Raspberry Pi OS).
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as probe:
            probe.connect(("1.1.1.1", 53))
            addresses.add(probe.getsockname()[0])
    except OSError:
        pass
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ip = info[4][0]
            if not ip.startswith("127."):
                addresses.add(ip)
    except socket.gaierror:
        pass
    # POS installations normally use a /24 LAN. Limit the scan to avoid broad probing.
    return [ipaddress.ip_network(f"{ip}/24", strict=False) for ip in addresses]


def probe_network_device(ip, local_addresses):
    address = str(ip)
    if address in local_addresses:
        return None
    try:
        result = subprocess.run(
            ["ping", "-n", "-c", "1", "-W", "1", address],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=1.5,
            check=False,
        )
        if result.returncode == 0:
            return {
                "type": "network",
                "value": address,
                "label": f"同網段裝置 {address}",
            }
    except (OSError, subprocess.TimeoutExpired):
        return None
    return None


def scan_devices():
    devices = usb_devices()
    hosts = set()
    local_addresses = set()
    for network in local_networks():
        hosts.update(network.hosts())
    for interface in Path("/sys/class/net").iterdir():
        if interface.name == "lo":
            continue
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as probe:
                packed = struct.pack("256s", interface.name[:15].encode("ascii"))
                local_addresses.add(socket.inet_ntoa(fcntl.ioctl(probe.fileno(), 0x8915, packed)[20:24]))
        except (OSError, UnicodeEncodeError):
            continue
    ordered_hosts = sorted(hosts, key=int)
    with concurrent.futures.ThreadPoolExecutor(max_workers=64) as pool:
        for device in pool.map(lambda host: probe_network_device(host, local_addresses), ordered_hosts):
            if device:
                devices.append(device)
    return devices


def main():
    spool = Path(os.environ.get("STALLEASY_PRINTER_SPOOL", "/var/lib/stalleasy/control/printer"))
    failed = spool / "failed"
    results = spool / "results"
    spool.mkdir(parents=True, exist_ok=True)
    failed.mkdir(exist_ok=True)
    results.mkdir(exist_ok=True)
    while True:
        for path in sorted(spool.glob("*.json"), key=lambda item: item.stat().st_mtime_ns):
            try:
                job = json.loads(path.read_text(encoding="utf-8"))
                if job["action"] == "scan_devices":
                    result = {"devices": scan_devices()}
                    result_path = results / f"{job['id']}.json"
                    result_path.write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")
                else:
                    send(job)
                    result_path = results / f"{job['id']}.json"
                    result_path.write_text(json.dumps({"devices": []}, ensure_ascii=False), encoding="utf-8")
                path.unlink()
            except Exception as exc:
                error_path = failed / f"{path.stem}.error.txt"
                error_path.write_text(str(exc), encoding="utf-8")
                path.replace(failed / path.name)
                print(f"hardware job {path.name} failed: {exc}", file=sys.stderr, flush=True)
        time.sleep(0.25)


if __name__ == "__main__":
    main()
