'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import styles from './page.module.css';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/store/auth-store';

export default function LoginPage() {
    const router = useRouter();
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handlePinInput = (num: string) => {
        if (pin.length < 8) { // Changed to 8 digits
            setPin((prev) => prev + num);
            setError('');
        }
    };

    // Keyboard support
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key >= '0' && e.key <= '9') {
                handlePinInput(e.key);
            } else if (e.key === 'Backspace') {
                handleBackspace();
            } else if (e.key === 'Enter') {
                // Prevent default form submission if any
                e.preventDefault();
                // Trigger login if PIN length > 3
                if (pin.length >= 4) {
                    handleLogin();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [pin]);

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
        setError('');

        try {
            // Map PIN to credentials (Temporary for V1 connection test)
            // In production, this should be replaced by a real PIN auth endpoint or user/pass input
            let username = '';
            let password = '';

            if (pin === '000000') {
                username = 'admin'; // Default admin
                password = 'password';
            } else if (pin === '111111') {
                username = 'staff';
                password = 'password';
            } else {
                // Try to use PIN as password for a generic user? 
                // For now, strict mapping to avoid confusion
                throw new Error('無效的 PIN 碼');
            }

            // 1. Login to get token
            const { access_token } = await authApi.login({ username, password });

            // Set cookie for middleware/server-side check
            document.cookie = `token=${access_token}; path=/; max-age=${7 * 24 * 60 * 60}`;
            document.cookie = `role=${username === 'admin' ? 'owner' : 'staff'}; path=/; max-age=${7 * 24 * 60 * 60}`;

            // 2. Set token temporarily to allow getMe
            useAuthStore.getState().setAuth(access_token, { id: 0, username: 'loading...', is_active: true, stores: [] });

            // 3. Get User Info
            const meResponse = await authApi.getMe();
            // meResponse is { data: User } based on ResponseBase[UserOut] wrapper in backend?
            // Wait, backend returns ResponseBase(data=user). 
            // So response.data in axios is ResponseBase. 
            // So response.data.data is the user.

            const user = meResponse;

            // 4. Update Store (先清除舊的selectedStoreId)
            useAuthStore.getState().setSelectedStore(null as any);
            useAuthStore.getState().setAuth(access_token, user);

            // 5. Redirect based on stores count
            if (!user.stores || user.stores.length === 0) {
                setError('此帳號沒有關聯任何店鋪,請聯絡管理員');
                return;
            } else if (user.stores.length === 1) {
                // 只有一個店鋪,直接設定並跳轉
                useAuthStore.getState().setSelectedStore(user.stores[0].id);
                window.location.href = '/pos';
            } else {
                // 多個店鋪,跳轉至選擇頁面
                window.location.href = '/select-store';
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            console.error('Login failed:', err);
            // Handle Axios error or logic error
            const msg = err.response?.data?.detail || err.message || '登入失敗，請檢查 PIN 碼或網絡連線';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <Card className={styles.card}>
                <CardHeader className={styles.header}>
                    <CardTitle className={styles.title}>StallEasy POS</CardTitle>
                    <div className={styles.subtitle}>請輸入員工 PIN 碼</div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex justify-center">
                        <Input
                            type="password"
                            value={pin}
                            readOnly
                            placeholder="••••••"
                            className="text-center text-2xl tracking-widest font-mono h-14 bg-white/50 border-slate-200 focus:border-slate-400 focus:ring-slate-200 transition-all duration-300"
                            autoComplete="off"
                            suppressHydrationWarning
                        />
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>錯誤</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <div className={styles.keypad}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                            <Button
                                key={num}
                                variant="outline"
                                className={styles.keyButton}
                                onClick={() => handlePinInput(num.toString())}
                            >
                                {num}
                            </Button>
                        ))}
                        <Button
                            variant="outline"
                            className={styles.clearButton}
                            onClick={handleClear}
                        >
                            C
                        </Button>
                        <Button
                            variant="outline"
                            className={styles.keyButton}
                            onClick={() => handlePinInput('0')}
                        >
                            0
                        </Button>
                        <Button
                            variant="outline"
                            className={styles.backspaceButton}
                            onClick={handleBackspace}
                        >
                            ⌫
                        </Button>
                    </div>

                    <Button
                        className={styles.loginButton}
                        onClick={handleLogin}
                        disabled={loading || pin.length < 4}
                    >
                        {loading ? '登入中...' : '登入'}
                    </Button>

                    <div className={styles.hint}>
                        Default Owner PIN: 000000 | Staff: 111111
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
