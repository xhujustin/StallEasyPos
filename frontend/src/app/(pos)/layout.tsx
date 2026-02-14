'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Store, FileText, DollarSign, Settings, LogOut, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/lib/store/cart-store';
import { useAuthStore } from '@/lib/store/auth-store';
import { SyncIndicator } from '@/components/pos/sync-indicator';
import styles from './layout.module.css';

export default function POSLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { user, selectedStoreId } = useAuthStore();
    const itemCount = useCartStore((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));

    const navItems = [
        { href: '/pos', icon: Store, label: '收銀' },
        { href: '/pos/orders', icon: FileText, label: '訂單' },
        { href: '/pos/closing', icon: DollarSign, label: '日結' },
        { href: '/pos/settings', icon: Settings, label: '設定' },
    ];

    // 權限檢查：只有 owner 或 manager 才能看到管理入口
    const currentStore = user?.stores?.find((s) => s.id === selectedStoreId);
    if (currentStore?.user_role === 'owner' || currentStore?.user_role === 'manager') {
        navItems.push({ href: '/admin/dashboard', icon: LayoutDashboard, label: '管理店鋪' });
    }

    return (
        <div className={styles.container}>
            <aside className={styles.sidebar}>
                <div className={styles.logo}>
                    <Image src="/icon.png" alt="Logo" width={64} height={64} className="rounded-md" />
                </div>

                <nav className={styles.nav}>
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;

                        return (
                            <Link key={item.href} href={item.href}>
                                <div className={cn(
                                    styles.navItem,
                                    isActive ? styles.navItemActive : styles.navItemInactive
                                )}>
                                    <div className="relative">
                                        <Icon className={styles.navIcon} />
                                        {item.href === '/pos' && itemCount > 0 && (
                                            <span className={styles.badge}>{itemCount}</span>
                                        )}
                                    </div>
                                    <span className={styles.navLabel}>{item.label}</span>
                                </div>
                            </Link>
                        );
                    })}
                </nav>

                <div className={styles.footer}>
                    <SyncIndicator />
                    <button
                        onClick={() => {
                            document.cookie = 'token=; path=/; max-age=0';
                            document.cookie = 'role=; path=/; max-age=0';
                            window.location.href = '/login';
                        }}
                        className={styles.logoutButton}
                    >
                        <LogOut className={styles.navIcon} />
                        <span className={styles.navLabel}>登出</span>
                    </button>
                </div>
            </aside>

            <main className={styles.mainContent}>
                {children}
            </main>
        </div>
    );
}
