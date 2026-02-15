import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Product, ProductAttribute, ProductAttributeOption } from '@/lib/api/products';
import { CartItemOption } from '@/lib/store/cart-store';
import { Plus, Minus } from 'lucide-react';

interface ProductOptionDialogProps {
    open: boolean;
    onClose: () => void;
    product: Product | null;
    onConfirm: (options: CartItemOption[], quantity: number) => void;
}

export function ProductOptionDialog({ open, onClose, product, onConfirm }: ProductOptionDialogProps) {
    const [selectedOptions, setSelectedOptions] = useState<Record<number, number[]>>({}); // attributeId -> [optionId, ...]
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        if (open) {
            setSelectedOptions({});
            setQuantity(1);
            // Auto-select defaults if min_selection > 0 and only 1 option?
            // Or just leave empty.
        }
    }, [open, product]);

    if (!product) return null;

    const attributes = product.attributes || [];

    const handleOptionToggle = (attribute: ProductAttribute, option: ProductAttributeOption) => {
        const currentSelected = selectedOptions[attribute.id!] || [];
        const isSelected = currentSelected.includes(option.id!);

        if (attribute.max_selection === 1) {
            // Single selection
            if (isSelected) {
                if (attribute.min_selection === 0) {
                    // Toggle off allowed if min is 0
                    setSelectedOptions({ ...selectedOptions, [attribute.id!]: [] });
                }
            } else {
                // Select new, replace old
                setSelectedOptions({ ...selectedOptions, [attribute.id!]: [option.id!] });
            }
        } else {
            // Multiple selection
            if (isSelected) {
                // Remove
                setSelectedOptions({
                    ...selectedOptions,
                    [attribute.id!]: currentSelected.filter(id => id !== option.id!)
                });
            } else {
                // Add if not exceeding max
                if (currentSelected.length < attribute.max_selection) {
                    setSelectedOptions({
                        ...selectedOptions,
                        [attribute.id!]: [...currentSelected, option.id!]
                    });
                }
            }
        }
    };

    const calculateTotal = () => {
        let total = Number(product.price);
        attributes.forEach(attr => {
            const selectedIds = selectedOptions[attr.id!] || [];
            selectedIds.forEach(optId => {
                const opt = attr.options.find(o => o.id === optId);
                if (opt) {
                    total += Number(opt.price_adjustment);
                }
            });
        });
        return total * quantity;
    };

    const isValid = () => {
        return attributes.every(attr => {
            const count = (selectedOptions[attr.id!] || []).length;
            return count >= attr.min_selection && count <= attr.max_selection;
        });
    };

    const handleConfirm = () => {
        if (!isValid()) return;

        const cartOptions: CartItemOption[] = [];
        attributes.forEach(attr => {
            const selectedIds = selectedOptions[attr.id!] || [];
            selectedIds.forEach(optId => {
                const opt = attr.options.find(o => o.id === optId);
                if (opt) {
                    cartOptions.push({
                        attributeId: attr.id!,
                        attributeName: attr.name,
                        optionId: opt.id!,
                        optionName: opt.name,
                        priceAdjustment: Number(opt.price_adjustment)
                    });
                }
            });
        });

        onConfirm(cartOptions, quantity);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto bg-white flex flex-col p-0 gap-0">
                <div className="p-6 pb-2">
                    <DialogTitle className="text-xl font-bold text-slate-900">{product.name}</DialogTitle>
                    <p className="text-sm text-slate-500 mt-1">底價: ${product.price}</p>
                </div>

                <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-6">
                    {attributes.map(attr => (
                        <div key={attr.id} className="space-y-3">
                            <div className="flex justify-between items-center bg-slate-50 p-2 rounded">
                                <h4 className="font-medium text-slate-900">
                                    {attr.name}
                                    <span className="text-xs text-slate-500 ml-2 font-normal">
                                        (選 {attr.min_selection} ~ {attr.max_selection} 項)
                                    </span>
                                </h4>
                                {selectedOptions[attr.id!] && selectedOptions[attr.id!].length > 0 && (
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                        已選 {selectedOptions[attr.id!].length}
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                {attr.options.map(opt => {
                                    const isSelected = (selectedOptions[attr.id!] || []).includes(opt.id!);
                                    return (
                                        <button
                                            key={opt.id}
                                            onClick={() => handleOptionToggle(attr, opt)}
                                            className={`
                                                flex justify-between items-center p-3 rounded-lg border text-sm transition-all
                                                ${isSelected
                                                    ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500'
                                                    : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50 text-slate-700'}
                                            `}
                                        >
                                            <span>{opt.name}</span>
                                            {opt.price_adjustment !== 0 && (
                                                <span className={`text-xs ${isSelected ? 'text-blue-600' : 'text-slate-500'}`}>
                                                    {opt.price_adjustment > 0 ? '+' : ''}{opt.price_adjustment}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-6">
                        <span className="font-medium text-slate-700">數量</span>
                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline" size="icon"
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            >
                                <Minus size={16} />
                            </Button>
                            <span className="w-8 text-center font-bold text-lg">{quantity}</span>
                            <Button
                                variant="outline" size="icon"
                                onClick={() => setQuantity(quantity + 1)}
                            >
                                <Plus size={16} />
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-200 bg-slate-50">
                    <Button
                        className="w-full h-12 text-lg font-bold bg-[#D4AF37] hover:bg-[#C5A028] text-white"
                        onClick={handleConfirm}
                        disabled={!isValid()}
                    >
                        加入購物車 - ${calculateTotal()}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
