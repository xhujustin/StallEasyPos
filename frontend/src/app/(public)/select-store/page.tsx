'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Store, Building2 } from 'lucide-react';

export default function SelectStorePage() {
    const router = useRouter();
    const { user, selectedStoreId, setSelectedStore } = useAuthStore();
    const [mounted, setMounted] = useState(false);

    // 處理hydration
    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        // 等待hydration完成
        if (!mounted) return;

        // 如果未登入,跳轉至登入頁
        if (!user) {
            router.push('/login');
            return;
        }

        // 如果沒有店鋪,跳轉回登入頁
        if (!user.stores || user.stores.length === 0) {
            router.push('/login');
            return;
        }

        // 注意:不要在這裡處理單店邏輯,因為登入頁面已經處理了
        // 如果使用者真的到達這個頁面,表示他們有多個店鋪
    }, [mounted, user, router]);

    // 在hydration完成前不渲染
    if (!mounted) {
        return null;
    }

    if (!user || !user.stores || user.stores.length === 0) {
        return null; // 等待重定向
    }

    const handleSelectStore = (storeId: number) => {
        setSelectedStore(storeId);
        router.push('/pos');
    };

    const handleManageStores = () => {
        // 如果還沒選擇店鋪,自動選擇第一個店鋪
        if (!selectedStoreId && user.stores.length > 0) {
            const firstStore = user.stores[0];
            setSelectedStore(firstStore.id);
        }
        router.push('/admin/dashboard');
    };

    // 判斷使用者是否有owner角色
    const hasOwnerRole = user.stores.some(
        (store) => store.user_role === 'owner' || store.owner_id === user.id
    );

    // 取得角色標籤
    const getRoleBadge = (store: typeof user.stores[0]) => {
        if (store.user_role) {
            switch (store.user_role) {
                case 'owner':
                    return '老闆';
                case 'manager':
                    return '經理';
                case 'staff':
                    return '店員';
                default:
                    return '';
            }
        }
        // 備用判斷
        return store.owner_id === user.id ? '老闆' : '店員';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="w-full max-w-4xl">
                <Card className="shadow-2xl border-0">
                    <CardContent className="p-8">
                        <div className="text-center mb-8">
                            <h1 className="text-3xl font-bold text-slate-900 mb-2">
                                選擇要操作的店鋪
                            </h1>
                            <p className="text-slate-600">
                                您有 {user.stores.length} 個店鋪的操作權限
                            </p>
                        </div>

                        {/* 店鋪網格 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                            {user.stores.map((store) => (
                                <Card
                                    key={store.id}
                                    className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 border-2 border-slate-200 hover:border-[#D4AF37]"
                                    onClick={() => handleSelectStore(store.id)}
                                >
                                    <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                                        <div className="w-16 h-16 bg-gradient-to-br from-[#D4AF37] to-[#C5A028] rounded-full flex items-center justify-center">
                                            <Store className="w-8 h-8 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-slate-900">
                                                {store.name}
                                            </h3>
                                            <span className="inline-block mt-1 px-3 py-1 bg-slate-100 text-slate-700 text-sm rounded-full">
                                                {getRoleBadge(store)}
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* 管理店鋪按鈕 (僅老闆可見) */}
                        {hasOwnerRole && (
                            <div className="border-t border-slate-200 pt-6">
                                <Button
                                    variant="outline"
                                    className="w-full h-14 text-base font-medium border-2 border-slate-300 hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-white transition-all"
                                    onClick={handleManageStores}
                                >
                                    <Building2 className="w-5 h-5 mr-2" />
                                    管理店鋪
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
