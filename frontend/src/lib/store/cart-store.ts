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

export interface HeldOrder {
    id: string;
    storeId: number;
    orderNo?: number;
    createdAt: string;
    items: CartItem[];
    total: number;
    printedOutputs?: string[];
    pickupAt?: string;
    dispatchedAt?: string;
}

interface CartState {
    items: CartItem[];
    heldOrders: HeldOrder[];
    storeId: number | null;
    currentOrderNo: number | null;
    currentPrintedOutputs: string[];
    initStore: (storeId: number) => void;
    initializeOrderNumbers: (storeId: number, nextOrderNo: number) => void;
    // addToCart now accepts more details
    addToCart: (product: { id: number; name: string; price: number; image_url?: string }, quantity?: number, options?: CartItemOption[], note?: string) => void;
    removeFromCart: (cartItemId: string) => void;
    updateQuantity: (cartItemId: string, quantity: number) => void;
    updateCartItem: (cartItemId: string, quantity: number, options: CartItemOption[], note: string, basePrice: number) => void;
    clearCart: () => void;
    holdCart: (pickupAt?: string) => void;
    markHeldOrderPrinted: (heldOrderId: string, output: string) => void;
    restoreHeldOrder: (heldOrderId: string) => void;
    deleteHeldOrder: (heldOrderId: string) => void;
    totalAmount: () => number;
}

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],
            heldOrders: [],
            storeId: null,
            currentOrderNo: null,
            currentPrintedOutputs: [],
            initStore: (storeId) => {
                const currentStoreId = get().storeId;
                if (currentStoreId !== null && currentStoreId !== storeId) {
                    // Store changed! Clear cart
                    set({ items: [], storeId, currentOrderNo: null, currentPrintedOutputs: [] });
                } else {
                    set({ storeId });
                }
            },
            initializeOrderNumbers: (storeId, nextOrderNo) => set((state) => {
                const storeOrders = state.heldOrders.filter((order) => order.storeId === storeId);
                const usedNumbers = new Set(
                    storeOrders
                        .map((order) => order.orderNo)
                        .filter((orderNo): orderNo is number => typeof orderNo === 'number')
                );
                let candidate = nextOrderNo;
                const assignedNumbers = new Map<string, number>();
                [...storeOrders]
                    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
                    .forEach((order) => {
                        if (order.orderNo) return;
                        while (usedNumbers.has(candidate)) candidate += 1;
                        assignedNumbers.set(order.id, candidate);
                        usedNumbers.add(candidate);
                        candidate += 1;
                    });

                const heldOrders = state.heldOrders.map((order) => {
                    const assigned = assignedNumbers.get(order.id);
                    return assigned ? { ...order, orderNo: assigned } : order;
                });
                const highestHeldNumber = heldOrders
                    .filter((order) => order.storeId === storeId)
                    .reduce((highest, order) => Math.max(highest, order.orderNo || 0), 0);
                return {
                    heldOrders,
                    currentOrderNo: Math.max(nextOrderNo, highestHeldNumber + 1),
                };
            }),
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
                            currentPrintedOutputs: [],
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
                        currentPrintedOutputs: [],
                    };
                });
            },
            removeFromCart: (cartItemId) =>
                set((state) => ({ items: state.items.filter((i) => i.cartItemId !== cartItemId), currentPrintedOutputs: [] })),
            updateQuantity: (cartItemId, quantity) =>
                set((state) => ({
                    items: quantity > 0
                        ? state.items.map((i) => (i.cartItemId === cartItemId ? { ...i, quantity } : i))
                        : state.items.filter((i) => i.cartItemId !== cartItemId),
                    currentPrintedOutputs: [],
                })),
            updateCartItem: (cartItemId, quantity, options, note, basePrice) =>
                set((state) => ({
                    items: state.items.map((item) => item.cartItemId === cartItemId
                        ? {
                            ...item,
                            quantity,
                            note,
                            selectedOptions: options,
                            price: Number(basePrice) + options.reduce((sum, option) => sum + Number(option.priceAdjustment), 0),
                        }
                        : item),
                    currentPrintedOutputs: [],
                })),
            clearCart: () => set({ items: [], currentOrderNo: null, currentPrintedOutputs: [] }),
            holdCart: (pickupAt) => set((state) => {
                if (!state.storeId || state.items.length === 0) return state;
                const heldOrder: HeldOrder = {
                    id: (typeof crypto !== 'undefined' && crypto.randomUUID)
                        ? crypto.randomUUID()
                        : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                    storeId: state.storeId,
                    orderNo: state.currentOrderNo || undefined,
                    createdAt: new Date().toISOString(),
                    items: state.items.map(item => ({
                        ...item,
                        selectedOptions: item.selectedOptions.map(option => ({ ...option })),
                    })),
                    total: state.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
                    printedOutputs: [...state.currentPrintedOutputs],
                    pickupAt,
                };
                return {
                    heldOrders: [heldOrder, ...state.heldOrders],
                    items: [],
                    currentOrderNo: state.currentOrderNo ? state.currentOrderNo + 1 : null,
                    currentPrintedOutputs: [],
                };
            }),
            markHeldOrderPrinted: (heldOrderId, output) => set((state) => ({
                heldOrders: state.heldOrders.map(order => order.id === heldOrderId
                    ? { ...order, printedOutputs: Array.from(new Set([...(order.printedOutputs || []), output])) }
                    : order),
            })),
            restoreHeldOrder: (heldOrderId) => set((state) => {
                const heldOrder = state.heldOrders.find(order => order.id === heldOrderId);
                if (!heldOrder || heldOrder.storeId !== state.storeId) return state;
                return {
                    items: heldOrder.items.map(item => ({
                        ...item,
                        selectedOptions: item.selectedOptions.map(option => ({ ...option })),
                    })),
                    currentOrderNo: heldOrder.orderNo || state.currentOrderNo,
                    currentPrintedOutputs: [...(heldOrder.printedOutputs || [])],
                    heldOrders: state.heldOrders.filter(order => order.id !== heldOrderId),
                };
            }),
            deleteHeldOrder: (heldOrderId) => set((state) => ({
                heldOrders: state.heldOrders.filter(order => order.id !== heldOrderId),
            })),
            totalAmount: () => get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),
        }),
        {
            name: 'pos-cart-storage',
        }
    )
);
