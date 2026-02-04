'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Box, Users, Settings, FileText, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

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
        <div className="flex h-screen bg-slate-100">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
                <div className="h-16 flex items-center px-6 border-b border-slate-200">
                    <div className="w-8 h-8 bg-[#D4AF37] rounded-md flex items-center justify-center font-bold text-slate-900 mr-3">
                        S
                    </div>
                    <span className="font-bold text-slate-900">StallEasy Admin</span>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        const Icon = item.icon;
                        return (
                            <Link key={item.href} href={item.href}>
                                <Button
                                    variant={isActive ? "secondary" : "ghost"}
                                    className={cn(
                                        "w-full justify-start gap-3 mb-1",
                                        isActive ? "bg-slate-100 text-slate-900 font-medium" : "text-slate-500 hover:text-slate-900"
                                    )}
                                >
                                    <Icon className="w-4 h-4" />
                                    {item.label}
                                </Button>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-200">
                    <Link href="/pos">
                        <Button variant="outline" className="w-full gap-2">
                            <ExternalLink className="w-4 h-4" />
                            前往 POS
                        </Button>
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto p-8">
                {children}
            </main>
        </div>
    );
}
