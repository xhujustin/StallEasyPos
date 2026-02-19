import { apiClient, ResponseBase } from './client';

export enum SettingScope {
    STORE = "store",
    DEVICE = "device",
    USER = "user"
}

export interface SettingBatchUpdate {
    scope: SettingScope;
    target_id?: string;
    settings: Record<string, any>;
}

export const settingsApi = {
    // 取得特定範圍的所有設定
    get: async (storeId: number, scope: SettingScope = SettingScope.STORE, targetId?: string) => {
        const response = await apiClient.get<ResponseBase<Record<string, any>>>('/settings/', {
            params: { store_id: storeId, scope, target_id: targetId }
        });
        return response.data;
    },

    // 批次更新設定
    updateBatch: async (storeId: number, data: SettingBatchUpdate) => {
        const response = await apiClient.post<ResponseBase<boolean>>('/settings/batch', data, {
            params: { store_id: storeId }
        });
        return response.data;
    },

    // 取得店鋪基本資訊格式化後的結果
    getStoreProfile: async (storeId: number) => {
        const result = await settingsApi.get(storeId, SettingScope.STORE);
        return {
            store_account: result.data?.store_account || "",
            store_name: result.data?.store_name || "",
            receipt_header: result.data?.receipt_header || "",
            receipt_footer: result.data?.receipt_footer || "",
            business_id: result.data?.business_id || "",
            tax_rate: result.data?.tax_rate || 5, // 預設 5%
            tax_mode: result.data?.tax_mode || "inclusive", // 預設含稅
            timezone: result.data?.timezone || "Asia/Taipei",
            language: result.data?.language || "zh-TW",
            receipt_width: result.data?.receipt_width || "80mm",
            // 財務經營參數
            monthly_fixed_costs: result.data?.monthly_fixed_costs || [],
            rounding_rule: result.data?.rounding_rule || "round",
            default_service_fee_rate: result.data?.default_service_fee_rate || 0,
            // POS 營運自動化
            auto_print_after_checkout: result.data?.auto_print_after_checkout ?? false,
            default_order_type: result.data?.default_order_type || "take_out",
            enabled_payment_methods: result.data?.enabled_payment_methods || ["cash"],
            discount_presets: result.data?.discount_presets || [],
        };
    },

    getDeviceSettings: async (storeId: number) => {
        const { getDeviceUUID } = await import('@/lib/device');
        const deviceId = getDeviceUUID();
        const result = await settingsApi.get(storeId, SettingScope.DEVICE, deviceId);
        return {
            printer_ip: result.data?.printer_ip || "",
            printer_type: result.data?.printer_type || "network",
            paper_width: result.data?.paper_width || "80mm",
            auto_print_receipt: result.data?.auto_print_receipt || false,
            open_cash_drawer: result.data?.open_cash_drawer || false,
            // POS UI 偏好 (設備級別)
            pos_product_card_size: result.data?.pos_product_card_size || "medium",
            pos_show_product_image: result.data?.pos_show_product_image ?? true,
            pos_show_cart_item_details: result.data?.pos_show_cart_item_details ?? true,
            pos_sound_enabled: result.data?.pos_sound_enabled ?? true,
        };
    },

    updateDeviceSettings: async (storeId: number, settings: Record<string, any>) => {
        const { getDeviceUUID } = await import('@/lib/device');
        const deviceId = getDeviceUUID();
        return settingsApi.updateBatch(storeId, {
            scope: SettingScope.DEVICE,
            target_id: deviceId,
            settings
        });
    }
};
