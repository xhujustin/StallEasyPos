'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Store as StoreRecord, useAuthStore } from '@/lib/store/auth-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Store, Building2, Plus, Loader2 } from 'lucide-react';
import { storeApi } from '@/lib/api/stores';
import { userApi } from '@/lib/api/users';

export default function SelectStorePage() {
    const router = useRouter();
    const { user, selectedStoreId, setSelectedStore, updateUser } = useAuthStore();
    const [mounted, setMounted] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [newStoreName, setNewStoreName] = useState('');
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState('');

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

        // 注意:不要在這裡處理單店邏輯,因為登入頁面已經處理了
        // 如果使用者真的到達這個頁面,表示他們有多個店鋪
    }, [mounted, user, router]);

    // 在hydration完成前不渲染
    if (!mounted) {
        return null;
    }

    const isAdmin = user?.is_admin;
    const stores = user?.stores || [];

    if (!user) {
        return null; // 等待重定向
    }

    const handleCreateStore = async () => {
        const name = newStoreName.trim();
        if (!name) {
            setCreateError('請輸入店鋪名稱');
            return;
        }
        try {
            setCreating(true);
            setCreateError('');
            const created = await storeApi.create(name);
            const freshUser = await userApi.me();
            if (freshUser.data) updateUser({ stores: freshUser.data.stores || [] });
            setSelectedStore(created.id);
            setShowCreate(false);
            setNewStoreName('');
            router.push('/admin/settings');
        } catch (error: unknown) {
            const detail = (error as { response?: { data?: { detail?: string } } }).response?.data?.detail;
            setCreateError(detail || '新增店鋪失敗，請稍後再試');
        } finally {
            setCreating(false);
        }
    };

    const handleSelectStore = (storeId: number) => {
        setSelectedStore(storeId);
        router.push('/pos');
    };

    const handleManageStores = () => {
        // 如果還沒選擇店鋪,自動選擇第一個店鋪
        if (!selectedStoreId && stores.length > 0) {
            const firstStore = stores[0];
            setSelectedStore(firstStore.id);
        }
        router.push('/admin/dashboard');
    };

    // 判斷使用者是否有owner角色
    const hasOwnerRole = isAdmin || stores.some(
        (store) => store.user_role === 'owner' || store.owner_id === user.id
    );

    // 取得角色標籤
    const getRoleBadge = (store: StoreRecord) => {
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
        return store.owner_id === user?.id ? '老闆' : '店員';
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
                                {isAdmin ? '您具備全域管理權限，可存取系統內所有店鋪' : `您有 ${stores.length} 個店鋪的操作權限`}
                            </p>
                        </div>

                        <Button
                            className="mb-6 h-12 w-full bg-[#D4AF37] font-bold text-white hover:bg-[#C5A028]"
                            onClick={() => setShowCreate(true)}
                        >
                            <Plus className="mr-2 h-5 w-5" />
                            新增店鋪
                        </Button>

                        {stores.length === 0 && (
                            <div className="mb-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                                尚未建立店鋪，請先新增第一間店鋪。
                            </div>
                        )}

                        {/* 店鋪網格 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                            {stores.map((store) => (
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

            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>新增店鋪</DialogTitle>
                        <DialogDescription>建立後會自動將您設為店鋪負責人。</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        <label className="text-sm font-bold text-slate-700">店鋪名稱</label>
                        <Input
                            value={newStoreName}
                            onChange={(event) => {
                                setNewStoreName(event.target.value);
                                setCreateError('');
                            }}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' && !creating) handleCreateStore();
                            }}
                            placeholder="例如：台北總店"
                            autoFocus
                        />
                        {createError && <p className="text-sm text-red-600">{createError}</p>}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreate(false)} disabled={creating}>取消</Button>
                        <Button onClick={handleCreateStore} disabled={creating}>
                            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            建立店鋪
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
