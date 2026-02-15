import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Package, Plus, X } from 'lucide-react';
import { ProductAttributeOption, OptionMaterial } from '@/lib/api/products';
import { Material } from '@/lib/api/materials';

interface SortableOptionProps {
    id: string; // 用於 dnd-kit 的唯一識別符
    option: ProductAttributeOption;
    groupIndex: number;
    optIndex: number;
    updateOption: (groupIndex: number, optIndex: number, updates: Partial<ProductAttributeOption>) => void;
    removeOption: (groupIndex: number, optIndex: number) => void;
    materials?: Material[];
}

export function SortableOption({
    id,
    option,
    groupIndex,
    optIndex,
    updateOption,
    removeOption,
    materials = []
}: SortableOptionProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const [showMaterials, setShowMaterials] = useState(false);

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

                    {/* 加價 */}
                    <div className="md:col-span-3 flex items-center max-md:mt-1">
                        <span className="text-gray-500 text-sm mr-1">+$</span>
                        <input
                            type="number"
                            value={option.price_adjustment}
                            onChange={(e) => updateOption(groupIndex, optIndex, { price_adjustment: parseFloat(e.target.value) || 0 })}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
                            placeholder="加價"
                            step="1"
                        />
                    </div>

                    {/* 啟用/停用 */}
                    <div className="md:col-span-3 flex items-center gap-2 max-md:mt-1">
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
                    <div className="md:col-span-2 flex justify-end gap-1">
                        <button
                            type="button"
                            onClick={() => setShowMaterials(!showMaterials)}
                            className={`p-1 rounded transition-colors ${showMaterials || (option.materials && option.materials.length > 0) ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
                            title="設定耗材"
                        >
                            <Package size={16} />
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
                        <span className="text-xs font-medium text-gray-500">連結庫存耗材</span>
                        <button
                            type="button"
                            onClick={handleAddMaterial}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                            disabled={materials.length === 0}
                        >
                            <Plus size={12} />
                            新增耗材
                        </button>
                    </div>

                    {(!option.materials || option.materials.length === 0) && (
                        <div className="text-xs text-gray-400 italic py-1">
                            尚未連結任何耗材 (選取此選項不會扣庫存)
                        </div>
                    )}

                    <div className="space-y-2">
                        {option.materials?.map((optMat, idx) => (
                            <div key={idx} className="flex items-center gap-4 bg-white border border-gray-200 rounded p-2">
                                <select
                                    value={optMat.material_id}
                                    onChange={(e) => updateMaterial(idx, { material_id: Number(e.target.value) })}
                                    className="flex-1 text-sm border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 py-1"
                                >
                                    {materials.map(m => (
                                        <option key={m.id} value={m.id}>
                                            {m.name} ({m.unit})
                                        </option>
                                    ))}
                                </select>

                                <div className="w-px h-6 bg-gray-200"></div>

                                <div className="flex items-center w-24">
                                    <input
                                        type="number"
                                        value={optMat.quantity}
                                        onChange={(e) => updateMaterial(idx, { quantity: Number(e.target.value) })}
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
