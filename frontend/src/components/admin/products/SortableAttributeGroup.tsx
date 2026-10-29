import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { ProductAttribute } from '@/lib/api/products';
import CopyAttributesDialog from './CopyAttributesDialog';

interface SortableAttributeGroupProps {
    id: string; // 用於 dnd-kit (例如 "group-123")
    attribute: ProductAttribute;
    groupIndex: number;
    expanded: boolean;
    toggleGroup: (index: number) => void;
    updateAttributeGroup: (index: number, updates: Partial<ProductAttribute>) => void;
    removeAttributeGroup: (index: number) => void;
    currentProductId?: number;
    storeId?: number;
    children: React.ReactNode; // 選項列表內容
}

export function SortableAttributeGroup({
    id,
    attribute,
    groupIndex,
    expanded,
    toggleGroup,
    updateAttributeGroup,
    removeAttributeGroup,
    currentProductId,
    storeId,
    children
}: SortableAttributeGroupProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1000 : 'auto',
        position: 'relative' as const,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm transition-colors ${isDragging ? 'border-blue-400 ring-2 ring-blue-100' : ''}`}
        >
            {/* Group Header */}
            <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-200">
                <div className="flex items-center gap-3 flex-1">
                    {/* 拖曳把手 */}
                    <div
                        {...attributes}
                        {...listeners}
                        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 p-1"
                    >
                        <GripVertical size={20} />
                    </div>

                    <button
                        type="button"
                        onClick={() => toggleGroup(groupIndex)}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>

                    <div className="flex-1 flex gap-4 items-center flex-wrap">
                        <input
                            type="text"
                            value={attribute.name}
                            onChange={(e) => updateAttributeGroup(groupIndex, { name: e.target.value })}
                            className="px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 max-w-[150px] font-medium"
                            placeholder="群組名稱 (例如: 甜度)"
                        />

                        <div className="flex items-center gap-2 text-sm text-gray-600 bg-white px-2 py-1 rounded border border-gray-200">
                            <span>最少選:</span>
                            <input
                                type="number"
                                min="0"
                                value={attribute.min_selection}
                                onChange={(e) => updateAttributeGroup(groupIndex, { min_selection: parseInt(e.target.value) || 0 })}
                                className="w-12 px-1 py-0.5 border border-gray-300 rounded text-center"
                            />
                            <span className="ml-2">最多選:</span>
                            <input
                                type="number"
                                min="1"
                                value={attribute.max_selection}
                                onChange={(e) => updateAttributeGroup(groupIndex, { max_selection: parseInt(e.target.value) || 1 })}
                                className="w-12 px-1 py-0.5 border border-gray-300 rounded text-center"
                            />
                        </div>
                    </div>
                </div>

                <div className="ml-2 flex items-center gap-2">
                    {currentProductId !== undefined && storeId !== undefined && (
                        <CopyAttributesDialog
                            attributes={[attribute]}
                            currentProductId={currentProductId}
                            storeId={storeId}
                            singleGroup
                            compact
                        />
                    )}
                    <button
                        type="button"
                        onClick={() => removeAttributeGroup(groupIndex)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                        title="刪除群組"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>

            {/* Options List (Children) */}
            {expanded && (
                <div className="p-4 bg-white">
                    {children}
                </div>
            )}
        </div>
    );
}
