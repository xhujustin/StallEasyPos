'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Coins, Receipt, DollarSign, AlertCircle } from 'lucide-react';
import { ManagerPinDialog } from '@/components/pos/manager-pin-dialog';

// Helper to get user role from cookie
function getUserRole(): string {
    if (typeof document === 'undefined') return '';
    const cookies = document.cookie.split(';');
    const roleCookie = cookies.find(c => c.trim().startsWith('role='));
    return roleCookie ? roleCookie.split('=')[1] : '';
}

export default function ClosingPage() {
    const [cashActual, setCashActual] = useState('');
    const [loading, setLoading] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [report, setReport] = useState<any>(null);
    const [showManagerPin, setShowManagerPin] = useState(false);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const userRole = getUserRole();

    // Check if user needs authorization
    useEffect(() => {
        if (userRole === 'staff') {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIsAuthorized(false);
        } else {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIsAuthorized(true);
        }
    }, [userRole]);

    // Mock System Totals
    const EXPECTED_CASH = 5250;
    const SALES_TOTAL = 8500;
    const LINEPAY_TOTAL = 3250;

    const handleClosing = () => {
        // If staff, require manager authorization first
        if (userRole === 'staff' && !isAuthorized) {
            setShowManagerPin(true);
            return;
        }

        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            const actual = parseInt(cashActual) || 0;
            const diff = actual - EXPECTED_CASH;
            setReport({
                excess: diff,
                timestamp: new Date().toLocaleString(),
            });
            setLoading(false);
        }, 1000);
    };

    const handleManagerAuthorized = () => {
        setIsAuthorized(true);
        setShowManagerPin(false);
        // Auto-proceed with closing after authorization
        setLoading(true);
        setTimeout(() => {
            const actual = parseInt(cashActual) || 0;
            const diff = actual - EXPECTED_CASH;
            setReport({
                excess: diff,
                timestamp: new Date().toLocaleString(),
            });
            setLoading(false);
        }, 1000);
    };

    return (
        <>
            <div className="flex-1 p-6 bg-slate-50 flex flex-col items-center justify-center">
                <Card className="w-full max-w-lg shadow-lg border-slate-300">
                    <CardHeader className="border-b border-slate-200 bg-slate-50/50 py-4">
                        <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
                            <DollarSign className="w-5 h-5 text-slate-500" />
                            本日結帳
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {!report ? (
                            <>
                                {userRole === 'staff' && !isAuthorized && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                                        <p className="text-sm text-amber-800">
                                            員工日結需要主管授權
                                        </p>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 text-blue-900">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-medium">系統紀錄現金</span>
                                            <span className="font-mono text-xl font-bold">${EXPECTED_CASH}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm opacity-80">
                                            <span>總銷售額</span>
                                            <span>${SALES_TOTAL}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>錢箱實點現金</Label>
                                        <div className="relative">
                                            <Coins className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                                            <Input
                                                type="number"
                                                placeholder="輸入金額"
                                                className="pl-10 h-12 text-lg font-mono"
                                                value={cashActual}
                                                onChange={(e) => setCashActual(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-6 text-center py-4">
                                <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${report.excess === 0 ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                    <Receipt className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900">日結完成</h3>
                                    <p className="text-slate-500 text-sm mt-1">{report.timestamp}</p>
                                </div>

                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                    <div className="flex justify-between py-2 border-b border-slate-200">
                                        <span className="text-slate-600">實收現金</span>
                                        <span className="font-mono font-bold">${cashActual}</span>
                                    </div>
                                    <div className="flex justify-between py-2">
                                        <span className="text-slate-600">現金短溢</span>
                                        <span className={`font-mono font-bold ${report.excess < 0 ? 'text-red-500' : report.excess > 0 ? 'text-green-500' : 'text-slate-900'}`}>
                                            {report.excess > 0 ? '+' : ''}{report.excess}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Button variant="outline" className="flex-1">預覽報表</Button>
                                    <Button className="flex-1 bg-[#D4AF37] hover:bg-[#C5A028] text-white">列印 Z-Report</Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                    {!report && (
                        <CardFooter className="pt-0">
                            <Button
                                className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white"
                                onClick={handleClosing}
                                disabled={!cashActual || loading}
                            >
                                {loading ? '結算中...' : (userRole === 'staff' && !isAuthorized ? '授權日結' : '確認結帳')}
                            </Button>
                        </CardFooter>
                    )}
                </Card>
            </div>

            <ManagerPinDialog
                open={showManagerPin}
                onSuccess={handleManagerAuthorized}
                onCancel={() => setShowManagerPin(false)}
            />
        </>
    );
}
