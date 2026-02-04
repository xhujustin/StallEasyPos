'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Printer, Ban, FileEdit } from 'lucide-react';

// Mock Data
const MOCK_ORDERS = [
    { id: 'ORD-003', time: '12:45', total: 1250, status: 'completed', payment: 'cash', items: 4 },
    { id: 'ORD-002', time: '12:30', total: 85, status: 'voided', payment: 'cash', items: 2 },
    { id: 'ORD-001', time: '11:15', total: 420, status: 'completed', payment: 'linepay', items: 3 },
];

export default function OrdersPage() {
    const [searchTerm, setSearchTerm] = useState('');

    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
        completed: { label: '完成', variant: 'default' }, // changed to 'default' (primary color usually) or 'success' if available
        voided: { label: '作廢', variant: 'destructive' },
        pending: { label: '待付款', variant: 'secondary' },
    };

    return (
        <div className="flex-1 p-6 bg-slate-50 flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-900">今日帳單</h1>
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

            <Card className="flex-1 border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-auto bg-white">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="w-[120px]">單號</TableHead>
                                <TableHead>時間</TableHead>
                                <TableHead>支付</TableHead>
                                <TableHead>金額</TableHead>
                                <TableHead>狀態</TableHead>
                                <TableHead className="text-right">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {MOCK_ORDERS.map((order) => (
                                <TableRow key={order.id} className="hover:bg-slate-50">
                                    <TableCell className="font-medium font-mono">{order.id}</TableCell>
                                    <TableCell className="text-slate-500">{order.time}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="font-normal text-slate-600">
                                            {order.payment === 'cash' ? '現金' : 'LINE Pay'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-bold text-slate-900 font-mono">${order.total}</TableCell>
                                    <TableCell>
                                        <Badge variant={statusMap[order.status].variant}>
                                            {statusMap[order.status].label}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900">
                                                <Printer className="h-4 w-4" />
                                            </Button>
                                            {order.status !== 'voided' && (
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50">
                                                    <Ban className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div>
    );
}
