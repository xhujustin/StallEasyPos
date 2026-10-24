'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Printer, Ban, Loader2, RefreshCw } from 'lucide-react';
import { orderApi, Order, OrderStatus } from '@/lib/api/orders';
import { useAuthStore } from '@/lib/store/auth-store';
import { toast } from 'sonner';
import { OrderDetailModal } from '@/components/orders/OrderDetailModal';
import { shiftApi } from '@/lib/api/shifts';
import { hardwareApi } from '@/lib/api/hardware';
import { dateKeyInTimeZone, formatTime } from '@/lib/utils';
import { settingsApi } from '@/lib/api/settings';

export default function OrdersPage() {
    const { selectedStoreId: storeId, user } = useAuthStore();
    const [orders, setOrders] = useState<Order[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    const fetchOrders = async () => {
        if (!storeId) return;
        setIsLoading(true);
        try {
            // 1. Get Current Shift first
            let currentShiftId: number | undefined;
            try {
                const shift = await shiftApi.getCurrent(storeId);
                if (shift) {
                    currentShiftId = shift.id;
                }
            } catch (e) {
                console.error("Failed to get current shift", e);
            }

            const profile = await settingsApi.getStoreProfile(storeId);
            const startStr = dateKeyInTimeZone(new Date(), profile.timezone);

            // 2. Fetch Orders
            // If we have a current shift, we PRIORITIZE filtering by it.
            // This solves the "seeing yesterday's orders" issue if the shift spans days or if timezone is weird.
            // Only if no shift is open, we fall back to date filter (or just show empty).
            // User request: "Normal I start new shift I shouldn't see previous shift's orders" -> Implies strict shift isolation.

            const response = await orderApi.list(storeId, {
                search: searchTerm,
                // If searching, ignore other filters? Or combine?
                // If we have a shift, and not searching globally, limit to shift.
                // If user searches "Order #123", they might want to find it even if from yesterday.
                // But "Today's Bills" list should be current shift.

                // Strategy:
                // If searchTerm is present -> Global search (or maybe still shift restricted? Let's allow global for search to be useful)
                // If NO search -> Strict Current Shift filter (if shift exists).

                shift_id: (!searchTerm && currentShiftId) ? currentShiftId : undefined,

                // Fallback to date only if no shift or if specifically requested?
                // Actually, if we pass shift_id, backend filters by it.
                // If we DON'T pass shift_id (e.g. no open shift), we pass today's date.
                start_date: (!searchTerm && !currentShiftId) ? startStr : undefined
            });
            setOrders(response.data);
        } catch (error) {
            console.error(error);
            toast.error("無法載入訂單");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [storeId, searchTerm]);

    const handlePrint = async (order: Order, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!storeId) return;
        try {
            const storeName = user?.stores?.find(store => store.id === storeId)?.name || 'StallEasy POS';
            await hardwareApi.printOrder(storeId, order, storeName);
            toast.success('收據已送至出單機');
        } catch (error) {
            console.error('Receipt print failed:', error);
            toast.error('列印失敗，請檢查出單機連線');
        }
    };

    const handleVoid = async (orderId: number, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevents row click
        console.log("handleVoid Clicked", orderId, storeId);
        if (!confirm('確定要作廢此訂單嗎？')) {
            console.log("Void cancelled by user");
            return;
        }
        if (!storeId) {
            console.error("Store ID missing");
            return;
        }

        try {
            console.log("Sending updateStatus request...");
            await orderApi.updateStatus(storeId, orderId, 'cancelled');
            console.log("updateStatus success");
            setOrders(current => current.map(order =>
                order.id === orderId ? { ...order, status: 'cancelled', is_voided: true } : order
            ));
            toast.success("訂單已作廢");
            await fetchOrders();
        } catch (error) {
            console.error("Void failed", error);
            toast.error("作廢失敗");
        }
    };

    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" }> = {
        completed: { label: '完成', variant: 'success' },
        paid: { label: '已付款', variant: 'success' },
        voided: { label: '已作廢', variant: 'destructive' },
        cancelled: { label: '已作廢', variant: 'destructive' },
        pending_payment: { label: '待付款', variant: 'secondary' },
    };

    const getStatusBadge = (status: string) => {
        const config = statusMap[status.toLowerCase()] || { label: status, variant: 'secondary' };
        // Custom variant handling since badge might not support 'success' directly in shadcn defaults
        return (
            <Badge variant={config.variant as any} className={config.variant === 'success' ? 'bg-green-100 text-green-800 hover:bg-green-200 border-transparent' : ''}>
                {config.label}
            </Badge>
        );
    };

    return (
        <div className="flex-1 p-6 bg-slate-50 flex flex-col gap-6 h-full">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold text-slate-900">本班帳單</h1>
                    <Button variant="ghost" size="icon" onClick={fetchOrders} disabled={isLoading}>
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>

                <div className="flex gap-2 w-full max-w-sm">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="搜尋單號..."
                            className="pl-9 bg-white border-slate-200"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <Card className="flex-1 border-slate-200 shadow-sm overflow-hidden flex flex-col p-0 gap-0">
                <div className="overflow-auto bg-white flex-1 relative w-full p-0 m-0">
                    {isLoading && orders.length === 0 ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
                            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                        </div>
                    ) : null}

                    <Table className="m-0 w-full min-w-full border-collapse">
                        <TableHeader className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 m-0 p-0">
                            <TableRow className="h-10 hover:bg-transparent border-0">
                                <TableHead className="w-[60px] pl-4 h-10 text-slate-900 font-bold align-middle">單號</TableHead>
                                <TableHead className="w-[80px] px-2 h-10 text-slate-900 font-bold align-middle">時間</TableHead>
                                <TableHead className="w-[80px] px-2 h-10 text-slate-900 font-bold align-middle text-center">類型</TableHead>
                                <TableHead className="px-2 h-10 text-slate-900 font-bold align-middle">支付</TableHead>
                                <TableHead className="px-2 h-10 text-slate-900 font-black align-middle">商品小計</TableHead>
                                <TableHead className="px-2 h-10 text-slate-900 font-black align-middle text-red-600">服務費</TableHead>
                                <TableHead className="px-2 h-10 text-slate-900 font-bold align-middle">應收</TableHead>
                                <TableHead className="px-2 h-10 text-slate-900 font-bold align-middle">實收</TableHead>
                                <TableHead className="px-2 h-10 text-slate-900 font-bold align-middle">狀態</TableHead>
                                <TableHead className="text-right pr-4 h-10 text-slate-900 font-bold align-middle">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orders.length === 0 && !isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={10} className="text-center py-12 text-slate-500">
                                        尚無訂單資料
                                    </TableCell>
                                </TableRow>
                            ) : (
                                orders.map((order) => (
                                    <TableRow
                                        key={order.id}
                                        className="hover:bg-slate-50 cursor-pointer h-12 border-b border-slate-100"
                                        onClick={() => {
                                            setSelectedOrder(order);
                                            setIsDetailOpen(true);
                                        }}
                                    >
                                        <TableCell className="font-bold font-mono text-slate-900 text-lg pl-4 py-2">
                                            #{order.order_no}
                                        </TableCell>
                                        <TableCell className="text-slate-600 font-medium px-2 py-2 text-xs">
                                            {formatTime(order.created_at, order.timezone)}
                                        </TableCell>
                                        <td className="px-2 py-2 text-center">
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${order.order_type === 'dine_in' ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-500'
                                                }`}>
                                                {order.order_type === 'dine_in' ? '內用' : order.order_type === 'take_out' ? '外帶' : '外送'}
                                            </span>
                                        </td>
                                        <TableCell className="px-2 py-2">
                                            <Badge variant="outline" className="font-normal text-slate-600 text-[10px] px-1 h-5">
                                                {order.delivery_platform || order.payment_provider || (order.payment_method === 'cash' ? '現金' : order.payment_method || '-')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-bold text-slate-900 font-mono px-2 py-2">
                                            ${order.subtotal || order.total_amount}
                                        </TableCell>
                                        <TableCell className="text-red-400 font-mono text-xs px-2 py-2">
                                            <div className="flex flex-col">
                                                <span className={`${order.service_fee ? 'text-red-600 font-bold' : 'text-slate-400 font-bold'}`}>
                                                    {order.service_fee ? `+$${order.service_fee}` : '$0'}
                                                </span>
                                                <span className="text-[10px] opacity-50">
                                                    ({order.service_fee_rate ? `${order.service_fee_rate}%` : '0%'})
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-bold text-slate-900 font-mono px-2 py-2">
                                            ${order.total_amount}
                                        </TableCell>
                                        <TableCell className="font-bold text-blue-600 font-mono px-2 py-2">
                                            {order.cash_received != null ? `$${order.cash_received}` : '-'}
                                        </TableCell>
                                        <TableCell className="px-2 py-2">
                                            {getStatusBadge(order.status as string)}
                                        </TableCell>
                                        <TableCell className="text-right pr-3 py-2">
                                            <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-slate-500 hover:text-slate-900"
                                                    onClick={(e) => handlePrint(order, e)}
                                                >
                                                    <Printer className="h-4 w-4" />
                                                </Button>
                                                {order.status !== 'cancelled' && order.status !== 'voided' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                        onClick={(e) => handleVoid(order.id, e)}
                                                    >
                                                        <Ban className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            <OrderDetailModal
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                order={selectedOrder}
                onStatusChange={async (id, status) => {
                    if (!storeId) return;
                    try {
                        await orderApi.updateStatus(storeId, id, status);
                        setOrders(current => current.map(order =>
                            order.id === id ? { ...order, status, is_voided: status === 'cancelled' } : order
                        ));
                        await fetchOrders();
                        setIsDetailOpen(false);
                        setSelectedOrder(null);
                        toast.success('訂單已作廢');
                    } catch (error) {
                        console.error('Void failed:', error);
                        toast.error('作廢失敗');
                    }
                }}
            />
        </div>
    );
}
