import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Store {
    id: number;
    name: string;
    owner_id: number;
    user_role?: string;  // 使用者在此店鋪的角色 (owner/manager/staff)
    created_at: string;
}

interface User {
    id: number;
    username: string;
    is_active: boolean;
    stores: Store[];
}

interface AuthState {
    token: string | null;
    user: User | null;
    selectedStoreId: number | null;  // 選擇的店鋪ID
    isAuthenticated: boolean;

    // Actions
    setAuth: (token: string, user: User) => void;
    setSelectedStore: (storeId: number) => void;  // 設定選擇的店鋪
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            user: null,
            selectedStoreId: null,  // 初始值
            isAuthenticated: false,

            setAuth: (token, user) => set({
                token,
                user,
                isAuthenticated: true
            }),

            setSelectedStore: (storeId) => set({
                selectedStoreId: storeId
            }),

            refreshShift: () => {
                window.dispatchEvent(new Event('shift-data-changed'));
            },

            logout: () => set({
                token: null,
                user: null,
                selectedStoreId: null,  // 登出時清除選擇的店鋪
                isAuthenticated: false
            }),
        }),
        {
            name: 'auth-storage', // key in localStorage
            storage: createJSONStorage(() => localStorage),
        }
    )
);
