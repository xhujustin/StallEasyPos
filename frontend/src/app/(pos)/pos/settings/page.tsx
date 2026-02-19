'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store/auth-store';
import { settingsApi, SettingScope } from '@/lib/api/settings';
import { userApi } from '@/lib/api/users';
import {
    Printer,
    Monitor,
    UserCircle,
    Key,
    Save,
    RefreshCcw,
    HardDrive,
    LayoutGrid,
    Image as ImageIcon,
    Volume2,
    Eye,
    EyeOff,
    Info,
    Coins,
    Type,
    Settings,
    ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DeviceSettings {
    printer_ip: string;
    printer_type: string;
    paper_width: string;
    auto_print_receipt: boolean;
    open_cash_drawer: boolean;
    pos_product_card_size: string;
    pos_show_product_image: boolean;
    pos_show_cart_item_details: boolean;
    pos_sound_enabled: boolean;
}

export default function POSSettingsPage() {
    const { user, selectedStoreId, updateUser } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [mounted, setMounted] = useState(false);

    // 硬體與偏好設定
    const [deviceSettings, setDeviceSettings] = useState<DeviceSettings>({
        printer_ip: '',
        printer_type: 'network',
        paper_width: '80mm',
        auto_print_receipt: false,
        open_cash_drawer: false,
        pos_product_card_size: 'medium',
        pos_show_product_image: true,
        pos_show_cart_item_details: true,
        pos_sound_enabled: true,
    });

    // 個人資料
    const [profile, setProfile] = useState({
        full_name: '',
        nickname: '',
        email: '',
        phone: '',
        pin: '',
        old_pin: '',
    });

    const [showPin, setShowPin] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (selectedStoreId) {
            loadSettings();
        }
    }, [selectedStoreId]);

    const loadSettings = async () => {
        if (!selectedStoreId) return;
        try {
            setLoading(true);
            const [devData, userData] = await Promise.all([
                settingsApi.getDeviceSettings(selectedStoreId),
                userApi.me()
            ]);

            setDeviceSettings((prev) => ({
                ...prev,
                ...devData,
            }));

            if (userData.data) {
                setProfile({
                    full_name: userData.data.full_name || '',
                    nickname: userData.data.nickname || '',
                    email: userData.data.email || '',
                    phone: userData.data.phone || '',
                    pin: '',
                    old_pin: '',
                });
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
            toast.error("載入失敗: 無法取得目前的設定資訊");
        } finally {
            setLoading(false);
        }
    };

    const autoSaveDeviceSettings = async (newSettings: DeviceSettings) => {
        if (!selectedStoreId) return;
        try {
            await settingsApi.updateDeviceSettings(selectedStoreId, newSettings);
            // 靜默儲存，不跳出成功 toast 以免干擾操作，除非是重要的硬體變更
        } catch (error) {
            console.error('Auto-save failed:', error);
            toast.error("自動存取失敗，請檢查網路連線");
        }
    };

    const updateAndSave = (updates: Partial<DeviceSettings>) => {
        const newSettings = { ...deviceSettings, ...updates };
        setDeviceSettings(newSettings);
        autoSaveDeviceSettings(newSettings);
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            await userApi.updateProfile({
                full_name: profile.full_name,
                nickname: profile.nickname,
                email: profile.email,
                phone: profile.phone,
                old_pin: profile.old_pin || undefined,
                pin: profile.pin || undefined
            });

            updateUser({
                full_name: profile.full_name,
                nickname: profile.nickname,
                email: profile.email,
                phone: profile.phone,
            });
            setProfile(prev => ({ ...prev, pin: '', old_pin: '' })); // 清空 PIN 輸入框
            toast.success(profile.pin ? "個人資料與 PIN 碼已更新" : "個人資料已更新");
        } catch (error) {
            toast.error("更新失敗: 無法更新個人資料");
        } finally {
            setSaving(false);
        }
    };

    const runPrinterTest = () => {
        toast.info(`正在發送測試指令至 ${deviceSettings.printer_ip || '預設印表機'}...`);
    };

    const runDrawerTest = () => {
        toast.info("正在發送開錢箱脈衝指令...");
    };

    if (!mounted || loading) {
        return (
            <div className="flex h-full items-center justify-center bg-slate-50 text-slate-400">
                <RefreshCcw className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="h-full w-full bg-slate-50 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="h-16 border-b border-slate-200 bg-white flex items-center px-8 justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="bg-slate-900 text-white p-2 rounded-lg">
                        <Settings size={20} />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900 tracking-tight">POS 本地設定</h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Device & User Configuration</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        設定已自動同步至雲端
                    </div>
                    <div className="w-px h-6 bg-slate-200" />
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={loadSettings}
                        className="text-slate-500 hover:text-slate-900"
                    >
                        <RefreshCcw className="mr-2 h-4 w-4" /> 重新整理
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="w-full h-full space-y-10 pb-12">

                    {/* 頂部兩欄：硬體 + 介面偏好 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">

                        {/* 區塊一：硬體設備 */}
                        <section className="space-y-4 flex flex-col">
                            <div className="flex items-center gap-2 px-1 text-slate-700">
                                <HardDrive size={18} className="text-slate-400" />
                                <h2 className="font-bold">硬體設備連線</h2>
                            </div>
                            <Card className="border-slate-200 shadow-sm flex-1">
                                <CardContent className="p-6 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-xs text-slate-500 uppercase font-bold tracking-wider">印表機 IP 地址</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    value={deviceSettings.printer_ip}
                                                    onChange={(e) => setDeviceSettings({ ...deviceSettings, printer_ip: e.target.value })}
                                                    onBlur={() => autoSaveDeviceSettings(deviceSettings)}
                                                    placeholder="192.168.1.100"
                                                    className="bg-slate-50 border-slate-200 font-mono font-bold h-11"
                                                />
                                                <Button variant="outline" className="h-11 px-4" onClick={runPrinterTest}>測試</Button>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs text-slate-500 uppercase font-bold tracking-wider">紙張寬度</Label>
                                            <select
                                                value={deviceSettings.paper_width}
                                                onChange={(e) => updateAndSave({ paper_width: e.target.value })}
                                                className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-md text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-400"
                                            >
                                                <option value="80mm">80mm (標準)</option>
                                                <option value="57mm">57mm (窄)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-700">自動出單</span>
                                                <span className="text-[10px] text-slate-400">結帳後實體收據</span>
                                            </div>
                                            <button
                                                onClick={() => updateAndSave({ auto_print_receipt: !deviceSettings.auto_print_receipt })}
                                                className={cn(
                                                    "w-12 h-6 rounded-full relative transition-all duration-300 shadow-inner",
                                                    deviceSettings.auto_print_receipt ? "bg-green-500" : "bg-slate-300"
                                                )}
                                            >
                                                <div className={cn(
                                                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                                                    deviceSettings.auto_print_receipt ? "right-1" : "left-1"
                                                )} />
                                            </button>
                                        </div>

                                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-700">結帳開箱</span>
                                                <span className="text-[10px] text-slate-400">現金支付時</span>
                                            </div>
                                            <button
                                                onClick={() => updateAndSave({ open_cash_drawer: !deviceSettings.open_cash_drawer })}
                                                className={cn(
                                                    "w-12 h-6 rounded-full relative transition-all duration-300 shadow-inner",
                                                    deviceSettings.open_cash_drawer ? "bg-green-500" : "bg-slate-300"
                                                )}
                                            >
                                                <div className={cn(
                                                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                                                    deviceSettings.open_cash_drawer ? "right-1" : "left-1"
                                                )} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <Button variant="ghost" className="w-full h-11 border border-dashed border-slate-300 text-slate-500 hover:bg-slate-100 rounded-xl font-bold" onClick={runDrawerTest}>
                                            <Coins className="mr-2 h-4 w-4" /> 點擊測試開啟錢箱
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </section>

                        {/* 區塊二：操作介面偏好 */}
                        <section className="space-y-4 flex flex-col">
                            <div className="flex items-center gap-2 px-1 text-slate-700">
                                <LayoutGrid size={18} className="text-slate-400" />
                                <h2 className="font-bold">操作介面偏好</h2>
                            </div>
                            <Card className="border-slate-200 shadow-sm flex-1">
                                <CardContent className="p-6 space-y-8">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <Type size={16} className="text-[#D4AF37]" />
                                            <Label className="text-sm font-bold">商品卡片大小</Label>
                                        </div>
                                        <div className="flex gap-2 bg-slate-100 p-1.5 rounded-xl">
                                            {['small', 'medium', 'large'].map((size) => (
                                                <button
                                                    key={size}
                                                    type="button"
                                                    onClick={() => updateAndSave({ pos_product_card_size: size })}
                                                    className={cn(
                                                        "flex-1 py-3 text-xs font-black uppercase rounded-lg transition-all",
                                                        deviceSettings.pos_product_card_size === size
                                                            ? "bg-white text-slate-900 shadow-md ring-1 ring-slate-200"
                                                            : "text-slate-400 hover:text-slate-600"
                                                    )}
                                                >
                                                    {size === 'small' ? '小比例' : size === 'medium' ? '中等比例' : '大比例'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div
                                            className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-100/50 transition-colors"
                                            onClick={() => updateAndSave({ pos_show_product_image: !deviceSettings.pos_show_product_image })}
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-700">商品圖片顯示</span>
                                                <span className="text-[10px] text-slate-400 uppercase tracking-tight">Show Product Thumbnails</span>
                                            </div>
                                            <div className={cn(
                                                "w-12 h-6 rounded-full relative transition-all duration-300 shadow-inner",
                                                deviceSettings.pos_show_product_image ? "bg-[#D4AF37]" : "bg-slate-300"
                                            )}>
                                                <div className={cn(
                                                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                                                    deviceSettings.pos_show_product_image ? "right-1" : "left-1"
                                                )} />
                                            </div>
                                        </div>

                                        <div
                                            className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-100/50 transition-colors"
                                            onClick={() => updateAndSave({ pos_sound_enabled: !deviceSettings.pos_sound_enabled })}
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-700">操作音效開關</span>
                                                <span className="text-[10px] text-slate-400 uppercase tracking-tight">Operation Sound Effects</span>
                                            </div>
                                            <div className={cn(
                                                "w-12 h-6 rounded-full relative transition-all duration-300 shadow-inner",
                                                deviceSettings.pos_sound_enabled ? "bg-[#D4AF37]" : "bg-slate-300"
                                            )}>
                                                <div className={cn(
                                                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                                                    deviceSettings.pos_sound_enabled ? "right-1" : "left-1"
                                                )} />
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </section>
                    </div>

                    {/* 區塊三：個人資訊與安全 */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 px-1 text-slate-700">
                            <UserCircle size={18} className="text-slate-400" />
                            <h2 className="font-bold">個人資訊與帳號安全</h2>
                        </div>
                        <Card className="border-slate-200 shadow-sm overflow-hidden">
                            <div className="grid grid-cols-1 md:grid-cols-12">
                                <CardContent className="p-8 md:col-span-8 space-y-8 border-r border-slate-100">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-xs text-slate-500 uppercase font-bold tracking-wider">真實姓名</Label>
                                            <Input
                                                value={profile.full_name}
                                                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                                                className="h-12 bg-slate-50 border-slate-200 font-bold"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs text-slate-500 uppercase font-bold tracking-wider">暱稱 (Nickname)</Label>
                                            <Input
                                                value={profile.nickname}
                                                onChange={(e) => setProfile({ ...profile, nickname: e.target.value })}
                                                placeholder="用於 POS 顯示"
                                                className="h-12 bg-slate-50 border-slate-200"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs text-slate-500 uppercase font-bold tracking-wider">聯絡電話</Label>
                                            <Input
                                                value={profile.phone}
                                                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                                className="h-12 bg-slate-50 border-slate-200"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs text-slate-500 uppercase font-bold tracking-wider">電子郵件地址</Label>
                                        <Input
                                            value={profile.email}
                                            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                            className="h-12 bg-slate-50 border-slate-200"
                                        />
                                    </div>
                                    <div className="pt-2">
                                        <Button
                                            variant="default"
                                            className="bg-slate-900 text-white rounded-xl px-10 h-11 font-bold hover:bg-slate-800 transition-all active:scale-95 shadow-md"
                                            onClick={handleSaveProfile}
                                            disabled={saving}
                                        >
                                            儲存修改
                                        </Button>
                                    </div>
                                </CardContent>
                                <CardContent className="p-8 md:col-span-4 bg-slate-50/30 flex flex-col justify-center gap-6">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-black text-[#D4AF37] uppercase tracking-widest flex items-center gap-2">
                                            <Key size={14} /> 變更 PIN 碼
                                        </Label>
                                        <button type="button" onClick={() => setShowPin(!showPin)} className="p-1 hover:bg-slate-100 rounded text-slate-400">
                                            {showPin ? <Eye size={16} /> : <EyeOff size={16} />}
                                        </button>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Input
                                                type={showPin ? "text" : "password"}
                                                placeholder="ORIGINAL PIN"
                                                maxLength={8}
                                                value={profile.old_pin}
                                                onChange={(e) => setProfile({ ...profile, old_pin: e.target.value.replace(/\D/g, '') })}
                                                className="h-14 bg-white border-2 border-slate-200 text-center text-3xl font-black font-mono tracking-[0.2em] focus:border-[#D4AF37] shadow-sm rounded-xl"
                                            />
                                        </div>
                                        <div className="flex flex-col items-center justify-center -my-2 relative z-10 gap-1">
                                            <div className="bg-slate-50 p-1.5 rounded-full border border-slate-100 shadow-sm animate-bounce duration-1000">
                                                <ChevronDown className="text-[#D4AF37]" size={20} />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Input
                                                type={showPin ? "text" : "password"}
                                                placeholder="NEW PIN"
                                                maxLength={8}
                                                value={profile.pin}
                                                onChange={(e) => setProfile({ ...profile, pin: e.target.value.replace(/\D/g, '') })}
                                                className="h-14 bg-white border-2 border-slate-200 text-center text-3xl font-black font-mono tracking-[0.2em] focus:border-[#D4AF37] shadow-sm rounded-xl"
                                            />
                                        </div>
                                        <p className="text-[10px] text-slate-400 text-center leading-relaxed font-medium">請輸入 6-8 位數字<br />變更後請牢記，需輸入原 PIN 碼才能驗證</p>
                                        <Button
                                            className="w-full h-12 bg-[#D4AF37] hover:bg-[#C5A028] text-white font-black rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50"
                                            disabled={saving || !profile.pin}
                                            onClick={handleSaveProfile}
                                        >
                                            確認變更 PIN 碼
                                        </Button>
                                    </div>
                                </CardContent>
                            </div>
                        </Card>
                    </section>

                    {/* Footer Info */}
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-10 border-t border-slate-200">
                        <div className="flex items-center gap-6 text-slate-400">
                            <div className="flex items-center gap-2">
                                <Info size={14} />
                                <span className="text-[11px] font-bold uppercase tracking-wider">
                                    Device: <span className="font-mono text-slate-500 font-medium ml-1">
                                        {mounted && (localStorage.getItem('device_uuid') || localStorage.getItem('store_account') || 'LOC-DEVICE-01').substring(0, 18)}
                                    </span>
                                </span>
                            </div>
                            <div className="w-px h-3 bg-slate-200" />
                            <span className="text-[11px] font-bold uppercase tracking-wider">Version: 2.1.0-PRO</span>
                        </div>
                        <p className="text-[11px] text-slate-300 font-bold uppercase tracking-[0.1em]">© 2026 StallEasy POS Engine</p>
                    </div>

                    {/* Extra spacing to prevent cutting off on mobile/iPad */}
                    <div className="h-3 shrink-0" />
                </div>
            </div>
        </div>
    );
}
