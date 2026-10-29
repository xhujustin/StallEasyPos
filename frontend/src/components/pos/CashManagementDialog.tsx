import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '../ui/textarea';
import { shiftApi } from '@/lib/api/shifts';
import { Loader2, PlusCircle, MinusCircle, Plus, X } from 'lucide-react';
import axios from 'axios';

const DEFAULT_REASON_PRESETS = ['電費', '瓦斯', '晚餐'];
const CUSTOM_REASON_STORAGE_KEY = 'stalleasy-cash-reason-presets';

interface CashManagementDialogProps {
    open: boolean;
    onClose: () => void;
    shiftId: number | null;
    onSuccess: () => void;
}

export function CashManagementDialog({ open, onClose, shiftId, onSuccess }: CashManagementDialogProps) {
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [type, setType] = useState<'in' | 'out'>('in');
    const [loading, setLoading] = useState(false);
    const [customReasonPresets, setCustomReasonPresets] = useState<string[]>([]);

    useEffect(() => {
        try {
            const saved = JSON.parse(localStorage.getItem(CUSTOM_REASON_STORAGE_KEY) || '[]');
            if (Array.isArray(saved)) {
                setCustomReasonPresets(saved.filter((item): item is string => typeof item === 'string' && item.trim().length > 0));
            }
        } catch {
            setCustomReasonPresets([]);
        }
    }, []);

    const saveCustomReasonPresets = (presets: string[]) => {
        setCustomReasonPresets(presets);
        localStorage.setItem(CUSTOM_REASON_STORAGE_KEY, JSON.stringify(presets));
    };

    const addCustomReasonPreset = () => {
        const value = window.prompt('輸入常用備註名稱');
        const preset = value?.trim();
        if (!preset) return;

        const allPresets = [...DEFAULT_REASON_PRESETS, ...customReasonPresets];
        if (allPresets.some((item) => item.toLocaleLowerCase() === preset.toLocaleLowerCase())) {
            setReason(preset);
            return;
        }

        saveCustomReasonPresets([...customReasonPresets, preset]);
        setReason(preset);
    };

    const removeCustomReasonPreset = (preset: string) => {
        saveCustomReasonPresets(customReasonPresets.filter((item) => item !== preset));
    };

    const handleNumberClick = (num: string) => {
        setAmount((prev) => prev + num);
    };

    const handleBackspace = () => {
        setAmount((prev) => prev.slice(0, -1));
    };

    const handleClear = () => {
        setAmount('');
    };

    const submitTransaction = async () => {
        if (!shiftId) return;

        const val = parseFloat(amount);
        if (isNaN(val) || val <= 0) {
            alert('請輸入有效金額');
            return;
        }

        setLoading(true);
        try {
            await shiftApi.modifyCash(shiftId, {
                amount: val,
                type,
                reason: reason || undefined
            });
            onSuccess();
            handleClose();
        } catch (error: unknown) {
            console.error(error);
            const msg = axios.isAxiosError<{ detail?: string }>(error)
                ? error.response?.data?.detail || '操作失敗'
                : '操作失敗';
            alert(`操作失敗: ${msg}`);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setAmount('');
        setReason('');
        setType('in');
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden flex h-[620px] max-h-[90vh] [&_button[class*='absolute']]:hidden">
                <DialogHeader className="sr-only">
                    <DialogTitle>錢箱管理</DialogTitle>
                    <DialogDescription>錢箱進出管理</DialogDescription>
                </DialogHeader>

                {/* Left: Inputs & Display */}
                <div className="w-1/2 bg-slate-50 p-6 border-r border-slate-200 flex flex-col overflow-y-auto">
                    <div className="flex gap-2 mb-6 p-1 bg-white rounded-lg border border-slate-200">
                        <Button
                            type="button"
                            variant="ghost"
                            className={`flex-1 ${type === 'in' ? 'bg-green-100 text-green-700 hover:bg-green-200 hover:text-green-800' : 'text-slate-500'}`}
                            onClick={() => setType('in')}
                        >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            補入 (In)
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            className={`flex-1 ${type === 'out' ? 'bg-red-100 text-red-700 hover:bg-red-200 hover:text-red-800' : 'text-slate-500'}`}
                            onClick={() => setType('out')}
                        >
                            <MinusCircle className="mr-2 h-4 w-4" />
                            取出 (Out)
                        </Button>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="amount_display">金額</Label>
                            <div className={`h-16 flex items-center px-4 rounded-md border-2 text-3xl font-bold font-mono bg-white ${type === 'in' ? 'border-green-500 text-green-600' : 'border-red-500 text-red-600'}`}>
                                <span className="mr-2">$</span>
                                {amount || '0'}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="reason">備註</Label>
                            <Textarea
                                id="reason"
                                placeholder="輸入原因..."
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="resize-none h-24 bg-white"
                            />
                            <div className="space-y-2">
                                <span className="text-xs font-medium text-slate-500">快速選擇</span>
                                <div className="flex flex-wrap gap-2">
                                    {[...DEFAULT_REASON_PRESETS, ...customReasonPresets].map((preset) => {
                                        const isCustom = customReasonPresets.includes(preset);
                                        return (
                                            <span key={preset} className="inline-flex items-center">
                                                <button
                                                    type="button"
                                                    onClick={() => setReason(preset)}
                                                    className={`rounded-l-full border px-3 py-1.5 text-xs font-bold transition-colors ${reason === preset
                                                        ? 'border-amber-400 bg-amber-100 text-amber-800'
                                                        : 'border-slate-200 bg-white text-slate-600 hover:border-amber-300 hover:bg-amber-50'
                                                    } ${!isCustom ? 'rounded-r-full' : ''}`}
                                                >
                                                    {preset}
                                                </button>
                                                {isCustom && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeCustomReasonPreset(preset)}
                                                        className="rounded-r-full border border-l-0 border-slate-200 bg-white px-1.5 py-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                                                        title={`移除「${preset}」`}
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                )}
                                            </span>
                                        );
                                    })}
                                    <button
                                        type="button"
                                        onClick={addCustomReasonPreset}
                                        className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-500 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700"
                                    >
                                        <Plus size={14} />自己設定
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Keypad */}
                <div className="w-1/2 p-6 bg-white flex flex-col">
                    <div className="grid grid-cols-3 gap-3 flex-1">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                            <Button
                                key={num}
                                variant="outline"
                                className="text-2xl font-bold text-slate-700 h-full hover:bg-slate-50 active:scale-95 transition-all"
                                onClick={() => handleNumberClick(num.toString())}
                            >
                                {num}
                            </Button>
                        ))}
                        <Button
                            variant="outline"
                            className="text-xl font-bold text-red-600 h-full hover:bg-red-50 border-red-100"
                            onClick={handleClear}
                        >
                            C
                        </Button>
                        <Button
                            variant="outline"
                            className="text-2xl font-bold text-slate-700 h-full hover:bg-slate-50 active:scale-95"
                            onClick={() => handleNumberClick('0')}
                        >
                            0
                        </Button>
                        <Button
                            variant="outline"
                            className="text-xl font-medium text-slate-600 h-full hover:bg-slate-100"
                            onClick={handleBackspace}
                        >
                            ⌫
                        </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4 h-16 shrink-0">
                        <Button variant="outline" onClick={handleClose} disabled={loading} className="h-full text-lg">
                            取消
                        </Button>
                        <Button
                            onClick={submitTransaction}
                            disabled={loading || !amount}
                            className={`h-full text-lg text-white shadow-md active:scale-95 transition-all ${type === 'in' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                        >
                            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : '確認'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
