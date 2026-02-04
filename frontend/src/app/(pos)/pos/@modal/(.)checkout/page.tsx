'use client';

import { useRouter } from 'next/navigation';
import { useCartStore } from '@/lib/store/cart-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
import { X, Printer, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogOverlay } from '@/components/ui/dialog';

export default function CheckoutPage() {
    const router = useRouter();
    const { totalAmount, clearCart, items } = useCartStore();
    const total = totalAmount();
    const [cashReceived, setCashReceived] = useState('');
    const [isCompleted, setIsCompleted] = useState(false);
    const [change, setChange] = useState(0);

    // If cart is empty, redirect back to POS
    useEffect(() => {
        if (items.length === 0 && !isCompleted) {
            // router.back(); // Optional: redirect if empty
        }
    }, [items, isCompleted, router]);

    const handleNumberClick = (num: string) => {
        setCashReceived((prev) => prev + num);
    };

    const handleBackspace = () => {
        setCashReceived((prev) => prev.slice(0, -1));
    };

    const handleExactCash = () => {
        setCashReceived(total.toString());
    };

    const handleCheckout = () => {
        const received = parseInt(cashReceived) || 0;
        if (received >= total) {
            setChange(received - total);
            setIsCompleted(true);
            // Here we would call the API to create order
            clearCart();
        }
    };

    const handleClose = () => {
        router.back();
    };

    if (isCompleted) {
        return (
            <Dialog open={true} onOpenChange={handleClose}>
                <DialogOverlay className="bg-black/80" />
                <DialogContent className="sm:max-w-md bg-white border-0 shadow-2xl">
                    <div className="flex flex-col items-center justify-center p-6 space-y-6 text-center">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                            <CheckCircle className="w-12 h-12" />
                        </div>

                        <div className="space-y-1">
                            <h2 className="text-2xl font-bold text-slate-900">交易完成</h2>
                            <p className="text-slate-500">Receipt printed successfully</p>
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

    return (
        <Dialog open={true} onOpenChange={handleClose}>
            <DialogOverlay className="bg-black/50 backdrop-blur-sm" />
            <DialogContent className="sm:max-w-[800px] p-0 gap-0 bg-white overflow-hidden flex h-[600px]">
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
                <div className="w-1/2 p-4 bg-white">
                    <div className="grid grid-cols-3 gap-2 h-full">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                            <Button
                                key={num}
                                variant="outline"
                                className="text-2xl font-bold text-slate-700 h-auto hover:bg-slate-50"
                                onClick={() => handleNumberClick(num.toString())}
                            >
                                {num}
                            </Button>
                        ))}
                        <Button variant="outline" className="text-xl font-medium text-slate-600 h-auto" onClick={handleBackspace}>⌫</Button>
                        <Button variant="outline" className="text-2xl font-bold text-slate-700 h-auto" onClick={() => handleNumberClick('0')}>0</Button>
                        <Button variant="outline" className="text-xl font-medium text-slate-600 h-auto" onClick={() => handleNumberClick('00')}>00</Button>

                        <div className="col-span-3 grid grid-cols-2 gap-2 mt-2 h-20">
                            <Button
                                variant="secondary"
                                className="h-full text-lg font-bold bg-slate-100 text-slate-900 hover:bg-slate-200"
                                onClick={handleExactCash}
                            >
                                剛好
                            </Button>
                            <Button
                                className="h-full text-xl font-bold bg-[#D4AF37] hover:bg-[#C5A028] text-white"
                                onClick={handleCheckout}
                                disabled={(parseInt(cashReceived) || 0) < total}
                            >
                                結帳
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
