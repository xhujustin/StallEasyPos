import Dexie, { type EntityTable } from 'dexie';

interface OfflineOrder {
    id?: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items: any[];
    totalAmount: number;
    paymentMethod: string;
    createdAt: string;
    synced: boolean;
    idempotencyKey: string;
}

const db = new Dexie('StallEasyPosDB') as Dexie & {
    offlineOrders: EntityTable<OfflineOrder, 'id'>;
};

db.version(1).stores({
    offlineOrders: '++id, createdAt, synced, idempotencyKey',
});

export { db };
export type { OfflineOrder };
