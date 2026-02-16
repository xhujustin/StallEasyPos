// import { v4 as uuidv4 } from 'uuid'; // Removed to avoid dependency issues

const DEVICE_UUID_KEY = 'stalleasy_device_uuid';

function createUUID(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback implementation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export const getDeviceUUID = (): string => {
    if (typeof window === 'undefined') return '';

    let uuid = localStorage.getItem(DEVICE_UUID_KEY);
    if (!uuid) {
        uuid = createUUID();
        localStorage.setItem(DEVICE_UUID_KEY, uuid);
    }
    return uuid;
};
