import { apiClient, ResponseBase } from './client';

export enum UserRole {
    OWNER = 'owner',
    MANAGER = 'manager',
    STAFF = 'staff',
}

export interface StoreUser {
    id: number;
    username: string;
    role: UserRole;
    is_admin: boolean;
    full_name?: string;
    nickname?: string;
    email?: string;
    phone?: string;
    gender?: string;
    address?: string;
    birthday?: string;
    has_pin: boolean;
    created_at: string;
}

export interface CreateStoreUser {
    username?: string;
    password?: string;
    role: UserRole;
    pin?: string;
    full_name?: string;
    nickname?: string;
    email?: string;
    phone?: string;
    gender?: string;
    address?: string;
    birthday?: string;
}

export interface UpdateStoreUser {
    role?: UserRole;
    pin?: string;
    full_name?: string;
    nickname?: string;
    email?: string;
    phone?: string;
    gender?: string;
    address?: string;
    birthday?: string;
}

export const userApi = {
    // 取得店鋪人員列表
    list: async (storeId: number) => {
        const response = await apiClient.get<ResponseBase<StoreUser[]>>('/users/', {
            params: { store_id: storeId }
        });
        return response.data;
    },

    // 新增人員
    create: async (storeId: number, data: CreateStoreUser) => {
        const response = await apiClient.post<ResponseBase<any>>('/users/', data, {
            params: { store_id: storeId }
        });
        return response.data;
    },

    // 更新人員 (角色、PIN)
    update: async (storeId: number, userId: number, data: UpdateStoreUser) => {
        const response = await apiClient.put<ResponseBase<any>>(`/users/${userId}`, data, {
            params: { store_id: storeId }
        });
        return response.data;
    },

    // 移除人員
    remove: async (storeId: number, userId: number) => {
        const response = await apiClient.delete<ResponseBase<boolean>>(`/users/${userId}`, {
            params: { store_id: storeId }
        });
        return response.data;
    },

    // 取得當前使用者資訊
    me: async () => {
        const response = await apiClient.get<ResponseBase<any>>('/users/me');
        return response.data;
    }
};
