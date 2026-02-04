'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Box, Users, Settings, FileText, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import styles from './layout.module.css';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    const navItems = [
        { href: '/admin/dashboard', icon: LayoutDashboard, label: '儀表板' },
        { href: '/admin/products', icon: Box, label: '商品管理' },
        { href: '/admin/orders', icon: FileText, label: '訂單管理' },
        { href: '/admin/users', icon: Users, label: '人員管理' },
        { href: '/admin/settings', icon: Settings, label: '系統設定' },
    ];

    return (
        <div className={styles.container}>
            <aside className={styles.sidebar}>
                <div className={styles.header}>
                    <div className={styles.logo}>S</div>
                    <span className={styles.brandName}>StallEasy Admin</span>
                </div>

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
