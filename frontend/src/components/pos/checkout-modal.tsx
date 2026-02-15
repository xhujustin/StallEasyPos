'use client';

import { useCartStore } from '@/lib/store/cart-store';
import { useAuthStore } from '@/lib/store/auth-store';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogOverlay, DialogTitle } from '@/components/ui/dialog';

import { orderApi, OrderCreate, OrderItemCreate, PaymentMethod, OrderSource } from '@/lib/api/orders';
import { Loader2 } from 'lucide-react';

interface CheckoutModalProps {
    open: boolean;
    onClose: () => void;
}


export function CheckoutModal({ open, onClose }: CheckoutModalProps) {
    const { totalAmount, clearCart, items } = useCartStore();
    const { selectedStoreId, user } = useAuthStore();
    const storeId = selectedStoreId || user?.stores?.[0]?.id;

    const total = totalAmount();
    const [cashReceived, setCashReceived] = useState('');
    const [isCompleted, setIsCompleted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [change, setChange] = useState(0);

    // ... (handlers)

    const handleCheckout = async () => {
        if (!storeId) {
            alert("未選擇店鋪，無法結帳");
            return;
        }

        const received = parseInt(cashReceived) || 0;
        if (received >= total) {
            setIsLoading(true);
            try {
                // Prepare payload
                const orderData: OrderCreate = {
                    idempotency_key: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                        return v.toString(16);
                    }),
                    total_amount: total,
                    payment_method: PaymentMethod.CASH,
                    source: OrderSource.POS,
                    cash_received: received,
                    change_amount: received - total,
                    items: items.map(item => ({
                        product_id: item.productId,
                        quantity: item.quantity,
                        note: item.note,
                        options: item.selectedOptions.map(opt => ({
                            attribute_id: opt.attributeId,
                            attribute_name: opt.attributeName,
                            option_id: opt.optionId,
                            option_name: opt.optionName,
                            price_adjustment: opt.priceAdjustment
                        }))
                    }))
                };

                // Remove console log after debugging
                // console.log("Sending Order Payload:", JSON.stringify(orderData, null, 2));

                // Call API
                await orderApi.create(storeId, orderData);

                // Success UI
                setChange(received - total);
                setIsCompleted(true);
                clearCart();
            } catch (error: any) {
                console.error("Checkout failed:", error);
                if (error.response) {
                    console.error("Error Response Data:", error.response.data);
                    console.error("Error Response Status:", error.response.status);
                    alert(`結帳失敗: ${JSON.stringify(error.response.data)}`);
                } else {
                    alert("結帳失敗，請檢查網路或後端狀態");
                }
            } finally {
                setIsLoading(false);
            }
        }
    };
    const handleNumberClick = (num: string) => {
        setCashReceived((prev) => prev + num);
    };

    const handleBackspace = () => {
        setCashReceived((prev) => prev.slice(0, -1));
    };

    const handleClear = () => {
        setCashReceived('');
    };

    const handleExactCash = () => {
        setCashReceived(total.toString());
    };



    const handleClose = () => {
        setCashReceived('');
        setIsCompleted(false);
        setIsLoading(false);
        setChange(0);
        onClose();
    };

    // Keyboard support
    useEffect(() => {
        if (!open || isCompleted || isLoading) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Prevent default for number keys and special keys
            if (/^[0-9]$/.test(e.key) || ['Backspace', 'Delete', 'Enter', 'Escape'].includes(e.key)) {
                e.preventDefault();
            }

            if (/^[0-9]$/.test(e.key)) {
                handleNumberClick(e.key);
            } else if (e.key === 'Backspace' || e.key === 'Delete') {
                handleBackspace();
            } else if (e.key === 'c' || e.key === 'C') {
                handleClear();
            } else if (e.key === 'Enter') {
                const received = parseInt(cashReceived) || 0;
                if (received >= total) {
                    handleCheckout();
                }
            } else if (e.key === 'Escape') {
                handleClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, isCompleted, isLoading, cashReceived, total]);

    if (isCompleted) {
        return (
            <Dialog open={open} onOpenChange={handleClose}>
                <DialogOverlay className="bg-black/80" />
                <DialogContent className="sm:max-w-md bg-white border-0 shadow-2xl">
                    <DialogTitle className="sr-only">交易完成</DialogTitle>
                    <div className="flex flex-col items-center justify-center p-6 space-y-6 text-center">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                            <CheckCircle className="w-12 h-12" />
                        </div>

                        <div className="space-y-1">
                            <h2 className="text-2xl font-bold text-slate-900">交易完成</h2>
                            <p className="text-slate-500">Order created successfully</p>
                        </div>

                        <div className="w-full bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-2">
                            <div className="flex justify-between text-lg">
                                <span className="text-slate-500">找零</span>
                                <span className="font-bold font-mono text-3xl text-slate-900">${change}</span>
                            </div>
                        </div>

                        <Button
                            onClick={handleClose}
                            className="w-full h-14 text-lg bg-[#D4AF37] hover:bg-[#C5A028] text-white"
                        >
                            下一位
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        )
    }

    if (isLoading) {
        return (
            <Dialog open={open} onOpenChange={() => { }}>
                <DialogOverlay className="bg-black/50 backdrop-blur-sm" />
                <DialogContent className="sm:max-w-sm bg-white border-0 shadow-xl flex flex-col items-center justify-center py-12">
                    <DialogTitle className="sr-only">處理中</DialogTitle>
                    <Loader2 className="w-12 h-12 animate-spin text-[#D4AF37] mb-4" />
                    <p className="text-lg font-medium text-slate-700">正在建立訂單...</p>
                </DialogContent>
            </Dialog>
        )
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogOverlay className="bg-black/50 backdrop-blur-sm" />
            <DialogContent className="sm:max-w-[800px] p-0 gap-0 bg-white overflow-hidden flex h-[600px]">
                <DialogTitle className="sr-only">結帳收款</DialogTitle>
                {/* Left: Summary */}
                <div className="w-1/2 bg-slate-50 p-6 border-r border-slate-200 flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-slate-900">結帳金額</h2>
                        <div className="text-3xl font-bold text-[#D4AF37] font-mono">${total}</div>
                    </div>

                    <div className="space-y-4 mb-6">
                        <div className="text-sm font-medium text-slate-500 mb-2">支付方式</div>
                        <div className="grid grid-cols-2 gap-3">
                            <Button variant="default" className="h-12 bg-slate-900 text-white hover:bg-slate-800">現金</Button>
                            <Button variant="outline" className="h-12 border-slate-300 text-slate-400" disabled>LINE Pay</Button>
                        </div>
                    </div>

                    <div className="mt-auto">
                        <div className="bg-white p-4 rounded-lg border border-slate-200 mb-4">
                            <div className="flex justify-between items-center text-sm text-slate-500">
                                <span>應收</span>
                                <span className="font-mono">${total}</span>
                            </div>
                            <div className="flex justify-between items-center text-lg font-bold text-slate-900 mt-1">
                                <span>實收</span>
                                <span className="font-mono text-2xl text-blue-600">
                                    ${cashReceived || '0'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm text-slate-500 mt-2 pt-2 border-t border-slate-100">
                                <span>找零</span>
                                <span className="font-mono text-lg">
                                    ${Math.max(0, (parseInt(cashReceived) || 0) - total)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Keypad */}
                <div className="w-1/2 p-6 bg-white flex flex-col">
                    <div className="flex-1 flex flex-col justify-center pt-8 pb-4">
                        <div className="grid grid-cols-3 gap-3">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                <Button
                                    key={num}
                                    variant="outline"
                                    className="text-3xl font-bold text-slate-700 h-20 hover:bg-slate-50 border-slate-300 transition-all active:scale-95"
                                    onClick={() => handleNumberClick(num.toString())}
                                >
                                    {num}
                                </Button>
                            ))}
                            <Button
                                variant="outline"
                                className="text-2xl font-bold text-red-600 h-20 border-slate-300 hover:bg-red-50 hover:border-red-300 transition-all"
                                onClick={handleClear}
                                title="清除 (C)"
                            >
                                C
                            </Button>
                            <Button
                                variant="outline"
                                className="text-3xl font-bold text-slate-700 h-20 border-slate-300 hover:bg-slate-50 transition-all active:scale-95"
                                onClick={() => handleNumberClick('0')}
                            >
                                0
                            </Button>
                            <Button
                                variant="outline"
                                className="text-2xl font-medium text-slate-600 h-20 border-slate-300 hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-all"
                                onClick={handleBackspace}
                                title="刪除 (Backspace)"
                            >
                                ⌫
                            </Button>
                        </div>

                        {/* Quick Amount Buttons */}
                        <div className="mt-4">
                            <div className="text-xs font-medium text-slate-500 mb-2">快速金額</div>
                            <div className="grid grid-cols-4 gap-2">
                                {[100, 200, 500, 1000].map((amount) => (
                                    <Button
                                        key={amount}
                                        variant="outline"
                                        size="sm"
                                        className="text-sm font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 border-slate-300 transition-all"
                                        onClick={() => setCashReceived(amount.toString())}
                                    >
                                        ${amount}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-4">
                            <Button
                                variant="secondary"
                                className="h-16 text-lg font-bold bg-slate-100 text-slate-900 hover:bg-slate-200 transition-all"
                                onClick={handleExactCash}
                            >
                                剛好
                            </Button>
                            <Button
                                className="h-16 text-xl font-bold bg-[#D4AF37] hover:bg-[#C5A028] text-white shadow-md transition-all active:scale-95"
                                onClick={handleCheckout}
                                disabled={(parseInt(cashReceived) || 0) < total || isLoading}
                            >
                                {isLoading ? '處理中...' : '結帳 (Enter)'}
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
