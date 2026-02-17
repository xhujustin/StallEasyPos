'use client';

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shift } from '@/lib/api/shifts';
import { FileText, Printer, X, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPortal } from 'react-dom';

interface ReportPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    shifts: Shift[];
    dateRange: string;
}

interface ReportContentProps {
    shifts: Shift[];
    dateRange: string;
}

// ----------------------------------------------------------------------
// 1. Accountant Style (For Print/PDF) - Serif, Formal, Double Borders
// ----------------------------------------------------------------------
const AccountantReportContent = ({ shifts, dateRange }: ReportContentProps) => {
    // Calculate aggregate data
    const totalSales = shifts.reduce((sum, shift) => sum + (shift.total_sales || 0), 0);
    const totalNetProfit = shifts.reduce((sum, shift) => sum + (shift.total_net_profit || 0), 0);
    const totalOrderCount = shifts.reduce((sum, shift) => sum + (shift.order_count || 0), 0);
    // const totalCashOut = shifts.reduce((sum, shift) => sum + (shift.final_cash || 0), 0); // User requested to remove total final cash
    const totalShifts = shifts.length;
    const maxSales = Math.max(...shifts.map(s => s.total_sales || 0), 1);

    return (
        <div className="p-8 print:p-0 font-serif text-black max-w-[210mm] mx-auto print-a4-fixed" id="report-content-accountant">
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 10mm;
                    }
                    body {
                        -webkit-print-color-adjust: exact;
                        width: 210mm !important;
                    }
                    #report-content-accountant {
                        width: 190mm !important; /* 210mm - 2*10mm margins */
                        margin: 0 auto !important;
                        transform: scale(0.95);
                        transform-origin: top center;
                    }
                    .report-section, tr, .grid, .flex {
                        page-break-inside: avoid;
                        break-inside: avoid;
                    }
                    #report-content-accountant {
                        width: 180mm !important;
                        max-width: 180mm !important;
                        padding: 0 !important;
                        margin: 0 auto !important;
                        transform: scale(0.98);
                        transform-origin: top center;
                    }
                    table {
                        width: 100% !important;
                        table-layout: fixed;
                    }
                }
            `}} />
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
            <div className="flex flex-nowrap gap-2 mb-6 border-b border-gray-300 pb-6 overflow-hidden">
                <div className="flex-1 p-2 border border-gray-300 min-w-0">
                    <span className="text-[9px] uppercase font-bold text-gray-500 block truncate">總銷售額 (Revenue)</span>
                    <span className="text-lg font-bold font-mono block truncate">${totalSales.toLocaleString()}</span>
                </div>
                <div className="flex-1 p-2 border border-gray-300 min-w-0">
                    <span className="text-[9px] uppercase font-bold text-gray-500 block truncate">總淨利 (Net Profit)</span>
                    <span className={cn("text-lg font-bold font-mono block truncate", totalNetProfit >= 0 ? "text-black" : "text-red-700")}>
                        ${totalNetProfit.toLocaleString()}
                    </span>
                </div>
                <div className="flex-1 p-2 border border-gray-300 min-w-0">
                    <span className="text-[9px] uppercase font-bold text-gray-500 block truncate">總單量 (Orders)</span>
                    <span className="text-lg font-bold font-mono block truncate">{totalOrderCount.toLocaleString()}</span>
                </div>
                <div className="flex-1 p-2 border border-gray-300 min-w-0">
                    <span className="text-[9px] uppercase font-bold text-gray-500 block truncate">客單價 (AOV)</span>
                    <span className="text-lg font-bold font-mono block truncate">
                        ${totalOrderCount > 0 ? Math.round(totalSales / totalOrderCount).toLocaleString() : 0}
                    </span>
                </div>
            </div>

            {/* Chart (simplified for print contrast) */}
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
                <div className="flex justify-center gap-4 mt-1 text-[10px]">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-black"></span> Revenue</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-gray-400"></span> Profit</span>
                </div>
            </div>

            {/* Table */}
            <table className="w-full text-[10px] border-collapse">
                <thead className="border-b-2 border-gray-800">
                    <tr>
                        <th className="py-1 text-left whitespace-nowrap">班次</th>
                        <th className="py-1 text-left whitespace-nowrap">開啟 / 結單人員</th>
                        <th className="py-1 text-right whitespace-nowrap">單量</th>
                        <th className="py-1 text-right whitespace-nowrap w-[12%]">營收</th>
                        <th className="py-1 text-right whitespace-nowrap w-[12%]">淨利</th>
                        <th className="py-1 text-right whitespace-nowrap w-[12%]">期初</th>
                        <th className="py-1 text-right whitespace-nowrap w-[12%]">實收</th>
                        <th className="py-1 text-right whitespace-nowrap w-[10%]">差異</th>
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

// ----------------------------------------------------------------------
// 2. Modern Style (For Screen Preview) - Sans-serif, Rounded, System UI
// ----------------------------------------------------------------------
const ModernReportContent = ({ shifts, dateRange }: ReportContentProps) => {
    // Calculate aggregate data
    const totalSales = shifts.reduce((sum, shift) => sum + (shift.total_sales || 0), 0);
    const totalNetProfit = shifts.reduce((sum, shift) => sum + (shift.total_net_profit || 0), 0);
    const totalOrderCount = shifts.reduce((sum, shift) => sum + (shift.order_count || 0), 0);
    const maxSales = Math.max(...shifts.map(s => s.total_sales || 0), 1);

    return (
        <div className="p-8" id="report-content-modern">
            {/* Header */}
            <div className="text-center mb-8 border-b border-slate-200 pb-6">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">營運報表總結</h2>
                <div className="flex justify-between items-end mt-4 text-sm text-slate-500">
                    <p className="font-mono">REF: {new Date().getTime().toString().slice(-8)}</p>
                    <p className="font-medium text-slate-700">期間: {dateRange}</p>
                    <p>列印時間: {new Date().toLocaleString('zh-TW')}</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4 mb-8">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block mb-1">總銷售額</span>
                    <span className="text-2xl font-bold text-slate-900 font-mono">${totalSales.toLocaleString()}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block mb-1">總淨利</span>
                    <span className={cn("text-2xl font-bold font-mono", totalNetProfit >= 0 ? "text-slate-900" : "text-red-500")}>
                        ${totalNetProfit.toLocaleString()}
                    </span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block mb-1">總單量</span>
                    <span className="text-2xl font-bold text-slate-900 font-mono">{totalOrderCount.toLocaleString()}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block mb-1">平均客單價</span>
                    <span className="text-2xl font-bold text-slate-900 font-mono">
                        ${totalOrderCount > 0 ? Math.round(totalSales / totalOrderCount).toLocaleString() : 0}
                    </span>
                </div>
            </div>

            {/* Chart */}
            <div className="mb-8 p-6 border border-slate-100 rounded-xl bg-white shadow-sm">
                <h3 className="text-sm font-bold text-slate-700 mb-6 flex items-center gap-2">
                    <div className="w-1 h-4 bg-[#D4AF37] rounded-full"></div>
                    營收與淨利趨勢
                </h3>
                <div className="flex items-end justify-between h-44 gap-2 px-2 border-b border-slate-100 pb-1">
                    {shifts.map((shift) => {
                        const salesHeight = Math.max(((shift.total_sales || 0) / maxSales) * 100, 2);
                        const profitHeight = Math.max(((shift.total_net_profit || 0) / maxSales) * 100, 0);
                        return (
                            <div key={shift.id} className="flex flex-col items-center flex-1 group min-w-[20px]">
                                <div className="relative w-full flex items-end justify-center h-full gap-1">
                                    <div className="w-2 bg-slate-800 rounded-t-sm opacity-90" style={{ height: `${salesHeight}%` }} title={`Sales: $${shift.total_sales}`}></div>
                                    <div className="w-2 bg-[#D4AF37] rounded-t-sm opacity-90" style={{ height: `${profitHeight}%` }} title={`Profit: $${shift.total_net_profit}`}></div>
                                </div>
                                <span className="text-[10px] text-slate-400 mt-2 font-mono">#{shift.id}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                        <tr>
                            {/* Added whitespace-nowrap to prevent header wrapping */}
                            <th className="px-4 py-3 text-left font-bold whitespace-nowrap uppercase tracking-wider">班次</th>
                            <th className="px-4 py-3 text-left font-bold whitespace-nowrap uppercase tracking-wider">開啟人員</th>
                            <th className="px-4 py-3 text-left font-bold whitespace-nowrap uppercase tracking-wider">結單人員</th>
                            <th className="px-4 py-3 text-right font-bold whitespace-nowrap uppercase tracking-wider">單量</th>
                            <th className="px-4 py-3 text-right font-bold whitespace-nowrap uppercase tracking-wider">營收</th>
                            <th className="px-4 py-3 text-right font-bold whitespace-nowrap uppercase tracking-wider">淨利</th>
                            <th className="px-4 py-3 text-right font-bold whitespace-nowrap uppercase tracking-wider">期初現金</th>
                            <th className="px-4 py-3 text-right font-bold whitespace-nowrap uppercase tracking-wider">期末實收</th>
                            <th className="px-4 py-3 text-right font-bold whitespace-nowrap uppercase tracking-wider">差異</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                        {shifts.map((shift) => {
                            const expected = (shift.initial_cash || 0) + (shift.cash_sales || 0) + (shift.cash_added || 0) - (shift.cash_removed || 0);
                            const diff = (shift.final_cash || 0) - expected;
                            return (
                                <tr key={shift.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 font-mono text-slate-500">#{shift.id}</td>
                                    <td className="px-4 py-3">{shift.opened_by?.username}</td>
                                    <td className="px-4 py-3">{shift.closed_by?.username || '-'}</td>
                                    <td className="px-4 py-3 text-right font-mono">{shift.order_count || 0}</td>
                                    <td className="px-4 py-3 text-right font-mono font-medium text-slate-900">${(shift.total_sales || 0).toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right font-mono text-[#D4AF37] font-medium">${(shift.total_net_profit || 0).toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right font-mono text-slate-400">${shift.initial_cash.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right font-mono">${(shift.final_cash || 0).toLocaleString()}</td>
                                    <td className={cn("px-4 py-3 text-right font-mono font-bold", diff >= 0 ? "text-slate-900" : "text-red-500")}>
                                        {diff !== 0 ? (diff > 0 ? '+' : '') + diff.toLocaleString() : '-'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-slate-900">
                        <tr>
                            <td colSpan={3} className="px-4 py-3 text-right">總計:</td>
                            <td className="px-4 py-3 text-right font-mono">{totalOrderCount}</td>
                            <td className="px-4 py-3 text-right font-mono">${totalSales.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right font-mono text-[#D4AF37]">${totalNetProfit.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right font-mono">-</td>
                            <td className="px-4 py-3 text-right font-mono">-</td>
                            <td className="px-4 py-3 text-right font-mono">-</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <div className="mt-8 text-[10px] text-slate-300 text-center uppercase tracking-widest">
                StallEasy POS System • Confidential Report
            </div>
        </div>
    );
};

export function ReportPreviewModal({ isOpen, onClose, shifts, dateRange }: ReportPreviewModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    const handlePrint = () => {
        window.print();
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-7xl w-[90vw] max-h-[90vh] overflow-y-auto p-0 gap-0">
                    <DialogHeader className="p-6 border-b sticky top-0 bg-white z-10">
                        <div className="flex items-center justify-between">
                            <DialogTitle className="flex items-center gap-2 text-xl">
                                <FileText className="h-5 w-5 text-[#D4AF37]" />
                                報表電子預覽 (Unified View)
                            </DialogTitle>
                        </div>
                    </DialogHeader>

                    {/* On-Screen Preview: Uses Modern Style */}
                    <ModernReportContent shifts={shifts} dateRange={dateRange} />

                    <DialogFooter className="p-6 border-t bg-gray-50 sticky bottom-0 z-10">
                        <Button variant="ghost" onClick={onClose} className="mr-auto">
                            <X className="h-4 w-4 mr-2" />
                            關閉
                        </Button>
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={handlePrint}>
                                <Printer className="h-4 w-4 mr-2" />
                                列印報表
                            </Button>
                            <Button className="bg-[#D4AF37] hover:bg-[#C5A028] text-white" onClick={handlePrint}>
                                <Download className="h-4 w-4 mr-2" />
                                匯出 PDF
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Print Portal: Uses Accountant Style (Hidden on screen via CSS media query) */}
            {mounted && isOpen && createPortal(
                <div className="print-only-container bg-white w-full h-full">
                    <AccountantReportContent shifts={shifts} dateRange={dateRange} />
                </div>,
                document.body
            )}
        </>
    );
}
