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
    material_type: 'raw' | 'composite';
    output_quantity: number;
    components: Array<{
        id: number;
        component_material_id: number;
        quantity: number;
        component?: Material;
    }>;
    group_name: string | null;
    is_active: boolean;
    display_order: number;
}

export interface MaterialCreate {
    store_id: number;
    name: string;
    unit: string;
    stock_quantity?: number;
    unit_cost?: number;
    low_stock_threshold?: number | null;
    default_purchase_unit?: string;
    default_conversion_rate?: number;
    default_supplier?: string | null;
    group_name?: string | null;
    initial_purchase_quantity?: number;
    initial_purchase_unit_price?: number;
}

export interface MaterialUpdate {
    name?: string;
    unit?: string;
    stock_quantity?: number;
    unit_cost?: number;
    low_stock_threshold?: number | null;
    group_name?: string | null;
}

export interface InventoryItem {
    id: number;
    material_id: number;
    name: string;
    purchase_unit: string;
    conversion_rate: number;
    supplier: string | null;
    is_active: boolean;
}

export interface MaterialPurchaseCreate {
    inventory_item_id?: number | null;
    purchase_quantity: number;
    purchase_unit: string;
    conversion_rate: number;
    unit_price: number;
    supplier?: string | null;
    note?: string | null;
}

export interface MaterialPurchase extends MaterialPurchaseCreate {
    id: number;
    material_id: number;
    base_quantity: number;
    total_cost: number;
    resulting_average_cost: number;
    purchased_at: string;
}

export interface InventoryTransaction {
    id: number;
    material_id: number;
    transaction_type: 'OPENING_BALANCE' | 'PURCHASE' | 'SALE' | 'WASTE' | 'ADJUSTMENT_IN' | string;
    quantity_change: number;
    balance_before: number;
    balance_after: number;
    unit_cost_snapshot: number;
    total_cost: number;
    purchase_id: number | null;
    reference_type: string | null;
    reference_id: number | null;
    note: string | null;
    created_at: string;
}

export interface MaterialUsageSummary {
    product_count: number;
    direct_product_count: number;
    option_product_count: number;
    composite_count: number;
    direct_products: string[];
    option_products: string[];
    composites: string[];
}

export interface MaterialGroup {
    id: number;
    store_id: number;
    name: string;
    description: string | null;
    display_order: number;
}

// Material API
export const materialApi = {
    getGroups: async (storeId: number): Promise<MaterialGroup[]> => {
        const response = await apiClient.get(`/materials/groups?store_id=${storeId}`);
        return response.data;
    },
    createGroup: async (storeId: number, data: Omit<MaterialGroup, 'id' | 'store_id'>): Promise<MaterialGroup> => {
        const response = await apiClient.post(`/materials/groups?store_id=${storeId}`, data);
        return response.data;
    },
    updateGroup: async (groupId: number, storeId: number, data: Partial<Omit<MaterialGroup, 'id' | 'store_id'>>): Promise<MaterialGroup> => {
        const response = await apiClient.put(`/materials/groups/${groupId}?store_id=${storeId}`, data);
        return response.data;
    },
    deleteGroup: async (groupId: number, storeId: number): Promise<void> => {
        await apiClient.delete(`/materials/groups/${groupId}?store_id=${storeId}`);
    },
    reorderGroups: async (storeId: number, groupIds: number[]): Promise<void> => {
        await apiClient.put(`/materials/groups/reorder?store_id=${storeId}`, { group_ids: groupIds });
    },
    reorderMaterials: async (storeId: number, materialIds: number[]): Promise<void> => {
        await apiClient.put(`/materials/reorder?store_id=${storeId}`, { material_ids: materialIds });
    },
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
    disconnectAndDelete: async (materialId: number, storeId: number): Promise<void> => {
        await apiClient.post(`/materials/${materialId}/disconnect-and-delete?store_id=${storeId}`);
    },
    replaceAndDelete: async (materialId: number, replacementId: number, storeId: number): Promise<void> => {
        await apiClient.post(`/materials/${materialId}/replace-and-delete?store_id=${storeId}&replacement_id=${replacementId}`);
    },
    getInventoryItems: async (materialId: number, storeId: number): Promise<InventoryItem[]> => {
        const response = await apiClient.get(`/materials/${materialId}/inventory-items?store_id=${storeId}`);
        return response.data;
    },
    createInventoryItem: async (
        materialId: number,
        storeId: number,
        data: Omit<InventoryItem, 'id' | 'material_id' | 'is_active'>,
    ): Promise<InventoryItem> => {
        const response = await apiClient.post(`/materials/${materialId}/inventory-items?store_id=${storeId}`, data);
        return response.data;
    },
    receivePurchase: async (materialId: number, storeId: number, data: MaterialPurchaseCreate) => {
        const response = await apiClient.post(`/materials/${materialId}/purchases?store_id=${storeId}`, data);
        return response.data;
    },
    createComposite: async (storeId: number, data: {
        name: string;
        unit: string;
        output_quantity: number;
        components: Array<{ material_id: number; quantity: number }>;
        group_name?: string | null;
    }): Promise<Material> => {
        const response = await apiClient.post(`/materials/composites?store_id=${storeId}`, data);
        return response.data;
    },
    updateComposite: async (materialId: number, storeId: number, data: {
        name: string;
        unit: string;
        output_quantity: number;
        components: Array<{ material_id: number; quantity: number }>;
        group_name?: string | null;
    }): Promise<Material> => {
        const response = await apiClient.put(`/materials/composites/${materialId}?store_id=${storeId}`, data);
        return response.data;
    },
    getPurchases: async (materialId: number, storeId: number): Promise<MaterialPurchase[]> => {
        const response = await apiClient.get(`/materials/${materialId}/purchases?store_id=${storeId}`);
        return response.data;
    },
    getTransactions: async (materialId: number, storeId: number): Promise<InventoryTransaction[]> => {
        const response = await apiClient.get(`/materials/${materialId}/transactions?store_id=${storeId}`);
        return response.data;
    },
    getUsageSummary: async (materialId: number, storeId: number): Promise<MaterialUsageSummary> => {
        const response = await apiClient.get(`/materials/${materialId}/usage?store_id=${storeId}`);
        return response.data;
    },
};
