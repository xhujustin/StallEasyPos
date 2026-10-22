import { apiClient, ResponseBase } from './client';
import type { Store } from '@/lib/store/auth-store';

export const storeApi = {
    list: async () => {
        const response = await apiClient.get<ResponseBase<Store[]>>('/stores/');
        return response.data.data;
    },

    create: async (name: string) => {
        const response = await apiClient.post<ResponseBase<Store>>('/stores/', { name });
        return response.data.data;
    },

    update: async (storeId: number, data: { name?: string }) => {
        const response = await apiClient.patch<ResponseBase<Store>>(`/stores/${storeId}`, data);
        return response.data.data;
    },
};
