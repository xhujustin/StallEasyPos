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

export interface OrderItemCreate {
    product_id: number;
    quantity: number;
    note?: string;
}

export interface OrderCreate {
    idempotency_key: string;
    items: OrderItemCreate[];
    total_amount: number;
    payment_method?: PaymentMethod;
    source?: OrderSource;
}

export interface Order {
    id: number;
    order_no: number;
    total_amount: number;
    status: string;
    created_at: string;
}

export const orderApi = {
    create: async (data: OrderCreate) => {
        const response = await apiClient.post<ResponseBase<Order>>('/orders', data);
        return response.data;
    }
};
