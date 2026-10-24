'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store/auth-store';
import { orderApi, Order, OrderStatus } from '@/lib/api/orders';
import { Search, Filter, Calendar, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { OrderDetailModal } from '@/components/orders/OrderDetailModal';
import { dateKeyInTimeZone, formatTime } from '@/lib/utils';
import { settingsApi } from '@/lib/api/settings';

export default function OrderListPage() {
    const { selectedStoreId: storeId } = useAuthStore();
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [dateFilter, setDateFilter] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState<string>(''); // Order No

    useEffect(() => {
        if (!storeId) return;
        settingsApi.getStoreProfile(storeId).then(profile => setDateFilter(dateKeyInTimeZone(new Date(), profile.timezone)));
    }, [storeId]);

    const loadOrders = async () => {
        if (!storeId) return;
        setIsLoading(true);
        try {
            const response = await orderApi.list(storeId, {
                status: statusFilter || undefined,
                start_date: dateFilter || undefined,
                end_date: dateFilter || undefined, // Simple single day filter for now
                search: searchTerm || undefined
            });
            setOrders(response.data || []);
        } catch (error) {
            console.error('Failed to load orders:', error);
            // Optionally show toast/alert
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadOrders();
        setCurrentPage(1); // Reset to page 1 when filters change
    }, [storeId, statusFilter, dateFilter, searchTerm]); // Reload when filters or search term change

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setCurrentPage(1); // Reset to page 1 on search
        loadOrders();
    };

    const handleStatusChange = async (orderId: number, newStatus: string) => {
        if (!storeId) return;
        try {
            await orderApi.updateStatus(storeId, orderId, newStatus);
            // Reload list or update local state
            setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus, is_voided: newStatus === 'cancelled' } : o));
            if (selectedOrder && selectedOrder.id === orderId) {
                setSelectedOrder({ ...selectedOrder, status: newStatus, is_voided: newStatus === 'cancelled' });
            }
            alert("訂單狀態已更新");
        } catch (error) {
            console.error("Failed to update status:", error);
            alert("更新失敗");
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid':
            case 'completed':
                return 'bg-green-100 text-green-700';
            case 'pending_payment':
                return 'bg-yellow-100 text-yellow-700';
            case 'cancelled':
                return 'bg-red-100 text-red-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    const getStatusLabel = (status: string) => {
        const map: Record<string, string> = {
            'pending_payment': '待付款',
            'paid': '已付款',
            'completed': '已完成',
            'cancelled': '已作廢',
            'voided': '已作廢'
        };
        return map[status] || status;
    };

    const totalPages = Math.ceil(orders.length / ITEMS_PER_PAGE);
    const paginatedOrders = orders.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    if (!storeId) {
        return <div className="p-8 text-center text-gray-500">請先選擇店鋪</div>;
    }

    return (
        <div className="p-6 max-w-[1600px] mx-auto">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">訂單管理</h1>
                    <p className="text-gray-500 text-sm mt-1">查看與管理店鋪的所有訂單記錄</p>
                </div>
            </div>

            {/* Filter Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {/* Search Order No */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="搜尋訂單編號..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none transition-all text-sm"
                        />
                    </div>

                    {/* Date Picker */}
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="date"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none transition-all text-sm appearance-none cursor-pointer"
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none transition-all text-sm appearance-none cursor-pointer"
                        >
                            <option value="">所有狀態</option>
                            <option value="paid">已付款</option>
                            <option value="pending_payment">待付款</option>
                            <option value="completed">已完成</option>
                            <option value="cancelled">已作廢</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Order Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider">
                                <th className="px-6 py-3 font-semibold">單號</th>
                                <th className="px-6 py-3 font-semibold">時間</th>
                                <th className="px-6 py-3 font-semibold text-center">類型</th>
                                <th className="px-6 py-3 font-bold text-gray-900">商品小計</th>
                                <th className="px-6 py-3 font-bold text-gray-900">服務費 (%)</th>
                                <th className="px-6 py-3 font-bold text-gray-900">服務費 ($)</th>
                                <th className="px-6 py-3 font-semibold">應收</th>
                                <th className="px-6 py-3 font-semibold">狀態</th>
                                <th className="px-6 py-3 font-semibold text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                                        載入中...
                                    </td>
                                </tr>
                            ) : orders.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                                        尚無訂單資料
                                    </td>
                                </tr>
                            ) : (
                                paginatedOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            #{order.order_no}
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-500">
                                            {formatTime(order.created_at, order.timezone)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${order.order_type === 'dine_in' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-gray-50 text-gray-500 border border-gray-100'
                                                }`}>
                                                {order.order_type === 'dine_in' ? '內用' : order.order_type === 'take_out' ? '外帶' : '外送'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900 font-bold">
                                            ${order.subtotal || order.total_amount}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 font-bold">
                                            {order.service_fee_rate ? `${order.service_fee_rate}%` : '0%'}
                                        </td>
                                        <td className={`px-6 py-4 text-sm font-mono font-bold ${order.service_fee ? 'text-red-500' : 'text-gray-400'}`}>
                                            {order.service_fee ? `+$${order.service_fee}` : '$0'}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-900">
                                            ${order.total_amount}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status as string)}`}>
                                                {getStatusLabel(order.status as string)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => setSelectedOrder(order)}
                                                className="text-blue-600 hover:text-blue-900 hover:bg-blue-50 p-2 rounded-full transition-colors"
                                                title="查看詳情"
                                            >
                                                <Eye size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Info & Pagination */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-[12px] text-gray-500 font-medium order-2 sm:order-1">
                        顯示第 {orders.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} 至 {Math.min(currentPage * ITEMS_PER_PAGE, orders.length)} 筆，共 {orders.length} 筆
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
                                        (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                                    ) {
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setCurrentPage(pageNum)}
                                                className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${currentPage === pageNum
                                                    ? "bg-[#D4AF37] text-white shadow-md shadow-gold/20"
                                                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                                                    }`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    } else if (
                                        pageNum === currentPage - 2 ||
                                        pageNum === currentPage + 2
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

            {/* Detail Modal */}
            {selectedOrder && (
                <OrderDetailModal
                    isOpen={!!selectedOrder}
                    order={selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                    onStatusChange={handleStatusChange}
                />
            )}
        </div>
    );
}
