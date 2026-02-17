import React from 'react';
import { X, Receipt, Ban, CheckCircle } from 'lucide-react';
import { Order, OrderItemOption } from '@/lib/api/orders';

interface OrderDetailModalProps {
    isOpen: boolean;
    order: Order | null;
    onClose: () => void;
    onStatusChange: (orderId: number, status: string) => void;
}

export function OrderDetailModal({ isOpen, order, onClose, onStatusChange }: OrderDetailModalProps) {
    if (!isOpen || !order) return null;

    const isVoided = order.status === 'cancelled' || order.status === 'voided';
    const isPaid = order.status === 'paid' || order.status === 'completed';

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0 }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('zh-TW');
    };

    // Helper to render options safely
    const renderOptions = (options: any[]) => {
        if (!options || options.length === 0) return null;
        return (
            <div className="text-xs text-gray-500 mt-1">
                {options.map((opt: any, idx: number) => (
                    <span key={idx} className="mr-2">
                        {opt.option_name}
                        {opt.price_adjustment > 0 && ` (+${opt.price_adjustment})`}
                    </span>
                ))}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-lg">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-full">
                            <Receipt className="text-blue-600" size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-800">訂單號碼: #{order.order_no}</h2>
                            <p className="text-sm text-gray-500">{formatDate(order.created_at)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Order Type & Source in Header */}
                        <div className="text-sm text-right flex flex-col items-end gap-1">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${order.order_type === 'dine_in'
                                ? 'bg-blue-50 text-blue-600 border-blue-200'
                                : 'bg-gray-100 text-gray-500 border-gray-200'
                                }`}>
                                {order.order_type === 'dine_in' ? '內用' : order.order_type === 'take_out' ? '外帶' : '外送'}
                            </span>
                            <div className="text-gray-400 text-[10px] uppercase">
                                {order.created_by?.username || order.source}
                            </div>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 rounded-full p-1 hover:bg-gray-100">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1">
                    {/* Status Banner */}
                    <div className={`mb-6 p-3 rounded-md flex items-center gap-2 ${isVoided ? 'bg-red-50 text-red-700 border border-red-100' :
                        isPaid ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-yellow-50 text-yellow-700 border border-yellow-100'
                        }`}>
                        {isVoided ? <Ban size={18} /> : <CheckCircle size={18} />}
                        <span className="font-medium">
                            訂單狀態: {
                                order.status === 'pending_payment' ? '待付款' :
                                    order.status === 'paid' ? '已付款' :
                                        order.status === 'completed' ? '已完成' :
                                            order.status === 'cancelled' ? '已作廢' :
                                                order.status
                            }
                        </span>
                        {order.is_voided && order.voided_at && (
                            <span className="text-xs ml-auto">作廢時間: {formatDate(order.voided_at)}</span>
                        )}
                    </div>

                    {/* Order Items */}
                    <div className="border rounded-lg overflow-hidden mb-6">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                                <tr>
                                    <th className="px-4 py-2">商品</th>
                                    <th className="px-4 py-2 text-right">單價</th>
                                    <th className="px-4 py-2 text-center">數量</th>
                                    <th className="px-4 py-2 text-right">小計</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {order.items.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50/50">
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-gray-800">{item.name_snapshot}</div>
                                            {renderOptions(item.options as any[])}
                                            {item.note && <div className="text-xs text-amber-600 mt-1">備註: {item.note}</div>}
                                        </td>
                                        <td className="px-4 py-3 text-right">{formatCurrency(item.price_snapshot)}</td>
                                        <td className="px-4 py-3 text-center">{item.quantity}</td>
                                        <td className="px-4 py-3 text-right font-medium">
                                            {formatCurrency(item.price_snapshot * item.quantity)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-gray-50 border-t border-gray-200">
                                <tr>
                                    <td colSpan={2} className="px-4 py-2 text-left text-xs text-gray-500 align-middle">
                                        支付方式: <span className="uppercase font-bold text-gray-700 ml-1">{order.payment_method === 'cash' ? '現金' : order.payment_method || '-'}</span>
                                    </td>
                                    <td className="px-4 py-2 text-right text-sm font-bold text-gray-700 align-middle border-l border-gray-100">商品小計</td>
                                    <td className="px-4 py-2 text-right font-bold text-gray-900 align-middle">
                                        {formatCurrency(order.subtotal || order.total_amount)}
                                    </td>
                                </tr>
                                <tr>
                                    <td colSpan={2} className="px-4 py-1"></td>
                                    <td className="px-4 py-1 text-right text-xs font-bold text-slate-500 align-middle border-l border-gray-100">
                                        服務費 ({order.service_fee_rate || 0}%)
                                    </td>
                                    <td className={`px-4 py-1 text-right text-sm font-bold align-middle ${order.service_fee > 0 ? 'text-red-500' : 'text-slate-500'}`}>
                                        {order.service_fee > 0 ? '+' : ''}{formatCurrency(order.service_fee || 0)}
                                    </td>
                                </tr>
                                <tr className="border-t border-gray-200/50">
                                    <td colSpan={2}></td>
                                    <td className="px-4 py-3 text-right font-bold text-gray-800 align-middle border-l border-gray-100">應收金額</td>
                                    <td className="px-4 py-3 text-right font-black text-blue-600 text-xl align-middle">
                                        {formatCurrency(order.total_amount)}
                                    </td>
                                </tr>
                                {(order.cash_received != null && order.change_amount != null) && (
                                    <>
                                        <tr>
                                            <td colSpan={2} className="border-t border-gray-200/50"></td>
                                            <td className="px-4 pt-2 pb-0 text-right font-bold text-gray-800 align-middle border-t border-gray-200/50">實收</td>
                                            <td className="px-4 pt-2 pb-0 text-right font-bold text-blue-600 text-lg align-middle border-t border-gray-200/50">
                                                {formatCurrency(order.cash_received)}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td colSpan={2}></td>
                                            <td className="px-4 pt-0 pb-2 text-right font-bold text-gray-800 align-middle">找零</td>
                                            <td className="px-4 pt-0 pb-2 text-right font-bold text-blue-600 text-lg align-middle">
                                                {formatCurrency(order.change_amount)}
                                            </td>
                                        </tr>
                                    </>
                                )}
                            </tfoot>
                        </table>
                    </div>

                    {/* Additional Info Placeholders */}
                    <div className="grid grid-cols-3 gap-4 text-sm bg-gray-50 rounded border border-gray-100 p-3">
                        <div>
                            <span className="text-gray-500 block mb-1 text-xs">發票載具</span>
                            <span className="font-medium text-gray-400 italic">尚未串接</span>
                        </div>
                        <div>
                            <span className="text-gray-500 block mb-1 text-xs">統一編號</span>
                            <span className="font-medium text-gray-400 italic">未使用</span>
                        </div>
                        <div>
                            <span className="text-gray-500 block mb-1 text-xs">會員資訊</span>
                            <span className="font-medium text-gray-400 italic">非會員</span>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-lg flex justify-between">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium"
                    >
                        關閉
                    </button>
                    {!isVoided && (
                        <button
                            onClick={() => {
                                if (window.confirm('確定要作廢此訂單嗎？此操作無法復原。')) {
                                    onStatusChange(order.id, 'cancelled');
                                }
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded font-medium transition-colors"
                        >
                            <Ban size={16} />
                            作廢訂單
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
