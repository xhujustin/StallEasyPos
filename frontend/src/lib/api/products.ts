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
    image_url?: string;
    description?: string;
    created_at?: string;
    updated_at?: string;
}

export interface ProductCreate {
    name: string;
    price: number;
    category?: string;
    description?: string;
    is_active?: boolean;
    image_url?: string;
}

export interface ProductUpdate {
    name?: string;
    price?: number;
    category?: string;
    description?: string;
    is_active?: boolean;
    image_url?: string;
}

export const productApi = {
    // 取得所有商品
    getAll: async (storeId: number) => {
        const response = await apiClient.get<ResponseBase<Product[]>>('/products', {
            params: { store_id: storeId }
        });
        return response.data.data;
    },

    // 取得單一商品
    getById: async (id: number, storeId: number) => {
        const response = await apiClient.get<ResponseBase<Product>>(`/products/${id}`, {
            params: { store_id: storeId }
        });
        return response.data.data;
    },

    // 建立商品
    createProduct: async (storeId: number, data: ProductCreate): Promise<Product> => {
        const response = await apiClient.post(`/products/?store_id=${storeId}`, data);
        return response.data;
    },

    // 更新商品
    updateProduct: async (productId: number, storeId: number, data: ProductUpdate): Promise<Product> => {
        const response = await apiClient.patch(`/products/${productId}?store_id=${storeId}`, data);
        return response.data;
    },

    // 刪除商品
    deleteProduct: async (productId: number, storeId: number): Promise<void> => {
        await apiClient.delete(`/products/${productId}?store_id=${storeId}`);
    },
};
