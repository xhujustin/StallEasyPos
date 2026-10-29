import { apiClient, ResponseBase } from './client';
import { Material } from './materials';

export interface ProductMaterial {
    id: number;
    material_id: number;
    quantity: number;
    material?: Material;
}

export interface ProductMaterialCreate {
    material_id: number;
    quantity: number;
}

export interface OptionMaterial {
    id?: number;
    option_id?: number;
    material_id: number;
    quantity: number;
    material?: Material;
}

export interface ProductAttributeOption {
    id?: number;
    attribute_id?: number;
    name: string;
    price_adjustment: number;
    is_active: boolean;
    display_order: number;
    materials?: OptionMaterial[];
}

export interface ProductAttribute {
    id?: number;
    product_id?: number;
    name: string;
    min_selection: number;
    max_selection: number;
    display_order: number;
    options: ProductAttributeOption[];
}

export interface Product {
    id: number;
    store_id: number;
    display_order: number;
    name: string;
    price: number;
    cost?: number; // 注意: 這個cost欄位通常是手動輸入的,我們可以用它來存儲自動計算的成本,或者作為覆蓋值
    category?: string;
    attributes?: ProductAttribute[];
    is_active: boolean;
    image_url?: string;
    description?: string;
    created_at?: string;
    updated_at?: string;
    materials?: ProductMaterial[];
}

export interface ProductCreate {
    name: string;
    price: number;
    category?: string;
    description?: string;
    is_active?: boolean;
    image_url?: string;
    materials?: ProductMaterialCreate[];
    attributes?: ProductAttribute[];
}

export interface ProductUpdate {
    name?: string;
    price?: number;
    category?: string;
    description?: string;
    is_active?: boolean;
    image_url?: string;
    materials?: ProductMaterialCreate[];
    attributes?: ProductAttribute[];
}

export const productApi = {
    // 取得所有商品
    getAll: async (storeId: number) => {
        const response = await apiClient.get<ResponseBase<Product[]>>('/products/', {
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
        const response = await apiClient.post<ResponseBase<Product>>(`/products/?store_id=${storeId}`, data);
        return response.data.data;
    },

    // 更新商品
    updateProduct: async (productId: number, storeId: number, data: ProductUpdate): Promise<Product> => {
        const response = await apiClient.patch<ResponseBase<Product>>(`/products/${productId}?store_id=${storeId}`, data);
        return response.data.data;
    },

    // 刪除商品
    deleteProduct: async (productId: number, store_id: number): Promise<void> => {
        await apiClient.delete(`/products/${productId}?store_id=${store_id}`);
    },

    reorderProducts: async (storeId: number, productIds: number[]): Promise<void> => {
        await apiClient.put(`/products/reorder?store_id=${storeId}`, {
            product_ids: productIds,
        });
    },

    // 上傳圖片
    uploadImage: async (storeId: number, file: File, oldImageUrl?: string): Promise<string> => {
        const formData = new FormData();
        formData.append('file', file);

        let url = `/products/upload-image?store_id=${storeId}`;
        if (oldImageUrl) {
            url += `&old_url=${encodeURIComponent(oldImageUrl)}`;
        }

        const response = await apiClient.post<ResponseBase<string>>(url, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            }
        });
        return response.data.data;
    },
};
