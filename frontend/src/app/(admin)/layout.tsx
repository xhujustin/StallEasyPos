'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Box, Users, Settings, FileText, ExternalLink, ChevronDown, Package, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/store/auth-store';
import styles from './layout.module.css';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, selectedStoreId, setSelectedStore } = useAuthStore();

    const navItems = [
        { href: '/admin/dashboard', icon: LayoutDashboard, label: '儀表板' },
        { href: '/admin/reports', icon: BarChart3, label: '報表分析' },
        { href: '/admin/products', icon: Box, label: '商品管理' },
        { href: '/admin/materials', icon: Package, label: '耗材管理' },
        { href: '/admin/orders', icon: FileText, label: '訂單管理' },
        { href: '/admin/users', icon: Users, label: '人員管理' },
        { href: '/admin/settings', icon: Settings, label: '系統設定' },
    ];

    const currentStore = user?.stores?.find((s) => s.id === selectedStoreId);

    const handleStoreChange = (storeId: number) => {
        setSelectedStore(storeId);
        // 重新載入當前頁面以更新資料
        router.refresh();
    };

    return (
        <div className={styles.container}>
            <aside className={styles.sidebar}>
                <div className={styles.header}>
                    <div className={styles.logo}>
                        <Image src="/icon.png" alt="Logo" width={35} height={35} className="rounded-md" />
                    </div>
                    <span className={styles.brandName}>StallEasy Admin</span>
                </div>

                {/* 店鋪選擇下拉選單 */}
                {user?.stores && user.stores.length > 0 && (
                    <div className="px-3 py-3 mt-1">
                        <label className="text-sm font-bold text-slate-900 mb-2 block">當前店鋪</label>
                        <div className="relative">
                            <select
                                value={selectedStoreId || ''}
                                onChange={(e) => handleStoreChange(Number(e.target.value))}
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-900 appearance-none cursor-pointer hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                {user.stores.map((store) => (
                                    <option key={store.id} value={store.id}>
                                        {store.name}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                )}

                <nav className={styles.nav}>
                    {navItems.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        const Icon = item.icon;
                        return (
                            <Link key={item.href} href={item.href}>
                                <Button
                                    variant={isActive ? "secondary" : "ghost"}
                                    className={cn(
                                        styles.navButton,
                                        isActive ? styles.navButtonActive : styles.navButtonInactive
                                    )}
                                >
                                    <Icon className={styles.navIcon} />
                                    {item.label}
                                </Button>
                            </Link>
                        );
                    })}
                </nav>

                <div className={styles.footer}>
                    <Link href="/pos">
                        <Button variant="outline" className={styles.posLink}>
                            <ExternalLink className="w-4 h-4" />
                            前往 POS
                        </Button>
                    </Link>
                </div>
            </aside>

            <main className={styles.mainContent}>
                {children}
            </main>
        </div>
    );
}
