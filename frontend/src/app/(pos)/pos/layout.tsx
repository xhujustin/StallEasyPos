'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { shiftApi } from '@/lib/api/shifts';


export default function POSLayout({
    children,
    modal,
}: {
    children: React.ReactNode;
    modal: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const { selectedStoreId } = useAuthStore();
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        const checkShift = async () => {
            // If not selected store, strict auth guard should handle it, or we just wait
            if (!selectedStoreId) {
                setIsChecking(false);
                return;
            }

            try {
                const shift = await shiftApi.getCurrent(selectedStoreId);
                const isOpeningPage = pathname === '/pos/opening';
                // Device settings must remain available before a shift starts so
                // staff can configure and test the POS hardware first.
                const isPreShiftPage = isOpeningPage || pathname === '/pos/settings';

                if (!shift && !isPreShiftPage) {
                    router.replace('/pos/opening');
                } else if (shift && isOpeningPage) {
                    router.replace('/pos');
                }
            } catch (error) {
                console.error("Failed to check shift:", error);
            } finally {
                setIsChecking(false);
            }
        };

        checkShift();
    }, [selectedStoreId, pathname, router]);

    // Optional: You might want a better loading screen here
    if (isChecking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-500">Checking system status...</span>
            </div>
        );
    }

    return (
        <>
            {children}
            {modal}
        </>
    );
}
