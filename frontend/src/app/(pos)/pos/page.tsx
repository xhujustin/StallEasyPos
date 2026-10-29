'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useCartStore, CartItem, CartItemOption, HeldOrder } from '@/lib/store/cart-store';
import { useAuthStore } from '@/lib/store/auth-store';
import { productApi, Product } from '@/lib/api/products';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Plus, Minus, ShoppingCart, Loader2, AlertCircle, Clock3, RotateCcw, Printer } from 'lucide-react';
import { CheckoutModal } from '@/components/pos/checkout-modal';
import { ProductOptionDialog } from '@/components/pos/ProductOptionDialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { settingsApi } from '@/lib/api/settings';
import { cn, getFullImageUrl } from '@/lib/utils';

import { CashManagementDialog } from '@/components/pos/CashManagementDialog';
import { shiftApi } from '@/lib/api/shifts';
import { hardwareApi } from '@/lib/api/hardware';
import type { HeldOrderPrintAction } from '@/lib/api/hardware';
import { orderApi } from '@/lib/api/orders';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const HELD_PRINT_OPTIONS: [HeldOrderPrintAction, string, string][] = [
    ['print_receipt', '收據', 'receipt'],
    ['print_number_ticket', '號碼牌', 'number_ticket'],
    ['print_kitchen', '內場單', 'kitchen'],
    ['print_label', '商品貼紙', 'label'],
];

const isPickupTimePast = (value: string) => {
    if (!value) return false;
    const currentMinute = new Date();
    currentMinute.setSeconds(0, 0);
    return new Date(value).getTime() < currentMinute.getTime();
};

export default function POSPage() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [showCheckout, setShowCheckout] = useState(false);
    const [showHeldOrders, setShowHeldOrders] = useState(false);
    const [printMenuOrderId, setPrintMenuOrderId] = useState<string | null>(null);
    const [printingHeldOrder, setPrintingHeldOrder] = useState<string | null>(null);
    const [configuredHeldPrintActions, setConfiguredHeldPrintActions] = useState<HeldOrderPrintAction[]>([]);
    const [configuredScheduledPrintActions, setConfiguredScheduledPrintActions] = useState<HeldOrderPrintAction[]>([]);
    const [holdMode, setHoldMode] = useState<'normal' | 'scheduled'>('normal');
    const [pickupTime, setPickupTime] = useState('');
    const dispatchingHeldOrders = useRef(new Set<string>());
    const {
        items, heldOrders, currentOrderNo, addToCart, removeFromCart, updateQuantity, totalAmount,
        updateCartItem, initStore, initializeOrderNumbers, holdCart, restoreHeldOrder, deleteHeldOrder, markHeldOrderPrinted
    } = useCartStore();
    const [activeCategory, setActiveCategory] = useState('全部');
    const { user, selectedStoreId } = useAuthStore();

    // Cash Management State
    const [showCashDialog, setShowCashDialog] = useState(false);
    const [currentShiftId, setCurrentShiftId] = useState<number | null>(null);

    // Product Option Dialog State
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);
    const [showOptionDialog, setShowOptionDialog] = useState(false);

    // 使用選擇的店鋪ID,如果沒有則使用第一個店鋪
    const storeId = selectedStoreId || user?.stores?.[0]?.id;
    const currentStore = user?.stores?.find((s) => s.id === storeId);
    const storeHeldOrders = heldOrders.filter(order => order.storeId === storeId);

    const printHeldOutputs = async (heldOrder: HeldOrder, onlyAction?: HeldOrderPrintAction, outputMode: 'hold' | 'scheduled' = 'hold') => {
        if (!storeId) return [];
        const [device, profile] = await Promise.all([
            settingsApi.getDeviceSettings(storeId),
            settingsApi.getStoreProfile(storeId),
        ]);
        const outputByAction: Record<HeldOrderPrintAction, string> = {
            print_receipt: 'receipt',
            print_number_ticket: 'number_ticket',
            print_kitchen: 'kitchen',
            print_label: 'label',
        };
        const actionByOutput: Record<string, HeldOrderPrintAction> = {
            receipt: 'print_receipt',
            number_ticket: 'print_number_ticket',
            kitchen: 'print_kitchen',
            label: 'print_label',
        };
        const printers = (Array.isArray(device.printers) ? device.printers : []).filter((printer: any) => printer.enabled !== false);
        const outputKey = outputMode === 'scheduled' ? 'scheduled_outputs' : 'hold_outputs';
        const actions = onlyAction
            ? [onlyAction]
            : Array.from(new Set(printers.flatMap((printer: any) =>
                (Array.isArray(printer[outputKey]) ? printer[outputKey] : [])
                    .map((output: string) => actionByOutput[output])
                    .filter(Boolean)
            ))) as HeldOrderPrintAction[];
        const printed: string[] = [];
        for (const action of actions) {
            const output = outputByAction[action];
            const targets = printers.filter((printer: any) =>
                Array.isArray(printer[outputKey]) && printer[outputKey].includes(output)
            );
            if (targets.length === 0) {
                if (onlyAction) throw new Error('尚未指定處理此掛單輸出的印表機');
                continue;
            }
            const results = await Promise.allSettled(targets.map((printer: any) =>
                hardwareApi.printHeldOrder(storeId, heldOrder, action, profile.store_name, printer.id, profile.timezone)
            ));
            if (results.some(result => result.status === 'fulfilled')) {
                markHeldOrderPrinted(heldOrder.id, output);
                printed.push(output);
            } else if (onlyAction) {
                throw (results[0] as PromiseRejectedResult).reason;
            }
        }
        return printed;
    };

    const handleHoldCurrentOrder = () => {
        if (items.length === 0) {
            toast.error('購物車目前沒有可掛起的品項');
            return;
        }
        if (!currentOrderNo) {
            toast.error('單號取得中，請稍後再試');
            return;
        }
        let pickupAt: string | undefined;
        if (holdMode === 'scheduled') {
            const parsed = new Date(pickupTime);
            if (!pickupTime || Number.isNaN(parsed.getTime()) || isPickupTimePast(pickupTime)) {
                toast.error('請設定晚於現在的預計取餐時間');
                return;
            }
            pickupAt = parsed.toISOString();
        }
        holdCart(pickupAt, currentShiftId || undefined);
        setHoldMode('normal');
        setPickupTime('');
        setShowHeldOrders(false);
        toast.success('訂單已掛起，可隨時從掛單清單取回');
    };

    const handleRestoreHeldOrder = (heldOrderId: string) => {
        if (items.length > 0 && !window.confirm('目前購物車有商品，取回掛單將取代目前內容，確定繼續嗎？')) return;
        restoreHeldOrder(heldOrderId, currentShiftId || undefined);
        setShowHeldOrders(false);
        toast.success('掛單已取回');
    };

    const handlePrintHeldOrder = async (heldOrderId: string, action: HeldOrderPrintAction, label: string) => {
        const heldOrder = storeHeldOrders.find(order => order.id === heldOrderId);
        if (!storeId || !heldOrder) return;
        const printKey = `${heldOrderId}:${action}`;
        setPrintingHeldOrder(printKey);
        try {
            await printHeldOutputs(heldOrder, action);
            toast.success(`${label}已送出列印`);
        } catch (error) {
            console.error('Held order print failed:', error);
            toast.error(`${label}列印失敗，請檢查印表機連線與輸出設定`);
        } finally {
            setPrintingHeldOrder(null);
        }
    };

    const roleLabels: Record<string, string> = {
        'owner': '老闆',
        'manager': '店長',
        'staff': '店員'
    };
    const translatedRole = currentStore?.user_role ? (roleLabels[currentStore.user_role] || currentStore.user_role) : '';

    // 注意:移除了自動跳轉到select-store的邏輯
    // 因為這會導致頁面在select-store和pos之間無限循環

    // Fetch Products
    const { data: products = [], isLoading, error, refetch } = useQuery({
        queryKey: ['products', storeId],
        queryFn: () => {
            if (!storeId) return [];
            return productApi.getAll(storeId)
        },
        enabled: !!storeId,
        staleTime: 1000 * 10, // 10 seconds
    });

    const [deviceSettings, setDeviceSettings] = useState({
        pos_product_card_size: 'medium',
        pos_show_product_image: true,
        scheduled_order_dispatch_lead_minutes: 15,
    });

    useEffect(() => {
        if (storeId) {
            initStore(storeId);
            // Fetch device settings
            settingsApi.getDeviceSettings(storeId).then((data: any) => {
                setDeviceSettings({
                    pos_product_card_size: data.pos_product_card_size || 'medium',
                    pos_show_product_image: data.pos_show_product_image ?? true,
                    scheduled_order_dispatch_lead_minutes: Number(data.scheduled_order_dispatch_lead_minutes ?? 15),
                });
                const enabledOutputs = new Set<string>(
                    (Array.isArray(data.printers) ? data.printers : [])
                        .filter((printer: any) => printer.enabled !== false)
                        .flatMap((printer: any) => Array.isArray(printer.hold_outputs) ? printer.hold_outputs : [])
                );
                setConfiguredHeldPrintActions(
                    HELD_PRINT_OPTIONS.filter(([, , output]) => enabledOutputs.has(output)).map(([action]) => action)
                );
                const scheduledOutputs = new Set<string>(
                    (Array.isArray(data.printers) ? data.printers : [])
                        .filter((printer: any) => printer.enabled !== false)
                        .flatMap((printer: any) => Array.isArray(printer.scheduled_outputs) ? printer.scheduled_outputs : [])
                );
                setConfiguredScheduledPrintActions(
                    HELD_PRINT_OPTIONS.filter(([, , output]) => scheduledOutputs.has(output)).map(([action]) => action)
                );
            });
        }
        setMounted(true);
        // Fetch current shift ID
        const fetchShift = async () => {
            if (storeId) {
                try {
                    const shift = await shiftApi.getCurrent(storeId);
                    if (shift) {
                        setCurrentShiftId(shift.id);
                    }
                } catch (err) {
                    console.error("Failed to fetch current shift", err);
                }
            }
        };
        fetchShift();
    }, [storeId]);

    useEffect(() => {
        if (!storeId || configuredScheduledPrintActions.length === 0) return;
        const dispatchDueOrders = async () => {
            const leadMs = deviceSettings.scheduled_order_dispatch_lead_minutes * 60_000;
            const dueOrders = useCartStore.getState().heldOrders.filter(order =>
                order.storeId === storeId && order.pickupAt &&
                new Date(order.pickupAt).getTime() - leadMs <= Date.now() &&
                configuredScheduledPrintActions.some(action => {
                    const output = HELD_PRINT_OPTIONS.find(([candidate]) => candidate === action)?.[2];
                    return output && !(order.printedOutputs || []).includes(output);
                }) && !dispatchingHeldOrders.current.has(order.id)
            );
            for (const order of dueOrders) {
                dispatchingHeldOrders.current.add(order.id);
                try {
                    const printed = await printHeldOutputs(order, undefined, 'scheduled');
                    if (printed.length > 0) toast.success(`單號 #${order.orderNo ?? '—'} 已自動派發`);
                } catch (error) {
                    console.error('Scheduled held order dispatch failed:', error);
                } finally {
                    dispatchingHeldOrders.current.delete(order.id);
                }
            }
        };
        void dispatchDueOrders();
        const timer = window.setInterval(dispatchDueOrders, 15_000);
        return () => window.clearInterval(timer);
    }, [storeId, configuredScheduledPrintActions, deviceSettings.scheduled_order_dispatch_lead_minutes]);

    useEffect(() => {
        if (!storeId || !currentShiftId || currentOrderNo !== null) return;
        let cancelled = false;
        const loadNextOrderNumber = async () => {
            try {
                const nextNumber = await orderApi.getNextNumber(storeId);
                if (!cancelled) initializeOrderNumbers(storeId, nextNumber, currentShiftId);
            } catch (error) {
                console.error('Failed to get next order number:', error);
                if (!cancelled) toast.error('目前單號取得失敗，結帳時將由系統自動編號');
            }
        };
        loadNextOrderNumber();
        return () => { cancelled = true; };
    }, [storeId, currentShiftId, currentOrderNo, heldOrders, initializeOrderNumbers]);

    const handleProductClick = (product: Product) => {
        setEditingCartItem(null);
        if (product.attributes && product.attributes.length > 0) {
            setSelectedProduct(product);
            setShowOptionDialog(true);
        } else {
            addToCart({
                id: product.id,
                name: product.name,
                price: product.price,
                image_url: product.image_url
            }, 1);
        }
    };

    const handleOptionConfirm = (options: CartItemOption[], quantity: number, note: string) => {
        if (selectedProduct) {
            if (editingCartItem) {
                updateCartItem(editingCartItem.cartItemId, quantity, options, note, selectedProduct.price);
                toast.success('購物車品項已更新');
                setEditingCartItem(null);
                return;
            }
            addToCart({
                id: selectedProduct.id,
                name: selectedProduct.name,
                price: selectedProduct.price,
                image_url: selectedProduct.image_url
            }, quantity, options, note);
        }
    };

    const handleCartItemClick = (item: CartItem) => {
        const product = products.find(product => product.id === item.productId);
        if (!product) {
            toast.error('找不到此商品設定，請刪除後重新加入');
            return;
        }
        setSelectedProduct(product);
        setEditingCartItem(item);
        setShowOptionDialog(true);
    };

    const closeOptionDialog = () => {
        setShowOptionDialog(false);
        setEditingCartItem(null);
    };

    const handleCashManagementClick = async () => {
        if (!currentShiftId) {
            toast.error('請先開班才能使用錢箱功能');
            return;
        }
        if (storeId) {
            try {
                await hardwareApi.openDrawer(storeId);
            } catch (error) {
                console.error('Cash drawer command failed:', error);
                toast.error('錢箱開啟失敗，請檢查出單機連線');
            }
        }
        setShowCashDialog(true);
    };


    const categories = Array.from(new Set(['全部', ...products.map((p: Product) => p.category || '未分類')]));

    const filteredProducts = (activeCategory === '全部'
        ? products
        : products.filter((p: Product) => (p.category || '未分類') === activeCategory)
    ).filter((p: Product) => p.is_active); // 只顯示啟用的商品

    if (!mounted) return null;

    // Grid columns based on size
    const gridCols = {
        small: "grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2",
        medium: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4",
        large: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    }[deviceSettings.pos_product_card_size as 'small' | 'medium' | 'large'] || "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4";

    return (
        <div className="flex w-full h-full overflow-hidden">
            {/* Product Catalog Area (Left) */}
            <div className="flex-1 flex flex-col border-r border-slate-200 bg-slate-50">
                {/* Category Tabs & Info */}
                <div className="h-16 border-b border-slate-200 flex items-center px-8 gap-4 bg-white shadow-sm shrink-0">
                    <div className="flex items-center gap-2 overflow-x-auto flex-1 min-w-0 h-full py-2">
                        {categories.map((cat) => (
                            <Button
                                key={cat}
                                variant={activeCategory === cat ? 'default' : 'ghost'}
                                className={activeCategory === cat
                                    ? 'bg-slate-900 text-white hover:bg-slate-800 rounded-full px-6 shrink-0'
                                    : 'text-slate-600 hover:bg-slate-100 rounded-full px-6 shrink-0'
                                }
                                onClick={() => setActiveCategory(cat)}
                            >
                                {cat}
                            </Button>
                        ))}
                    </div>

                    {/* Store & User Info */}
                    <div className="flex items-center gap-6 px-4 border-l border-slate-300 shrink-0 bg-white h-full">
                        <div className="flex flex-col justify-center">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-1">目前店鋪</span>
                            <span className="text-sm font-bold text-slate-900 leading-none">{currentStore?.name || '未選擇店鋪'}</span>
                        </div>
                        <div className="flex flex-col items-end justify-center">
                            <span className="text-sm font-bold text-slate-900 leading-none mb-1">
                                {user?.nickname || user?.full_name || user?.username}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium bg-slate-100 px-1.5 py-0.5 rounded leading-none">{translatedRole}</span>
                        </div>
                    </div>
                </div>

                {/* Product Grid */}
                <div className="flex-1 overflow-y-auto px-8 py-6">
                    {isLoading ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                            <Loader2 className="w-8 h-8 animate-spin mb-2" />
                            <p>載入商品中...</p>
                        </div>
                    ) : error ? (
                        <div className="p-4">
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>無法載入商品</AlertTitle>
                                <AlertDescription>
                                    請檢查網路連線或後端伺服器狀態。
                                    <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2 text-black bg-white">重試</Button>
                                </AlertDescription>
                            </Alert>
                        </div>
                    ) : (
                        <div className={cn("grid", gridCols)}>
                            {filteredProducts.map((product) => (
                                <Card
                                    key={product.id}
                                    className="cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98] border-slate-200 overflow-hidden"
                                    onClick={() => handleProductClick(product)}
                                >
                                    <CardContent className="p-2 flex flex-col h-full overflow-hidden">
                                        {/* Image Area - Balanced padding */}
                                        {true && (
                                            <div className="w-full aspect-square bg-slate-100 flex items-center justify-center text-slate-300 relative overflow-hidden rounded-lg">
                                                {product.image_url ? (
                                                    <img src={getFullImageUrl(product.image_url)} alt={product.name} className="object-cover w-full h-full transition-transform hover:scale-105 duration-300" />
                                                ) : (
                                                    <span className={cn(
                                                        "font-bold select-none text-slate-200",
                                                        deviceSettings.pos_product_card_size === 'small' ? "text-2xl" : "text-4xl"
                                                    )}>
                                                        {product.name.charAt(0)}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        <div className="flex flex-col justify-between flex-1 p-1 px-1.5 pt-2">
                                            <h3 className={cn(
                                                "font-bold text-slate-900 line-clamp-2 leading-tight mb-0.5",
                                                deviceSettings.pos_product_card_size === 'small' ? "text-xs" : "text-sm"
                                            )}>
                                                {product.name}
                                            </h3>
                                            <div className={cn(
                                                "text-[#D4AF37] font-black leading-none",
                                                deviceSettings.pos_product_card_size === 'small' ? "text-[11px]" : "text-sm"
                                            )}>
                                                ${product.price}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Cart Sidebar (Right) */}
            <div className="w-[350px] lg:w-[400px] flex flex-col bg-white shadow-xl z-40">
                <div className="h-16 border-b border-slate-200 flex items-center px-6 justify-between shrink-0">
                    <div>
                        <h2 className="font-bold text-lg leading-tight text-slate-900">購物車</h2>
                        <div className="mt-0.5 text-xs font-bold text-[#8A701E]">
                            目前單號 #{currentOrderNo ?? '取得中'}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-slate-500 hover:text-slate-900"
                            onClick={handleCashManagementClick}
                            title="錢箱管理 (補錢/取款)"
                        >
                            <span className="sr-only">錢箱管理</span>
                            {/* Coins icon manually or ensure import */}
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-coins"><circle cx="8" cy="8" r="6" /><path d="M18.09 10.37A6 6 0 1 1 10.34 18" /><path d="M7 6h1v4" /><path d="m16.71 13.88.7.71-2.82 2.82" /></svg>
                        </Button>
                        <span className="text-sm text-slate-500">{items.length} 項目</span>
                    </div>
                </div>

                <ScrollArea className="flex-1 p-4 min-h-0">
                    {items.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                            <ShoppingCart className="w-12 h-12 opacity-20" />
                            <p>尚未加入商品</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {items.map((item) => (
                                <div
                                    key={item.cartItemId}
                                    className="flex gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 items-center cursor-pointer hover:border-[#D4AF37]/60 hover:bg-amber-50/30 transition-colors"
                                    onClick={() => handleCartItemClick(item)}
                                    title="點擊調整品項內容"
                                >
                                    <div className="w-12 h-12 bg-white rounded-md border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center text-slate-300">
                                        {item.image_url ? (
                                            <img src={getFullImageUrl(item.image_url)} alt={item.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-xs font-bold text-slate-200">{item.name.charAt(0)}</span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <div>
                                                <span className="font-medium text-slate-900 block leading-tight">{item.name}</span>
                                                {item.selectedOptions && item.selectedOptions.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {item.selectedOptions.map((opt, idx) => (
                                                            <span key={idx} className="text-[10px] text-slate-500 bg-white px-1 py-0.5 rounded border border-slate-200">
                                                                {opt.optionName} {opt.priceAdjustment > 0 ? `(+$${opt.priceAdjustment})` : ''}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                {item.note && (
                                                    <div className="text-[10px] text-amber-700 mt-1">客製：{item.note}</div>
                                                )}
                                            </div>
                                            <span className="font-mono font-medium">${item.price * item.quantity}</span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-2">
                                            <div className="flex items-center gap-1 bg-white rounded-md border border-slate-200 p-0.5">
                                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-sm" onClick={(event) => { event.stopPropagation(); updateQuantity(item.cartItemId, item.quantity - 1); }}>
                                                    <Minus className="h-3 w-3" />
                                                </Button>
                                                <span className="w-6 text-center text-sm font-mono">{item.quantity}</span>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-sm" onClick={(event) => { event.stopPropagation(); updateQuantity(item.cartItemId, item.quantity + 1); }}>
                                                    <Plus className="h-3 w-3" />
                                                </Button>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-50 ml-auto" onClick={(event) => { event.stopPropagation(); removeFromCart(item.cartItemId); }}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>

                {/* Action Bar */}
                <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-4 shrink-0">
                    <div className="flex justify-between items-end">
                        <span className="text-slate-600">總金額</span>
                        <span className="text-3xl font-bold text-slate-900 font-mono tracking-tight">
                            ${totalAmount()}
                        </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                        <Button
                            variant="outline"
                            className="h-14 flex-col gap-0.5 border-slate-300 text-slate-600 hover:text-slate-900"
                            onClick={() => setShowHeldOrders(true)}
                        >
                            <span>掛單</span>
                            {storeHeldOrders.length > 0 && <span className="text-[10px] text-[#A38322]">{storeHeldOrders.length} 筆</span>}
                        </Button>

                        <Button
                            className="col-span-3 w-full h-14 text-lg font-bold bg-[#D4AF37] hover:bg-[#C5A028] text-white shadow-md active:translate-y-0.5 transition-all"
                            disabled={!mounted || items.length === 0}
                            onClick={() => setShowCheckout(true)}
                        >
                            結帳收款
                        </Button>
                    </div>
                </div>
            </div>

            <CheckoutModal open={showCheckout} onClose={() => setShowCheckout(false)} />
            <Dialog open={showHeldOrders} onOpenChange={setShowHeldOrders}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>掛單管理</DialogTitle>
                        <DialogDescription>掛起目前訂單，或取回先前尚未結帳的購物車。</DialogDescription>
                    </DialogHeader>

                    <div className="max-h-[420px] overflow-y-auto space-y-3 py-2">
                        {storeHeldOrders.length === 0 ? (
                            <div className="py-10 text-center text-slate-400">
                                <Clock3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                目前沒有掛單
                            </div>
                        ) : storeHeldOrders.map(order => (
                            <div key={order.id} className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                        <div className="font-bold text-slate-900">
                                            <span className="mr-2 text-[#8A701E]">單號 #{order.orderNo ?? '—'}</span>
                                            {new Date(order.createdAt).toLocaleString('zh-TW', { hour12: false })}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1 truncate">
                                            {order.items.map(item => `${item.name}×${item.quantity}`).join('、')}
                                        </div>
                                        <div className="text-sm font-bold text-[#A38322] mt-2">${order.total}</div>
                                        {order.pickupAt && (
                                            <div className="mt-1 text-xs font-bold text-blue-700">
                                                預計取餐：{new Date(order.pickupAt).toLocaleString('zh-TW', { hour12: false })}
                                            </div>
                                        )}
                                        {(order.printedOutputs || []).length > 0 && (
                                            <div className="mt-1 text-[11px] font-medium text-emerald-700">
                                                已列印：{(order.printedOutputs || []).map(output => ({
                                                    receipt: '收據',
                                                    number_ticket: '號碼牌',
                                                    kitchen: '內場單',
                                                    label: '商品貼紙',
                                                }[output] || output)).join('、')}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                        {configuredHeldPrintActions.length > 0 && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setPrintMenuOrderId(current => current === order.id ? null : order.id)}
                                            >
                                                <Printer className="w-3.5 h-3.5 mr-1" />列印
                                            </Button>
                                        )}
                                        <Button size="sm" onClick={() => handleRestoreHeldOrder(order.id)}>
                                            <RotateCcw className="w-3.5 h-3.5 mr-1" />取回
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => {
                                                if (window.confirm('確定刪除此筆掛單嗎？')) deleteHeldOrder(order.id);
                                            }}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                                {printMenuOrderId === order.id && configuredHeldPrintActions.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-200 pt-3">
                                        {HELD_PRINT_OPTIONS.filter(([action]) => configuredHeldPrintActions.includes(action)).map(([action, label]) => {
                                            const printKey = `${order.id}:${action}`;
                                            return (
                                                <Button
                                                    key={action}
                                                    type="button"
                                                    size="sm"
                                                    variant="secondary"
                                                    disabled={printingHeldOrder !== null}
                                                    onClick={() => handlePrintHeldOrder(order.id, action, label)}
                                                >
                                                    {printingHeldOrder === printKey && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                                                    {label}
                                                </Button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {items.length > 0 && (
                        <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <Button type="button" size="sm" variant={holdMode === 'normal' ? 'default' : 'outline'} onClick={() => setHoldMode('normal')}>一般掛單</Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={holdMode === 'scheduled' ? 'default' : 'outline'}
                                    onClick={() => {
                                        setHoldMode('scheduled');
                                        if (!pickupTime) {
                                            const now = new Date();
                                            const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
                                            setPickupTime(local);
                                        }
                                    }}
                                >定時取餐</Button>
                            </div>
                            {holdMode === 'scheduled' && (
                                <div>
                                    <label className="mb-1 block text-xs font-bold text-slate-600">預計取餐時間</label>
                                    <Input
                                        type="datetime-local"
                                        value={pickupTime}
                                        min={new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16)}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setPickupTime(value);
                                            if (isPickupTimePast(value)) {
                                                toast.warning('預計取餐時間不能早於現在，請重新選擇');
                                            }
                                        }}
                                        className={cn("bg-white", isPickupTimePast(pickupTime) && "border-red-400 focus-visible:ring-red-300")}
                                    />
                                    {isPickupTimePast(pickupTime) && (
                                        <p className="mt-1 text-xs font-bold text-red-600">預計取餐時間已經過去，無法建立定時掛單。</p>
                                    )}
                                    <p className="mt-1 text-[11px] text-slate-500">將提前 {deviceSettings.scheduled_order_dispatch_lead_minutes} 分鐘派發設定的輸出內容。</p>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowHeldOrders(false)}>關閉</Button>
                        <Button
                            onClick={handleHoldCurrentOrder}
                            disabled={items.length === 0}
                            className="bg-[#D4AF37] hover:bg-[#C5A028] text-white"
                        >
                            {holdMode === 'scheduled' ? '建立定時掛單' : '掛起目前訂單'}（{items.length} 項）
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <ProductOptionDialog
                open={showOptionDialog}
                onClose={closeOptionDialog}
                product={selectedProduct}
                onConfirm={handleOptionConfirm}
                initialOptions={editingCartItem?.selectedOptions}
                initialQuantity={editingCartItem?.quantity}
                initialNote={editingCartItem?.note}
                editing={!!editingCartItem}
            />
            <CashManagementDialog
                open={showCashDialog}
                onClose={() => setShowCashDialog(false)}
                shiftId={currentShiftId}
                onSuccess={() => {
                    // Refresh shift data if needed, or show success message
                }}
            />
        </div>
    );
}
