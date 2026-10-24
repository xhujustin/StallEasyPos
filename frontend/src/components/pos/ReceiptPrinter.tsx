
import React from 'react';
import { Order } from '@/lib/api/orders';
import { formatDateTime } from '@/lib/utils';

import { createPortal } from 'react-dom';

interface ReceiptPrinterProps {
    order: Order | null;
}

export const ReceiptPrinter = ({ order }: ReceiptPrinterProps) => {
    if (!order) return null;
    // Client-side check
    if (typeof document === 'undefined') return null;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0 }).format(amount);
    };

    return createPortal(
        <div className="print-only-container bg-white text-black font-mono text-[12px] px-1 py-0 w-[57mm] mx-auto">
            {/* Store Name - Placeholder or from Context */}
            <div className="text-center mb-2">
            </div>

            {/* Order Info */}
            <div className="border-b border-black pb-2 mb-2 border-dashed">
                <div className="flex justify-between text-xs">
                    <span>單號: #{order.order_no}</span>
                    <span>店家：StallEasy POS</span>
                </div>
                {order.shift_number && <div className="text-xs mt-1">班次：{order.shift_number}</div>}
                <div className="flex justify-between text-xs mt-1">
                    <span>收銀員: {order.created_by?.nickname || order.created_by?.full_name || order.created_by?.username || order.source}</span>
                    <span>{order.delivery_platform || order.payment_provider || (order.payment_method === 'cash' ? '現金' : order.payment_method)}</span>
                </div>
            </div>

            {/* Items */}
            <div className="mb-2">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-black border-dashed">
                            <th className="py-1">品項</th>
                            <th className="text-center py-1 w-12">售價</th>
                            <th className="text-center py-1 w-8">數量</th>
                            <th className="text-center py-1 w-12">金額</th>
                        </tr>
                    </thead>
                    <tbody>
                        {order.items.map((item, idx) => (
                            <React.Fragment key={idx}>
                                <tr>
                                    <td className="py-1 pt-2 align-top font-bold">
                                        {item.name_snapshot}
                                    </td>
                                    <td className="text-center pt-2 align-top">{formatCurrency(item.price_snapshot)}</td>
                                    <td className="text-center pt-2 align-top">{item.quantity}</td>
                                    <td className="text-center pt-2 align-top">{formatCurrency(item.price_snapshot * item.quantity)}</td>
                                </tr>
                                {/* Options */}
                                {item.options && item.options.length > 0 && (
                                    <tr>
                                        <td colSpan={4} className="pb-1 text-left text-xs text-slate-500">
                                            {item.options.map((opt: any, i) => (
                                                <span key={i} className="mr-2">
                                                    {opt.option_name}
                                                    {opt.price_adjustment > 0 && `(+${opt.price_adjustment})`}
                                                </span>
                                            ))}
                                        </td>
                                    </tr>
                                )}
                                {/* Note */}
                                {item.note && (
                                    <tr>
                                        <td colSpan={4} className="pb-1 text-left text-xs text-slate-500 italic">
                                            - {item.note}
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Totals */}
            <div className="border-t border-black border-dashed pt-2 mb-4">
                <div className="flex justify-between text-sm">
                    <span>小計</span>
                    <span>{formatCurrency(Number(order.subtotal))}</span>
                </div>
                {Number(order.service_fee) > 0 && (
                    <div className="flex justify-between text-sm">
                        <span>服務費</span>
                        <span>{formatCurrency(Number(order.service_fee))}</span>
                    </div>
                )}
                <div className="flex justify-between text-sm">
                    <span>營業稅 ({order.tax_rate}%{order.tax_mode === 'inclusive' ? ' 內含' : ' 外加'})</span>
                    <span>{formatCurrency(Number(order.tax_amount || 0))}</span>
                </div>
                {Number(order.discount_amount) > 0 && (
                    <>
                        <div className="flex justify-between text-sm">
                            <span>優惠折扣名稱</span>
                            <span>{order.discount_note || '優惠'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>折扣金額</span>
                            <span>-{formatCurrency(Number(order.discount_amount))}</span>
                        </div>
                    </>
                )}
                <div className="flex justify-between font-bold text-lg mt-1">
                    <span>{Number(order.discount_amount) > 0 ? '折後總計' : '總計'}</span>
                    <span>{formatCurrency(order.total_amount)}</span>
                </div>
            </div>

            {/* Footer */}
            <div className="text-center text-xs mt-3 pb-3">
                <p>*** 收據 ***</p>
                <p className="mt-1">{order.idempotency_key.slice(0, 8)}</p>
            </div>
        </div>,
        document.body
    );
};
