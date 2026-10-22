#!/usr/bin/env python3
"""Host-side ESC/POS bridge for network and USB receipt printers."""
import json
import os
import socket
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

    line(f"單號：{receipt.get('order_no', '')}", font=small)
    line(f"時間：{receipt.get('created_at', '')}", font=small)
    if receipt.get("cashier"):
        line(f"收銀員：{receipt['cashier']}", font=small)
    payment_labels = {
        "cash": "現金",
        "linepay": "LINE Pay",
        "platform_collect": "平台代收",
    }
    payment_method = str(receipt.get("payment_method") or "")
    if payment_method:
        line(f"結帳方式：{payment_labels.get(payment_method, payment_method)}", font=small)
    rule()
    line("品項", "數量／金額", font=small)
    rule()
    option_font = receipt_font(20)
    for item in receipt.get("lines", []):
        quantity = float(item.get("quantity", 1))
        right_text = f"x{quantity:g}  {money(item.get('amount', 0))}"
        right_width, _ = text_dimensions(draw, right_text, small)
        name_width = max(80, width - margin * 2 - right_width - 10)
        name_lines = wrap_text(draw, item.get("name", ""), normal, name_width)
        # Quantity and line amount stay on the same row as the product name.
        first_name = name_lines[0] if name_lines else ""
        draw_mixed(draw, (margin, y), first_name, normal)
        draw_mixed(draw, (width - margin - right_width, y), right_text, small)
        _, row_height = text_dimensions(draw, f"{first_name}{right_text}Ag", normal)
        y += row_height + 3
        for extra_name in name_lines[1:]:
            line(extra_name, font=normal, gap=3)
        for option in item.get("options", []):
            for option_line in wrap_text(draw, f"＋ {option}", option_font, width - margin * 2 - 12):
                draw_mixed(draw, (margin + 12, y), option_line, option_font)
                _, option_height = text_dimensions(draw, f"{option_line}Ag", option_font)
                y += option_height + 2
        if item.get("note"):
            for note_line in wrap_text(draw, f"客製：{item['note']}", option_font, width - margin * 2 - 12):
                draw_mixed(draw, (margin + 12, y), note_line, option_font)
                _, note_height = text_dimensions(draw, f"{note_line}Ag", option_font)
                y += note_height + 2
        y += 5
    rule()
    discount_amount = float(receipt.get("discount_amount") or 0)
    service_fee = float(receipt.get("service_fee") or 0)
    # Keep the receipt summary explicit so discounted orders are easy to audit.
    line("小計", money(receipt.get("subtotal", receipt.get("total"))))
    if service_fee > 0:
        line("服務費", money(service_fee))
    if discount_amount > 0:
        line("優惠折扣名稱", str(receipt.get("discount_note") or "優惠"), font=small)
        line("折扣金額", f"-{money(discount_amount)}", font=small)
    total_label = "折後總計" if discount_amount > 0 else "總計"
    line(total_label, money(receipt.get("total")), font=title, gap=7)
    if receipt.get("cash_received") is not None:
        line("實收", money(receipt["cash_received"]))
    if receipt.get("change") is not None:
        line("找零", money(receipt["change"]))
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
    centered(f"班次 #{report.get('shift_id', '')}", section, 8)
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


def send(job):
    printer = job["printer"]
    data = command_bytes(job)
    if printer["type"] == "network":
        with socket.create_connection((printer["ip"], int(printer.get("port", 9100))), timeout=5) as sock:
            sock.sendall(data)
    else:
        path = printer.get("usb_path", "/dev/usb/lp0")
        with open(path, "wb", buffering=0) as device:
            device.write(data)


def usb_devices():
    devices = []
    for path in sorted(Path("/dev/usb").glob("lp*")):
        label = f"USB 印表機 ({path})"
        sys_device = Path("/sys/class/usb") / path.name / "device"
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


def probe_printer(ip):
    try:
        with socket.create_connection((str(ip), 9100), timeout=0.18):
            return {"type": "network", "value": str(ip), "label": f"網路印表機 {ip}:9100"}
    except OSError:
        return None


def scan_devices():
    devices = usb_devices()
    hosts = []
    for network in local_networks():
        hosts.extend(network.hosts())
    with concurrent.futures.ThreadPoolExecutor(max_workers=48) as pool:
        for device in pool.map(probe_printer, hosts):
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
                path.unlink()
            except Exception as exc:
                error_path = failed / f"{path.stem}.error.txt"
                error_path.write_text(str(exc), encoding="utf-8")
                path.replace(failed / path.name)
                print(f"hardware job {path.name} failed: {exc}", file=sys.stderr, flush=True)
        time.sleep(0.25)


if __name__ == "__main__":
    main()
