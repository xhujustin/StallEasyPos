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

export enum OrderType {
    DINE_IN = 'dine_in',
    TAKE_OUT = 'take_out',
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
    order_no?: number;
    items: OrderItemCreate[];
    total_amount: number;
    subtotal: number;
    service_fee: number;
    service_fee_rate: number;
    tax_rate: number;
    tax_mode: 'inclusive' | 'exclusive';
    tax_amount: number;
    order_type: OrderType;
    payment_method?: PaymentMethod;
    delivery_platform?: string;
    payment_provider?: string;
    source?: OrderSource;
    cash_received?: number;
    change_amount?: number;
    discount_amount?: number;
    discount_note?: string;
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
    shift_id?: number;
    shift_number?: number;
    order_no: number;
    status: OrderStatus | string;
    order_type: OrderType | string;
    subtotal: number;
    service_fee: number;
    service_fee_rate: number;
    tax_rate: number;
    tax_mode: 'inclusive' | 'exclusive';
    tax_amount: number;
    total_amount: number;
    payment_method?: PaymentMethod | string;
    delivery_platform?: string;
    payment_provider?: string;
    source: string;
    created_at: string;
    timezone: string;
    business_date: string;
    items: OrderItem[];
    is_voided: boolean;
    voided_at?: string;
    void_reason?: string;
    idempotency_key: string;

    cash_received?: number;
    change_amount?: number;
    discount_amount: number;
    discount_note?: string;
    created_by?: {
        id: number;
        username: string;
        full_name?: string;
        nickname?: string;
    };
    creator_role?: string;
}

export const orderApi = {
    getNextNumber: async (storeId: number) => {
        const response = await apiClient.get<ResponseBase<number>>(`/orders/next-number?store_id=${storeId}`);
        return response.data.data;
    },

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
