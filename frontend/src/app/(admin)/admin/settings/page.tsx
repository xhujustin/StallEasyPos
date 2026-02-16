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
    Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function AdminSettingsPage() {
    const router = useRouter();
    const { user, selectedStoreId } = useAuthStore();
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

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

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;

        if (!user || !selectedStoreId) {
            router.push('/select-store');
            return;
        }

        loadSettings();
    }, [mounted, user, selectedStoreId]);

    const loadSettings = async () => {
        if (!selectedStoreId) return;
        try {
            setLoading(true);
            const data = await settingsApi.getStoreProfile(selectedStoreId);
            setSettings(data);
        } catch (error) {
            console.error('載入設定失敗:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!selectedStoreId) return;
        try {
            setSaving(true);
            setSuccess(false);

            await settingsApi.updateBatch(selectedStoreId, {
                scope: SettingScope.STORE,
                settings: settings
            });

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (error) {
            console.error('儲存設定失敗:', error);
            alert('儲存失敗，請重試');
        } finally {
            setSaving(false);
        }
    };

    if (!mounted || loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-slate-400 animate-pulse font-medium">載入系統設定中...</div>
            </div>
        );
    }

    const currentStore = user?.stores?.find((s) => s.id === selectedStoreId);

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <span className="p-2 bg-[#D4AF37] rounded-xl text-white">
                            <Store className="w-6 h-6" />
                        </span>
                        系統設定
                    </h1>
                    <p className="text-slate-500 mt-1">管理店鋪內容、收據格式與營運參數</p>
                </div>
                <div className="flex items-center gap-3">
                    {success && (
                        <span className="text-green-600 flex items-center gap-1.5 text-sm font-bold bg-green-50 px-3 py-1.5 rounded-full border border-green-100 animate-in fade-in slide-in-from-right-4">
                            <CheckCircle2 className="w-4 h-4" />
                            設定已儲存
                        </span>
                    )}
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-[#D4AF37] hover:bg-[#B8962E] text-white px-8 h-12 rounded-xl font-bold shadow-lg shadow-[#D4AF37]/20 transition-all active:scale-95 flex items-center gap-2"
                    >
                        {saving ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save className="w-5 h-5" />
                        )}
                        儲存變更
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 店鋪與收據設定 */}
                <Card className="border-none shadow-sm overflow-hidden bg-white/60 backdrop-blur-sm">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                        <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                            <Receipt className="w-5 h-5 text-[#D4AF37]" />
                            店鋪與收據資訊
                        </CardTitle>
                        <CardDescription>設定會顯示在收據與發票上的內容</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-5">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">店鋪帳號 (登入憑證)</label>
                            <Input
                                placeholder="請輸入登入使用的店鋪帳號"
                                value={settings.store_account}
                                onChange={(e) => setSettings({ ...settings, store_account: e.target.value })}
                                className="border-slate-200 focus:border-[#D4AF37] focus:ring-[#D4AF37]/5 h-11 font-mono font-bold text-slate-800 bg-white"
                            />
                            <p className="text-[11px] text-slate-400">這是您登入 POS 與後台時使用的帳號，變更後立即生效。</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">店鋪名稱</label>
                            <Input
                                placeholder="請輸入店鋪名稱"
                                value={settings.store_name}
                                onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
                                className="border-slate-200 focus:border-[#D4AF37] focus:ring-[#D4AF37]/5 h-11 font-bold text-slate-800"
                            />
                            <p className="text-[11px] text-slate-400">這是您店鋪的對外顯示名稱。</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">收據抬頭 / 店鋪簡稱</label>
                            <Input
                                placeholder="例如：StallEasy 行動餐飲"
                                value={settings.receipt_header}
                                onChange={(e) => setSettings({ ...settings, receipt_header: e.target.value })}
                                className="border-slate-200 focus:border-[#D4AF37] focus:ring-[#D4AF37]/5 h-11"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">統一編號</label>
                            <Input
                                placeholder="8 位數數字"
                                value={settings.business_id}
                                onChange={(e) => setSettings({ ...settings, business_id: e.target.value })}
                                className="border-slate-200 focus:border-[#D4AF37] focus:ring-[#D4AF37]/5 h-11"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">收據頁尾文字</label>
                            <textarea
                                rows={3}
                                placeholder="例如：週一公休 / 歡迎下次光臨"
                                value={settings.receipt_footer}
                                onChange={(e) => setSettings({ ...settings, receipt_footer: e.target.value })}
                                className="w-full rounded-md border border-slate-200 p-3 text-sm focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/5"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* 稅務與環境設定 */}
                <div className="space-y-6">
                    <Card className="border-none shadow-sm overflow-hidden bg-white/60 backdrop-blur-sm">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                            <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                                <Percent className="w-5 h-5 text-[#D4AF37]" />
                                稅務設定
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">稅率 (%)</label>
                                    <Input
                                        type="number"
                                        value={settings.tax_rate}
                                        onChange={(e) => setSettings({ ...settings, tax_rate: parseFloat(e.target.value) })}
                                        className="border-slate-200 focus:border-[#D4AF37] focus:ring-[#D4AF37]/5 h-11"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">顯示模式</label>
                                    <select
                                        value={settings.tax_mode}
                                        onChange={(e) => setSettings({ ...settings, tax_mode: e.target.value })}
                                        className="w-full h-11 px-3 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/5"
                                    >
                                        <option value="inclusive">內含稅</option>
                                        <option value="exclusive">未稅 (外加)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="bg-amber-50 p-3 rounded-lg flex gap-3">
                                <Info className="w-5 h-5 text-amber-500 shrink-0" />
                                <p className="text-[11px] text-amber-700 leading-relaxed">
                                    稅務設定會影響結帳後的金額計算與報表顯示。台灣一般門市建議使用「內含稅」且稅率為 5%。
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm overflow-hidden bg-white/60 backdrop-blur-sm">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                            <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                                <Globe className="w-5 h-5 text-[#D4AF37]" />
                                地區與語系
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-5">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">系統時區</label>
                                <select
                                    value={settings.timezone}
                                    onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                                    className="w-full h-11 px-3 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/5"
                                >
                                    <option value="Asia/Taipei">Asia/Taipei (台北)</option>
                                    <option value="Asia/Tokyo">Asia/Tokyo (東京)</option>
                                    <option value="UTC">UTC</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">介面語言</label>
                                <select
                                    value={settings.language}
                                    onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                                    className="w-full h-11 px-3 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/5"
                                >
                                    <option value="zh-TW">繁體中文 (台灣)</option>
                                    <option value="en-US">English (United States)</option>
                                </select>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <div className="flex justify-end gap-3 mt-4 border-t border-slate-200 pt-6">
                <Button
                    variant="ghost"
                    onClick={() => router.back()}
                    className="text-slate-500 font-bold px-6"
                >
                    取消
                </Button>
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-[#D4AF37] hover:bg-[#B8962E] text-white px-10 h-12 rounded-xl font-bold"
                >
                    確認儲存
                </Button>
            </div>
        </div>
    );
}
