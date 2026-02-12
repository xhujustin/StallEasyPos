import { apiClient, ResponseBase } from './client';

export interface Product {
    id: number;
    store_id: number;
    name: string;
    price: number;
    cost?: number;
    category?: string;
    attributes?: Record<string, any>;
    is_active: boolean;
    // 前端擴充欄位
    image?: string;
    description?: string;
}

export const productApi = {
    getAll: async (storeId: number = 1) => {
        const response = await apiClient.get<ResponseBase<Product[]>>('/products', {
            params: { store_id: storeId }
        });
        return response.data.data;
    },

    getById: async (id: number) => {
        const response = await apiClient.get<ResponseBase<Product>>(`/products/${id}`);
        return response.data.data;
    },
};
