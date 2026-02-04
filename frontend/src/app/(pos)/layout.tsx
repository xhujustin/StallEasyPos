'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Store, ShoppingCart, FileText, Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming Shadcn utils exist
import { useCartStore } from '@/lib/store/cart-store';
import { SyncIndicator } from '@/components/pos/sync-indicator';

export default function POSLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const cartItemCount = useCartStore((state) => state.items.length);

    const navItems = [
        { href: '/pos', icon: Store, label: '收銀' },
        { href: '/pos/orders', icon: FileText, label: '訂單' },
        { href: '/pos/closing', icon: LogOut, label: '日結' }, // Icon placeholder
        { href: '/pos/settings', icon: Settings, label: '設定' },
    ];

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            {/* Sidebar Navigation - Simplified for POS */}
            <aside className="w-20 bg-slate-900 flex flex-col items-center py-6 gap-6 text-slate-400 z-50 shadow-xl">
                <div className="mb-2">
                    <div className="w-10 h-10 bg-[#D4AF37] rounded-md flex items-center justify-center font-bold text-slate-900">
                        S
                    </div>
                </div>

                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                        <Link key={item.href} href={item.href}>
                            <div
                                className={cn(
                                    "group flex flex-col items-center gap-1 p-2 rounded-lg transition-colors cursor-pointer",
                                    isActive ? "bg-slate-800 text-[#D4AF37]" : "hover:bg-slate-800 hover:text-slate-200"
                                )}
                            >
                                <Icon className="w-6 h-6" />
                                <span className="text-[10px] hidden md:block">{item.label}</span>
                            </div>
                        </Link>
                    )
                })}

                <div className="mt-auto">
                    <SyncIndicator />
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex overflow-hidden relative">
                {children}
            </main>
        </div>
    );
}
