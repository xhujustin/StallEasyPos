'use client';

import { useEffect, useState } from 'react';
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
    RefreshCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { userApi } from '@/lib/api/users';

// 簡易 Debounce Hook
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

export default function AdminSettingsPage() {
    const router = useRouter();
    const { user, selectedStoreId } = useAuthStore();
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [lastSynced, setLastSynced] = useState<Date | null>(null);

    // 設定狀態
    const [settings, setSettings] = useState({
        store_account: '',
        store_name: '',
        receipt_header: '',
        receipt_footer: '',
        business_id: '',
        tax_rate: 5,
        tax_mode: 'inclusive',
        timezone: 'Asia/Taipei',
        language: 'zh-TW',
    });

    // 個人資料狀態
    const [profile, setProfile] = useState({
        username: '',
        full_name: '',
        email: '',
        phone: '',
        pin: '',
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
        if (!user || !selectedStoreId) {
            router.push('/select-store');
            return;
        }
        loadAllData();
    }, [mounted, user, selectedStoreId]);

    const loadAllData = async () => {
        if (!selectedStoreId) return;
        try {
            setLoading(true);
            const [settingsData, userData] = await Promise.all([
                settingsApi.getStoreProfile(selectedStoreId),
                userApi.me()
            ]);
            setSettings(settingsData);
            if (userData.data) {
                setProfile({
                    username: userData.data.username || '',
                    full_name: userData.data.full_name || '',
                    email: userData.data.email || '',
                    phone: userData.data.phone || '',
                    pin: '',
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
            try {
                await settingsApi.updateBatch(selectedStoreId, {
                    scope: SettingScope.STORE,
                    settings: debouncedSettings
                });
                setLastSynced(new Date());
            } catch (error) {
                console.error('店鋪設定同步失敗:', error);
            } finally {
                setSyncing(false);
            }
        };

        syncSettings();
    }, [debouncedSettings]);

    // 自動同步個人資料
    useEffect(() => {
        if (isInitialLoad || loading) return;

        const syncProfile = async () => {
            setSyncing(true);
            try {
                await userApi.updateProfile({
                    username: debouncedProfile.username,
                    full_name: debouncedProfile.full_name,
                    email: debouncedProfile.email,
                    phone: debouncedProfile.phone,
                    pin: debouncedProfile.pin || undefined
                });
                setLastSynced(new Date());
            } catch (error) {
                console.error('個人資料同步失敗:', error);
            } finally {
                setSyncing(false);
            }
        };

        syncProfile();
    }, [debouncedProfile]);

    const [showSyncedStatus, setShowSyncedStatus] = useState(false);

    // 狀態自動隱藏邏輯 (2秒後關閉)
    useEffect(() => {
        if (lastSynced) {
            setShowSyncedStatus(true);
            const timer = setTimeout(() => setShowSyncedStatus(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [lastSynced]);

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
                                        <Input
                                            type={showPin ? "text" : "password"}
                                            maxLength={8}
                                            value={profile.pin}
                                            onChange={(e) => setProfile({ ...profile, pin: e.target.value.replace(/\D/g, '') })}
                                            className="h-14 bg-white border-2 border-slate-200 rounded-xl focus:border-[#D4AF37] shadow-sm text-center text-3xl font-black font-mono tracking-widest text-[#D4AF37]"
                                            placeholder="••••"
                                        />
                                        <p className="text-[10px] text-gray-400 text-center italic mt-1 leading-relaxed">
                                            若不修改請保持空白<br />輸入 6-8 位數字
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
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">店鋪代表帳號</label>
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
                                            const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
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
                            <h3 className="font-black text-gray-800 tracking-tight">環境語系與地區</h3>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">系統時區偏移 (Timezone)</label>
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
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">系統語言 (Language)</label>
                                <div className="relative">
                                    <select
                                        value={settings.language}
                                        onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                                        className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/5 outline-none transition-all text-sm font-bold appearance-none"
                                    >
                                        <option value="zh-TW">繁體中文 (台灣)</option>
                                        <option value="en-US">English (Western)</option>
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
