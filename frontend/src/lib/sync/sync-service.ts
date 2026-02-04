import { db, OfflineOrder } from '../db/offline-db';

const SYNC_INTERVAL = 10000; // 10 seconds

class SyncService {
    private timer: NodeJS.Timeout | null = null;
    private isSyncing = false;

    start() {
        if (this.timer) return;
        this.timer = setInterval(() => this.sync(), SYNC_INTERVAL);
        console.log('[SyncService] Started');
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    async sync() {
        if (this.isSyncing || !navigator.onLine) return;

        this.isSyncing = true;
        try {
            // 1. Get unsynced orders
            const unsyncedOrders = await db.offlineOrders
                .where('synced')
                .equals(false as any) // Dexie boolean filtering workaround if needed, or just 0
                .toArray(); // Actually boolean works fine in modern Dexie

            if (unsyncedOrders.length === 0) {
                this.isSyncing = false;
                return;
            }

            console.log(`[SyncService] Found ${unsyncedOrders.length} orders to sync`);

            // 2. Process each order
            for (const order of unsyncedOrders) {
                try {
                    // Simulate API call
                    await this.mockApiSync(order);

                    // 3. Mark as synced
                    await db.offlineOrders.update(order.id!, { synced: true });
                    console.log(`[SyncService] Order ${order.id} synced successfully`);
                } catch (error) {
                    console.error(`[SyncService] Failed to sync order ${order.id}`, error);
                    // Keep synced=false to retry later
                }
            }
        } catch (error) {
            console.error('[SyncService] Sync failed', error);
        } finally {
            this.isSyncing = false;
        }
    }

    private mockApiSync(order: OfflineOrder): Promise<void> {
        return new Promise((resolve) => {
            setTimeout(() => {
                // 95% success rate simulation
                if (Math.random() > 0.05) resolve();
                else throw new Error('Network fluctuation');
            }, 500);
        });
    }
}

export const syncService = new SyncService();
