'use client';

import { useEffect } from 'react';
import { syncService } from '@/lib/sync/sync-service';

export default function SyncInitializer() {
    useEffect(() => {
        syncService.start();
        return () => syncService.stop();
    }, []);

    return null;
}
