import { apiClient, ResponseBase } from './client';

export enum PaymentMethod {
    CASH = 'cash',
    LINEPAY = 'linepay',
    PLATFORM_COLLECT = 'platform_collect'
}

export enum OrderSource {
    POS = 'pos',
    DELIVERY = 'delivery'
}

export interface OrderItemOption {
    attribute_id: number;
    attribute_name: string;
    option_id: number;
    option_name: string;
    price_adjustment: number;
}

export interface OrderItemCreate {
    product_id: number;
    quantity: number;
    note?: string;
    options?: OrderItemOption[];
}

export interface OrderCreate {
    idempotency_key: string;
    items: OrderItemCreate[];
    total_amount: number;
    payment_method?: PaymentMethod;
    source?: OrderSource;
    cash_received?: number;
    change_amount?: number;
}

export interface OrderFilter {
    status?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
    shift_id?: number;
}

export interface OrderItem {
    id: number;
    product_id: number;
    name_snapshot: string;
    price_snapshot: number;
    cost_snapshot?: number;
    quantity: number;
    note?: string;
    options?: any[]; // JSONB from backend
}

export enum OrderStatus {
    DRAFT = 'draft',
    PENDING_PAYMENT = 'pending_payment',
    PAID = 'paid',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
    NEEDS_REVIEW = 'needs_review'
}

export interface Order {
    id: number;
    store_id: number;
    order_no: number;
    status: OrderStatus | string;
    total_amount: number;
    payment_method?: PaymentMethod | string;
    source: string;
    created_at: string;
    business_date: string;
    items: OrderItem[];
    is_voided: boolean;
    voided_at?: string;
    idempotency_key: string;

    cash_received?: number;
    change_amount?: number;
    created_by?: {
        id: number;
        username: string;
    };
    creator_role?: string;
}

export const orderApi = {
    create: async (storeId: number, data: OrderCreate) => {
        const response = await apiClient.post<ResponseBase<Order>>(`/orders/?store_id=${storeId}`, data);
        return response.data;
    },

    list: async (storeId: number, filters?: OrderFilter) => {
        const params = new URLSearchParams();
        params.append('store_id', storeId.toString());

        if (filters) {
            if (filters.status) params.append('status', filters.status);
            if (filters.start_date) params.append('start_date', filters.start_date);
            if (filters.end_date) params.append('end_date', filters.end_date);
            if (filters.search) params.append('search', filters.search);
            if (filters.shift_id) params.append('shift_id', filters.shift_id.toString());
        }

        const response = await apiClient.get<ResponseBase<Order[]>>(`/orders/?${params.toString()}`);
        return response.data;
    },

    updateStatus: async (storeId: number, orderId: number, status: string) => {
        const response = await apiClient.put<ResponseBase<Order>>(`/orders/${orderId}/status?store_id=${storeId}&status=${status}`);
        return response.data;
    }
};
