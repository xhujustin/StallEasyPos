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

import { useState, useEffect } from 'react';
import { shiftApi } from '@/lib/api/shifts';
import { CashManagementDialog } from '@/components/pos/CashManagementDialog';
import { Coins } from 'lucide-react';
import { toast } from 'sonner';
import { hardwareApi } from '@/lib/api/hardware';

export default function POSLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { user, selectedStoreId } = useAuthStore();
    const itemCount = useCartStore((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));

    // Cash Management State
    const [showCashDialog, setShowCashDialog] = useState(false);
    const [currentShiftId, setCurrentShiftId] = useState<number | null>(null);

    useEffect(() => {
        const fetchShift = async () => {
            if (selectedStoreId) {
                try {
                    console.log("[POSLayout] Fetching current shift for store:", selectedStoreId);
                    const shift = await shiftApi.getCurrent(selectedStoreId);
                    const newId = shift ? shift.id : null;
                    console.log("[POSLayout] Active shift status:", newId);
                    setCurrentShiftId(newId);
                } catch (err) {
                    console.error("[POSLayout] Failed to fetch shift id", err);
                }
            }
        };

        fetchShift();

        const handleShiftUpdate = () => {
            console.log("[POSLayout] Global 'shift-data-changed' event caught. Refreshing ID...");
            fetchShift();
        };

        window.addEventListener('shift-data-changed', handleShiftUpdate);

        // Also refresh when pathname changes to ensure sidebar is in sync with navigation
        handleShiftUpdate();

        return () => window.removeEventListener('shift-data-changed', handleShiftUpdate);
    }, [selectedStoreId, pathname]);

    const navItems = [
        { href: '/pos', icon: Store, label: '收銀' },
        { href: '/pos/orders', icon: FileText, label: '訂單' },
        { href: '/pos/closing', icon: DollarSign, label: '班結' },
        { href: '/pos/settings', icon: Settings, label: '設定' },
    ];

    // 權限檢查：只有 owner 或 manager 才能看到管理入口
    const currentStore = user?.stores?.find((s) => s.id === selectedStoreId);
    if (currentStore?.user_role === 'owner' || currentStore?.user_role === 'manager') {
        navItems.push({ href: '/admin/dashboard', icon: LayoutDashboard, label: '管理店鋪' });
    }

    const handleCashDrawerClick = async () => {
        if (!currentShiftId) {
            toast.error("請先開班才能使用錢箱功能");
            return;
        }
        if (selectedStoreId) {
            try {
                await hardwareApi.openDrawer(selectedStoreId);
            } catch (error) {
                console.error('Cash drawer command failed:', error);
                toast.error('錢箱開啟失敗，請檢查出單機連線');
            }
        }
        setShowCashDialog(true);
    };

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
                            <div key={item.href}>
                                <Link href={item.href}>
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
                                {/* Insert Cash Button after Closing */}
                                {item.href === '/pos/closing' && (
                                    <button
                                        onClick={handleCashDrawerClick}
                                        className={cn(
                                            styles.navItem,
                                            showCashDialog ? styles.navItemActive : styles.navItemInactive,
                                            "w-full cursor-pointer border-none bg-transparent p-0 mt-2"
                                        )}
                                    >
                                        <div className="relative">
                                            <Coins className={styles.navIcon} />
                                        </div>
                                        <span className={styles.navLabel}>錢箱</span>
                                    </button>
                                )}
                            </div>
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

            <CashManagementDialog
                open={showCashDialog}
                onClose={() => setShowCashDialog(false)}
                shiftId={currentShiftId}
                onSuccess={() => {
                    window.dispatchEvent(new Event('shift-data-changed'));
                }}
            />
        </div>
    );
}
