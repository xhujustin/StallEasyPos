'use client';

import { useMemo, useState } from 'react';
import { Check, Copy, Loader2, Search } from 'lucide-react';
import { Product, ProductAttribute, productApi } from '@/lib/api/products';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface CopyAttributesDialogProps {
    attributes: ProductAttribute[];
    currentProductId: number;
    storeId: number;
    singleGroup?: boolean;
    compact?: boolean;
}

export const createAttributesPayload = (attributes: ProductAttribute[]): ProductAttribute[] =>
    attributes.map((attribute, attributeIndex) => ({
        name: attribute.name,
        min_selection: attribute.min_selection,
        max_selection: attribute.max_selection,
        display_order: attributeIndex + 1,
        options: attribute.options.map((option, optionIndex) => ({
            name: option.name,
            price_adjustment: option.price_adjustment,
            is_active: option.is_active,
            display_order: optionIndex + 1,
            materials: option.materials?.map((material) => ({
                material_id: material.material_id,
                quantity: material.quantity,
            })),
        })),
    }));

export default function CopyAttributesDialog({
    attributes,
    currentProductId,
    storeId,
    singleGroup = false,
    compact = false,
}: CopyAttributesDialogProps) {
    const [open, setOpen] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [copying, setCopying] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successCount, setSuccessCount] = useState<number | null>(null);

    const availableProducts = useMemo(
        () => products.filter((product) => product.id !== currentProductId),
        [products, currentProductId]
    );

    const filteredProducts = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return availableProducts;
        return availableProducts.filter((product) =>
            product.name.toLowerCase().includes(query) ||
            (product.category || '').toLowerCase().includes(query)
        );
    }, [availableProducts, searchQuery]);

    const handleOpenChange = async (nextOpen: boolean) => {
        if (copying) return;
        setOpen(nextOpen);
        if (!nextOpen) return;

        setSelectedIds([]);
        setSearchQuery('');
        setErrorMessage('');
        setSuccessCount(null);
        setLoadingProducts(true);
        try {
            setProducts(await productApi.getAll(storeId));
        } catch (error) {
            console.error('載入可複製商品失敗:', error);
            setErrorMessage('無法載入商品列表，請稍後再試。');
        } finally {
            setLoadingProducts(false);
        }
    };

    const toggleProduct = (productId: number) => {
        setSelectedIds((current) =>
            current.includes(productId)
                ? current.filter((id) => id !== productId)
                : [...current, productId]
        );
        setErrorMessage('');
        setSuccessCount(null);
    };

    const allFilteredSelected = filteredProducts.length > 0 &&
        filteredProducts.every((product) => selectedIds.includes(product.id));

    const toggleAllFiltered = () => {
        const filteredIds = filteredProducts.map((product) => product.id);
        setSelectedIds((current) => allFilteredSelected
            ? current.filter((id) => !filteredIds.includes(id))
            : Array.from(new Set([...current, ...filteredIds]))
        );
    };

    const handleCopy = async () => {
        if (selectedIds.length === 0) {
            setErrorMessage('請至少選擇一個商品。');
            return;
        }

        setCopying(true);
        setErrorMessage('');
        setSuccessCount(null);
        const payload = createAttributesPayload(attributes);

        const results = await Promise.allSettled(selectedIds.map((productId) => {
            if (!singleGroup) {
                return productApi.updateProduct(productId, storeId, { attributes: payload });
            }

            const targetProduct = products.find((product) => product.id === productId);
            const targetAttributes = createAttributesPayload(targetProduct?.attributes || []);
            const copiedGroup = payload[0];
            const sameNameIndex = targetAttributes.findIndex(
                (attribute) => attribute.name.trim().toLowerCase() === copiedGroup.name.trim().toLowerCase()
            );

            if (sameNameIndex >= 0) {
                targetAttributes[sameNameIndex] = {
                    ...copiedGroup,
                    display_order: targetAttributes[sameNameIndex].display_order,
                };
            } else {
                targetAttributes.push({ ...copiedGroup, display_order: targetAttributes.length + 1 });
            }

            return productApi.updateProduct(productId, storeId, { attributes: targetAttributes });
        }));
        const succeededIds = selectedIds.filter((_, index) => results[index].status === 'fulfilled');
        const failedCount = results.length - succeededIds.length;

        setCopying(false);
        setSuccessCount(succeededIds.length);
        if (failedCount > 0) {
            setSelectedIds((current) => current.filter((id) => !succeededIds.includes(id)));
            setErrorMessage(`${failedCount} 個商品複製失敗，已保留失敗項目供您重試。`);
        } else {
            setSelectedIds([]);
        }
    };

    return (
        <>
            <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={attributes.length === 0}
                onClick={() => void handleOpenChange(true)}
                className={compact
                    ? 'h-8 border-blue-200 px-2 text-blue-700 hover:bg-blue-50 hover:text-blue-800'
                    : 'border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800'}
                title={attributes.length === 0 ? '請先新增客製選項' : undefined}
            >
                <Copy />
                {singleGroup ? '複製群組' : '複製全部選項'}
            </Button>

            <Dialog open={open} onOpenChange={(nextOpen) => void handleOpenChange(nextOpen)}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{singleGroup ? `複製「${attributes[0]?.name || '屬性群組'}」到其他商品` : '複製全部客製選項到其他商品'}</DialogTitle>
                        <DialogDescription>
                            {singleGroup
                                ? '目標商品會保留其他屬性群組；如已有同名群組，將以目前內容覆寫。'
                                : `將目前畫面中的 ${attributes.length} 個屬性群組複製到所選商品。目標商品原有的客製選項會被完整覆寫。`}
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
                            <button
                                type="button"
                                onClick={toggleAllFiltered}
                                disabled={filteredProducts.length === 0 || loadingProducts}
                                className="font-medium text-blue-600 hover:text-blue-800 disabled:text-gray-300"
                            >
                                {allFilteredSelected ? '取消全選' : '全選目前結果'}
                            </button>
                        </div>

                        <div className="max-h-72 overflow-y-auto rounded-lg border border-gray-200">
                            {loadingProducts ? (
                                <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
                                    <Loader2 className="animate-spin" size={18} />
                                    載入商品中...
                                </div>
                            ) : filteredProducts.length === 0 ? (
                                <div className="py-12 text-center text-sm text-gray-400">
                                    {availableProducts.length === 0 ? '沒有其他可複製的商品' : '找不到符合的商品'}
                                </div>
                            ) : (
                                filteredProducts.map((product) => {
                                    const selected = selectedIds.includes(product.id);
                                    return (
                                        <label
                                            key={product.id}
                                            className="flex cursor-pointer items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0 hover:bg-gray-50"
                                        >
                                            <span className={`flex h-5 w-5 items-center justify-center rounded border ${selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white'}`}>
                                                {selected && <Check size={14} />}
                                            </span>
                                            <input
                                                type="checkbox"
                                                checked={selected}
                                                onChange={() => toggleProduct(product.id)}
                                                className="sr-only"
                                            />
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-medium text-gray-800">{product.name}</span>
                                                <span className="block text-xs text-gray-400">{product.category || '未分類'} · ID #{product.id}</span>
                                            </span>
                                            {(product.attributes?.length || 0) > 0 && (
                                                <span className="text-xs text-amber-600">已有 {product.attributes?.length} 組選項</span>
                                            )}
                                        </label>
                                    );
                                })
                            )}
                        </div>

                        {successCount !== null && successCount > 0 && (
                            <p className="text-sm text-green-600">已成功複製到 {successCount} 個商品。</p>
                        )}
                        {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => void handleOpenChange(false)} disabled={copying}>
                            {successCount !== null && !errorMessage ? '完成' : '取消'}
                        </Button>
                        <Button
                            type="button"
                            onClick={() => void handleCopy()}
                            disabled={copying || loadingProducts || selectedIds.length === 0}
                            className="bg-blue-600 text-white hover:bg-blue-700"
                        >
                            {copying ? <Loader2 className="animate-spin" /> : <Copy />}
                            {copying ? '複製中...' : `複製到 ${selectedIds.length} 個商品`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
