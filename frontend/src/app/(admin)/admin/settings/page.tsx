'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { settingsApi, SettingScope } from '@/lib/api/settings';
import {
    Store,
    Receipt,
    Percent,
    Globe,
    Save,
    CheckCircle2,
    AlertCircle,
    Info,
    UserCircle,
    Key,
    Eye,
    EyeOff,
    ChevronDown,
    ChevronUp,
    RefreshCcw,
    Coins,
    Calculator,
    ShoppingCart,
    Plus,
    Trash2,
    CreditCard,
    Wallet,
    Tags,
    Upload,
    ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn, getFullImageUrl } from '@/lib/utils';
import { userApi } from '@/lib/api/users';
import { storeApi } from '@/lib/api/stores';

// 簡易 Debounce Hook
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

type ConfigurableChannel = { id: string; name: string; color: string; enabled: boolean };

type ChannelSettingsCardProps = {
    title: string; description: string; enabled: boolean; expanded: boolean;
    items: ConfigurableChannel[]; placeholder: string; icon: ReactNode;
    onToggle: () => void; onAdd: () => void; onChange: (items: ConfigurableChannel[]) => void;
};

function ChannelSettingsCard({ title, description, enabled, expanded, items, placeholder, icon, onToggle, onAdd, onChange }: ChannelSettingsCardProps) {
    const updateItem = (id: string, patch: Partial<ConfigurableChannel>) => onChange(items.map(item => item.id === id ? { ...item, ...patch } : item));
    return (
        <div className={cn("bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden", !enabled && "opacity-60")}>
            <button type="button" onClick={onToggle} className="w-full px-6 py-4 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between text-left">
                <div className="flex items-center gap-3">{icon}<div><h3 className="font-black text-gray-800 tracking-tight">{title}</h3><p className="text-[11px] text-gray-400 mt-0.5">{description}</p></div></div>
                <ChevronDown size={18} className={cn("shrink-0 text-gray-400 transition-transform", expanded && "rotate-180")} />
            </button>
            {expanded && <div className="p-6 space-y-3">
                <div className="flex items-center justify-between gap-3">
                    {!enabled ? <p className="text-sm text-amber-600">請先在「支付管道管理」開啟此功能。</p> : <span />}
                    <Button variant="outline" size="sm" onClick={onAdd} disabled={!enabled}><Plus size={14} className="mr-1" /> 新增項目</Button>
                </div>
                {items.length === 0 && enabled && <p className="text-sm text-gray-400">尚未新增項目</p>}
                {items.map(item => <div key={item.id} className="grid grid-cols-1 xl:grid-cols-[minmax(160px,1fr)_140px_90px_44px] items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/60 p-3">
                    <Input value={item.name} placeholder={placeholder} disabled={!enabled} onChange={(e) => updateItem(item.id, { name: e.target.value })} />
                    <label className="flex h-10 items-center gap-2 rounded-md border bg-white px-2 text-xs font-bold text-gray-500"><input type="color" value={item.color} disabled={!enabled} onChange={(e) => updateItem(item.id, { color: e.target.value })} className="h-7 w-8 cursor-pointer border-0 bg-transparent" />按鈕色彩</label>
                    <button type="button" disabled={!enabled} onClick={() => updateItem(item.id, { enabled: !item.enabled })} className={cn("h-9 rounded-lg text-xs font-black text-white", item.enabled ? "bg-emerald-500" : "bg-gray-300")}>{item.enabled ? '已開啟' : '已關閉'}</button>
                    <Button variant="ghost" size="icon" className="text-red-500" disabled={!enabled} onClick={() => onChange(items.filter(current => current.id !== item.id))}><Trash2 size={16} /></Button>
                </div>)}
            </div>}
        </div>
    );
}

export default function AdminSettingsPage() {
    const router = useRouter();
    const { user, selectedStoreId, updateUser, updateStore } = useAuthStore();
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [lastSynced, setLastSynced] = useState<Date | null>(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [syncError, setSyncError] = useState('');
    const [expandedChannelSettings, setExpandedChannelSettings] = useState<Record<string, boolean>>({});

    // 設定狀態
    const [settings, setSettings] = useState({
        store_account: '',
        store_name: '',
        logo_url: '',
        receipt_header: '',
        receipt_footer: '',
        business_id: '',
        tax_rate: 5,
        tax_mode: 'inclusive',
        timezone: 'Asia/Taipei',
        // 財務經營參數
        monthly_fixed_costs: [] as { id: string, name: string, amount: number }[],
        business_days: [1, 2, 3, 4, 5, 6, 0] as number[],
        rounding_rule: 'round',
        default_service_fee_rate: 0,
        // POS 營運自動化
        default_order_type: 'take_out',
        // 營運進階設定
        enabled_payment_methods: ['cash'] as string[],
        delivery_platforms: [] as ConfigurableChannel[],
        multi_payment_methods: [] as ConfigurableChannel[],
        discount_presets: [] as { id: string, name: string, type: 'percent' | 'fixed', value: number }[],
    });

    // 個人資料狀態
    const [profile, setProfile] = useState({
        username: '',
        full_name: '',
        nickname: '',
        email: '',
        phone: '',
        pin: '',
        old_pin: '',
    });

    const [showPin, setShowPin] = useState(false);
    const [isProfileExpanded, setIsProfileExpanded] = useState(false);

    // Debounced values
    const debouncedSettings = useDebounce(settings, 1000);
    const debouncedProfile = useDebounce(profile, 1000);

    // 初始化標記，防止首次載入觸發儲存
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;

        // 僅在初始化時載入資料，不依賴於 user 的細微變化
        // 這樣 updateProfile 觸發的 store 更新就不會導致頁面重新載入
        if (!user || !selectedStoreId) {
            router.push('/select-store');
            return;
        }

        loadAllData();
    }, [mounted, selectedStoreId]);

    const loadAllData = async () => {
        if (!selectedStoreId) return;
        try {
            setLoading(true);
            const [settingsData, userData] = await Promise.all([
                settingsApi.getStoreProfile(selectedStoreId),
                userApi.me()
            ]);
            setSettings({
                ...settingsData,
                monthly_fixed_costs: settingsData.monthly_fixed_costs || [],
                business_days: settingsData.business_days || [1, 2, 3, 4, 5, 6, 0],
                rounding_rule: settingsData.rounding_rule || 'round',
                default_service_fee_rate: settingsData.default_service_fee_rate || 0,
                default_order_type: settingsData.default_order_type || 'take_out',
                enabled_payment_methods: settingsData.enabled_payment_methods || ['cash'],
                delivery_platforms: (settingsData.delivery_platforms || []).map((item: any) => ({
                    ...item,
                    color: item.color || '#f97316',
                    enabled: item.enabled !== false,
                })),
                multi_payment_methods: (settingsData.multi_payment_methods || []).map((item: any) => ({
                    ...item,
                    color: item.color || '#16a34a',
                    enabled: item.enabled !== false,
                })),
                discount_presets: settingsData.discount_presets || [],
            });
            if (userData.data) {
                if (userData.data.stores) {
                    updateUser({ stores: userData.data.stores });
                }
                setProfile({
                    username: userData.data.username || '',
                    full_name: userData.data.full_name || '',
                    nickname: userData.data.nickname || '',
                    email: userData.data.email || '',
                    phone: userData.data.phone || '',
                    pin: '',
                    old_pin: '',
                });
            }
            // 載入完成後延遲開啟監聽，避免初始化觸發同步
            setTimeout(() => setIsInitialLoad(false), 500);
        } catch (error) {
            console.error('載入資料失敗:', error);
        } finally {
            setLoading(false);
        }
    };

    // 自動同步店鋪設定
    useEffect(() => {
        if (isInitialLoad || loading || !selectedStoreId) return;

        const syncSettings = async () => {
            setSyncing(true);
            setSyncError('');
            try {
                const storeName = debouncedSettings.store_name.trim();
                if (!storeName) throw new Error('店鋪名稱不可空白');
                const { store_name: _storeName, ...storeSettings } = debouncedSettings;
                await Promise.all([
                    settingsApi.updateBatch(selectedStoreId, {
                        scope: SettingScope.STORE,
                        settings: storeSettings
                    }),
                    storeApi.update(selectedStoreId, { name: storeName })
                ]);
                updateStore(selectedStoreId, { name: storeName });
                setLastSynced(new Date());
            } catch (error: any) {
                console.error('店鋪設定同步失敗:', error);
                setSyncError(error.response?.data?.detail || error.message || '設定同步失敗');
            } finally {
                setSyncing(false);
            }
        };

        syncSettings();
    }, [debouncedSettings]);

    // 自動同步個人資料
    useEffect(() => {
        if (isInitialLoad || loading) return;
        if (debouncedProfile.pin && (debouncedProfile.pin.length < 6 || debouncedProfile.pin.length > 8 || !debouncedProfile.old_pin)) return;

        const syncProfile = async () => {
            setSyncing(true);
            setSyncError('');
            try {
                await userApi.updateProfile({
                    username: debouncedProfile.username,
                    full_name: debouncedProfile.full_name,
                    nickname: debouncedProfile.nickname,
                    email: debouncedProfile.email,
                    phone: debouncedProfile.phone,
                    old_pin: debouncedProfile.old_pin || undefined,
                    pin: debouncedProfile.pin || undefined
                });
                updateUser({
                    username: debouncedProfile.username,
                    full_name: debouncedProfile.full_name,
                    nickname: debouncedProfile.nickname,
                    email: debouncedProfile.email,
                    phone: debouncedProfile.phone,
                });
                setLastSynced(new Date());
                if (debouncedProfile.pin) {
                    setProfile(current => ({ ...current, pin: '', old_pin: '' }));
                }
            } catch (error: any) {
                console.error('個人資料同步失敗:', error);
                setSyncError(error.response?.data?.detail || error.message || '個人資料同步失敗');
            } finally {
                setSyncing(false);
            }
        };

        syncProfile();
    }, [debouncedProfile]);

    const handleAddFixedCost = () => {
        const newItem = {
            id: Math.random().toString(36).substr(2, 9),
            name: '',
            amount: 0
        };
        setSettings({
            ...settings,
            monthly_fixed_costs: [...settings.monthly_fixed_costs, newItem]
        });
    };

    const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !selectedStoreId) return;
        try {
            setUploadingLogo(true);
            const logoUrl = await settingsApi.uploadLogo(selectedStoreId, file, settings.logo_url);
            setSettings(prev => ({ ...prev, logo_url: logoUrl }));
        } catch (error: any) {
            alert(error.response?.data?.detail || 'Logo 上傳失敗');
        } finally {
            setUploadingLogo(false);
            event.target.value = '';
        }
    };

    const handleRemoveFixedCost = (id: string) => {
        setSettings({
            ...settings,
            monthly_fixed_costs: settings.monthly_fixed_costs.filter(item => item.id !== id)
        });
    };

    const handleUpdateFixedCost = (id: string, field: 'name' | 'amount', value: string | number) => {
        setSettings({
            ...settings,
            monthly_fixed_costs: settings.monthly_fixed_costs.map(item =>
                item.id === id ? { ...item, [field]: value } : item
            )
        });
    };

    const toggleBusinessDay = (day: number) => {
        const selected = settings.business_days.includes(day);
        if (selected && settings.business_days.length === 1) {
            setSyncError('每週至少要保留一個營業日');
            return;
        }
        setSettings({
            ...settings,
            business_days: selected
                ? settings.business_days.filter((value) => value !== day)
                : [...settings.business_days, day]
        });
    };

    // 支付管道管理邏輯
    const togglePaymentMethod = (method: string) => {
        const current = settings.enabled_payment_methods;
        const next = current.includes(method)
            ? current.filter(m => m !== method)
            : [...current, method];

        // 確保至少有一個支付方式 (通常是現金)
        if (next.length === 0) return;

        setSettings({ ...settings, enabled_payment_methods: next });
    };

    const handleAddDeliveryPlatform = () => {
        setSettings({
            ...settings,
            delivery_platforms: [
                ...settings.delivery_platforms,
                { id: crypto.randomUUID?.() || Math.random().toString(36).slice(2), name: '', color: '#f97316', enabled: true }
            ]
        });
    };

    const handleAddMultiPaymentMethod = () => {
        setSettings({
            ...settings,
            multi_payment_methods: [
                ...settings.multi_payment_methods,
                { id: crypto.randomUUID?.() || Math.random().toString(36).slice(2), name: '', color: '#16a34a', enabled: true }
            ]
        });
    };

    const handleDeleteStore = async () => {
        if (!selectedStoreId) return;
        const confirmation = window.prompt(`刪除店鋪會永久移除相關設定與資料。\n請輸入店鋪名稱「${settings.store_name}」確認：`);
        if (confirmation !== settings.store_name) {
            if (confirmation !== null) alert('店鋪名稱不相符，已取消刪除');
            return;
        }
        try {
            await storeApi.delete(selectedStoreId);
            useAuthStore.getState().setSelectedStore(null as any);
            window.location.href = '/select-store';
        } catch (error: any) {
            alert(error.response?.data?.detail || '刪除店鋪失敗');
        }
    };

    // 折扣範本邏輯
    const handleAddDiscount = () => {
        const newItem = {
            id: Math.random().toString(36).substr(2, 9),
            name: '',
            type: 'percent' as const,
            value: 0
        };
        setSettings({
            ...settings,
            discount_presets: [...settings.discount_presets, newItem]
        });
    };

    const handleRemoveDiscount = (id: string) => {
        setSettings({
            ...settings,
            discount_presets: settings.discount_presets.filter(item => item.id !== id)
        });
    };

    const handleUpdateDiscount = (id: string, field: string, value: any) => {
        setSettings({
            ...settings,
            discount_presets: settings.discount_presets.map(item =>
                item.id === id ? { ...item, [field]: value } : item
            )
        });
    };

    const [showSyncedStatus, setShowSyncedStatus] = useState(false);

    // 狀態自動隱藏邏輯 (2秒後關閉)
    useEffect(() => {
        if (lastSynced) {
            setShowSyncedStatus(true);
            const timer = setTimeout(() => setShowSyncedStatus(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [lastSynced]);

    const monthlyFixedCostTotal = settings.monthly_fixed_costs.reduce(
        (total, item) => total + Number(item.amount || 0),
        0
    );
    const now = new Date();
    const currentMonthOperatingDays = Array.from(
        { length: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() },
        (_, index) => new Date(now.getFullYear(), now.getMonth(), index + 1).getDay()
    ).filter((day) => settings.business_days.includes(day)).length;
    const averageFixedCostPerOperatingDay = currentMonthOperatingDays > 0
        ? monthlyFixedCostTotal / currentMonthOperatingDays
        : 0;

    if (!mounted || loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="w-10 h-10 border-4 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin mb-4" />
                <div className="text-slate-400 font-medium">載入系統設定中...</div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-[1200px] mx-auto pb-32">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-3">
                        系統設定 & 營運參數
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">變更後將即時同步，無需手動儲存</p>
                </div>

                <div className="flex items-center gap-3">
                    {syncError && (
                        <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-red-600">
                            <AlertCircle size={16} />
                            <span className="text-xs font-bold">{syncError}</span>
                        </div>
                    )}
                    <div className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-300",
                        syncing
                            ? "bg-amber-50 text-amber-600 border-amber-100"
                            : showSyncedStatus
                                ? "bg-green-50 text-green-600 border-green-100"
                                : "opacity-0 translate-x-4 pointer-events-none"
                    )}>
                        {syncing ? (
                            <RefreshCcw size={16} className="animate-spin" />
                        ) : (
                            <CheckCircle2 size={16} />
                        )}
                        <span className="text-xs font-black uppercase tracking-widest">
                            {syncing ? '正在同步中...' : '已同步至雲端'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Profile Card - Full Width */}
                <div className="lg:col-span-12">
                    <div className={cn(
                        "bg-white rounded-2xl shadow-sm border transition-all duration-300 overflow-hidden",
                        isProfileExpanded ? "border-[#D4AF37]/30 shadow-md" : "border-gray-200"
                    )}>
                        <div
                            className={cn(
                                "px-6 py-4 flex items-center justify-between cursor-pointer group",
                                isProfileExpanded ? "bg-[#D4AF37]/5" : "bg-gray-50/50 hover:bg-gray-50"
                            )}
                            onClick={() => setIsProfileExpanded(!isProfileExpanded)}
                        >
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                                    isProfileExpanded ? "bg-[#D4AF37] text-white" : "bg-gray-100 text-gray-400 group-hover:bg-gray-200"
                                )}>
                                    <UserCircle size={22} />
                                </div>
                                <div className="flex flex-col">
                                    <h3 className="font-black text-gray-800 tracking-tight">個人帳號與安全</h3>
                                    <p className="text-[11px] text-gray-400 font-medium">管理登入身分與個人專屬 PIN 碼</p>
                                </div>
                            </div>
                            <ChevronDown className={cn("text-gray-400 transition-transform duration-300", isProfileExpanded && "rotate-180")} size={20} />
                        </div>

                        {isProfileExpanded && (
                            <div className="p-6 border-t border-gray-100 animate-in slide-in-from-top-2">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                                    <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">登入帳號</label>
                                            <Input
                                                value={profile.username}
                                                onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                                                className="h-12 bg-gray-50 border-gray-200 focus:border-[#D4AF37] font-mono font-bold transition-all"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">真實姓名</label>
                                            <Input
                                                value={profile.full_name}
                                                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                                                className="h-12 bg-gray-50 border-gray-200 focus:border-[#D4AF37] transition-all"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">暱稱 (Nickname)</label>
                                            <Input
                                                value={profile.nickname}
                                                onChange={(e) => setProfile({ ...profile, nickname: e.target.value })}
                                                placeholder="用於 POS 顯示"
                                                className="h-12 bg-gray-50 border-gray-200 focus:border-[#D4AF37] transition-all"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">電子郵件</label>
                                            <Input
                                                value={profile.email}
                                                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                                className="h-12 bg-gray-50 border-gray-200 focus:border-[#D4AF37] transition-all"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">聯絡電話</label>
                                            <Input
                                                value={profile.phone}
                                                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                                className="h-12 bg-gray-50 border-gray-200 focus:border-[#D4AF37] transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col justify-center gap-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.2em] flex items-center gap-2">
                                                <Key size={14} /> POS 快速 PIN 碼
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => setShowPin(!showPin)}
                                                className="text-gray-400 hover:text-[#D4AF37] transition-colors"
                                            >
                                                {showPin ? <Eye size={16} /> : <EyeOff size={16} />}
                                            </button>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">原始 PIN 碼 (Verify)</label>
                                                <Input
                                                    type={showPin ? "text" : "password"}
                                                    maxLength={8}
                                                    value={profile.old_pin}
                                                    onChange={(e) => setProfile({ ...profile, old_pin: e.target.value.replace(/\D/g, '') })}
                                                    className="h-10 bg-white border-slate-200 rounded-xl focus:border-[#D4AF37] text-center text-xl font-black font-mono tracking-widest text-slate-400"
                                                    placeholder="••••"
                                                />
                                            </div>
                                            <div className="flex justify-center -my-1">
                                                <ChevronDown size={14} className="text-slate-300" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">設定新 PIN 碼</label>
                                                <Input
                                                    type={showPin ? "text" : "password"}
                                                    maxLength={8}
                                                    value={profile.pin}
                                                    onChange={(e) => setProfile({ ...profile, pin: e.target.value.replace(/\D/g, '') })}
                                                    className="h-14 bg-white border-2 border-slate-200 rounded-xl focus:border-[#D4AF37] shadow-sm text-center text-3xl font-black font-mono tracking-widest text-[#D4AF37]"
                                                    placeholder="••••"
                                                />
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-gray-400 text-center italic mt-1 leading-relaxed">
                                            變更 PIN 碼需先輸入原密碼<br />輸入 6-8 位數字
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Left Side - Store Settings */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 bg-gray-50/80 border-b border-gray-100 flex items-center gap-3">
                            <Receipt size={18} className="text-[#D4AF37]" />
                            <h3 className="font-black text-gray-800 tracking-tight">店鋪營運與收據</h3>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">店鋪帳號</label>
                                    <Input
                                        value={settings.store_account}
                                        onChange={(e) => setSettings({ ...settings, store_account: e.target.value })}
                                        className="h-12 bg-gray-50 border-gray-200 focus:border-[#D4AF37] font-mono font-bold"
                                    />
                                    <p className="text-[10px] text-gray-400 italic mt-1">此帳號用於 POS 入口快速切換</p>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">店鋪全名</label>
                                    <Input
                                        value={settings.store_name}
                                        onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
                                        className="h-12 bg-gray-50 border-gray-200 focus:border-[#D4AF37] font-bold"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">收據與號碼牌 Logo</label>
                                <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                                    <div className="h-20 w-28 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white flex items-center justify-center">
                                        {settings.logo_url ? (
                                            <img src={getFullImageUrl(settings.logo_url)} alt="店鋪 Logo" className="max-h-full max-w-full object-contain" />
                                        ) : (
                                            <ImageIcon className="h-8 w-8 text-gray-300" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <label className="inline-flex h-10 cursor-pointer items-center rounded-lg bg-slate-900 px-4 text-sm font-bold text-white hover:bg-slate-800">
                                            <Upload className="mr-2 h-4 w-4" />
                                            {uploadingLogo ? '上傳中…' : '選擇 Logo'}
                                            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={uploadingLogo} onChange={handleLogoUpload} />
                                        </label>
                                        <p className="mt-2 text-[10px] text-gray-400">支援 PNG、JPG、WEBP；列印時會自動轉為黑白並置中。</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">收據抬頭名稱</label>
                                    <Input
                                        value={settings.receipt_header}
                                        onChange={(e) => setSettings({ ...settings, receipt_header: e.target.value })}
                                        className="h-12 bg-gray-50 border-gray-200 focus:border-[#D4AF37]"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">統一編號</label>
                                    <Input
                                        value={settings.business_id}
                                        onChange={(e) => setSettings({ ...settings, business_id: e.target.value })}
                                        className="h-12 bg-gray-50 border-gray-200 focus:border-[#D4AF37] font-mono"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">收據頁尾訊息</label>
                                <textarea
                                    rows={3}
                                    value={settings.receipt_footer}
                                    onChange={(e) => setSettings({ ...settings, receipt_footer: e.target.value })}
                                    className="w-full rounded-xl bg-gray-50 border border-gray-200 p-4 text-sm focus:outline-none focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/5 transition-all outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* POS Automation Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mt-6">
                        <div className="px-6 py-4 bg-gray-50/80 border-b border-gray-100 flex items-center gap-3">
                            <ShoppingCart size={18} className="text-[#D4AF37]" />
                            <h3 className="font-black text-gray-800 tracking-tight">POS 營運自動化</h3>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">預設訂單類型</label>
                                    <div className="relative">
                                        <select
                                            value={settings.default_order_type}
                                            onChange={(e) => setSettings({ ...settings, default_order_type: e.target.value })}
                                            className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/5 outline-none transition-all text-sm font-bold appearance-none"
                                        >
                                            <option value="take_out">外帶 (Take Out)</option>
                                            <option value="dine_in">內用 (Dine In)</option>
                                            <option value="delivery">外送 (Delivery)</option>
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Payment Management Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mt-6">
                        <div className="px-6 py-4 bg-gray-50/80 border-b border-gray-100 flex items-center gap-3">
                            <CreditCard size={18} className="text-[#D4AF37]" />
                            <h3 className="font-black text-gray-800 tracking-tight">支付管道管理</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-[11px] text-gray-400 font-medium mb-4">設定 POS 結帳畫面顯示的支付按鈕</p>
                            <div className="grid grid-cols-1 gap-3">
                                {[
                                    { id: 'cash', name: '現金結帳', icon: <Coins size={16} /> },
                                    { id: 'linepay', name: '多元支付', icon: <Wallet size={16} /> },
                                    { id: 'platform_collect', name: '啟用外送平台', icon: <ShoppingCart size={16} /> }
                                ].map((method) => (
                                    <div
                                        key={method.id}
                                        className={cn(
                                            "flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer",
                                            settings.enabled_payment_methods.includes(method.id)
                                                ? "bg-blue-50/50 border-blue-100"
                                                : "bg-white border-gray-100 opacity-60 grayscale hover:grayscale-0 hover:opacity-100"
                                        )}
                                        onClick={() => togglePaymentMethod(method.id)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-8 h-8 rounded-lg flex items-center justify-center",
                                                settings.enabled_payment_methods.includes(method.id) ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400"
                                            )}>
                                                {method.icon}
                                            </div>
                                            <span className="text-sm font-bold text-gray-700">{method.name}</span>
                                        </div>
                                        <div className={cn("w-10 h-5 rounded-full relative transition-colors", settings.enabled_payment_methods.includes(method.id) ? "bg-blue-500" : "bg-gray-200")}>
                                            <div className={cn("absolute top-1 w-3 h-3 bg-white rounded-full transition-all", settings.enabled_payment_methods.includes(method.id) ? "left-6" : "left-1")} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 space-y-4">
                        <ChannelSettingsCard
                            title="外送平台設定"
                            description="結帳選擇外送時，顯示已開啟的平台。"
                            enabled={settings.enabled_payment_methods.includes('platform_collect')}
                            expanded={!!expandedChannelSettings.delivery_platforms}
                            items={settings.delivery_platforms}
                            placeholder="例如：Uber Eats、foodpanda"
                            icon={<ShoppingCart size={18} className="text-[#D4AF37]" />}
                            onToggle={() => setExpandedChannelSettings(current => ({ ...current, delivery_platforms: !current.delivery_platforms }))}
                            onAdd={handleAddDeliveryPlatform}
                            onChange={(items) => setSettings(current => ({ ...current, delivery_platforms: items }))}
                        />
                        <ChannelSettingsCard
                            title="多元支付設定"
                            description="已開啟的項目會直接顯示在結帳支付方式。"
                            enabled={settings.enabled_payment_methods.includes('linepay')}
                            expanded={!!expandedChannelSettings.multi_payment_methods}
                            items={settings.multi_payment_methods}
                            placeholder="例如：LINE Pay、街口支付、信用卡"
                            icon={<Wallet size={18} className="text-[#D4AF37]" />}
                            onToggle={() => setExpandedChannelSettings(current => ({ ...current, multi_payment_methods: !current.multi_payment_methods }))}
                            onAdd={handleAddMultiPaymentMethod}
                            onChange={(items) => setSettings(current => ({ ...current, multi_payment_methods: items }))}
                        />
                    </div>
                </div>

                {/* Right Side - Parameters */}
                <div className="lg:col-span-5 space-y-6">
                    {/* Tax Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 bg-gray-50/80 border-b border-gray-100 flex items-center gap-3">
                            <Percent size={18} className="text-[#D4AF37]" />
                            <h3 className="font-black text-gray-800 tracking-tight">稅務參數設定</h3>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">營業稅率 (%)</label>
                                    <Input
                                        type="number"
                                        value={isNaN(settings.tax_rate) ? '' : settings.tax_rate}
                                        onChange={(e) => {
                                            const val = e.target.value === '' ? 0 : Math.min(100, Math.max(0, parseFloat(e.target.value)));
                                            setSettings({ ...settings, tax_rate: val });
                                        }}
                                        className="h-12 bg-gray-50 border-gray-200 focus:border-[#D4AF37] font-bold"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">課稅模式</label>
                                    <div className="relative">
                                        <select
                                            value={settings.tax_mode}
                                            onChange={(e) => setSettings({ ...settings, tax_mode: e.target.value })}
                                            className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/5 outline-none transition-all text-sm font-bold appearance-none"
                                        >
                                            <option value="inclusive">內含 (預設)</option>
                                            <option value="exclusive">外加</option>
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-4 p-4 bg-amber-50/50 rounded-2xl border border-amber-100/50">
                                <Info className="text-amber-500 shrink-0 mt-0.5" size={16} />
                                <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                                    台灣地區建議使用「內含 5%」。系統會自動根據此設定產出正確的發票金額明細。
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Environment Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 bg-gray-50/80 border-b border-gray-100 flex items-center gap-3">
                            <Globe size={18} className="text-[#D4AF37]" />
                            <h3 className="font-black text-gray-800 tracking-tight">時區與營業日</h3>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">店鋪時區 (Timezone)</label>
                                <div className="relative">
                                    <select
                                        value={settings.timezone}
                                        onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                                        className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/5 outline-none transition-all text-sm font-bold appearance-none"
                                    >
                                        <option value="Asia/Taipei">Asia/Taipei (GMT+8)</option>
                                        <option value="Asia/Tokyo">Asia/Tokyo (GMT+9)</option>
                                        <option value="UTC">UTC (GMT+0)</option>
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                                </div>
                                <p className="mt-2 text-[10px] text-gray-400">套用於班次單號重置、日結、儀表板營業日及訂單時間。</p>
                            </div>
                        </div>
                    </div>

                    {/* Finance Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mt-6">
                        <div className="px-6 py-4 bg-gray-50/80 border-b border-gray-100 flex items-center gap-3">
                            <Coins size={18} className="text-[#D4AF37]" />
                            <h3 className="font-black text-gray-800 tracking-tight">財務經營設定</h3>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">進位規則</label>
                                    <div className="relative">
                                        <select
                                            value={settings.rounding_rule}
                                            onChange={(e) => setSettings({ ...settings, rounding_rule: e.target.value })}
                                            className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/5 outline-none transition-all text-sm font-bold appearance-none"
                                        >
                                            <option value="floor">無條件捨去 (捨去小數)</option>
                                            <option value="round">四捨五入 (小數五入)</option>
                                            <option value="ceil">無條件進位 (有小數即進位)</option>
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">預設服務費 (%)</label>
                                    <Input
                                        type="number"
                                        value={isNaN(settings.default_service_fee_rate) ? '' : settings.default_service_fee_rate}
                                        onChange={(e) => {
                                            const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                            setSettings({ ...settings, default_service_fee_rate: val });
                                        }}
                                        className="h-12 bg-gray-50 border-gray-200 focus:border-[#D4AF37] font-bold"
                                    />
                                </div>
                            </div>

                            <hr className="border-gray-100" />

                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">每週營業日</label>
                                    <p className="mt-1 text-[10px] text-gray-400">用於將每月固定成本平均分攤到實際營業日。</p>
                                </div>
                                <div className="grid grid-cols-7 gap-2">
                                    {[
                                        { value: 1, label: '一' },
                                        { value: 2, label: '二' },
                                        { value: 3, label: '三' },
                                        { value: 4, label: '四' },
                                        { value: 5, label: '五' },
                                        { value: 6, label: '六' },
                                        { value: 0, label: '日' },
                                    ].map((day) => {
                                        const active = settings.business_days.includes(day.value);
                                        return (
                                            <button
                                                type="button"
                                                key={day.value}
                                                onClick={() => toggleBusinessDay(day.value)}
                                                className={cn(
                                                    "h-10 rounded-xl border text-xs font-black transition-colors",
                                                    active
                                                        ? "border-[#D4AF37] bg-[#D4AF37] text-white"
                                                        : "border-gray-200 bg-gray-50 text-gray-400 hover:border-[#D4AF37]"
                                                )}
                                            >
                                                週{day.label}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="grid grid-cols-2 gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-xs">
                                    <div>
                                        <span className="block text-[10px] text-gray-400">本月營業日</span>
                                        <strong className="text-gray-800">{currentMonthOperatingDays} 天</strong>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-[10px] text-gray-400">每日平均固定成本</span>
                                        <strong className="text-blue-700">${Math.round(averageFixedCostPerOperatingDay).toLocaleString()}</strong>
                                    </div>
                                </div>
                            </div>

                            <hr className="border-gray-100" />

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        每月固定成本營運項目 (OpEx)
                                    </label>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleAddFixedCost}
                                        className="h-7 px-2 rounded-lg text-[10px] font-black border-dashed border-2 hover:border-[#D4AF37] hover:text-[#D4AF37] hover:bg-white flex items-center gap-1"
                                    >
                                        <Plus size={12} /> 新增項目
                                    </Button>
                                </div>

                                {settings.monthly_fixed_costs.length === 0 ? (
                                    <div className="text-center py-6 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                                        <Calculator className="mx-auto text-gray-300 mb-2" size={24} />
                                        <p className="text-[10px] text-gray-400 font-medium italic">尚未設定固定成本項目</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                        {settings.monthly_fixed_costs.map((item) => (
                                            <div key={item.id} className="flex items-center gap-3 animate-in fade-in slide-in-from-right-2 duration-300">
                                                <Input
                                                    placeholder="項目名稱 (如:房租)"
                                                    value={item.name}
                                                    onChange={(e) => handleUpdateFixedCost(item.id, 'name', e.target.value)}
                                                    className="h-11 flex-[2] bg-gray-50/50 border-gray-200 focus:border-[#D4AF37] text-xs font-bold"
                                                />
                                                <div className="relative flex-1">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                                                    <Input
                                                        type="number"
                                                        placeholder="金額"
                                                        value={item.amount || ''}
                                                        onChange={(e) => handleUpdateFixedCost(item.id, 'amount', parseFloat(e.target.value) || 0)}
                                                        className="h-11 pl-6 bg-gray-50/50 border-gray-200 focus:border-[#D4AF37] text-xs font-mono font-bold"
                                                    />
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleRemoveFixedCost(item.id)}
                                                    className="h-11 w-11 rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <p className="text-[10px] text-gray-400 font-medium italic leading-relaxed">
                                    ※ 這些成本將用於報表頁面計算「預估淨利」，不會影響實際結帳總額。
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Discount Presets Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mt-6">
                        <div className="px-6 py-4 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Tags size={18} className="text-[#D4AF37]" />
                                <h3 className="font-black text-gray-800 tracking-tight">優惠折扣範本</h3>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleAddDiscount}
                                className="h-7 px-2 rounded-lg text-[10px] font-black border-dashed border-2 hover:border-[#D4AF37] hover:text-[#D4AF37] hover:bg-white flex items-center gap-1"
                            >
                                <Plus size={12} /> 新增折扣
                            </Button>
                        </div>
                        <div className="p-6 space-y-4">
                            {settings.discount_presets.length === 0 ? (
                                <div className="text-center py-8 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                                    <Tags className="mx-auto text-gray-300 mb-2" size={24} />
                                    <p className="text-[10px] text-gray-400 font-medium italic">尚未設定折扣預設項目</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {settings.discount_presets.map((discount) => (
                                        <div key={discount.id} className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex flex-col gap-3">
                                            <div className="flex items-center justify-between gap-3">
                                                <Input
                                                    placeholder="折扣名稱 (如: 員工餐)"
                                                    value={discount.name}
                                                    onChange={(e) => handleUpdateDiscount(discount.id, 'name', e.target.value)}
                                                    className="h-9 bg-white border-gray-200 focus:border-[#D4AF37] text-xs font-bold"
                                                />
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleRemoveDiscount(discount.id)}
                                                    className="h-9 w-9 text-gray-300 hover:text-red-500 hover:bg-red-50"
                                                >
                                                    <Trash2 size={14} />
                                                </Button>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={discount.type}
                                                    onChange={(e) => handleUpdateDiscount(discount.id, 'type', e.target.value)}
                                                    className="h-9 px-3 bg-white border border-gray-200 rounded-lg text-xs font-bold outline-none focus:border-[#D4AF37]"
                                                >
                                                    <option value="percent">百分比 (%)</option>
                                                    <option value="fixed">固定金額 ($)</option>
                                                </select>
                                                <div className="relative flex-1">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] font-bold">數值</span>
                                                    <Input
                                                        type="number"
                                                        value={discount.value || ''}
                                                        onChange={(e) => handleUpdateDiscount(discount.id, 'value', parseFloat(e.target.value) || 0)}
                                                        className="h-9 pl-10 bg-white border-gray-200 focus:border-[#D4AF37] text-xs font-mono font-bold"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <p className="text-[10px] text-gray-400 font-medium italic leading-relaxed">
                                ※ 折扣範本將顯示在 POS 結帳畫面中，方便快速套用常用優惠。
                            </p>
                        </div>
                    </div>
                </div>
            </div>


            {(user?.is_admin || user?.stores?.some(store => store.id === selectedStoreId && store.user_role === 'owner')) && (
                <div className="mt-10 rounded-2xl border border-red-200 bg-red-50 p-6 flex items-center justify-between gap-6">
                    <div>
                        <h3 className="font-black text-red-700">刪除店鋪</h3>
                        <p className="mt-1 text-xs text-red-600">此操作無法復原，系統會要求輸入完整店鋪名稱確認。</p>
                    </div>
                    <Button variant="outline" onClick={handleDeleteStore} className="border-red-300 text-red-700 hover:bg-red-100">
                        <Trash2 size={16} className="mr-2" /> 刪除店鋪
                    </Button>
                </div>
            )}
        </div>
    );
}
