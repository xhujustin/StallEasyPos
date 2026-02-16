'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import styles from './page.module.css';
import { cn } from '@/lib/utils';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/store/auth-store';

export default function LoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [activeField, setActiveField] = useState<'username' | 'pin'>('username');
    const [showPin, setShowPin] = useState(false);

    // Load remembered username on mount
    useEffect(() => {
        const rememberedUsername = localStorage.getItem('remembered_username');
        if (rememberedUsername) {
            setUsername(rememberedUsername);
            setActiveField('pin'); // 帳號已自動填入，焦點移至 PIN
        }
    }, []);

    const handleInput = (num: string) => {
        if (activeField === 'username') {
            if (username.length < 20) {
                setUsername(prev => prev + num);
                setError('');
            }
        } else {
            if (pin.length < 8) {
                setPin((prev) => prev + num);
                setError('');
            }
        }
    };

    // Keyboard support
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key >= '0' && e.key <= '9') {
                e.preventDefault();
                handleInput(e.key);
            } else if (e.key === 'Backspace') {
                e.preventDefault();
                handleBackspace();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (activeField === 'username' && username.length > 0) {
                    setActiveField('pin');
                } else if (pin.length >= 4) {
                    handleLogin();
                }
            } else if (e.key === 'Tab') {
                e.preventDefault();
                setActiveField(prev => prev === 'username' ? 'pin' : 'username');
            }
            // Allow normal alphanumeric typing if keyboard is physical
            if (activeField === 'username' && /^[a-zA-Z0-9_]$/.test(e.key)) {
                // handleInput already handles 0-9, we can let the input field handle others or manually add
                // Since we have a virtual keypad, we'll focus on numbers/backspace for now but allow keys
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [pin, username, activeField]);

    const handleClear = () => {
        if (activeField === 'username') setUsername('');
        else setPin('');
        setError('');
    };

    const handleBackspace = () => {
        if (activeField === 'username') setUsername(prev => prev.slice(0, -1));
        else setPin((prev) => prev.slice(0, -1));
        setError('');
    };

    const handleLogin = async () => {
        if (!username) {
            setError('請輸入店鋪帳號');
            return;
        }
        if (pin.length < 4) {
            setError('PIN 碼長度不足');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // 使用帳號與 PIN 碼進行登入
            // 後端 AuthService 統一使用 PIN 驗證
            const { access_token } = await authApi.login({
                username: username,
                password: pin
            });

            // 儲存帳號以利下次自動填入
            localStorage.setItem('remembered_username', username);

            // Set cookie for middleware/server-side check
            document.cookie = `token=${access_token}; path=/; max-age=${7 * 24 * 60 * 60}`;

            // 2. Set token temporarily to allow getMe
            useAuthStore.getState().setAuth(access_token, { id: 0, username: 'loading...', is_active: true, stores: [] });

            // 3. Get User Info
            const meResponse = await authApi.getMe();
            const user = meResponse;

            // 4. Update Store (先清除舊的selectedStoreId)
            useAuthStore.getState().setSelectedStore(null as any);
            useAuthStore.getState().setAuth(access_token, user);

            // 5. Redirect based on stores count
            const isAdmin = (user as any).is_admin;
            const stores = user.stores || [];

            if (!isAdmin && stores.length === 0) {
                setError('此帳號沒有關聯任何店鋪,請聯絡管理員');
                return;
            } else if (stores.length === 1 && !isAdmin) {
                // 只有一個店鋪,直接設定並跳轉
                useAuthStore.getState().setSelectedStore(stores[0].id);
                window.location.href = '/pos';
            } else {
                // 多個店鋪,跳轉至選擇頁面
                window.location.href = '/select-store';
            }

        } catch (err: any) {
            console.error('Login failed:', err);
            const msg = err.response?.data?.detail || err.message || '登入失敗，請檢查帳號、PIN 碼或網路連線';
            setError(msg);
            // 登入失敗時，保留帳號，僅清除 PIN 碼並聚焦
            setPin('');
            setActiveField('pin');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <Card className={styles.card}>
                <CardHeader className={cn(styles.header, "pb-2")}>
                    <CardTitle className={styles.title}>StallEasy POS</CardTitle>
                    <div className={styles.subtitle}>請輸入店鋪帳號與 PIN 碼</div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">店鋪帳號</label>
                            <Input
                                type="text"
                                placeholder="••••••"
                                value={username}
                                onFocus={() => setActiveField('username')}
                                onChange={(e) => setUsername(e.target.value)}
                                className={cn(
                                    "text-center text-3xl tracking-widest font-bold h-16 bg-slate-50 border-2 transition-all duration-200",
                                    activeField === 'username' ? "border-[#D4AF37] bg-white ring-4 ring-[#D4AF37]/5" : "border-slate-100"
                                )}
                                autoComplete="username"
                            />
                        </div>

                        <div className="space-y-1 relative">
                            <div className="flex justify-between items-center pl-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">POS PIN 碼</label>
                                <button
                                    type="button"
                                    onClick={() => setShowPin(!showPin)}
                                    className="text-slate-400 hover:text-[#D4AF37] transition-colors mb-1"
                                >
                                    {showPin ? <Eye size={14} /> : <EyeOff size={14} />}
                                </button>
                            </div>
                            <Input
                                type={showPin ? "text" : "password"}
                                value={pin}
                                onFocus={() => setActiveField('pin')}
                                readOnly
                                placeholder="••••••"
                                className={cn(
                                    "text-center text-3xl tracking-widest font-bold h-16 bg-slate-50 border-2 transition-all duration-200",
                                    activeField === 'pin' ? "border-[#D4AF37] bg-white ring-4 ring-[#D4AF37]/5" : "border-slate-100"
                                )}
                                autoComplete="current-password"
                                suppressHydrationWarning
                            />
                        </div>
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
                                onClick={() => handleInput(num.toString())}
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
                            onClick={() => handleInput('0')}
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
                        不分職位，請統一使用店鋪帳號與 PIN 碼登入
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
