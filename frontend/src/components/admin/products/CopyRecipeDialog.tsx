'use client';

import { useMemo, useState } from 'react';
import { Check, Copy, Loader2, Search } from 'lucide-react';
import { Product, ProductMaterial, ProductMaterialCreate, productApi } from '@/lib/api/products';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface CopyRecipeDialogProps {
    materials: ProductMaterial[];
    currentProductId: number;
    storeId: number;
}

export const createRecipePayload = (materials: ProductMaterial[]): ProductMaterialCreate[] =>
    materials.map((material) => ({
        material_id: material.material_id,
        quantity: material.quantity,
    }));

export default function CopyRecipeDialog({ materials, currentProductId, storeId }: CopyRecipeDialogProps) {
    const [open, setOpen] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [copying, setCopying] = useState(false);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);

    const availableProducts = useMemo(
        () => products.filter((product) => product.id !== currentProductId),
        [products, currentProductId]
    );
    const filteredProducts = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return query
            ? availableProducts.filter((product) =>
                product.name.toLowerCase().includes(query) ||
                (product.category || '').toLowerCase().includes(query)
            )
            : availableProducts;
    }, [availableProducts, searchQuery]);

    const handleOpenChange = async (nextOpen: boolean) => {
        if (copying) return;
        setOpen(nextOpen);
        if (!nextOpen) return;

        setSelectedIds([]);
        setSearchQuery('');
        setMessage('');
        setLoading(true);
        try {
            setProducts(await productApi.getAll(storeId));
        } catch (error) {
            console.error('載入商品列表失敗:', error);
            setIsError(true);
            setMessage('無法載入商品列表，請稍後再試。');
        } finally {
            setLoading(false);
        }
    };

    const toggleProduct = (productId: number) => {
        setSelectedIds((current) => current.includes(productId)
            ? current.filter((id) => id !== productId)
            : [...current, productId]
        );
        setMessage('');
    };

    const allFilteredSelected = filteredProducts.length > 0 &&
        filteredProducts.every((product) => selectedIds.includes(product.id));

    const toggleAll = () => {
        const filteredIds = filteredProducts.map((product) => product.id);
        setSelectedIds((current) => allFilteredSelected
            ? current.filter((id) => !filteredIds.includes(id))
            : Array.from(new Set([...current, ...filteredIds]))
        );
    };

    const handleCopy = async () => {
        if (selectedIds.length === 0) return;
        setCopying(true);
        setMessage('');
        const results = await Promise.allSettled(
            selectedIds.map((productId) =>
                productApi.updateProduct(productId, storeId, { materials: createRecipePayload(materials) })
            )
        );
        const succeededIds = selectedIds.filter((_, index) => results[index].status === 'fulfilled');
        const failedCount = results.length - succeededIds.length;
        setCopying(false);
        setIsError(failedCount > 0);
        setMessage(failedCount > 0
            ? `${succeededIds.length} 個成功、${failedCount} 個失敗；已保留失敗項目供重試。`
            : `已成功複製配方到 ${succeededIds.length} 個商品。`
        );
        setSelectedIds(failedCount > 0
            ? selectedIds.filter((id) => !succeededIds.includes(id))
            : []
        );
    };

    return (
        <>
            <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={materials.length === 0}
                onClick={() => void handleOpenChange(true)}
                className="border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                title={materials.length === 0 ? '請先新增配方耗材' : undefined}
            >
                <Copy />
                複製配方
            </Button>

            <Dialog open={open} onOpenChange={(nextOpen) => void handleOpenChange(nextOpen)}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>複製配方到其他商品</DialogTitle>
                        <DialogDescription>
                            將目前的 {materials.length} 項配方耗材複製到所選商品，並完整覆寫目標商品原有配方。
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="search"
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                placeholder="搜尋商品名稱或分類"
                                className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                            />
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>已選擇 {selectedIds.length} 個商品</span>
                            <button type="button" onClick={toggleAll} disabled={filteredProducts.length === 0} className="font-medium text-blue-600 disabled:text-gray-300">
                                {allFilteredSelected ? '取消全選' : '全選目前結果'}
                            </button>
                        </div>
                        <div className="max-h-72 overflow-y-auto rounded-lg border border-gray-200">
                            {loading ? (
                                <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500"><Loader2 className="animate-spin" />載入商品中...</div>
                            ) : filteredProducts.length === 0 ? (
                                <div className="py-12 text-center text-sm text-gray-400">沒有符合的其他商品</div>
                            ) : filteredProducts.map((product) => {
                                const selected = selectedIds.includes(product.id);
                                return (
                                    <label key={product.id} className="flex cursor-pointer items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-0 hover:bg-gray-50">
                                        <span className={`flex h-5 w-5 items-center justify-center rounded border ${selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'}`}>
                                            {selected && <Check size={14} />}
                                        </span>
                                        <input type="checkbox" checked={selected} onChange={() => toggleProduct(product.id)} className="sr-only" />
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-medium text-gray-800">{product.name}</span>
                                            <span className="block text-xs text-gray-400">{product.category || '未分類'} · ID #{product.id}</span>
                                        </span>
                                        {(product.materials?.length || 0) > 0 && <span className="text-xs text-amber-600">已有 {product.materials?.length} 項配方</span>}
                                    </label>
                                );
                            })}
                        </div>
                        {message && <p className={`text-sm ${isError ? 'text-red-600' : 'text-green-600'}`}>{message}</p>}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => void handleOpenChange(false)} disabled={copying}>關閉</Button>
                        <Button type="button" onClick={() => void handleCopy()} disabled={copying || loading || selectedIds.length === 0} className="bg-blue-600 text-white hover:bg-blue-700">
                            {copying ? <Loader2 className="animate-spin" /> : <Copy />}
                            {copying ? '複製中...' : `複製到 ${selectedIds.length} 個商品`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
