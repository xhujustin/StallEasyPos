import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
    id: string; // product_id
    name: string;
    price: number;
    quantity: number;
    note?: string;
}

interface CartState {
    items: CartItem[];
    addToCart: (product: { id: string; name: string; price: number }, quantity?: number, note?: string) => void;
    removeFromCart: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    clearCart: () => void;
    totalAmount: () => number;
}

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],
            addToCart: (product, quantity = 1, note = '') => {
                set((state) => {
                    const existing = state.items.find((i) => i.id === product.id && i.note === note);
                    if (existing) {
                        return {
                            items: state.items.map((i) =>
                                i.id === product.id && i.note === note ? { ...i, quantity: i.quantity + quantity } : i
                            ),
                        };
                    }
                    return {
                        items: [...state.items, { ...product, quantity, note }],
                    };
                });
            },
            removeFromCart: (productId) =>
                set((state) => ({ items: state.items.filter((i) => i.id !== productId) })),
            updateQuantity: (productId, quantity) =>
                set((state) => ({
                    items: quantity > 0
                        ? state.items.map((i) => (i.id === productId ? { ...i, quantity } : i))
                        : state.items.filter((i) => i.id !== productId),
                })),
            clearCart: () => set({ items: [] }),
            totalAmount: () => get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),
        }),
        {
            name: 'pos-cart-storage',
        }
    )
);
