import { apiClient } from './client';

// Category Types
export interface Category {
    id: number;
    store_id: number;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
    display_order?: number;
}

export interface CategoryCreate {
    name: string;
    description?: string | null;
    display_order?: number;
}

export interface CategoryUpdate {
    name?: string;
    description?: string | null;
    display_order?: number;
}

// Category API
export const categoryApi = {
    // 取得所有分類
    getCategories: async (storeId: number): Promise<Category[]> => {
        const response = await apiClient.get(`/categories/?store_id=${storeId}`);
        return response.data;
    },

    // 取得單一分類
    getCategory: async (categoryId: number, storeId: number): Promise<Category> => {
        const response = await apiClient.get(`/categories/${categoryId}?store_id=${storeId}`);
        return response.data;
    },

    // 建立分類
    createCategory: async (storeId: number, data: CategoryCreate): Promise<Category> => {
        const response = await apiClient.post(`/categories/?store_id=${storeId}`, data);
        return response.data;
    },

    // 更新分類
    updateCategory: async (categoryId: number, storeId: number, data: CategoryUpdate): Promise<Category> => {
        const response = await apiClient.put(`/categories/${categoryId}?store_id=${storeId}`, data);
        return response.data;
    },

    // 刪除分類
    deleteCategory: async (categoryId: number, storeId: number): Promise<void> => {
        await apiClient.delete(`/categories/${categoryId}?store_id=${storeId}`);
    },
};
