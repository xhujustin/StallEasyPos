import React, { useMemo, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Package, Plus, X } from 'lucide-react';
import { ProductAttributeOption, OptionMaterial } from '@/lib/api/products';
import { Material, MaterialGroup } from '@/lib/api/materials';

interface SortableOptionProps {
    id: string; // 用於 dnd-kit 的唯一識別符
    option: ProductAttributeOption;
    groupIndex: number;
    optIndex: number;
    updateOption: (groupIndex: number, optIndex: number, updates: Partial<ProductAttributeOption>) => void;
    removeOption: (groupIndex: number, optIndex: number) => void;
    materials?: Material[];
    materialGroups?: MaterialGroup[];
}

export function SortableOption({
    id,
    option,
    groupIndex,
    optIndex,
    updateOption,
    removeOption,
    materials = [],
    materialGroups = []
}: SortableOptionProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const [showMaterials, setShowMaterials] = useState((option.materials?.length || 0) > 0);
    const [priceDirection, setPriceDirection] = useState<'add' | 'subtract'>(
        Number(option.price_adjustment) < 0 ? 'subtract' : 'add'
    );
    const materialSections = useMemo(() => {
        const configuredGroups = materialGroups.map((group) => group.name);
        const additionalGroups = materials
            .map((material) => material.group_name)
            .filter((name): name is string => Boolean(name) && !configuredGroups.includes(name as string));
        const groupNames = Array.from(new Set([...configuredGroups, ...additionalGroups, '未分類']));
        const types: Array<{ type: Material['material_type']; label: string }> = [
            { type: 'raw', label: '庫存管理' },
            { type: 'composite', label: '耗材組合' },
        ];

        return types.map((section) => ({
            ...section,
            groups: groupNames.map((groupName) => ({
                name: groupName,
                materials: materials.filter((material) =>
                    material.material_type === section.type &&
                    (material.group_name || '未分類') === groupName
                ),
            })).filter((group) => group.materials.length > 0),
        })).filter((section) => section.groups.length > 0);
    }, [materials, materialGroups]);

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1000 : 'auto',
        position: 'relative' as const,
    };

    const handleAddMaterial = () => {
        if (!materials.length) return;
        const currentMaterials = option.materials || [];
        const newMaterial: OptionMaterial = {
            material_id: materials[0].id,
            quantity: 1
        };
        updateOption(groupIndex, optIndex, { materials: [...currentMaterials, newMaterial] });
    };

    const updateMaterial = (matIndex: number, updates: Partial<OptionMaterial>) => {
        const currentMaterials = [...(option.materials || [])];
        currentMaterials[matIndex] = { ...currentMaterials[matIndex], ...updates };
        updateOption(groupIndex, optIndex, { materials: currentMaterials });
    };

    const removeMaterial = (matIndex: number) => {
        const currentMaterials = (option.materials || []).filter((_, i) => i !== matIndex);
        updateOption(groupIndex, optIndex, { materials: currentMaterials });
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex flex-col gap-2 p-2 hover:bg-gray-50 rounded border transition-colors ${isDragging ? 'border-blue-400 bg-blue-50 shadow-lg' : 'border-transparent hover:border-gray-200'}`}
        >
            <div className="flex items-center gap-3">
                {/* 拖曳把手 */}
                <div
                    {...attributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 p-1"
                >
                    <GripVertical size={16} />
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                    {/* 選項名稱 */}
                    <div className="md:col-span-4">
                        <input
                            type="text"
                            value={option.name}
                            onChange={(e) => updateOption(groupIndex, optIndex, { name: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
                            placeholder="選項名稱"
                        />
                    </div>

                    {/* 價格調整 */}
                    <div className="md:col-span-3 flex items-center max-md:mt-1">
                        <select
                            value={priceDirection}
                            onChange={(e) => {
                                const direction = e.target.value as 'add' | 'subtract';
                                const amount = Math.abs(Number(option.price_adjustment)) || 0;
                                setPriceDirection(direction);
                                updateOption(groupIndex, optIndex, {
                                    price_adjustment: direction === 'subtract' ? -amount : amount
                                });
                            }}
                            className="mr-1 h-8 w-12 rounded border border-gray-300 bg-white text-center text-sm font-bold text-gray-600 focus:ring-1 focus:ring-blue-500"
                            aria-label="價格調整方式"
                        >
                            <option value="add">＋</option>
                            <option value="subtract">－</option>
                        </select>
                        <span className="mr-1 text-sm text-gray-500">$</span>
                        <input
                            type="number"
                            value={Math.abs(Number(option.price_adjustment))}
                            onChange={(e) => {
                                const amount = Math.abs(parseFloat(e.target.value)) || 0;
                                updateOption(groupIndex, optIndex, {
                                    price_adjustment: priceDirection === 'subtract' ? -amount : amount
                                });
                            }}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
                            placeholder="金額"
                            min="0"
                            step="1"
                        />
                    </div>

                    {/* 啟用/停用 */}
                    <div className="md:col-span-2 flex items-center gap-2 max-md:mt-1">
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={option.is_active}
                                onChange={(e) => updateOption(groupIndex, optIndex, { is_active: e.target.checked })}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                            />
                            <span className={`text-sm ${option.is_active ? 'text-gray-700' : 'text-gray-400'}`}>
                                {option.is_active ? '啟用' : '停用'}
                            </span>
                        </label>
                    </div>

                    {/* 動作按鈕 */}
                    <div className="md:col-span-3 flex items-center justify-end gap-1">
                        <button
                            type="button"
                            onClick={() => setShowMaterials(!showMaterials)}
                            className={`flex h-8 items-center justify-center gap-1 rounded-md px-2 text-xs font-medium transition-colors ${showMaterials || (option.materials && option.materials.length > 0) ? 'text-blue-700 bg-blue-50 ring-1 ring-blue-200' : 'text-gray-500 bg-gray-50 hover:bg-gray-100 hover:text-gray-700'}`}
                            title="設定成本與庫存調整"
                        >
                            <Package size={14} />
                            <span className="whitespace-nowrap">成本與庫存調整</span>
                            {(option.materials?.length || 0) > 0 && (
                                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] text-white">
                                    {option.materials?.length}
                                </span>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => removeOption(groupIndex, optIndex)}
                            className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                            title="刪除選項"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* 耗材設定區塊 */}
            {showMaterials && (
                <div className="ml-8 mt-2 p-4 border border-gray-200 bg-gray-50 rounded-lg shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <div className="text-xs font-medium text-gray-600">成本與庫存調整</div>
                            <div className="mt-1 text-xs text-gray-400">
                                加料請選「加入」；不要請選「移除」；替換請各新增一筆「移除原料」與「加入替代料」。
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleAddMaterial}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                            disabled={materials.length === 0}
                        >
                            <Plus size={12} />
                            新增調整
                        </button>
                    </div>

                    {(!option.materials || option.materials.length === 0) && (
                        <div className="text-xs text-gray-400 italic py-1">
                            尚未設定耗材調整（選取此選項不會改變成本與庫存）
                        </div>
                    )}

                    <div className="space-y-2">
                        {option.materials?.map((optMat, idx) => (
                            <div key={idx} className="flex flex-wrap items-center gap-3 bg-white border border-gray-200 rounded p-2">
                                <select
                                    value={optMat.quantity < 0 ? 'remove' : 'add'}
                                    onChange={(e) => {
                                        const quantity = Math.abs(Number(optMat.quantity)) || 0;
                                        updateMaterial(idx, {
                                            quantity: e.target.value === 'remove' ? -quantity : quantity
                                        });
                                    }}
                                    className={`h-9 w-24 rounded px-2 py-1 text-center text-sm font-medium [text-align-last:center] ${
                                        optMat.quantity < 0
                                            ? 'border-red-200 bg-red-50 text-red-700'
                                            : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                    }`}
                                    aria-label="耗材調整方式"
                                >
                                    <option value="add">加入</option>
                                    <option value="remove">移除</option>
                                </select>
                                <select
                                    value={optMat.material_id}
                                    onChange={(e) => updateMaterial(idx, { material_id: Number(e.target.value) })}
                                    className="min-w-40 flex-1 text-sm border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 py-1"
                                >
                                    {materialSections.flatMap((section) => [
                                        <option key={`${section.type}-heading`} disabled value={`${section.type}-heading`}>
                                            ── {section.label} ──
                                        </option>,
                                        ...section.groups.map((group) => (
                                            <optgroup key={`${section.type}-${group.name}`} label={`${section.label}｜${group.name}`}>
                                                {group.materials.map((material) => (
                                                    <option key={material.id} value={material.id}>
                                                        {material.name} ({material.unit})
                                                    </option>
                                                ))}
                                            </optgroup>
                                        )),
                                    ])}
                                </select>

                                <div className="w-px h-6 bg-gray-200"></div>

                                <div className="flex items-center w-28">
                                    <input
                                        type="number"
                                        value={Math.abs(Number(optMat.quantity))}
                                        onChange={(e) => {
                                            const quantity = Math.abs(Number(e.target.value)) || 0;
                                            updateMaterial(idx, {
                                                quantity: optMat.quantity < 0 ? -quantity : quantity
                                            });
                                        }}
                                        className="w-full text-sm border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 py-1"
                                        placeholder="數量"
                                        min="0"
                                        step="0.1"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeMaterial(idx)}
                                    className="text-gray-400 hover:text-red-500"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
