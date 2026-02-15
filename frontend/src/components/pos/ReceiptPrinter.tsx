
import React from 'react';
import { Order } from '@/lib/api/orders';

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

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    };

    return createPortal(
        <div className="print-only-container bg-white text-black font-mono text-sm p-4 w-[80mm] mx-auto">
            {/* Store Name - Placeholder or from Context */}
            <div className="text-center mb-4">
                <h1 className="text-xl font-bold">StallEasy POS</h1>
                <p className="text-xs mt-1">感謝您的光臨</p>
            </div>

            {/* Order Info */}
            <div className="border-b border-black pb-2 mb-2 border-dashed">
                <div className="flex justify-between text-xs">
                    <span>單號: #{order.order_no}</span>
                    <span>{formatDate(order.created_at)}</span>
                </div>
                <div className="flex justify-between text-xs mt-1">
                    <span>收銀員: {order.created_by?.username || order.source}</span>
                    <span className="uppercase">{order.payment_method}</span>
                </div>
            </div>

            {/* Items */}
            <div className="mb-2">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-black border-dashed">
                            <th className="py-1">品項</th>
                            <th className="text-center py-1 w-8">數</th>
                            <th className="text-right py-1 w-12">金額</th>
                        </tr>
                    </thead>
                    <tbody>
                        {order.items.map((item, idx) => (
                            <React.Fragment key={idx}>
                                <tr>
                                    <td className="py-1 pt-2 align-top font-bold">
                                        {item.name_snapshot}
                                    </td>
                                    <td className="text-center pt-2 align-top">x{item.quantity}</td>
                                    <td className="text-right pt-2 align-top">{formatCurrency(item.price_snapshot * item.quantity)}</td>
                                </tr>
                                {/* Options */}
                                {item.options && item.options.length > 0 && (
                                    <tr>
                                        <td colSpan={3} className="pb-1 text-xs text-slate-500">
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
                                        <td colSpan={3} className="pb-1 text-xs text-slate-500 italic">
                                            備註: {item.note}
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
                <div className="flex justify-between font-bold text-lg">
                    <span>總計</span>
                    <span>{formatCurrency(order.total_amount)}</span>
                </div>
                {(order.cash_received != null && order.change_amount != null) && (
                    <div className="mt-2 text-xs">
                        <div className="flex justify-between">
                            <span>實收</span>
                            <span>{formatCurrency(order.cash_received)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>找零</span>
                            <span>{formatCurrency(order.change_amount)}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="text-center text-xs mt-6">
                <p>*** 收據 ***</p>
                <p className="mt-1">{order.idempotency_key.slice(0, 8)}</p>
            </div>
        </div>,
        document.body
    );
};
