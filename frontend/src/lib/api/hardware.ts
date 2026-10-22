import { apiClient, ResponseBase } from './client';
import { getDeviceUUID } from '@/lib/device';
import { Order } from './orders';

export interface DetectedPrinter {
    type: 'usb' | 'network';
    value: string;
    label: string;
}

export const hardwareApi = {
    run: async (storeId: number, action: 'print_receipt' | 'print_number_ticket' | 'print_shift_report' | 'open_drawer' | 'test_print' | 'scan_devices', receipt?: Record<string, unknown>) => {
        const response = await apiClient.post<ResponseBase<string>>(`/hardware/jobs?store_id=${storeId}`, {
            action,
            device_id: getDeviceUUID(),
            receipt,
        });
        return response.data;
    },

    openDrawer: (storeId: number) => hardwareApi.run(storeId, 'open_drawer'),
    testPrint: (storeId: number) => hardwareApi.run(storeId, 'test_print'),
    scanDevices: async (storeId: number): Promise<DetectedPrinter[]> => {
        const queued = await hardwareApi.run(storeId, 'scan_devices');
        const jobId = queued.data;
        for (let attempt = 0; attempt < 20; attempt += 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
            const response = await apiClient.get<ResponseBase<{
                status: 'pending' | 'completed' | 'failed';
                devices: DetectedPrinter[];
                error?: string;
            }>>(`/hardware/jobs/${jobId}`);
            if (response.data.data.status === 'completed') return response.data.data.devices;
            if (response.data.data.status === 'failed') throw new Error(response.data.data.error || '裝置掃描失敗');
        }
        throw new Error('裝置掃描逾時');
    },
    printOrder: (storeId: number, order: Order, storeName = 'StallEasy POS') => hardwareApi.run(storeId, 'print_receipt', {
        order_no: String(order.order_no),
        store_name: storeName,
        created_at: new Date(order.created_at).toLocaleString('zh-TW', { hour12: false }),
        cashier: order.created_by?.nickname || order.created_by?.full_name || order.created_by?.username || '',
        payment_method: order.payment_method || '',
        subtotal: order.subtotal,
        service_fee: order.service_fee,
        discount_amount: order.discount_amount,
        discount_note: order.discount_note,
        total: order.total_amount,
        cash_received: order.cash_received,
        change: order.change_amount,
        lines: order.items.map(item => ({
            name: item.name_snapshot,
            quantity: Number(item.quantity),
            // price_snapshot already includes all option adjustments on the backend.
            amount: Number(item.price_snapshot) * Number(item.quantity),
            options: (item.options || []).map((option: any) =>
                `${option.option_name}${Number(option.price_adjustment || 0) > 0 ? ` (+$${Number(option.price_adjustment)})` : ''}`
            ),
            note: item.note || undefined,
        })),
    }),
    printNumberTicket: (storeId: number, order: Order, storeName = 'StallEasy POS') => hardwareApi.run(storeId, 'print_number_ticket', {
        order_no: String(order.order_no),
        store_name: storeName,
        created_at: new Date(order.created_at).toLocaleString('zh-TW', { hour12: false }),
        total: order.total_amount,
        lines: [],
    }),
    printShiftReport: (storeId: number, report: Record<string, unknown>) =>
        hardwareApi.run(storeId, 'print_shift_report', report),
};
