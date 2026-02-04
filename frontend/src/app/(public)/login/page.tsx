'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import styles from './page.module.css';

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
        if (pin === '000000') {
            document.cookie = `token=mock_token; path=/; max-age=3600`;
            document.cookie = `role=owner; path=/; max-age=3600`;
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
                            className={styles.pinInput}
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
