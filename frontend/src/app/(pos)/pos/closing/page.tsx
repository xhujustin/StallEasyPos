'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { shiftApi, Shift } from '@/lib/api/shifts';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Coins, Receipt, DollarSign, AlertCircle, Calculator, Equal, Delete } from 'lucide-react';
import { ManagerPinDialog } from '@/components/pos/manager-pin-dialog';
import React from 'react';
import { hardwareApi } from '@/lib/api/hardware';
import { orderApi, Order } from '@/lib/api/orders';
import { toast } from 'sonner';

// Helper to get user role from auth store or cookie
function getUserRole(user: any): string {
    return user?.role || '';
}

export default function ClosingPage() {
    const router = useRouter();
    const { selectedStoreId, user } = useAuthStore();

    const [shift, setShift] = useState<Shift | null>(null);
    const [stats, setStats] = useState<{
        order_count: number;
        total_sales: number;
        total_net_profit: number;
        cash_sales?: number;
        cash_added?: number;
        cash_removed?: number;
    }>({
        order_count: 0,
        total_sales: 0,
        total_net_profit: 0,
        cash_sales: 0,
        cash_added: 0,
        cash_removed: 0
    });

    const [displayValue, setDisplayValue] = useState<string>('');
    const [loading, setLoading] = useState(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [report, setReport] = useState<any>(null);
    const [showManagerPin, setShowManagerPin] = useState(false);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [drawerLoading, setDrawerLoading] = useState(false);

    const userRole = getUserRole(user);

    // Initial Data Fetch
    const fetchShiftData = async () => {
        if (!selectedStoreId) return;
        setLoading(true);
        try {
            const currentShift = await shiftApi.getCurrent(selectedStoreId);
            if (!currentShift) {
                router.replace('/pos/opening');
                return;
            }
            setShift(currentShift);

            // Fetch Stats
            const currentStats = await shiftApi.getStats(currentShift.id);
            setStats(currentStats);

        } catch (error) {
            console.error("Failed to fetch shift data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchShiftData();

        const handleShiftUpdate = () => {
            fetchShiftData();
        };
        window.addEventListener('shift-data-changed', handleShiftUpdate);
        return () => window.removeEventListener('shift-data-changed', handleShiftUpdate);
    }, [selectedStoreId, router]);

    // Check if user needs authorization
    useEffect(() => {
        setIsAuthorized(userRole !== 'staff');
    }, [userRole]);

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

    const handleExactCash = () => {
        setDisplayValue(expectedCash.toString());
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

    const handleCalculate = (): string | null => {
        try {
            if (!/^[0-9+\-*/.\s]+$/.test(displayValue)) return displayValue;
            // eslint-disable-next-line
            const result = new Function('return ' + displayValue)();
            const formatted = String(Math.round(result * 100) / 100);
            setDisplayValue(formatted);
            return formatted;
        } catch (e) {
            setError('計算錯誤');
            return null;
        }
    };

    // Calculate Expected Cash
    const expectedCash = (
        Number(shift?.initial_cash || 0) +
        Number(stats.cash_sales || 0) +
        Number(stats.cash_added || 0) -
        Number(stats.cash_removed || 0)
    );

    const buildShiftPrintPayload = (closedShift: Shift, orders: Order[], actual: number, expected: number) => {
        const validOrders = orders.filter(order =>
            !order.is_voided && (order.status === 'paid' || order.status === 'completed')
        );
        const productSalesMap = new Map<string, { quantity: number; amount: number }>();
        validOrders.forEach(order => {
            order.items.forEach(item => {
                const current = productSalesMap.get(item.name_snapshot) || { quantity: 0, amount: 0 };
                current.quantity += Number(item.quantity || 0);
                current.amount += Number(item.price_snapshot || 0) * Number(item.quantity || 0);
                productSalesMap.set(item.name_snapshot, current);
            });
        });

        return {
            report_type: 'shift',
            shift_id: closedShift.id,
            shift_number: closedShift.shift_number,
            start_time: new Date(closedShift.start_time).toLocaleString('zh-TW', { hour12: false }),
            end_time: new Date(closedShift.end_time || new Date()).toLocaleString('zh-TW', { hour12: false }),
            opened_by: closedShift.opened_by?.username || '',
            closed_by: closedShift.closed_by?.username || user?.username || '',
            order_count: validOrders.length,
            void_count: orders.filter(order => order.is_voided || order.status === 'cancelled').length,
            total_sales: Number(closedShift.total_sales || 0),
            cash_sales: Number(closedShift.cash_sales || 0),
            non_cash_sales: Number(closedShift.total_sales || 0) - Number(closedShift.cash_sales || 0),
            total_cost: Number(closedShift.total_sales || 0) - Number(closedShift.total_net_profit || 0),
            total_net_profit: Number(closedShift.total_net_profit || 0),
            initial_cash: Number(closedShift.initial_cash || 0),
            cash_added: Number(closedShift.cash_added || 0),
            cash_removed: Number(closedShift.cash_removed || 0),
            expected_cash: expected,
            final_cash: actual,
            shortage: actual - expected,
            product_sales: Array.from(productSalesMap.entries())
                .map(([name, sales]) => ({ name, ...sales }))
                .sort((a, b) => b.amount - a.amount),
        };
    };

    const printShiftReport = async (payload: Record<string, unknown>) => {
        if (!selectedStoreId) return;
        await hardwareApi.printShiftReport(selectedStoreId, payload);
    };

    const handleClosing = async () => {
        if (userRole === 'staff' && !isAuthorized) {
            setShowManagerPin(true);
            return;
        }

        if (!shift) return;

        let finalValue = displayValue;
        if (/[\+\-\*\/]/.test(finalValue)) {
            const result = handleCalculate();
            if (result === null) return;
            finalValue = result;
        }

        const actual = parseFloat(finalValue) || 0;
        setLoading(true);
        try {
            const diff = actual - expectedCash;
            const closedShift = await shiftApi.close(shift.id, { final_cash: actual });
            const ordersResponse = await orderApi.list(selectedStoreId!, { shift_id: shift.id });
            const printPayload = buildShiftPrintPayload(closedShift, ordersResponse.data, actual, expectedCash);
            window.dispatchEvent(new Event('shift-data-changed'));

            setReport({
                expected: expectedCash,
                actual: actual,
                excess: diff,
                timestamp: new Date().toLocaleString(),
                printPayload,
            });
            try {
                await printShiftReport(printPayload);
                toast.success('本班明細已送至出單機');
            } catch (printError) {
                console.error('Shift report print failed:', printError);
                toast.error('班結已完成，但明細列印失敗，請檢查出單機連線後重新列印');
            }
        } catch (error) {
            console.error("Failed to close shift:", error);
            alert("結帳失敗，請重試");
        } finally {
            setLoading(false);
        }
    };

    const handleManagerAuthorized = () => {
        setIsAuthorized(true);
        setShowManagerPin(false);
        handleClosing();
    };

    if (loading && !report) {
        return (
            <div className="flex-1 p-6 bg-slate-50 flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
        );
    }

    if (report) {
        return (
            <div className="flex-1 p-6 bg-slate-50 flex flex-col items-center justify-center min-h-[85vh]">
                <Card className="w-full max-w-lg shadow-xl border-slate-200 p-8">
                    <div className="space-y-6 text-center py-4">
                        <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${report.excess === 0 ? 'bg-green-100 text-green-600' : report.excess > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                            <Receipt className="w-8 h-8" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-slate-900">日結完成</h3>
                            <p className="text-slate-500 text-sm mt-1">{report.timestamp}</p>
                        </div>

                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-3">
                            <div className="flex justify-between py-2 border-b border-slate-100">
                                <span className="text-slate-600 font-medium">系統紀錄金額</span>
                                <span className="font-mono font-bold text-lg">${report.expected}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-slate-100">
                                <span className="text-slate-600 font-medium">實點現金金額</span>
                                <span className="font-mono font-bold text-lg">${report.actual}</span>
                            </div>
                            <div className="flex justify-between py-2">
                                <span className="text-slate-600 font-medium">現金短溢</span>
                                <span className={`font-mono font-bold text-lg ${report.excess < 0 ? 'text-red-500' : report.excess > 0 ? 'text-green-600' : 'text-slate-900'}`}>
                                    {report.excess > 0 ? '+' : ''}{report.excess}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4">
                            <Button variant="outline" className="h-12 text-lg" onClick={() => router.replace('/pos/opening')}>返回開班</Button>
                            <Button
                                className="h-12 text-lg bg-[#D4AF37] hover:bg-[#C5A028] text-white"
                                onClick={async () => {
                                    try {
                                        await printShiftReport(report.printPayload);
                                        toast.success('本班明細已送至出單機');
                                    } catch (printError) {
                                        console.error('Shift report reprint failed:', printError);
                                        toast.error('列印失敗，請檢查出單機連線');
                                    }
                                }}
                            >重新列印本班明細</Button>
                        </div>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex-1 p-6 bg-slate-50 flex items-center justify-center min-h-[85vh]">
            <Card className="w-full max-w-5xl shadow-2xl border-slate-200 grid grid-cols-1 md:grid-cols-2 overflow-hidden h-[650px]">
                {/* Left Side: Summary and Authorization */}
                <div className="p-8 flex flex-col bg-white overflow-y-auto">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                            <DollarSign className="w-6 h-6 text-slate-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">班次結算</h1>
                            <p className="text-slate-500 text-sm">Shift Closing Audit</p>
                        </div>
                    </div>

                    <div className="space-y-4 mb-6">
                        {userRole === 'staff' && !isAuthorized && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 text-amber-800">
                                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                                <p className="text-sm font-medium">日結需要主管授權</p>
                            </div>
                        )}

                        <div className="p-5 bg-slate-50 rounded-2xl border-2 border-slate-200 space-y-3">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-slate-600 font-medium">系統應有現金</span>
                                <span className="font-mono text-2xl font-black text-[#D4AF37]">${expectedCash}</span>
                            </div>
                            <div className="grid grid-cols-1 gap-2 text-sm pt-3 border-t border-blue-100/50 text-slate-500">
                                <div className="flex justify-between">
                                    <span>備用金 (Initial)</span>
                                    <span>+${shift?.initial_cash}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>現金營收 (Sales)</span>
                                    <span>+${stats.cash_sales}</span>
                                </div>
                                {Number(stats.cash_added) > 0 && (
                                    <div className="flex justify-between text-green-600">
                                        <span>中途補錢 (In)</span>
                                        <span>+${stats.cash_added}</span>
                                    </div>
                                )}
                                {Number(stats.cash_removed) > 0 && (
                                    <div className="flex justify-between text-red-600">
                                        <span>中途取款 (Out)</span>
                                        <span>-${stats.cash_removed}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="mt-auto space-y-4">
                        <div className="space-y-2">
                            <Label className="text-slate-500 ml-1">實點總額</Label>
                            <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-200">
                                <div className="flex items-center justify-between">
                                    <span className="text-2xl text-slate-400 font-light">$</span>
                                    <div className="text-4xl font-mono font-bold text-[#D4AF37] text-right overflow-hidden">
                                        {displayValue || <span className="text-slate-200">0</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                        {error && <p className="text-red-500 text-sm text-center font-medium animate-pulse">{error}</p>}
                    </div>
                </div>

                {/* Right Side: Calculator */}
                <div className="bg-slate-50 p-6 flex flex-col justify-between border-l border-slate-100">
                    <div className="grid grid-cols-4 gap-3 flex-1 mb-4">
                        <Button variant="outline" className="h-full text-xl font-bold bg-white rounded-xl shadow-sm hover:bg-slate-100" onClick={handleClear}>C</Button>
                        <Button variant="outline" className="h-full text-xl font-bold bg-white rounded-xl shadow-sm hover:bg-slate-100" onClick={() => handleInput('/')}>/</Button>
                        <Button variant="outline" className="h-full text-xl font-bold bg-white rounded-xl shadow-sm hover:bg-slate-100" onClick={() => handleInput('*')}>×</Button>
                        <Button variant="outline" className="h-full text-xl font-bold bg-white rounded-xl shadow-sm hover:bg-slate-100 flex items-center justify-center" onClick={handleBackspace} aria-label="退格">
                            <Delete className="w-9 h-9 text-slate-500" />
                        </Button>

                        <Button variant="outline" className="h-full text-2xl font-black bg-white rounded-xl shadow-sm hover:bg-blue-50" onClick={() => handleInput('7')}>7</Button>
                        <Button variant="outline" className="h-full text-2xl font-black bg-white rounded-xl shadow-sm hover:bg-blue-50" onClick={() => handleInput('8')}>8</Button>
                        <Button variant="outline" className="h-full text-2xl font-black bg-white rounded-xl shadow-sm hover:bg-blue-50" onClick={() => handleInput('9')}>9</Button>
                        <Button variant="outline" className="h-full text-xl font-bold bg-white rounded-xl shadow-sm hover:bg-slate-100" onClick={() => handleInput('-')}>-</Button>

                        <Button variant="outline" className="h-full text-2xl font-black bg-white rounded-xl shadow-sm hover:bg-blue-50" onClick={() => handleInput('4')}>4</Button>
                        <Button variant="outline" className="h-full text-2xl font-black bg-white rounded-xl shadow-sm hover:bg-blue-50" onClick={() => handleInput('5')}>5</Button>
                        <Button variant="outline" className="h-full text-2xl font-black bg-white rounded-xl shadow-sm hover:bg-blue-50" onClick={() => handleInput('6')}>6</Button>
                        <Button variant="outline" className="h-full text-xl font-bold bg-white rounded-xl shadow-sm hover:bg-slate-100" onClick={() => handleInput('+')}>+</Button>

                        <Button variant="outline" className="h-full text-2xl font-black bg-white rounded-xl shadow-sm hover:bg-blue-50" onClick={() => handleInput('1')}>1</Button>
                        <Button variant="outline" className="h-full text-2xl font-black bg-white rounded-xl shadow-sm hover:bg-blue-50" onClick={() => handleInput('2')}>2</Button>
                        <Button variant="outline" className="h-full text-2xl font-black bg-white rounded-xl shadow-sm hover:bg-blue-50" onClick={() => handleInput('3')}>3</Button>
                        <Button variant="secondary" className="h-full row-span-2 text-2xl bg-slate-700 text-white hover:bg-slate-800 rounded-xl shadow-md" onClick={handleCalculate}><Equal className="w-8 h-8" /></Button>

                        <Button
                            variant="outline"
                            className="h-full text-xl font-bold bg-white border-2 border-[#D4AF37] text-[#D4AF37] hover:bg-amber-50 rounded-xl shadow-sm transition-all active:scale-95"
                            onClick={handleExactCash}
                        >
                            剛好
                        </Button>
                        <Button variant="outline" className="h-full text-2xl font-black bg-white rounded-xl shadow-sm hover:bg-blue-50" onClick={() => handleInput('0')}>0</Button>
                        <Button variant="outline" className="h-full text-2xl font-black bg-white rounded-xl shadow-sm hover:bg-blue-50" onClick={() => handleInput('.')}>.</Button>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleOpenDrawer}
                            disabled={drawerLoading}
                            className="h-16 text-base font-bold border-2 border-slate-300 bg-white rounded-2xl"
                        >
                            <Coins className="mr-2 h-5 w-5" /> {drawerLoading ? '開啟中…' : '開啟錢箱'}
                        </Button>
                        <Button
                            onClick={handleClosing}
                            disabled={loading || !displayValue}
                            className="col-span-2 h-16 text-xl font-bold bg-[#D4AF37] hover:bg-[#C5A028] text-white shadow-lg rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                            {loading ? '處理中...' : (userRole === 'staff' && !isAuthorized ? '授權結帳' : '確認結帳 (Close Shift)')}
                        </Button>
                    </div>
                </div>
            </Card>

            <ManagerPinDialog
                open={showManagerPin}
                onSuccess={handleManagerAuthorized}
                onCancel={() => setShowManagerPin(false)}
            />
        </div>
    );
}
