'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { shiftApi, Shift } from '@/lib/api/shifts';
import { Button } from '@/components/ui/button';
import { RefreshCcw, FileText, ChevronDown, ChevronRight, ArrowUpRight, ArrowDownRight, User, ChevronLeft, Calendar, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReportPreviewModal } from '@/components/reports/ReportPreviewModal'; // Modal is technically unused now

export default function AdminReportsPage() {
    const router = useRouter();
    const { selectedStoreId } = useAuthStore();
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [loading, setLoading] = useState(false);
    const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    // Filters
    const today = new Date().toLocaleDateString('sv').split(' ')[0];
    const [startDate, setStartDate] = useState<string>(today);
    const [endDate, setEndDate] = useState<string>(today);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    const fetchShifts = async () => {
        if (!selectedStoreId) return;
        setLoading(true);
        try {
            const history = await shiftApi.history(
                selectedStoreId,
                0,
                200, // Fetch enough items for filtering
                startDate || undefined,
                endDate || undefined
            );
            setShifts(history);
        } catch (error) {
            console.error("Failed to fetch shift history:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchShifts();
        setCurrentPage(1);
    }, [selectedStoreId, startDate, endDate]);

    const toggleRow = (id: number) => {
        setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const formatCurrency = (amount?: number) => {
        return new Intl.NumberFormat('zh-TW', {
            style: 'currency',
            currency: 'TWD',
            minimumFractionDigits: 0
        }).format(amount || 0);
    };

    const formatDate = (dateStr: string) => {
        try {
            return new Intl.DateTimeFormat('zh-TW', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }).format(new Date(dateStr));
        } catch (e) {
            return dateStr;
        }
    };

    const filteredShifts = shifts.filter(s =>
        searchTerm === '' || s.id.toString().includes(searchTerm)
    );
    const totalPages = Math.ceil(filteredShifts.length / ITEMS_PER_PAGE);
    const paginatedShifts = filteredShifts.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const handleExport = () => {
        if (!selectedStoreId) return;
        const query = new URLSearchParams({
            storeId: selectedStoreId.toString(),
            startDate: startDate,
            endDate: endDate
        }).toString();
        // Use router.push for client-side navigation (avoid full reload/flash)
        router.push(`/admin/reports/print?${query}`);
    };

    return (
        <div className="p-6 max-w-[1600px] mx-auto">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">報表分析 & 班次紀錄</h1>
                    <p className="text-gray-500 text-sm mt-1">查看店鋪歷史班次紀錄與現金變動日誌</p>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={fetchShifts}
                        disabled={loading}
                        className="h-10 border-gray-300 text-gray-700 hover:bg-gray-50 bg-white shadow-sm"
                    >
                        <RefreshCcw className={cn("mr-2 h-4 w-4 text-gray-400", loading && "animate-spin")} />
                        重新整理
                    </Button>
                    <Button
                        className="h-10 bg-[#D4AF37] hover:bg-[#C5A028] text-white shadow-sm font-medium"
                        onClick={handleExport}
                    >
                        <FileText className="mr-2 h-4 w-4" />
                        匯出報表
                    </Button>
                </div>
            </div>

            {/* Modal Removed */}

            {/* Filter Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Search */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">快速搜尋</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="搜尋班次 ID..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none transition-all text-sm"
                            />
                        </div>
                    </div>

                    {/* Start Date */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">開始日期</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none transition-all text-sm appearance-none cursor-pointer"
                            />
                        </div>
                    </div>

                    {/* End Date */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">結束日期</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none transition-all text-sm appearance-none cursor-pointer"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Table Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1100px]">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-[11px] uppercase tracking-wider whitespace-nowrap">
                                <th className="px-4 py-3 font-semibold w-10 text-center"></th>
                                <th className="px-4 py-3 font-semibold">班次資訊 / 狀態</th>
                                <th className="px-4 py-3 font-semibold">開啟 / 人員</th>
                                <th className="px-4 py-3 font-semibold">關閉 / 人員</th>
                                <th className="px-4 py-3 font-semibold text-right">起始現金</th>
                                <th className="px-4 py-3 font-semibold text-right">現金銷售</th>
                                <th className="px-4 py-3 font-semibold text-right">多元支付</th>
                                <th className="px-4 py-3 font-semibold text-right">收支變動</th>
                                <th className="px-4 py-3 font-semibold text-right">結餘現金</th>
                                <th className="px-4 py-3 font-semibold text-right">短溢</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <RefreshCcw className="h-6 w-6 animate-spin text-gray-300" />
                                            <span>載入中...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredShifts.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-6 py-12 text-center text-gray-500 italic">
                                        尚無班次紀錄資料
                                    </td>
                                </tr>
                            ) : (
                                paginatedShifts.map((shift) => {
                                    const transactions = (shift as any).transactions || [];
                                    const hasTransactions = transactions.length > 0;
                                    const isExpanded = expandedRows[shift.id];

                                    const expectedCash = (
                                        Number(shift.initial_cash) +
                                        Number(shift.cash_sales || 0) +
                                        Number(shift.cash_added || 0) -
                                        Number(shift.cash_removed || 0)
                                    );

                                    let diff = null;
                                    if (shift.final_cash !== null && shift.final_cash !== undefined) {
                                        diff = shift.final_cash - expectedCash;
                                    }

                                    return (
                                        <React.Fragment key={shift.id}>
                                            <tr
                                                className={cn(
                                                    "cursor-pointer hover:bg-gray-50 transition-colors",
                                                    isExpanded && "bg-gray-50/80"
                                                )}
                                                onClick={() => toggleRow(shift.id)}
                                            >
                                                <td className="px-4 py-4 text-center">
                                                    {hasTransactions ? (
                                                        isExpanded ? <ChevronDown className="h-4 w-4 text-[#D4AF37] mx-auto" /> : <ChevronRight className="h-4 w-4 text-gray-300 mx-auto" />
                                                    ) : null}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex flex-col gap-1.5">
                                                        <span className={cn(
                                                            "inline-flex items-center w-fit px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                                                            shift.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 border border-gray-200'
                                                        )}>
                                                            {shift.status === 'open' ? '進行中' : '已結班'}
                                                        </span>
                                                        <span className="text-sm font-black text-gray-900 leading-none">
                                                            #{shift.id}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm text-gray-900">{formatDate(shift.start_time)}</span>
                                                        <span className="text-xs text-gray-400">{shift.opened_by?.username}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    {shift.end_time ? (
                                                        <div className="flex flex-col">
                                                            <span className="text-sm text-gray-900">{formatDate(shift.end_time)}</span>
                                                            <span className="text-xs text-gray-400">{shift.closed_by?.username}</span>
                                                        </div>
                                                    ) : <span className="text-gray-300">-</span>}
                                                </td>
                                                <td className="px-4 py-4 text-right font-medium text-gray-600">
                                                    {formatCurrency(shift.initial_cash)}
                                                </td>
                                                <td className="px-4 py-4 text-right font-medium text-gray-900">
                                                    {formatCurrency(shift.cash_sales)}
                                                </td>
                                                <td className="px-4 py-4 text-right font-medium text-blue-600">
                                                    {formatCurrency(shift.total_sales - shift.cash_sales)}
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-green-600 text-xs font-medium">+{formatCurrency(shift.cash_added)}</span>
                                                        <span className="text-red-500 text-xs font-medium">-{formatCurrency(shift.cash_removed)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-right font-bold text-gray-900">
                                                    {shift.final_cash !== null ? formatCurrency(shift.final_cash) : <span className="text-gray-300">-</span>}
                                                </td>
                                                <td className={cn(
                                                    "px-4 py-4 text-right font-bold",
                                                    diff && diff < 0 ? 'text-red-500 focus:bg-red-50' : diff && diff > 0 ? 'text-green-600 focus:bg-green-50' : 'text-gray-400'
                                                )}>
                                                    {diff !== null ? (
                                                        <span>{diff > 0 ? '+' : ''}{formatCurrency(diff)}</span>
                                                    ) : '-'}
                                                </td>
                                            </tr>
                                            {isExpanded && hasTransactions && (
                                                <tr className="bg-gray-50/40">
                                                    <td colSpan={10} className="p-0 border-b border-gray-100">
                                                        <div className="px-12 py-6 bg-white/50 border-t border-gray-100">
                                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                                                <RefreshCcw className="h-3 w-3" />
                                                                中途現金操作日誌 (Cash Management Logs)
                                                            </h4>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                {transactions.map((tx: any) => (
                                                                    <div key={tx.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-white shadow-sm hover:border-gray-300 transition-all">
                                                                        <div className="flex items-center gap-4">
                                                                            <div className={cn(
                                                                                "w-10 h-10 rounded-full flex items-center justify-center",
                                                                                tx.type === 'in' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"
                                                                            )}>
                                                                                {tx.type === 'in' ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                                                                            </div>
                                                                            <div>
                                                                                <div className="text-sm font-bold text-gray-800">
                                                                                    {tx.type === 'in' ? '補進現金' : '取出款項'}
                                                                                    <span className={cn("ml-2 font-black", tx.type === 'in' ? "text-green-600" : "text-red-500")}>
                                                                                        {tx.type === 'in' ? '+' : '-'}{formatCurrency(tx.amount)}
                                                                                    </span>
                                                                                </div>
                                                                                <div className="text-xs text-gray-400 flex items-center gap-2 mt-1">
                                                                                    <span>{formatDate(tx.created_at)}</span>
                                                                                    {tx.reason && <><span className="w-1 h-1 rounded-full bg-gray-200"></span><span className="italic italic-none text-gray-500">"{tx.reason}"</span></>}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <div className="flex flex-col items-end">
                                                                                <span className="text-xs font-bold text-gray-600 flex items-center gap-1.5">
                                                                                    <User className="h-3 w-3 text-gray-400" /> {tx.user?.username}
                                                                                </span>
                                                                                <span className="text-[9px] uppercase tracking-widest text-gray-400 font-bold px-1.5 py-0.5 bg-gray-50 rounded mt-1 border border-gray-100">
                                                                                    {tx.user?.role || 'staff'}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Info & Pagination */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-[12px] text-gray-500 font-medium order-2 sm:order-1">
                        顯示第 {filteredShifts.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} 至 {Math.min(currentPage * ITEMS_PER_PAGE, filteredShifts.length)} 筆，共 {filteredShifts.length} 筆
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center gap-1 order-1 sm:order-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronLeft size={18} />
                            </button>

                            <div className="flex items-center gap-1 mx-2">
                                {[...Array(totalPages)].map((_, i) => {
                                    const pageNum = i + 1;
                                    if (
                                        pageNum === 1 ||
                                        pageNum === totalPages ||
                                        (pageNum >= currentPage - 2 && pageNum <= currentPage + 2)
                                    ) {
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setCurrentPage(pageNum)}
                                                className={cn(
                                                    "w-8 h-8 rounded-lg text-sm font-bold transition-all",
                                                    currentPage === pageNum
                                                        ? "bg-[#D4AF37] text-white shadow-md shadow-[#D4AF37]/20"
                                                        : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                                                )}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    } else if (
                                        pageNum === currentPage - 3 ||
                                        pageNum === currentPage + 3
                                    ) {
                                        return <span key={pageNum} className="text-gray-400 px-1">...</span>;
                                    }
                                    return null;
                                })}
                            </div>

                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
