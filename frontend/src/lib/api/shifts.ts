import { apiClient, ResponseBase } from './client';
import { User } from './auth';

export enum ShiftStatus {
    OPEN = 'open',
    CLOSED = 'closed'
}

export interface Shift {
    id: number;
    store_id: number;
    start_time: string;
    end_time?: string;
    initial_cash: number;
    final_cash: number | null;
    cash_added: number;
    cash_removed: number;
    total_sales: number;
    cash_sales: number;
    total_net_profit: number;
    order_count: number;
    opened_by_id: number;
    closed_by_id?: number;
    status: ShiftStatus;

    opened_by: {
        id: number;
        username: string;
    };
    closed_by?: {
        id: number;
        username: string;
    };
}

export interface ShiftCreate {
    initial_cash: number;
}

export interface ShiftClose {
    final_cash: number;
}

export const shiftApi = {
    // 取得當前開啟的班次
    getCurrent: async (storeId: number) => {
        const response = await apiClient.get<ResponseBase<Shift | null>>('/shifts/current', {
            params: { store_id: storeId }
        });
        return response.data.data;
    },

    // 開啟新班次
    start: async (storeId: number, data: ShiftCreate) => {
        const response = await apiClient.post<ResponseBase<Shift>>(`/shifts/start?store_id=${storeId}`, data);
        return response.data.data;
    },

    // 關閉班次
    close: async (shiftId: number, data: ShiftClose) => {
        const response = await apiClient.post<ResponseBase<Shift>>(`/shifts/${shiftId}/close`, data);
        return response.data.data;
    },

    // 修改現金 (補錢/取款)
    modifyCash: async (shiftId: number, data: { amount: number; type: 'in' | 'out'; reason?: string }) => {
        const response = await apiClient.post<ResponseBase<Shift>>(`/shifts/${shiftId}/cash`, data);
        return response.data.data;
    },

    // 取得歷史班次
    history: async (storeId: number, skip: number = 0, limit: number = 20, startDate?: string, endDate?: string) => {
        const response = await apiClient.get<ResponseBase<Shift[]>>('/shifts/', {
            params: {
                store_id: storeId,
                skip,
                limit,
                start_date: startDate,
                end_date: endDate
            }
        });
        return response.data.data;
    },

    // 取得班次統計 (預覽)
    getStats: async (shiftId: number) => {
        const response = await apiClient.get<ResponseBase<{
            order_count: number;
            total_sales: number;
            total_net_profit: number;
            cash_sales: number;
        }>>(`/shifts/${shiftId}/stats`);
        return response.data.data;
    }
};
