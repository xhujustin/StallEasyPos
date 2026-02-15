import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { ProductAttribute, ProductAttributeOption } from '@/lib/api/products';
import { Material } from '@/lib/api/materials';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableOption } from './SortableOption';
import { SortableAttributeGroup } from './SortableAttributeGroup';

interface AttributeManagerProps {
    attributes: ProductAttribute[];
    onChange: (attributes: ProductAttribute[]) => void;
    materials: Material[];
}

export default function AttributeManager({ attributes, onChange, materials }: AttributeManagerProps) {
    const [expandedGroups, setExpandedGroups] = useState<number[]>([]);

    // 設定拖曳感測器
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // 移動 5px 後才視為拖曳，避免與點擊衝突
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const toggleGroup = (index: number) => {
        if (expandedGroups.includes(index)) {
            setExpandedGroups(expandedGroups.filter(i => i !== index));
        } else {
            setExpandedGroups([...expandedGroups, index]);
        }
    };

    // --- Attribute Group Operations ---

    const addAttributeGroup = () => {
        // Generate a random ID (negative to distinguish from DB IDs and minimize collision)
        const tempId = Math.floor(Math.random() * -1000000000) - 1;
        const newGroup: ProductAttribute = {
            id: tempId,
            name: '新屬性群組',
            min_selection: 0,
            max_selection: 1,
            display_order: attributes.length + 1,
            options: [] // Empty options initially
        };
        onChange([...attributes, newGroup]);
        setExpandedGroups([...expandedGroups, attributes.length]); // Auto expand
    };

    const updateAttributeGroup = (index: number, updates: Partial<ProductAttribute>) => {
        const newAttributes = [...attributes];
        newAttributes[index] = { ...newAttributes[index], ...updates };
        onChange(newAttributes);
    };

    const removeAttributeGroup = (index: number) => {
        const newAttributes = attributes.filter((_, i) => i !== index);
        onChange(newAttributes);
    };

    // --- Option Operations ---

    const addOption = (groupIndex: number) => {
        const newAttributes = [...attributes];
        const group = { ...newAttributes[groupIndex] };
        // Generate a random ID (negative to distinguish from DB IDs and minimize collision)
        const tempId = Math.floor(Math.random() * -1000000000) - 1;
        const newOption: ProductAttributeOption = {
            id: tempId,
            name: '新選項',
            price_adjustment: 0,
            is_active: true,
            display_order: group.options.length + 1
        };
        group.options = [...group.options, newOption];
        newAttributes[groupIndex] = group;
        onChange(newAttributes);
    };

    const updateOption = (groupIndex: number, optionIndex: number, updates: Partial<ProductAttributeOption>) => {
        const newAttributes = [...attributes];
        const group = { ...newAttributes[groupIndex] };
        const newOptions = [...group.options];
        newOptions[optionIndex] = { ...newOptions[optionIndex], ...updates };
        group.options = newOptions;
        newAttributes[groupIndex] = group;
        onChange(newAttributes);
    };

    const removeOption = (groupIndex: number, optionIndex: number) => {
        const newAttributes = [...attributes];
        const group = { ...newAttributes[groupIndex] };
        group.options = group.options.filter((_, i) => i !== optionIndex);
        newAttributes[groupIndex] = group;
        onChange(newAttributes);
    };

    // --- Drag and Drop Handlers ---

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over) return;

        const activeId = active.id.toString();
        const overId = over.id.toString();

        if (activeId !== overId) {
            // 判斷是群組拖曳還是選項拖曳
            const isGroupDrag = activeId.startsWith('group-');
            const isOptionDrag = activeId.startsWith('option-');

            if (isGroupDrag) {
                const oldIndex = attributes.findIndex(attr => `group-${attr.id}` === activeId);
                const newIndex = attributes.findIndex(attr => `group-${attr.id}` === overId);

                if (oldIndex !== -1 && newIndex !== -1) {
                    const newAttributes = arrayMove(attributes, oldIndex, newIndex);
                    // 更新 display_order
                    const updatedAttributes = newAttributes.map((attr, idx) => ({
                        ...attr,
                        display_order: idx + 1
                    }));
                    onChange(updatedAttributes);
                }
            } else if (isOptionDrag) {
                // 選項拖曳
                const groupIndex = attributes.findIndex(group =>
                    group.options.some(opt => `option-${opt.id}` === activeId)
                );

                if (groupIndex !== -1) {
                    const newAttributes = [...attributes];
                    const group = { ...newAttributes[groupIndex] };

                    const oldIndex = group.options.findIndex(opt => `option-${opt.id}` === activeId);
                    const newIndex = group.options.findIndex(opt => `option-${opt.id}` === overId);

                    if (oldIndex !== -1 && newIndex !== -1) {
                        group.options = arrayMove(group.options, oldIndex, newIndex);

                        // 更新 Option display_order
                        group.options = group.options.map((opt, idx) => ({
                            ...opt,
                            display_order: idx + 1
                        }));

                        newAttributes[groupIndex] = group;
                        onChange(newAttributes);
                    }
                }
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">客製化選項設定</h3>
                <button
                    type="button"
                    onClick={addAttributeGroup}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 text-sm font-medium transition-colors"
                >
                    <Plus size={16} />
                    新增屬性群組
                </button>
            </div>

            {attributes.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-gray-500">
                    尚未設定任何屬性。點擊「新增屬性群組」來開始設定 (例如：甜度、冰塊、加料)。
                </div>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={attributes.map(attr => `group-${attr.id}`)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="space-y-4">
                            {attributes.map((attr, groupIndex) => (
                                <SortableAttributeGroup
                                    key={attr.id}
                                    id={`group-${attr.id}`}
                                    attribute={attr}
                                    groupIndex={groupIndex}
                                    expanded={expandedGroups.includes(groupIndex)}
                                    toggleGroup={toggleGroup}
                                    updateAttributeGroup={updateAttributeGroup}
                                    removeAttributeGroup={removeAttributeGroup}
                                >
                                    <div className="mb-2 flex items-center justify-between">
                                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">選項列表</span>
                                        <span className="text-xs text-gray-400">拖曳可排序</span>
                                    </div>

                                    <SortableContext
                                        items={attr.options.map(o => `option-${o.id}`)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div className="space-y-2">
                                            {attr.options.map((option, optIndex) => (
                                                <SortableOption
                                                    key={option.id}
                                                    id={`option-${option.id}`}
                                                    option={option}
                                                    groupIndex={groupIndex}
                                                    optIndex={optIndex}
                                                    updateOption={updateOption}
                                                    removeOption={removeOption}
                                                    materials={materials}
                                                />
                                            ))}
                                        </div>
                                    </SortableContext>

                                    <div className="mt-3">
                                        <button
                                            type="button"
                                            onClick={() => addOption(groupIndex)}
                                            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors w-fit"
                                        >
                                            <Plus size={14} />
                                            新增選項
                                        </button>
                                    </div>
                                </SortableAttributeGroup>
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            )}
        </div>
    );
}
