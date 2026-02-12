'use client';

import { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SyncIndicator() {
    const [isOnline, setIsOnline] = useState(true);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsOnline(navigator.onLine);

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return (
        <div className={cn(
            "flex flex-col items-center gap-1 mt-auto pb-4",
            isOnline ? "text-slate-500" : "text-red-500"
        )}>
            {isOnline ? (
                <div className="flex flex-col items-center">
                    <Wifi className="w-5 h-5 mb-1 text-green-500/50" />
                    <span className="text-[10px] text-slate-600">Online</span>
                </div>
            ) : (
                <div className="flex flex-col items-center animate-pulse">
                    <WifiOff className="w-5 h-5 mb-1" />
                    <span className="text-[10px] font-bold">Offline</span>
                </div>
            )}
        </div>
    );
}
