'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { shiftApi } from '@/lib/api/shifts';
import { settingsApi } from '@/lib/api/settings';
import { Calculator, Delete, Equal, Coins, Settings, Power } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { hardwareApi } from '@/lib/api/hardware';
import { toast } from 'sonner';

export default function ShiftOpeningPage() {
    const router = useRouter();
    const { user, selectedStoreId } = useAuthStore();
    const canShutdown = Boolean(
        user?.is_admin || user?.stores?.some(
            (store) => store.id === selectedStoreId && store.user_role === 'owner'
        )
    );
    const [displayValue, setDisplayValue] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [drawerLoading, setDrawerLoading] = useState(false);
    const [shuttingDown, setShuttingDown] = useState(false);
    const [isLocalAccess, setIsLocalAccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const showShutdown = canShutdown && isLocalAccess;

    useEffect(() => {
        const hostname = window.location.hostname.toLowerCase();
        setIsLocalAccess(
            hostname === 'localhost' ||
            hostname === '127.0.0.1' ||
            hostname === '::1' ||
            hostname === '[::1]'
        );
    }, []);

    // Calculator Logic
    const handleInput = (val: string) => {
        setDisplayValue((prev) => prev + val);
        setError(null);
    };

    const handleBackspace = () => {
        setDisplayValue((prev) => prev.slice(0, -1));
        setError(null);
    };

    const handleClear = () => {
        setDisplayValue('');
        setError(null);
    };

    const handleOpenDrawer = async () => {
        if (!selectedStoreId) return;
        try {
            setDrawerLoading(true);
            await hardwareApi.openDrawer(selectedStoreId);
            toast.success('開錢箱指令已送出');
        } catch (error) {
            console.error('Cash drawer command failed:', error);
            toast.error('錢箱開啟失敗，請檢查出單機連線');
        } finally {
            setDrawerLoading(false);
        }
    };

    const handleShutdown = async () => {
        if (!selectedStoreId) return;
        if (!window.confirm('確定要安全關閉 Raspberry Pi 嗎？所有 POS 裝置將中斷連線。')) return;
        try {
            setShuttingDown(true);
            await settingsApi.shutdownHost(selectedStoreId);
            toast.success('已送出安全關機指令，系統將在數秒內關閉');
        } catch (error: any) {
            toast.error(error.response?.data?.detail || '關機失敗，請確認目前帳號權限與主機設定');
            setShuttingDown(false);
        }
    };

    const handleCalculate = (): string | null => {
        try {
            // Safe evaluation for simple math: integers, decimals, +, -, *, /
            // Avoid eval if possible, but for a calculator simple Function is cleaner than a custom parser 
            // providing we validate input.
            if (!/^[0-9+\-*/.\s]+$/.test(displayValue)) {
                return displayValue; // Return original if it doesn't match safe pattern (though validation should prevent this)
            }
            // eslint-disable-next-line
            const result = new Function('return ' + displayValue)();
            const formatted = String(Math.round(result * 100) / 100); // Round to 2 decimals
            setDisplayValue(formatted);
            return formatted;
        } catch (e) {
            setError('計算錯誤');
            return null;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStoreId) return;

        let finalAmount = displayValue;

        // Auto-calculate if expression exists
        if (/[\+\-\*\/]/.test(finalAmount)) {
            const result = handleCalculate();
            if (result === null) return; // Error occurred
            finalAmount = result;
        }

        const cash = parseFloat(finalAmount);
        if (isNaN(cash) || cash < 0) {
            setError('請輸入有效的金額');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            await shiftApi.start(selectedStoreId, { initial_cash: cash });
            window.dispatchEvent(new Event('shift-data-changed'));
            router.push('/pos');
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || '無法開啟班次');
        } finally {
            setIsLoading(false);
        }
    };

    // Keyboard support
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const key = e.key;

            if (/^[0-9+\-*/.]$/.test(key)) {
                e.preventDefault();
                handleInput(key);
            } else if (key === 'Backspace' || key === 'Delete') {
                handleBackspace();
            } else if (key === 'Enter') {
                e.preventDefault();
                if (displayValue && /[\+\-\*\/]/.test(displayValue)) {
                    // If expression, calculate first
                    handleCalculate();
                } else {
                    // If just number, submit
                    handleSubmit(new Event('submit') as any);
                }
            } else if (key === 'Escape') {
                handleClear();
            } else if (key === '=') {
                e.preventDefault();
                handleCalculate();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [displayValue]);

    return (
        <div className="h-full w-full flex items-center justify-center p-6 bg-slate-50 min-h-[85vh]">
            <Card className="w-full max-w-4xl shadow-xl border-slate-200 grid grid-cols-1 md:grid-cols-2 overflow-hidden h-[600px]">
                {/* Left Side: Form & Info */}
                <div className="p-8 flex flex-col justify-between bg-white">
                    <div>
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center">
                                <Calculator className="w-6 h-6 text-[#D4AF37]" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900">開啟新班次</h1>
                                <p className="text-slate-500 text-sm">Shift Opening</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-200">
                                <Label htmlFor="displayCash" className="text-slate-500 mb-2 block">錢箱預備金</Label>
                                <div className="relative">
                                    <span className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400 text-2xl font-light">$</span>
                                    <div className="w-full text-4xl font-mono font-bold text-[#D4AF37] text-right pl-6 h-12 flex items-center justify-end overflow-hidden whitespace-nowrap">
                                        {displayValue || <span className="text-slate-200">0</span>}
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 text-center animate-in fade-in slide-in-from-top-1">
                                    {error}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="text-center text-xs text-slate-400 mt-auto">
                        支援加減乘除運算，確認後請按 Enter 或 開始班次
                    </div>
                </div>

                {/* Right Side: Calculator Numpad */}
                <div className="bg-slate-50 p-6 flex flex-col justify-center border-l border-slate-100">
                    <div className="grid grid-cols-4 gap-3 mb-4 flex-1">
                        {/* Row 1 */}
                        <Button variant="outline" className="h-full text-xl font-medium text-slate-500 bg-white hover:bg-slate-100 border-slate-200 rounded-xl" onClick={handleClear}>C</Button>
                        <Button variant="outline" className="h-full text-xl font-medium text-slate-500 bg-white hover:bg-slate-100 border-slate-200 rounded-xl" onClick={() => handleInput('/')}>/</Button>
                        <Button variant="outline" className="h-full text-xl font-medium text-slate-500 bg-white hover:bg-slate-100 border-slate-200 rounded-xl" onClick={() => handleInput('*')}>×</Button>
                        <Button variant="outline" className="h-full text-xl font-medium text-slate-500 bg-white hover:bg-slate-100 border-slate-200 rounded-xl flex items-center justify-center" onClick={handleBackspace} aria-label="退格">
                            <Delete className="w-9 h-9" />
                        </Button>

                        {/* Row 2 */}
                        <Button variant="outline" className="h-full text-2xl font-bold text-slate-700 bg-white hover:bg-blue-50 hover:text-blue-600 border-slate-200 rounded-xl" onClick={() => handleInput('7')}>7</Button>
                        <Button variant="outline" className="h-full text-2xl font-bold text-slate-700 bg-white hover:bg-blue-50 hover:text-blue-600 border-slate-200 rounded-xl" onClick={() => handleInput('8')}>8</Button>
                        <Button variant="outline" className="h-full text-2xl font-bold text-slate-700 bg-white hover:bg-blue-50 hover:text-blue-600 border-slate-200 rounded-xl" onClick={() => handleInput('9')}>9</Button>
                        <Button variant="outline" className="h-full text-xl font-medium text-slate-500 bg-white hover:bg-slate-100 border-slate-200 rounded-xl" onClick={() => handleInput('-')}>-</Button>

                        {/* Row 3 */}
                        <Button variant="outline" className="h-full text-2xl font-bold text-slate-700 bg-white hover:bg-blue-50 hover:text-blue-600 border-slate-200 rounded-xl" onClick={() => handleInput('4')}>4</Button>
                        <Button variant="outline" className="h-full text-2xl font-bold text-slate-700 bg-white hover:bg-blue-50 hover:text-blue-600 border-slate-200 rounded-xl" onClick={() => handleInput('5')}>5</Button>
                        <Button variant="outline" className="h-full text-2xl font-bold text-slate-700 bg-white hover:bg-blue-50 hover:text-blue-600 border-slate-200 rounded-xl" onClick={() => handleInput('6')}>6</Button>
                        <Button variant="outline" className="h-full text-xl font-medium text-slate-500 bg-white hover:bg-slate-100 border-slate-200 rounded-xl" onClick={() => handleInput('+')}>+</Button>

                        {/* Row 4 */}
                        <Button variant="outline" className="h-full text-2xl font-bold text-slate-700 bg-white hover:bg-blue-50 hover:text-blue-600 border-slate-200 rounded-xl" onClick={() => handleInput('1')}>1</Button>
                        <Button variant="outline" className="h-full text-2xl font-bold text-slate-700 bg-white hover:bg-blue-50 hover:text-blue-600 border-slate-200 rounded-xl" onClick={() => handleInput('2')}>2</Button>
                        <Button variant="outline" className="h-full text-2xl font-bold text-slate-700 bg-white hover:bg-blue-50 hover:text-blue-600 border-slate-200 rounded-xl" onClick={() => handleInput('3')}>3</Button>
                        <Button variant="secondary" className="h-full row-span-2 text-xl font-bold text-white bg-slate-700 hover:bg-slate-800 border-slate-200 rounded-xl" onClick={handleCalculate}><Equal /></Button>

                        {/* Row 5 */}
                        <Button
                            variant="outline"
                            className="h-full text-2xl font-bold bg-white rounded-xl border-slate-200 hover:bg-blue-50 text-slate-700"
                            onClick={() => handleInput('00')}
                        >
                            00
                        </Button>
                        <Button variant="outline" className="h-full text-2xl font-bold text-slate-700 bg-white hover:bg-blue-50 hover:text-blue-600 border-slate-200 rounded-xl" onClick={() => handleInput('0')}>0</Button>
                        <Button variant="outline" className="h-full text-2xl font-bold text-slate-700 bg-white hover:bg-blue-50 hover:text-blue-600 border-slate-200 rounded-xl" onClick={() => handleInput('.')}>.</Button>
                    </div>

                    <div className={`grid gap-3 ${showShutdown ? 'grid-cols-3' : 'grid-cols-2'}`}>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.push('/pos/settings')}
                            className="h-16 text-base font-bold border-2 border-slate-300 bg-white rounded-xl"
                        >
                            <Settings className="mr-2 h-5 w-5" /> 設備設定
                        </Button>
                        {showShutdown && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleShutdown}
                                disabled={shuttingDown}
                                className="h-16 text-base font-bold border-2 border-red-200 bg-white text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl"
                            >
                                <Power className="mr-2 h-5 w-5" /> {shuttingDown ? '關機中…' : '安全關機'}
                            </Button>
                        )}
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleOpenDrawer}
                            disabled={drawerLoading}
                            className="h-16 text-base font-bold border-2 border-slate-300 bg-white rounded-xl"
                        >
                            <Coins className="mr-2 h-5 w-5" /> {drawerLoading ? '開啟中…' : '開啟錢箱'}
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={isLoading || !displayValue}
                            className="col-span-full h-16 text-xl font-bold bg-[#D4AF37] hover:bg-[#C5A028] text-white shadow-md rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <span className="animate-spin">⟳</span> 處理中...
                                </span>
                            ) : '開始班次 (Start)'}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
