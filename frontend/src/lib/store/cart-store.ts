import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItemOption {
    attributeId: number;
    attributeName: string;
    optionId: number;
    optionName: string;
    priceAdjustment: number;
}

export interface CartItem {
    cartItemId: string;
    productId: number;
    name: string;
    price: number; // Unit price (base + options)
    quantity: number;
    image_url?: string;
    note?: string;
    selectedOptions: CartItemOption[];
}

interface CartState {
    items: CartItem[];
    // addToCart now accepts more details
    addToCart: (product: { id: number; name: string; price: number; image_url?: string }, quantity?: number, options?: CartItemOption[], note?: string) => void;
    removeFromCart: (cartItemId: string) => void;
    updateQuantity: (cartItemId: string, quantity: number) => void;
    clearCart: () => void;
    totalAmount: () => number;
}

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],
            addToCart: (product, quantity = 1, options = [], note = '') => {
                set((state) => {
                    // Generate a unique key for grouping (optional but good for comparison)
                    // Compare productId, options, and note
                    const optionsKey = JSON.stringify(options.sort((a, b) => a.optionId - b.optionId));

                    const existing = state.items.find((i) =>
                        i.productId === product.id &&
                        JSON.stringify(i.selectedOptions.sort((a, b) => a.optionId - b.optionId)) === optionsKey &&
                        i.note === note
                    );

                    if (existing) {
                        return {
                            items: state.items.map((i) =>
                                i.cartItemId === existing.cartItemId ? { ...i, quantity: i.quantity + quantity } : i
                            ),
                        };
                    }

                    // Calculate total price
                    const optionsPrice = options.reduce((sum, opt) => sum + Number(opt.priceAdjustment), 0);
                    const finalPrice = Number(product.price) + optionsPrice;

                    const newItem: CartItem = {
                        // Use a custom UUID generator if crypto.randomUUID is not available
                        cartItemId: `${product.id}-${(typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                            return v.toString(16);
                        })}`,
                        productId: product.id,
                        name: product.name,
                        price: finalPrice,
                        quantity,
                        image_url: product.image_url,
                        note,
                        selectedOptions: options
                    };

                    return {
                        items: [...state.items, newItem],
                    };
                });
            },
            removeFromCart: (cartItemId) =>
                set((state) => ({ items: state.items.filter((i) => i.cartItemId !== cartItemId) })),
            updateQuantity: (cartItemId, quantity) =>
                set((state) => ({
                    items: quantity > 0
                        ? state.items.map((i) => (i.cartItemId === cartItemId ? { ...i, quantity } : i))
                        : state.items.filter((i) => i.cartItemId !== cartItemId),
                })),
            clearCart: () => set({ items: [] }),
            totalAmount: () => get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),
        }),
        {
            name: 'pos-cart-storage',
        }
    )
);
