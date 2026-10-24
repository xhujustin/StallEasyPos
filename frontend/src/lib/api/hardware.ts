import { apiClient, ResponseBase } from './client';
import { getDeviceUUID } from '@/lib/device';
import { Order } from './orders';
import type { HeldOrder } from '@/lib/store/cart-store';
import { formatDateTime } from '@/lib/utils';

export type HeldOrderPrintAction = 'print_receipt' | 'print_number_ticket' | 'print_kitchen' | 'print_label';

export interface DetectedPrinter {
    type: 'usb' | 'network';
    value: string;
    label: string;
}

export const hardwareApi = {
    run: async (storeId: number, action: 'print_receipt' | 'print_kitchen' | 'print_label' | 'print_number_ticket' | 'print_shift_report' | 'open_drawer' | 'test_print' | 'scan_devices', receipt?: Record<string, unknown>, printerId?: string) => {
        const response = await apiClient.post<ResponseBase<string>>(`/hardware/jobs?store_id=${storeId}`, {
            action,
            device_id: getDeviceUUID(),
            printer_id: printerId,
            receipt,
        });
        return response.data;
    },

    openDrawer: (storeId: number) => hardwareApi.run(storeId, 'open_drawer'),
    testPrint: (storeId: number, printerId?: string) => hardwareApi.run(storeId, 'test_print', undefined, printerId),
    scanDevices: async (storeId: number): Promise<DetectedPrinter[]> => {
        const queued = await hardwareApi.run(storeId, 'scan_devices');
        const jobId = queued.data;
        for (let attempt = 0; attempt < 60; attempt += 1) {
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
        shift_number: order.shift_number,
        store_name: storeName,
        created_at: formatDateTime(order.created_at, order.timezone),
        cashier: order.created_by?.nickname || order.created_by?.full_name || order.created_by?.username || '',
        payment_method: order.delivery_platform || order.payment_provider || order.payment_method || '',
        delivery_platform: order.delivery_platform,
        payment_provider: order.payment_provider,
        subtotal: order.subtotal,
        service_fee: order.service_fee,
        tax_rate: order.tax_rate,
        tax_mode: order.tax_mode,
        tax_amount: order.tax_amount,
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
            unit_price: Number(item.price_snapshot),
            options: (item.options || []).map((option: any) =>
                `${option.option_name}${Number(option.price_adjustment || 0) > 0 ? ` (+$${Number(option.price_adjustment)})` : ''}`
            ),
            note: item.note || undefined,
        })),
    }),
    printNumberTicket: (storeId: number, order: Order, storeName = 'StallEasy POS') => hardwareApi.run(storeId, 'print_number_ticket', {
        order_no: String(order.order_no),
        store_name: storeName,
        created_at: formatDateTime(order.created_at, order.timezone),
        total: order.total_amount,
        lines: [],
    }),
    printKitchen: (storeId: number, order: Order, storeName = 'StallEasy POS') => hardwareApi.run(storeId, 'print_kitchen', {
        order_no: String(order.order_no),
        store_name: storeName,
        created_at: formatDateTime(order.created_at, order.timezone),
        total: order.total_amount,
        lines: order.items.map(item => ({
            name: item.name_snapshot,
            quantity: Number(item.quantity),
            amount: Number(item.price_snapshot) * Number(item.quantity),
            unit_price: Number(item.price_snapshot),
            options: (item.options || []).map((option: any) => option.option_name),
            note: item.note || undefined,
        })),
    }),
    printLabels: (storeId: number, order: Order, storeName = 'StallEasy POS') => hardwareApi.run(storeId, 'print_label', {
        order_no: String(order.order_no),
        store_name: storeName,
        created_at: formatDateTime(order.created_at, order.timezone),
        order_type: order.order_type,
        total: order.total_amount,
        lines: order.items.map(item => ({
            name: item.name_snapshot,
            quantity: Number(item.quantity),
            amount: Number(item.price_snapshot) * Number(item.quantity),
            unit_price: Number(item.price_snapshot),
            options: (item.options || []).map((option: any) => option.option_name),
            note: item.note || undefined,
        })),
    }),
    printHeldOrder: (storeId: number, order: HeldOrder, action: HeldOrderPrintAction, storeName = 'StallEasy POS', printerId?: string, timeZone = 'Asia/Taipei') => {
        const lines = order.items.map(item => ({
            name: item.name,
            quantity: Number(item.quantity),
            amount: Number(item.price) * Number(item.quantity),
            unit_price: Number(item.price),
            options: item.selectedOptions.map(option =>
                action === 'print_receipt' && Number(option.priceAdjustment || 0) > 0
                    ? `${option.optionName} (+$${Number(option.priceAdjustment)})`
                    : option.optionName
            ),
            note: item.note || undefined,
        }));
        return hardwareApi.run(storeId, action, {
            order_no: String(order.orderNo ?? '—'),
            store_name: storeName,
            created_at: formatDateTime(order.createdAt, timeZone),
            pickup_at: order.pickupAt ? formatDateTime(order.pickupAt, timeZone) : undefined,
            order_type: 'take_out',
            subtotal: order.total,
            total: order.total,
            lines: action === 'print_number_ticket' ? [] : lines,
        }, printerId);
    },
    printShiftReport: (storeId: number, report: Record<string, unknown>) =>
        hardwareApi.run(storeId, 'print_shift_report', report),
};
