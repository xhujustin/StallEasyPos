'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function LoginPage() {
    const router = useRouter();
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handlePinInput = (num: string) => {
        if (pin.length < 6) {
            setPin((prev) => prev + num);
            setError('');
        }
    };

    const handleClear = () => {
        setPin('');
        setError('');
    };

    const handleBackspace = () => {
        setPin((prev) => prev.slice(0, -1));
        setError('');
    };

    const handleLogin = async () => {
        setLoading(true);
        // Simulate API call
        if (pin === '000000') {
            // Mock successful login
            document.cookie = `token=mock_token; path=/; max-age=3600`;
            document.cookie = `role=owner; path=/; max-age=3600`; // Default to owner for now
            router.push('/pos');
        } else if (pin === '111111') {
            document.cookie = `token=mock_token; path=/; max-age=3600`;
            document.cookie = `role=staff; path=/; max-age=3600`;
            router.push('/pos');
        } else {
            setError('無效的 PIN 碼');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-lg border-slate-200">
                <CardHeader className="text-center space-y-2">
                    <CardTitle className="text-2xl font-bold text-slate-900">StallEasy POS</CardTitle>
                    <div className="text-sm text-slate-500">請輸入員工 PIN 碼</div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex justify-center">
                        <Input
                            type="password"
                            value={pin}
                            readOnly
                            className="text-center text-3xl tracking-[1em] h-16 font-mono border-slate-300 focus:border-slate-500 focus:ring-0"
                            placeholder="••••••"
                        />
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>錯誤</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="grid grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                            <Button
                                key={num}
                                variant="outline"
                                className="h-16 text-2xl font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 border-slate-300"
                                onClick={() => handlePinInput(num.toString())}
                            >
                                {num}
                            </Button>
                        ))}
                        <Button
                            variant="outline"
                            className="h-16 text-xl font-medium text-red-600 hover:bg-red-50 border-slate-300"
                            onClick={handleClear}
                        >
                            C
                        </Button>
                        <Button
                            variant="outline"
                            className="h-16 text-2xl font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 border-slate-300"
                            onClick={() => handlePinInput('0')}
                        >
                            0
                        </Button>
                        <Button
                            variant="outline"
                            className="h-16 text-xl font-medium text-slate-700 hover:bg-slate-100 border-slate-300"
                            onClick={handleBackspace}
                        >
                            ⌫
                        </Button>
                    </div>

                    <Button
                        className="w-full h-14 text-lg font-semibold bg-[#D4AF37] hover:bg-[#C5A028] text-white shadow-sm"
                        onClick={handleLogin}
                        disabled={loading || pin.length < 4}
                    >
                        {loading ? '登入中...' : '登入'}
                    </Button>

                    <div className="text-center text-xs text-slate-400 mt-4">
                        Default Owner PIN: 000000 | Staff: 111111
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
