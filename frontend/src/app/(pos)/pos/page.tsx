'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useCartStore, CartItemOption } from '@/lib/store/cart-store';
import { useAuthStore } from '@/lib/store/auth-store';
import { productApi, Product } from '@/lib/api/products';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Plus, Minus, ShoppingCart, Loader2, AlertCircle } from 'lucide-react';
import { CheckoutModal } from '@/components/pos/checkout-modal';
import { ProductOptionDialog } from '@/components/pos/ProductOptionDialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import { CashManagementDialog } from '@/components/pos/CashManagementDialog';
import { shiftApi } from '@/lib/api/shifts';

export default function POSPage() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [showCheckout, setShowCheckout] = useState(false);
    const { items, addToCart, removeFromCart, updateQuantity, totalAmount, initStore } = useCartStore();
    const [activeCategory, setActiveCategory] = useState('全部');
    const { user, selectedStoreId } = useAuthStore();

    // Cash Management State
    const [showCashDialog, setShowCashDialog] = useState(false);
    const [currentShiftId, setCurrentShiftId] = useState<number | null>(null);

    // Product Option Dialog State
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [showOptionDialog, setShowOptionDialog] = useState(false);

    // 使用選擇的店鋪ID,如果沒有則使用第一個店鋪
    const storeId = selectedStoreId || user?.stores?.[0]?.id;
    const currentStore = user?.stores?.find((s) => s.id === storeId);

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
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    useEffect(() => {
        if (storeId) {
            initStore(storeId);
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

    const handleProductClick = (product: Product) => {
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

    const handleOptionConfirm = (options: CartItemOption[], quantity: number) => {
        if (selectedProduct) {
            addToCart({
                id: selectedProduct.id,
                name: selectedProduct.name,
                price: selectedProduct.price,
                image_url: selectedProduct.image_url
            }, quantity, options);
        }
    };

    const categories = Array.from(new Set(['全部', ...products.map((p: Product) => p.category || '未分類')]));

    const filteredProducts = (activeCategory === '全部'
        ? products
        : products.filter((p: Product) => (p.category || '未分類') === activeCategory)
    ).filter((p: Product) => p.is_active); // 只顯示啟用的商品

    if (!mounted) return null;

    return (
        <div className="flex w-full h-full overflow-hidden">
            {/* Product Catalog Area (Left) */}
            <div className="flex-1 flex flex-col border-r border-slate-200 bg-slate-50">
                {/* Category Tabs & Info */}
                <div className="h-16 border-b border-slate-200 flex items-center px-4 gap-4 bg-white shadow-sm shrink-0">
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
                            <span className="text-sm font-bold text-slate-900 leading-none mb-1">{user?.username}</span>
                            <span className="text-[10px] text-slate-500 font-medium bg-slate-100 px-1.5 py-0.5 rounded leading-none">{translatedRole}</span>
                        </div>
                    </div>
                </div>

                {/* Product Grid */}
                <div className="flex-1 overflow-y-auto p-4">
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
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {filteredProducts.map((product) => (
                                <Card
                                    key={product.id}
                                    className="cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98] border-slate-200"
                                    onClick={() => handleProductClick(product)}
                                >
                                    <CardContent className="px-3 pb flex flex-col gap-0 h-full justify-between">
                                        <div className="w-full aspect-square bg-slate-100 rounded-md mb-3 flex items-center justify-center text-slate-300 relative overflow-hidden">
                                            {/* Placeholder or Image */}
                                            {product.image_url ? (
                                                <img src={product.image_url} alt={product.name} className="object-cover w-full h-full" />
                                            ) : (
                                                <span className="text-4xl text-slate-200 font-bold select-none">
                                                    {product.name.charAt(0)}
                                                </span>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-slate-900 line-clamp-1 text-sm leading-tight">{product.name}</h3>
                                            <div className="text-[#D4AF37] font-bold mt-1 text-sm leading-tight">
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
                    <h2 className="font-bold text-lg text-slate-900">購物車</h2>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-slate-500 hover:text-slate-900"
                            onClick={() => setShowCashDialog(true)}
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
                                <div key={item.cartItemId} className="flex gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="flex-1">
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
                                            </div>
                                            <span className="font-mono font-medium">${item.price * item.quantity}</span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-2">
                                            <div className="flex items-center gap-1 bg-white rounded-md border border-slate-200 p-0.5">
                                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-sm" onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}>
                                                    <Minus className="h-3 w-3" />
                                                </Button>
                                                <span className="w-6 text-center text-sm font-mono">{item.quantity}</span>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-sm" onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}>
                                                    <Plus className="h-3 w-3" />
                                                </Button>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-50 ml-auto" onClick={() => removeFromCart(item.cartItemId)}>
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
                        <Button variant="outline" className="h-14 flex-col gap-1 border-slate-300 text-slate-600 hover:text-slate-900">
                            <span>掛單</span>
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
            <ProductOptionDialog
                open={showOptionDialog}
                onClose={() => setShowOptionDialog(false)}
                product={selectedProduct}
                onConfirm={handleOptionConfirm}
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
