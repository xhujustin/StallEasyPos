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
    shutdownHost: async (storeId: number) => {
        const response = await apiClient.post<ResponseBase<boolean>>('/system/shutdown', null, {
            params: { store_id: storeId }
        });
        return response.data;
    },
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
            logo_url: result.data?.logo_url || "",
            receipt_header: result.data?.receipt_header || "",
            receipt_footer: result.data?.receipt_footer || "",
            business_id: result.data?.business_id || "",
            tax_rate: result.data?.tax_rate || 5, // 預設 5%
            tax_mode: result.data?.tax_mode || "inclusive", // 預設含稅
            timezone: result.data?.timezone || "Asia/Taipei",
            language: result.data?.language || "zh-TW",
            // 財務經營參數
            monthly_fixed_costs: result.data?.monthly_fixed_costs || [],
            business_days: result.data?.business_days || [1, 2, 3, 4, 5, 6, 0],
            rounding_rule: result.data?.rounding_rule || "round",
            default_service_fee_rate: result.data?.default_service_fee_rate || 0,
            // POS 營運自動化
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
            printer_port: result.data?.printer_port || 9100,
            printer_usb_path: result.data?.printer_usb_path || "/dev/usb/lp0",
            paper_width: result.data?.paper_width || "57mm",
            auto_print_receipt: result.data?.auto_print_receipt || false,
            print_number_ticket: result.data?.print_number_ticket || false,
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
    },

    uploadLogo: async (storeId: number, file: File, oldUrl?: string) => {
        const formData = new FormData();
        formData.append('file', file);
        let url = `/settings/upload-logo?store_id=${storeId}`;
        if (oldUrl) url += `&old_url=${encodeURIComponent(oldUrl)}`;
        const response = await apiClient.post<ResponseBase<string>>(url, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data.data;
    },
};
