'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/lib/store/cart-store';
import { MOCK_PRODUCTS } from '@/lib/api/mock-data';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Plus, Minus, CreditCard, ShoppingCart } from 'lucide-react';
import { CheckoutModal } from '@/components/pos/checkout-modal';

export default function POSPage() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [showCheckout, setShowCheckout] = useState(false);
    const { items, addToCart, removeFromCart, updateQuantity, totalAmount } = useCartStore();
    const [activeCategory, setActiveCategory] = useState('全部');

    useEffect(() => {
        setMounted(true);
    }, []);

    const categories = ['全部', ...Array.from(new Set(MOCK_PRODUCTS.map((p) => p.category)))];

    const filteredProducts = activeCategory === '全部'
        ? MOCK_PRODUCTS
        : MOCK_PRODUCTS.filter((p) => p.category === activeCategory);

    return (
        <div className="flex w-full h-full">
            {/* Product Catalog Area (Left) */}
            <div className="flex-1 flex flex-col border-r border-slate-200 bg-slate-50">
                {/* Category Tabs */}
                <div className="h-16 border-b border-slate-200 flex items-center px-4 gap-2 overflow-x-auto bg-white shadow-sm shrink-0">
                    {categories.map((cat) => (
                        <Button
                            key={cat}
                            variant={activeCategory === cat ? 'default' : 'ghost'}
                            className={activeCategory === cat
                                ? 'bg-slate-900 text-white hover:bg-slate-800 rounded-full px-6'
                                : 'text-slate-600 hover:bg-slate-100 rounded-full px-6'
                            }
                            onClick={() => setActiveCategory(cat)}
                        >
                            {cat}
                        </Button>
                    ))}
                </div>

                {/* Product Grid */}
                <ScrollArea className="flex-1 p-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filteredProducts.map((product) => (
                            <Card
                                key={product.id}
                                className="cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98] border-slate-200"
                                onClick={() => addToCart(product)}
                            >
                                <CardContent className="p-4 flex flex-col gap-2 h-full justify-between">
                                    <div className="w-full aspect-square bg-slate-100 rounded-md mb-2 flex items-center justify-center text-slate-300">
                                        {/* Placeholder for image */}
                                        Img
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-slate-900 line-clamp-1">{product.name}</h3>
                                        <div className="text-[#D4AF37] font-bold mt-1">
                                            ${product.price}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* Cart Sidebar (Right) */}
            <div className="w-[350px] lg:w-[400px] flex flex-col bg-white shadow-xl z-40">
                <div className="h-16 border-b border-slate-200 flex items-center px-6 justify-between shrink-0">
                    <h2 className="font-bold text-lg text-slate-900">購物車</h2>
                    <span className="text-sm text-slate-500">{mounted ? items.length : 0} 項目</span>
                </div>

                <ScrollArea className="flex-1 p-4">
                    {items.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                            <ShoppingCart className="w-12 h-12 opacity-20" />
                            <p>尚未加入商品</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {items.map((item) => (
                                <div key={item.id} className="flex gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-medium text-slate-900">{item.name}</span>
                                            <span className="font-mono font-medium">${item.price * item.quantity}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1 bg-white rounded-md border border-slate-200 p-0.5">
                                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-sm" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                                                    <Minus className="h-3 w-3" />
                                                </Button>
                                                <span className="w-6 text-center text-sm font-mono">{item.quantity}</span>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-sm" onClick={() => addToCart(item)}>
                                                    <Plus className="h-3 w-3" />
                                                </Button>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-50 ml-auto" onClick={() => removeFromCart(item.id)}>
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
                            ${mounted ? totalAmount() : 0}
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
        </div>
    );
}
