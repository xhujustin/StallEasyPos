'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { shiftApi } from '@/lib/api/shifts';
import { cn } from '@/lib/utils';
import {
    LayoutGrid,
    Receipt,
    Coins,
    LogOut,
    Menu,
    History
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CashManagementDialog } from './CashManagementDialog';

export function POSSidebar() {
    const pathname = usePathname();
    const { selectedStoreId } = useAuthStore();
    const [showCashDialog, setShowCashDialog] = useState(false);
    const [currentShiftId, setCurrentShiftId] = useState<number | null>(null);

    useEffect(() => {
        const fetchShift = async () => {
            if (selectedStoreId) {
                try {
                    const shift = await shiftApi.getCurrent(selectedStoreId);
                    if (shift) {
                        setCurrentShiftId(shift.id);
                    }
                } catch (err) {
                    console.error("Failed to fetch shift for sidebar", err);
                }
            }
        };
        fetchShift();
    }, [selectedStoreId]);

    const navItems = [
        {
            href: '/pos',
            icon: LayoutGrid,
            label: '收銀台',
            exact: true
        },
        {
            href: '/pos/orders',
            icon: History,
            label: '訂單記錄'
        },
        {
            href: '/pos/closing',
            icon: LogOut,
            label: '班次結帳' // Or "關閉班次"
        }
    ];

    return (
        <>
            <div className="w-20 bg-slate-900 flex flex-col items-center py-6 gap-6 shrink-0 h-screen text-white z-50">
                <div className="mb-2">
                    <div className="w-10 h-10 bg-[#D4AF37] rounded-lg flex items-center justify-center font-bold text-slate-900">
                        SE
                    </div>
                </div>

                <div className="flex-1 w-full flex flex-col gap-4 px-2">
                    {navItems.map((item) => {
                        const isActive = item.exact
                            ? pathname === item.href
                            : pathname?.startsWith(item.href);

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all w-full aspect-square",
                                    isActive
                                        ? "bg-white/10 text-[#D4AF37]"
                                        : "text-slate-400 hover:text-white hover:bg-white/5"
                                )}
                            >
                                <item.icon className="w-6 h-6" />
                                <span className="text-[10px] font-medium">{item.label}</span>
                            </Link>
                        );
                    })}

                    <div className="w-full h-px bg-slate-800 my-2" />

                    <Button
                        variant="ghost"
                        className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all w-full aspect-square h-auto hover:bg-white/5 text-slate-400 hover:text-white"
                        onClick={() => setShowCashDialog(true)}
                    >
                        <Coins className="w-6 h-6" />
                        <span className="text-[10px] font-medium">錢箱管理</span>
                    </Button>
                </div>

                <div className="mt-auto flex flex-col items-center gap-4">
                    {/* Bottom actions if any */}
                </div>
            </div>

            <CashManagementDialog
                open={showCashDialog}
                onClose={() => setShowCashDialog(false)}
                shiftId={currentShiftId}
                onSuccess={() => {
                    // Optional: Global toast?
                }}
            />
        </>
    );
}
