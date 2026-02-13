import { apiClient } from './client';

// Material Types
export interface Material {
    id: number;
    store_id: number;
    name: string;
    unit: string;
    stock_quantity: number;
    unit_cost: number;
    low_stock_threshold: number | null;
}

export interface MaterialCreate {
    store_id: number;
    name: string;
    unit: string;
    stock_quantity?: number;
    unit_cost?: number;
    low_stock_threshold?: number | null;
}

export interface MaterialUpdate {
    name?: string;
    unit?: string;
    stock_quantity?: number;
    unit_cost?: number;
    low_stock_threshold?: number | null;
}

// Material API
export const materialApi = {
    // 取得所有耗材
    getMaterials: async (storeId: number): Promise<Material[]> => {
        const response = await apiClient.get(`/materials/?store_id=${storeId}`);
        return response.data;
    },

    // 取得低庫存耗材
    getLowStockMaterials: async (storeId: number): Promise<Material[]> => {
        const response = await apiClient.get(`/materials/low-stock?store_id=${storeId}`);
        return response.data;
    },

    // 取得單一耗材
    getMaterial: async (materialId: number, storeId: number): Promise<Material> => {
        const response = await apiClient.get(`/materials/${materialId}?store_id=${storeId}`);
        return response.data;
    },

    // 建立耗材
    createMaterial: async (storeId: number, data: MaterialCreate): Promise<Material> => {
        const response = await apiClient.post(`/materials/?store_id=${storeId}`, data);
        return response.data;
    },

    // 更新耗材
    updateMaterial: async (materialId: number, storeId: number, data: MaterialUpdate): Promise<Material> => {
        const response = await apiClient.put(`/materials/${materialId}?store_id=${storeId}`, data);
        return response.data;
    },

    // 刪除耗材
    deleteMaterial: async (materialId: number, storeId: number): Promise<void> => {
        await apiClient.delete(`/materials/${materialId}?store_id=${storeId}`);
    },
};
