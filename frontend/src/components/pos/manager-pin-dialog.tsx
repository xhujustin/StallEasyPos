'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface ManagerPinDialogProps {
    open: boolean;
    onSuccess: () => void;
    onCancel: () => void;
}

export function ManagerPinDialog({ open, onSuccess, onCancel }: ManagerPinDialogProps) {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');

    const handlePinInput = (num: string) => {
        if (pin.length < 6) {
            setPin((prev) => prev + num);
            setError('');
        }
    };

    const handleBackspace = () => {
        setPin((prev) => prev.slice(0, -1));
        setError('');
    };

    const handleClear = () => {
        setPin('');
        setError('');
    };

    const handleVerify = () => {
        // Verify manager/owner PIN (000000 for owner, could add manager PIN)
        if (pin === '000000') {
            setPin('');
            setError('');
            onSuccess();
        } else {
            setError('無效的主管 PIN 碼');
            setPin('');
        }
    };

    const handleCancel = () => {
        setPin('');
        setError('');
        onCancel();
    };

    return (
        <Dialog open={open} onOpenChange={handleCancel}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>需要主管授權</DialogTitle>
                    <DialogDescription>
                        請輸入主管 PIN 碼以繼續結帳
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="flex justify-center">
                        <Input
                            type="password"
                            value={pin}
                            readOnly
                            className="text-center text-2xl tracking-[1em] h-14 font-mono"
                            placeholder="••••••"
                        />
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="grid grid-cols-3 gap-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                            <Button
                                key={num}
                                variant="outline"
                                className="h-14 text-xl font-medium"
                                onClick={() => handlePinInput(num.toString())}
                            >
                                {num}
                            </Button>
                        ))}
                        <Button
                            variant="outline"
                            className="h-14 text-lg font-medium text-red-600"
                            onClick={handleClear}
                        >
                            C
                        </Button>
                        <Button
                            variant="outline"
                            className="h-14 text-xl font-medium"
                            onClick={() => handlePinInput('0')}
                        >
                            0
                        </Button>
                        <Button
                            variant="outline"
                            className="h-14 text-lg font-medium"
                            onClick={handleBackspace}
                        >
                            ⌫
                        </Button>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={handleCancel}
                        >
                            取消
                        </Button>
                        <Button
                            className="flex-1 bg-[#D4AF37] hover:bg-[#C5A028]"
                            onClick={handleVerify}
                            disabled={pin.length < 4}
                        >
                            確認
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
