import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '../ui/textarea';
import { shiftApi } from '@/lib/api/shifts';
import { Loader2, PlusCircle, MinusCircle } from 'lucide-react';

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

    const handleNumberClick = (num: string) => {
        setAmount((prev) => prev + num);
    };

    const handleBackspace = () => {
        setAmount((prev) => prev.slice(0, -1));
    };

    const handleClear = () => {
        setAmount('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        submitTransaction();
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
        } catch (error: any) {
            console.error(error);
            const msg = error.response?.data?.detail || '操作失敗';
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
            <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden flex h-[500px] [&_button[class*='absolute']]:hidden">
                <DialogHeader className="sr-only">
                    <DialogTitle>錢箱管理</DialogTitle>
                    <DialogDescription>錢箱進出管理</DialogDescription>
                </DialogHeader>

                {/* Left: Inputs & Display */}
                <div className="w-1/2 bg-slate-50 p-6 border-r border-slate-200 flex flex-col">
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

                    <div className="space-y-4 flex-1">
                        <div className="space-y-2">
                            <Label htmlFor="amount_display">金額</Label>
                            <div className={`h-16 flex items-center px-4 rounded-md border-2 text-3xl font-bold font-mono bg-white ${type === 'in' ? 'border-green-500 text-green-600' : 'border-red-500 text-red-600'}`}>
                                <span className="mr-2">$</span>
                                {amount || '0'}
                            </div>
                        </div>

                        <div className="space-y-2 flex-1 flex flex-col">
                            <Label htmlFor="reason">備註</Label>
                            <Textarea
                                id="reason"
                                placeholder="輸入原因..."
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="resize-none flex-1 bg-white"
                            />
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
