'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { shiftApi, Shift } from '@/lib/api/shifts';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft, Loader2, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

// ==================================================================================
// Reusing the components from ReportPreviewModal (adapted for page usage)
// ==================================================================================

interface ReportContentProps {
    shifts: Shift[];
    dateRange: string;
}

// 1. Accountant Style (For Print/PDF)
const AccountantReportContent = ({ shifts, dateRange }: ReportContentProps) => {
    const totalSales = shifts.reduce((sum, shift) => sum + (shift.total_sales || 0), 0);
    const totalNetProfit = shifts.reduce((sum, shift) => sum + (shift.total_net_profit || 0), 0);
    const totalOrderCount = shifts.reduce((sum, shift) => sum + (shift.order_count || 0), 0);
    const maxSales = Math.max(...shifts.map(s => s.total_sales || 0), 1);

    return (
        <div className="p-8 print:p-0 font-serif text-black h-full" id="report-content-accountant">
            {/* Header */}
            <div className="text-center mb-6 border-b-4 border-double border-gray-800 pb-4">
                <h2 className="text-3xl font-bold text-gray-900 tracking-wide uppercase">營業損益結算表</h2>
                <div className="flex justify-between items-end mt-4 text-xs font-mono text-gray-600">
                    <p>REF: {new Date().getTime().toString().slice(-8)}</p>
                    <p className="font-sans font-bold text-sm text-black">期間: {dateRange}</p>
                    <p>列印: {new Date().toLocaleString('zh-TW')}</p>
                </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-4 gap-4 mb-6 border-b border-gray-300 pb-6">
                <div className="p-3 border border-gray-300">
                    <span className="text-[10px] uppercase font-bold text-gray-500 block">總銷售額</span>
                    <span className="text-xl font-bold font-mono">${totalSales.toLocaleString()}</span>
                </div>
                <div className="p-3 border border-gray-300">
                    <span className="text-[10px] uppercase font-bold text-gray-500 block">總淨利</span>
                    <span className={cn("text-xl font-bold font-mono", totalNetProfit >= 0 ? "text-black" : "text-red-700")}>
                        ${totalNetProfit.toLocaleString()}
                    </span>
                </div>
                <div className="p-3 border border-gray-300">
                    <span className="text-[10px] uppercase font-bold text-gray-500 block">總單量</span>
                    <span className="text-xl font-bold font-mono">{totalOrderCount.toLocaleString()}</span>
                </div>
                <div className="p-3 border border-gray-300">
                    <span className="text-[10px] uppercase font-bold text-gray-500 block">客單價</span>
                    <span className="text-xl font-bold font-mono">
                        ${totalOrderCount > 0 ? Math.round(totalSales / totalOrderCount).toLocaleString() : 0}
                    </span>
                </div>
            </div>

            {/* Chart */}
            <div className="mb-6">
                <h3 className="text-xs font-bold uppercase border-b border-gray-800 mb-2 pb-1">營收趨勢分析</h3>
                <div className="flex items-end justify-between h-32 gap-1 border-b border-gray-400 pb-1">
                    {shifts.map((shift) => {
                        const salesHeight = Math.max(((shift.total_sales || 0) / maxSales) * 100, 2);
                        const profitHeight = Math.max(((shift.total_net_profit || 0) / maxSales) * 100, 0);
                        return (
                            <div key={shift.id} className="flex flex-col items-center flex-1 min-w-[10px]">
                                <div className="relative w-full flex items-end justify-center h-full gap-[1px]">
                                    <div className="w-full bg-gray-800 print:bg-black" style={{ height: `${salesHeight}%` }}></div>
                                    <div className="w-full bg-gray-300 print:bg-gray-400" style={{ height: `${profitHeight}%` }}></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Table */}
            <table className="w-full text-[10px] border-collapse">
                <thead className="border-b-2 border-gray-800">
                    <tr>
                        <th className="py-1 text-left whitespace-nowrap">班次</th>
                        <th className="py-1 text-left whitespace-nowrap">開啟 / 結單人員</th>
                        <th className="py-1 text-right whitespace-nowrap">單量</th>
                        <th className="py-1 text-right whitespace-nowrap">營收</th>
                        <th className="py-1 text-right whitespace-nowrap">淨利</th>
                        <th className="py-1 text-right whitespace-nowrap">期初現金</th>
                        <th className="py-1 text-right whitespace-nowrap">期末實收</th>
                        <th className="py-1 text-right whitespace-nowrap">現金差異</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {shifts.map((shift) => {
                        const expected = (shift.initial_cash || 0) + (shift.cash_sales || 0) + (shift.cash_added || 0) - (shift.cash_removed || 0);
                        const diff = (shift.final_cash || 0) - expected;
                        return (
                            <tr key={shift.id}>
                                <td className="py-1 font-mono">#{shift.id}</td>
                                <td className="py-1">
                                    {shift.opened_by?.username} <span className="text-gray-400">/</span> {shift.closed_by?.username || '-'}
                                </td>
                                <td className="py-1 text-right font-mono">{shift.order_count}</td>
                                <td className="py-1 text-right font-mono">${(shift.total_sales || 0).toLocaleString()}</td>
                                <td className="py-1 text-right font-mono">${(shift.total_net_profit || 0).toLocaleString()}</td>
                                <td className="py-1 text-right font-mono">${shift.initial_cash.toLocaleString()}</td>
                                <td className="py-1 text-right font-mono">${(shift.final_cash || 0).toLocaleString()}</td>
                                <td className={cn("py-1 text-right font-mono font-bold", diff >= 0 ? "text-black" : "text-red-700")}>
                                    {diff !== 0 ? (diff > 0 ? '+' : '') + diff.toLocaleString() : '-'}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
                <tfoot className="border-t-2 border-gray-800 font-bold bg-gray-50">
                    <tr>
                        <td colSpan={2} className="py-2 text-right uppercase">Total:</td>
                        <td className="py-2 text-right font-mono">{totalOrderCount}</td>
                        <td className="py-2 text-right font-mono">${totalSales.toLocaleString()}</td>
                        <td className="py-2 text-right font-mono">${totalNetProfit.toLocaleString()}</td>
                        <td className="py-2 text-right font-mono">-</td>
                        <td className="py-2 text-right font-mono">-</td>
                        <td className="py-2 text-right font-mono">-</td>
                    </tr>
                </tfoot>
            </table>

            <div className="mt-8 text-[9px] text-gray-500 text-center uppercase tracking-widest border-t pt-2">
                StallEasy POS System • Financial Report
            </div>
        </div>
    );
};

// 2. Modern Style (For Screen Preview)
const ModernReportContent = ({ shifts, dateRange }: ReportContentProps) => {
    const totalSales = shifts.reduce((sum, shift) => sum + (shift.total_sales || 0), 0);
    const totalNetProfit = shifts.reduce((sum, shift) => sum + (shift.total_net_profit || 0), 0);
    const totalOrderCount = shifts.reduce((sum, shift) => sum + (shift.order_count || 0), 0);
    const maxSales = Math.max(...shifts.map(s => s.total_sales || 0), 1);

    return (
        <div className="p-8 bg-white min-h-screen" id="report-content-modern">
            {/* Header */}
            <div className="text-center mb-8 border-b border-slate-200 pb-6">
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">營運報表總結</h2>
                <div className="flex justify-between items-end mt-4 text-sm text-slate-500">
                    <p className="font-mono">REF: {new Date().getTime().toString().slice(-8)}</p>
                    <p className="font-medium text-slate-700">期間: {dateRange}</p>
                    <p>列印時間: {new Date().toLocaleString('zh-TW')}</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block mb-2">總銷售額</span>
                    <span className="text-3xl font-bold text-slate-900 font-mono">${totalSales.toLocaleString()}</span>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block mb-2">總淨利</span>
                    <span className={cn("text-3xl font-bold font-mono", totalNetProfit >= 0 ? "text-slate-900" : "text-red-500")}>
                        ${totalNetProfit.toLocaleString()}
                    </span>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block mb-2">總單量</span>
                    <span className="text-3xl font-bold text-slate-900 font-mono">{totalOrderCount.toLocaleString()}</span>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block mb-2">平均客單價</span>
                    <span className="text-3xl font-bold text-slate-900 font-mono">
                        ${totalOrderCount > 0 ? Math.round(totalSales / totalOrderCount).toLocaleString() : 0}
                    </span>
                </div>
            </div>

            {/* Chart */}
            <div className="mb-8 p-8 border border-slate-100 rounded-2xl bg-white shadow-sm">
                <h3 className="text-base font-bold text-slate-700 mb-8 flex items-center gap-2">
                    <div className="w-1.5 h-5 bg-[#D4AF37] rounded-full"></div>
                    營收與淨利趨勢
                </h3>
                <div className="flex items-end justify-between h-56 gap-2 px-2 border-b border-slate-100 pb-1">
                    {shifts.map((shift) => {
                        const salesHeight = Math.max(((shift.total_sales || 0) / maxSales) * 100, 2);
                        const profitHeight = Math.max(((shift.total_net_profit || 0) / maxSales) * 100, 0);
                        return (
                            <div key={shift.id} className="flex flex-col items-center flex-1 group min-w-[20px]">
                                <div className="relative w-full flex items-end justify-center h-full gap-1">
                                    <div className="w-3 bg-slate-800 rounded-t-sm opacity-90 transition-opacity hover:opacity-100" style={{ height: `${salesHeight}%` }} title={`Sales: $${shift.total_sales}`}></div>
                                    <div className="w-3 bg-[#D4AF37] rounded-t-sm opacity-90 transition-opacity hover:opacity-100" style={{ height: `${profitHeight}%` }} title={`Profit: $${shift.total_net_profit}`}></div>
                                </div>
                                <span className="text-xs text-slate-400 mt-2 font-mono">#{shift.id}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-left font-bold whitespace-nowrap uppercase tracking-wider">班次</th>
                                <th className="px-6 py-4 text-left font-bold whitespace-nowrap uppercase tracking-wider">開啟人員</th>
                                <th className="px-6 py-4 text-left font-bold whitespace-nowrap uppercase tracking-wider">結單人員</th>
                                <th className="px-6 py-4 text-right font-bold whitespace-nowrap uppercase tracking-wider">單量</th>
                                <th className="px-6 py-4 text-right font-bold whitespace-nowrap uppercase tracking-wider">營收</th>
                                <th className="px-6 py-4 text-right font-bold whitespace-nowrap uppercase tracking-wider">淨利</th>
                                <th className="px-6 py-4 text-right font-bold whitespace-nowrap uppercase tracking-wider">期初現金</th>
                                <th className="px-6 py-4 text-right font-bold whitespace-nowrap uppercase tracking-wider">期末實收</th>
                                <th className="px-6 py-4 text-right font-bold whitespace-nowrap uppercase tracking-wider">差異</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                            {shifts.map((shift) => {
                                const expected = (shift.initial_cash || 0) + (shift.cash_sales || 0) + (shift.cash_added || 0) - (shift.cash_removed || 0);
                                const diff = (shift.final_cash || 0) - expected;
                                return (
                                    <tr key={shift.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-slate-500">#{shift.id}</td>
                                        <td className="px-6 py-4">{shift.opened_by?.username}</td>
                                        <td className="px-6 py-4">{shift.closed_by?.username || '-'}</td>
                                        <td className="px-6 py-4 text-right font-mono">{shift.order_count || 0}</td>
                                        <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">${(shift.total_sales || 0).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-right font-mono text-[#D4AF37] font-bold">${(shift.total_net_profit || 0).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-right font-mono text-slate-400">${shift.initial_cash.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-right font-mono">${(shift.final_cash || 0).toLocaleString()}</td>
                                        <td className={cn("px-6 py-4 text-right font-mono font-bold", diff >= 0 ? "text-slate-900" : "text-red-500")}>
                                            {diff !== 0 ? (diff > 0 ? '+' : '') + diff.toLocaleString() : '-'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-slate-900">
                            <tr>
                                <td colSpan={3} className="px-6 py-4 text-right">總計:</td>
                                <td className="px-6 py-4 text-right font-mono">{totalOrderCount}</td>
                                <td className="px-6 py-4 text-right font-mono">${totalSales.toLocaleString()}</td>
                                <td className="px-6 py-4 text-right font-mono text-[#D4AF37]">${totalNetProfit.toLocaleString()}</td>
                                <td className="px-6 py-4 text-right font-mono">-</td>
                                <td className="px-6 py-4 text-right font-mono">-</td>
                                <td className="px-6 py-4 text-right font-mono">-</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
};

// 3. Main Content Component (Logic)
function ReportPrintContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Get params
    const storeId = searchParams.get('storeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const [shifts, setShifts] = useState<Shift[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!storeId) return;
            try {
                const data = await shiftApi.history(
                    parseInt(storeId),
                    0,
                    1000,
                    startDate || undefined,
                    endDate || undefined
                );
                setShifts(data);
            } catch (error) {
                console.error("Failed to fetch report data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [storeId, startDate, endDate]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-white">
                <Loader2 className="w-10 h-10 animate-spin text-[#D4AF37] mb-4" />
                <p className="text-gray-500">正在生成報表...</p>
            </div>
        );
    }

    if (!shifts.length) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-white">
                <p className="text-gray-500 mb-4">此區間無資料</p>
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    返回上一頁
                </Button>
            </div>
        );
    }

    const dateRangeStr = startDate === endDate ? startDate : `${startDate} ~ ${endDate}`;

    return (
        <div className="min-h-screen bg-gray-50 text-slate-900 pb-20 print:pb-0 print:bg-white">
            {/* Top Toolbar (Hidden on Print) */}
            <header className="sticky top-0 z-50 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between print:hidden shadow-sm">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => router.back()} className="text-slate-600 hover:text-slate-900">
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        返回列表 (Back)
                    </Button>
                    <div className="h-6 w-px bg-gray-200"></div>
                    <h1 className="text-lg font-bold text-slate-900">報表預覽 (Full Page View)</h1>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={handlePrint} className="border-gray-300">
                        <Printer className="w-4 h-4 mr-2" />
                        列印報表
                    </Button>
                    <Button onClick={handlePrint} className="bg-[#D4AF37] hover:bg-[#C5A028] text-white">
                        <Download className="w-4 h-4 mr-2" />
                        匯出 PDF
                    </Button>
                </div>
            </header>

            {/* Screen View (Modern) - Hidden on Print */}
            <div className="max-w-7xl mx-auto mt-8 print:hidden shadow-[0_0_40px_-15px_rgba(0,0,0,0.1)] rounded-3xl overflow-hidden">
                <ModernReportContent shifts={shifts} dateRange={dateRangeStr || ''} />
            </div>

            {/* Print View (Accountant) - Visible ONLY on Print */}
            <div className="hidden print:block print:w-full print:h-full bg-white text-black">
                <AccountantReportContent shifts={shifts} dateRange={dateRangeStr || ''} />
            </div>
        </div>
    );
}

// 4. Page Component with Suspense
export default function ReportPrintPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-screen bg-white">
                <Loader2 className="w-10 h-10 animate-spin text-[#D4AF37] mb-4" />
                <p className="text-gray-500">載入中...</p>
            </div>
        }>
            <ReportPrintContent />
        </Suspense>
    );
}
