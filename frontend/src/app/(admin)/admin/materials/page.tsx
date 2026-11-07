'use client';

import { useState, useEffect, useMemo, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { materialApi, Material, MaterialCreate, MaterialGroup, MaterialUpdate, MaterialUsageSummary } from '@/lib/api/materials';
import { BASE_UNITS, PURCHASE_UNITS, UNIT_GROUP_LABELS, conversionRateForBase, normalizeBaseUnit, unitsForBase } from '@/lib/material-units';
import { Search, Plus, Edit, Trash2, AlertTriangle, ArrowLeft, Calculator, ChevronLeft, ChevronRight, GripVertical, Loader2, ArrowUpDown } from 'lucide-react';
import { DndContext, type DragEndEvent, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function SortableMaterialRow({ materialId, disabled, children }: {
    materialId: number;
    disabled: boolean;
    children: (handle: { attributes: object; listeners: object | undefined }) => ReactNode;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: materialId,
        disabled,
    });
    return (
        <tr
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            className={cn('hover:bg-gray-50/80 transition-colors group', isDragging && 'relative z-10 bg-amber-50 opacity-80 shadow-lg')}
        >
            {children({ attributes, listeners })}
        </tr>
    );
}

export default function MaterialsPage() {
    const router = useRouter();
    const { user, selectedStoreId } = useAuthStore();
    const [mounted, setMounted] = useState(false);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [materialGroups, setMaterialGroups] = useState<MaterialGroup[]>([]);
    const [showGroupManager, setShowGroupManager] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showCompositeDialog, setShowCompositeDialog] = useState(false);
    const [editingComposite, setEditingComposite] = useState<Material | null>(null);
    const [activeTab, setActiveTab] = useState<'raw' | 'composite'>('raw');
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showStockDialog, setShowStockDialog] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
    const [formData, setFormData] = useState<MaterialCreate>({
        store_id: selectedStoreId || 0,
        name: '',
        unit: 'g',
        stock_quantity: 0,
        unit_cost: 0,
        low_stock_threshold: null,
        group_name: null,
    });
    const [defaultPurchaseUnit, setDefaultPurchaseUnit] = useState('kg');
    const [defaultConversionRate, setDefaultConversionRate] = useState(1000);
    const [defaultSupplier, setDefaultSupplier] = useState('');
    const [stockInputUnit, setStockInputUnit] = useState('kg');
    const [stockInputConversionRate, setStockInputConversionRate] = useState(1000);
    const [currentPage, setCurrentPage] = useState(1);
    const [groupFilter, setGroupFilter] = useState('all');
    const [savingOrder, setSavingOrder] = useState(false);
    const [autoSortBy, setAutoSortBy] = useState<'manual' | 'name_length' | 'name_stroke' | 'group' | 'stock' | 'cost'>('manual');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const ITEMS_PER_PAGE = 20;
    const materialSensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        setMounted(true);
    }, []);

    // Reset to page 1 when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, activeTab]);

    useEffect(() => {
        setGroupFilter('all');
    }, [activeTab]);

    useEffect(() => {
        if (!mounted) return;

        if (!user || !selectedStoreId) {
            router.push('/select-store');
            return;
        }

        loadMaterials();
    }, [mounted, user, selectedStoreId]);

    const loadMaterials = async () => {
        if (!selectedStoreId) return;
        try {
            const data = await materialApi.getMaterials(selectedStoreId);
            setMaterials(data.map((material) => ({
                ...material,
                stock_quantity: Number(material.stock_quantity),
                unit_cost: Number(material.unit_cost),
                low_stock_threshold: material.low_stock_threshold === null
                    ? null
                    : Number(material.low_stock_threshold),
                output_quantity: Number(material.output_quantity),
                components: material.components?.map((component) => ({
                    ...component,
                    quantity: Number(component.quantity),
                })) || [],
            })));
            setMaterialGroups(await materialApi.getGroups(selectedStoreId));
        } catch (error) {
            console.error('載入耗材失敗:', error);
            alert('載入耗材失敗,請稍後再試');
        }
    };

    const handleAddMaterial = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStoreId) return;

        try {
            const baseStockQuantity = Number(formData.stock_quantity || 0) * stockInputConversionRate;
            await materialApi.createMaterial(selectedStoreId, {
                ...formData,
                stock_quantity: baseStockQuantity,
                // The form accepts a supplier-facing price (e.g. $180/kg),
                // while recipes and inventory valuation store cost per base unit.
                unit_cost: Number(formData.unit_cost || 0) / defaultConversionRate,
                default_purchase_unit: defaultPurchaseUnit,
                default_conversion_rate: defaultConversionRate,
                default_supplier: defaultSupplier.trim() || null,
                initial_purchase_quantity: baseStockQuantity / defaultConversionRate,
                initial_purchase_unit_price: Number(formData.unit_cost || 0),
            });
            alert('耗材新增成功!');
            setShowAddDialog(false);
            resetForm();
            loadMaterials();
        } catch (error) {
            console.error('新增耗材失敗:', error);
            alert('新增耗材失敗,請稍後再試');
        }
    };

    const handleEditMaterial = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMaterial || !selectedStoreId) return;

        try {
            const updateData: MaterialUpdate = {
                name: formData.name,
                unit: formData.unit,
                unit_cost: formData.unit_cost,
                low_stock_threshold: formData.low_stock_threshold,
                group_name: formData.group_name,
            };
            await materialApi.updateMaterial(selectedMaterial.id, selectedStoreId, updateData);
            alert('耗材更新成功!');
            setShowEditDialog(false);
            setSelectedMaterial(null);
            resetForm();
            loadMaterials();
        } catch (error) {
            console.error('更新耗材失敗:', error);
            alert('更新耗材失敗,請稍後再試');
        }
    };

    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [materialToDelete, setMaterialToDelete] = useState<number | null>(null);
    const [deleteUsage, setDeleteUsage] = useState<MaterialUsageSummary | null>(null);
    const [loadingDeleteUsage, setLoadingDeleteUsage] = useState(false);
    const [replacementMaterialId, setReplacementMaterialId] = useState('');
    const [processingDelete, setProcessingDelete] = useState(false);

    const handleDeleteClick = async (materialId: number) => {
        setMaterialToDelete(materialId);
        setShowDeleteDialog(true);
        setDeleteUsage(null);
        setReplacementMaterialId('');
        if (!selectedStoreId) return;
        setLoadingDeleteUsage(true);
        try {
            setDeleteUsage(await materialApi.getUsageSummary(materialId, selectedStoreId));
        } catch (error) {
            console.error('載入耗材使用狀況失敗:', error);
        } finally {
            setLoadingDeleteUsage(false);
        }
    };

    const disconnectAndDelete = async () => {
        if (!materialToDelete || !selectedStoreId) return;
        if (!confirm('確定要移除所有商品、選項與組合耗材關聯，並永久刪除此耗材？此操作無法復原。')) return;
        setProcessingDelete(true);
        try {
            await materialApi.disconnectAndDelete(materialToDelete, selectedStoreId);
            setShowDeleteDialog(false);
            setMaterialToDelete(null);
            await loadMaterials();
            alert('已斷開所有關聯並永久刪除耗材。');
        } catch (error) {
            console.error('斷連並刪除耗材失敗:', error);
            alert('斷連並刪除失敗，請稍後再試。');
        } finally {
            setProcessingDelete(false);
        }
    };

    const replaceAndDelete = async () => {
        if (!materialToDelete || !selectedStoreId || !replacementMaterialId) return;
        const replacement = materials.find((item) => item.id === Number(replacementMaterialId));
        if (!confirm(`確定將所有關聯替換為「${replacement?.name || '選定耗材'}」，並永久刪除原耗材？`)) return;
        setProcessingDelete(true);
        try {
            await materialApi.replaceAndDelete(materialToDelete, Number(replacementMaterialId), selectedStoreId);
            setShowDeleteDialog(false);
            setMaterialToDelete(null);
            await loadMaterials();
            alert('所有關聯已替換，原耗材已永久刪除。');
        } catch (error) {
            console.error('替換耗材失敗:', error);
            alert('替換失敗，請確認替代耗材的基準單位相同。');
        } finally {
            setProcessingDelete(false);
        }
    };

    const confirmDelete = async () => {
        if (!materialToDelete || !selectedStoreId) return;

        if (!deleteUsage || deleteUsage.product_count > 0 || deleteUsage.composite_count > 0) {
            alert('此耗材仍有關聯，請先從商品、商品選項或組合耗材中移除。');
            return;
        }

        try {
            await materialApi.deleteMaterial(materialToDelete, selectedStoreId);
            alert('耗材與其庫存、進貨及價格紀錄已永久刪除。');
            loadMaterials();
            setShowDeleteDialog(false);
            setMaterialToDelete(null);
        } catch (error) {
            console.error('刪除耗材失敗:', error);
            alert('刪除耗材失敗,請稍後再試');
        }
    };

    const openEditDialog = (material: Material) => {
        setSelectedMaterial(material);
        setShowEditDialog(true);
    };

    // 當selectedMaterial改變時更新表單數據 (用於編輯)
    useEffect(() => {
        if (selectedMaterial && showEditDialog) {
            setFormData({
                store_id: selectedMaterial.store_id,
                name: selectedMaterial.name,
                unit: selectedMaterial.unit,
                stock_quantity: selectedMaterial.stock_quantity,
                unit_cost: selectedMaterial.unit_cost,
                low_stock_threshold: selectedMaterial.low_stock_threshold,
                group_name: selectedMaterial.group_name,
            });
        }
    }, [selectedMaterial, showEditDialog]);

    const openStockDialog = (material: Material) => {
        setSelectedMaterial(material);
        setShowStockDialog(true);
    };

    const resetForm = () => {
        setFormData({
            store_id: selectedStoreId || 0,
            name: '',
            unit: 'g',
            stock_quantity: 0,
            unit_cost: 0,
            low_stock_threshold: null,
            group_name: null,
        });
        setDefaultPurchaseUnit('kg');
        setDefaultConversionRate(1000);
        setDefaultSupplier('');
        setStockInputUnit('kg');
        setStockInputConversionRate(1000);
    };

    const filteredMaterials = materials.filter((material) =>
        (material.material_type || 'raw') === activeTab &&
        (groupFilter === 'all' || (material.group_name || '未分組') === groupFilter) &&
        material.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const visibleGroups = ['未分組', ...materialGroups.map((group) => group.name)];

    const handleMaterialDragEnd = async ({ active, over }: DragEndEvent) => {
        if (!over || active.id === over.id || !selectedStoreId || savingOrder) return;
        const oldIndex = materials.findIndex(material => material.id === Number(active.id));
        const newIndex = materials.findIndex(material => material.id === Number(over.id));
        if (oldIndex < 0 || newIndex < 0) return;

        const previousMaterials = materials;
        const reorderedMaterials = arrayMove(materials, oldIndex, newIndex).map((material, index) => ({
            ...material,
            display_order: index + 1,
        }));
        setAutoSortBy('manual');
        setMaterials(reorderedMaterials);
        setSavingOrder(true);
        try {
            await materialApi.reorderMaterials(selectedStoreId, reorderedMaterials.map(material => material.id));
        } catch (error) {
            console.error('儲存耗材排序失敗:', error);
            setMaterials(previousMaterials);
            alert('儲存耗材排序失敗，已恢復原本順序');
        } finally {
            setSavingOrder(false);
        }
    };

    const handleAutoSort = async () => {
        if (!selectedStoreId || savingOrder || materials.length < 2 || autoSortBy === 'manual') return;

        const previousMaterials = materials;
        const strokeCollator = new Intl.Collator('zh-Hant-u-co-stroke', {
            numeric: true,
            sensitivity: 'base',
        });
        const direction = sortDirection === 'asc' ? 1 : -1;
        const sortedMaterials = [...materials].sort((a, b) => {
            let comparison = 0;
            if (autoSortBy === 'name_length') {
                comparison = Array.from(a.name).length - Array.from(b.name).length;
            } else if (autoSortBy === 'name_stroke') {
                comparison = strokeCollator.compare(a.name, b.name);
            } else if (autoSortBy === 'group') {
                comparison = strokeCollator.compare(a.group_name || '未分類', b.group_name || '未分類');
            } else if (autoSortBy === 'stock') {
                comparison = Number(a.stock_quantity) - Number(b.stock_quantity);
            } else {
                comparison = Number(a.unit_cost) - Number(b.unit_cost);
            }

            if (comparison === 0) comparison = strokeCollator.compare(a.name, b.name);
            if (comparison === 0) comparison = a.id - b.id;
            return comparison * direction;
        }).map((material, index) => ({ ...material, display_order: index + 1 }));

        setMaterials(sortedMaterials);
        setCurrentPage(1);
        setSavingOrder(true);
        try {
            await materialApi.reorderMaterials(selectedStoreId, sortedMaterials.map(material => material.id));
        } catch (error) {
            console.error('自動排序儲存失敗:', error);
            setMaterials(previousMaterials);
            alert('自動排序儲存失敗，已恢復原本順序');
        } finally {
            setSavingOrder(false);
        }
    };

    const totalPages = Math.ceil(filteredMaterials.length / ITEMS_PER_PAGE);
    const paginatedMaterials = filteredMaterials.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const currentStore = user?.stores?.find((s) => s.id === selectedStoreId);

    if (!mounted) return null;

    return (
        <div className="p-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">耗材與庫存管理</h1>
                    <p className="text-gray-500 text-sm mt-1">查看與管理店鋪物料庫存、單位成本與預警設定</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Button onClick={() => setShowGroupManager(true)} variant="outline" className="h-10">管理分類</Button>
                    <Button
                        onClick={() => activeTab === 'raw'
                            ? (resetForm(), setShowAddDialog(true))
                            : (setEditingComposite(null), setShowCompositeDialog(true))}
                        className="h-10 bg-[#D4AF37] hover:bg-[#C5A028] text-white transition-all shadow-sm"
                    >
                        <Plus size={20} className="mr-2" />
                        {activeTab === 'raw' ? '新增庫存原料' : '新增組合耗材'}
                    </Button>
                </div>
            </div>

            <div className="inline-flex p-1 bg-gray-100 rounded-xl mb-6">
                <button onClick={() => setActiveTab('raw')} className={cn('px-6 py-2 rounded-lg text-sm font-bold', activeTab === 'raw' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500')}>庫存管理</button>
                <button onClick={() => setActiveTab('composite')} className={cn('px-6 py-2 rounded-lg text-sm font-bold', activeTab === 'composite' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500')}>耗材管理</button>
            </div>

            {/* Search Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 transition-all">
                <div className="flex flex-col sm:flex-row gap-3 max-w-2xl">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="搜尋耗材名稱..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none transition-all text-sm"
                    />
                </div>
                    <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                        <option value="all">全部分類</option>
                        {visibleGroups.map((group) => <option key={group} value={group}>{group}</option>)}
                    </select>
                </div>
            </div>

            {/* Materials Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all">
                <div className="flex flex-col gap-3 border-b border-gray-100 bg-amber-50/50 px-6 py-3 lg:flex-row lg:items-center lg:justify-between">
                    <span className="text-xs text-gray-500">按住耗材左側把手拖曳，即可調整耗材顯示順序</span>
                    <div className="flex flex-wrap items-center gap-2">
                        <label className="text-xs font-medium text-gray-500" htmlFor="material-auto-sort">自動排序</label>
                        <select
                            id="material-auto-sort"
                            value={autoSortBy}
                            onChange={(event) => setAutoSortBy(event.target.value as typeof autoSortBy)}
                            disabled={savingOrder}
                            className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700 outline-none focus:border-amber-400"
                        >
                            <option value="manual">手動排序</option>
                            <option value="name_length">耗材名稱長度</option>
                            <option value="name_stroke">耗材名稱筆劃</option>
                            <option value="group">耗材分類</option>
                            <option value="stock">庫存量</option>
                            <option value="cost">單位成本</option>
                        </select>
                        <select
                            value={sortDirection}
                            onChange={(event) => setSortDirection(event.target.value as typeof sortDirection)}
                            disabled={savingOrder}
                            aria-label="排序方向"
                            className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700 outline-none focus:border-amber-400"
                        >
                            <option value="asc">由小到大</option>
                            <option value="desc">由大到小</option>
                        </select>
                        <Button
                            type="button"
                            size="sm"
                            onClick={() => void handleAutoSort()}
                            disabled={savingOrder || materials.length < 2 || autoSortBy === 'manual'}
                            className="h-8 bg-amber-600 text-white hover:bg-amber-700"
                        >
                            {savingOrder ? <Loader2 className="animate-spin" /> : <ArrowUpDown />}
                            {savingOrder ? '儲存中...' : '套用排序'}
                        </Button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider">
                                <th className="w-12 px-3 py-4 font-semibold text-center">排序</th>
                                <th className="px-6 py-4 font-semibold">耗材名稱</th>
                                <th className="px-6 py-4 font-semibold text-center">單位</th>
                                <th className="px-6 py-4 font-semibold text-right">當前庫存</th>
                                <th className="px-6 py-4 font-semibold text-right">平均單位成本</th>
                                <th className="px-6 py-4 font-semibold text-center">庫存狀態</th>
                                <th className="px-6 py-4 font-semibold text-right">操作</th>
                            </tr>
                        </thead>
                        <DndContext sensors={materialSensors} collisionDetection={closestCenter} onDragEnd={(event) => void handleMaterialDragEnd(event)}>
                            <SortableContext items={paginatedMaterials.map(material => material.id)} strategy={verticalListSortingStrategy}>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {paginatedMaterials.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400 italic">
                                        {searchQuery
                                            ? '找不到符合條件的耗材'
                                            : '尚未建立任何耗材項目'}
                                    </td>
                                </tr>
                            ) : (
                                paginatedMaterials.map((material) => {
                                    const isLowStock = material.low_stock_threshold !== null &&
                                        Number(material.stock_quantity) <= Number(material.low_stock_threshold);
                                    return (
                                        <SortableMaterialRow key={material.id} materialId={material.id} disabled={savingOrder}>
                                            {({ attributes, listeners }) => (<>
                                            <td className="px-3 py-4 text-center">
                                                <button
                                                    type="button"
                                                    {...attributes}
                                                    {...listeners}
                                                    disabled={savingOrder}
                                                    className="inline-flex cursor-grab touch-none items-center justify-center rounded p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 active:cursor-grabbing disabled:cursor-not-allowed"
                                                    title="拖曳調整耗材順序"
                                                >
                                                    <GripVertical size={18} />
                                                </button>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    type="button"
                                                    onClick={() => router.push(`/admin/materials/${material.id}`)}
                                                    className="text-sm font-bold text-gray-900 group-hover:text-blue-600 hover:underline transition-colors text-left"
                                                    title="查看價格與庫存履歷"
                                                >
                                                    {material.name}
                                                </button>
                                                <div className="text-[11px] text-gray-400 mt-1">{material.group_name || '未分組'}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-[11px] font-medium">
                                                    {material.unit}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {material.material_type === 'composite' ? <span className="text-xs text-gray-500">虛擬配方</span> : <button
                                                    onClick={() => openStockDialog(material)}
                                                    className={cn(
                                                        "text-sm font-bold transition-all px-2 py-1 rounded hover:bg-gray-100 inline-block",
                                                        isLowStock ? 'text-red-600' : 'text-gray-900'
                                                    )}
                                                    title="點擊修改庫存"
                                                >
                                                    {parseFloat(Number(material.stock_quantity).toFixed(2))}
                                                </button>}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="text-sm text-gray-500 font-medium">
                                                    ${parseFloat(Number(material.unit_cost).toFixed(2))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {material.material_type === 'composite' ? (
                                                    <span className="text-xs font-bold text-blue-600">{material.components?.length || 0} 種原料</span>
                                                ) : isLowStock ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-600 border border-red-200">
                                                        <AlertTriangle size={12} className="shrink-0" />
                                                        庫存吃緊
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-green-50 text-green-600 border border-green-200">
                                                        庫存正常
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {material.material_type !== 'composite' && <button
                                                        onClick={() => openStockDialog(material)}
                                                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                                                        title="修改庫存"
                                                    >
                                                        <Calculator size={16} />
                                                    </button>}
                                                    <button
                                                        onClick={() => {
                                                            if (material.material_type === 'composite') {
                                                                setEditingComposite(material);
                                                                setShowCompositeDialog(true);
                                                            } else {
                                                                openEditDialog(material);
                                                            }
                                                        }}
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                        title="編輯"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteClick(material.id)}
                                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                        title="刪除"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                            </>)}
                                        </SortableMaterialRow>
                                    );
                                })
                            )}
                        </tbody>
                            </SortableContext>
                        </DndContext>
                    </table>
                </div>

                {/* Footer Info & Pagination */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-[12px] text-gray-500 font-medium order-2 sm:order-1">
                        顯示第 {(currentPage - 1) * ITEMS_PER_PAGE + 1} 至 {Math.min(currentPage * ITEMS_PER_PAGE, filteredMaterials.length)} 筆，共 {filteredMaterials.length} 筆
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center gap-1 order-1 sm:order-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronLeft size={18} />
                            </button>

                            <div className="flex items-center gap-1 mx-2">
                                {[...Array(totalPages)].map((_, i) => {
                                    const pageNum = i + 1;
                                    if (
                                        pageNum === 1 ||
                                        pageNum === totalPages ||
                                        (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                                    ) {
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setCurrentPage(pageNum)}
                                                className={cn(
                                                    "w-8 h-8 rounded-lg text-sm font-bold transition-all",
                                                    currentPage === pageNum
                                                        ? "bg-[#D4AF37] text-white shadow-md shadow-gold/20"
                                                        : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                                                )}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    } else if (
                                        pageNum === currentPage - 2 ||
                                        pageNum === currentPage + 2
                                    ) {
                                        return <span key={pageNum} className="text-gray-400 px-1">...</span>;
                                    }
                                    return null;
                                })}
                            </div>

                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Material Dialog */}
            {showAddDialog && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-8 w-full max-w-md max-h-[92vh] overflow-y-auto shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">新增耗材項目</h2>
                        <form onSubmit={handleAddMaterial}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">耗材名稱 <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none transition-all"
                                        placeholder="例如: 珍珠、鮮奶"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">分類 <span className="text-gray-400 font-normal">（選填）</span></label>
                                    <select value={formData.group_name || ''} onChange={(e) => setFormData({ ...formData, group_name: e.target.value || null })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl"><option value="">未分組</option>{materialGroups.map((group) => <option key={group.id} value={group.name}>{group.name}</option>)}</select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">原料類型／基準單位 <span className="text-red-500">*</span></label>
                                    <select
                                        required
                                        value={formData.unit}
                                        onChange={(e) => {
                                            const baseUnit = e.target.value;
                                            const preferred = baseUnit === 'g' ? PURCHASE_UNITS.find((u) => u.value === 'kg')
                                                : baseUnit === 'ml' ? PURCHASE_UNITS.find((u) => u.value === 'L')
                                                    : PURCHASE_UNITS.find((u) => u.value === '個');
                                            setFormData({ ...formData, unit: baseUnit });
                                            setDefaultPurchaseUnit(preferred?.value || baseUnit);
                                            setDefaultConversionRate(Number((preferred?.defaultRate || 1).toFixed(2)));
                                            setStockInputUnit(preferred?.value || baseUnit);
                                            setStockInputConversionRate(Number((preferred?.defaultRate || 1).toFixed(2)));
                                        }}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none transition-all"
                                    >
                                        {BASE_UNITS.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
                                    </select>
                                    <p className="text-xs text-gray-400 mt-1">商品配方與庫存統一使用基準單位，公斤、台斤、包裝於進貨時換算。</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">常用進貨單位 <span className="text-red-500">*</span></label>
                                        <select
                                            required
                                            value={defaultPurchaseUnit}
                                            onChange={(e) => {
                                                const selected = unitsForBase(formData.unit).find((unit) => unit.value === e.target.value);
                                                setDefaultPurchaseUnit(e.target.value);
                                                setDefaultConversionRate(Number((selected?.defaultRate || 1).toFixed(2)));
                                                setStockInputUnit(e.target.value);
                                                setStockInputConversionRate(Number((selected?.defaultRate || 1).toFixed(2)));
                                            }}
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                                        >
                                            {unitsForBase(formData.unit).map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">1 {defaultPurchaseUnit}＝多少 {formData.unit}</label>
                                        <input
                                            type="number" required min="0.01" step="0.01"
                                            value={defaultConversionRate}
                                            onChange={(e) => {
                                                const rate = Number(Number(e.target.value).toFixed(2));
                                                setDefaultConversionRate(rate);
                                                if (stockInputUnit === defaultPurchaseUnit) setStockInputConversionRate(rate);
                                            }}
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">目前庫存量 <span className="text-red-500">*</span></label>
                                        <div className="flex gap-2">
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            step="0.01"
                                            value={formData.stock_quantity}
                                            onChange={(e) => setFormData({ ...formData, stock_quantity: Number(Number(e.target.value).toFixed(2)) })}
                                            className="min-w-0 flex-1 px-4 py-3 text-lg bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none transition-all font-mono"
                                        />
                                        <select
                                            value={stockInputUnit}
                                            onChange={(e) => {
                                                const selected = unitsForBase(formData.unit).find((unit) => unit.value === e.target.value);
                                                setStockInputUnit(e.target.value);
                                                setStockInputConversionRate(e.target.value === defaultPurchaseUnit ? defaultConversionRate : Number((selected?.defaultRate || 1).toFixed(2)));
                                            }}
                                            className="w-40 px-3 bg-gray-50 border border-gray-200 rounded-xl"
                                        >
                                            {unitsForBase(formData.unit)
                                                .filter((unit) => unit.defaultRate !== undefined || unit.value === defaultPurchaseUnit)
                                                .map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
                                        </select>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1">
                                            基準庫存：{(Number(formData.stock_quantity || 0) * stockInputConversionRate).toFixed(2)} {formData.unit}；
                                            相當於 {((Number(formData.stock_quantity || 0) * stockInputConversionRate) / Math.max(defaultConversionRate, 0.0001)).toFixed(2)} {defaultPurchaseUnit}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">初始進貨單價／{defaultPurchaseUnit} <span className="text-red-500">*</span></label>
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            step="0.01"
                                            value={formData.unit_cost}
                                            onChange={(e) => setFormData({ ...formData, unit_cost: Number(Number(e.target.value).toFixed(2)) })}
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none transition-all font-mono"
                                        />
                                        <p className="text-xs text-gray-400 mt-1">
                                            換算後平均成本：${(Number(formData.unit_cost || 0) / Math.max(defaultConversionRate, 0.0001)).toFixed(2)}／{formData.unit}
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">低庫存預警值／{formData.unit}</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.low_stock_threshold ?? ''}
                                        onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value ? Number(Number(e.target.value).toFixed(2)) : null })}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none transition-all font-mono"
                                        placeholder="低於此值將顯示紅字"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">供應商 <span className="text-gray-400 font-normal">（選填）</span></label>
                                    <input
                                        type="text"
                                        value={defaultSupplier}
                                        onChange={(e) => setDefaultSupplier(e.target.value)}
                                        placeholder="例如：○○食品行"
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 mt-8">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddDialog(false);
                                        resetForm();
                                    }}
                                    className="flex-1 px-4 py-3 text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors"
                                >
                                    取消
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-3 bg-[#D4AF37] hover:bg-[#C5A028] text-white rounded-xl font-bold shadow-lg shadow-gold/20 transition-all transform active:scale-95"
                                >
                                    建立耗材
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Material Dialog */}
            {showEditDialog && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">編輯耗材資訊</h2>
                        <form onSubmit={handleEditMaterial}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">耗材名稱 <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">分類 <span className="text-gray-400 font-normal">（選填）</span></label>
                                    <select value={formData.group_name || ''} onChange={(e) => setFormData({ ...formData, group_name: e.target.value || null })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl"><option value="">未分組</option>{materialGroups.map((group) => <option key={group.id} value={group.name}>{group.name}</option>)}</select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">進貨單位 <span className="text-red-500">*</span></label>
                                    <select
                                        required
                                        disabled={Number(selectedMaterial?.stock_quantity || 0) !== 0}
                                        value={formData.unit}
                                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none transition-all disabled:opacity-60"
                                    >
                                        {BASE_UNITS.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
                                    </select>
                                    {Number(selectedMaterial?.stock_quantity || 0) !== 0 && <p className="text-xs text-amber-600 mt-1">庫存不為 0 時不可變更基準單位，避免數量失真。</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">平均單位成本 <span className="text-red-500">*</span></label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="0.01"
                                        value={formData.unit_cost}
                                        onChange={(e) => setFormData({ ...formData, unit_cost: Number(Number(e.target.value).toFixed(2)) })}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none transition-all font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">低庫存預警值</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.low_stock_threshold ?? ''}
                                        onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value ? Number(Number(e.target.value).toFixed(2)) : null })}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none transition-all font-mono"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 mt-8">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowEditDialog(false);
                                        setSelectedMaterial(null);
                                        resetForm();
                                    }}
                                    className="flex-1 px-4 py-3 text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors"
                                >
                                    取消
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-3 bg-[#D4AF37] hover:bg-[#C5A028] text-white rounded-xl font-bold shadow-lg shadow-gold/20 transition-all transform active:scale-95"
                                >
                                    更新儲存
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Stock Update Dialog with Number Pad */}
            {showStockDialog && selectedMaterial && (
                <StockUpdateDialog
                    material={selectedMaterial}
                    onClose={() => {
                        setShowStockDialog(false);
                        setSelectedMaterial(null);
                    }}
                    onUpdate={loadMaterials}
                    storeId={selectedStoreId!}
                />
            )}

            {showCompositeDialog && selectedStoreId && (
                <CompositeMaterialDialog
                    composite={editingComposite}
                    materials={materials.filter((material) => material.id !== editingComposite?.id)}
                    groups={materialGroups}
                    storeId={selectedStoreId}
                    onClose={() => { setShowCompositeDialog(false); setEditingComposite(null); }}
                    onSaved={() => { setShowCompositeDialog(false); setEditingComposite(null); loadMaterials(); }}
                />
            )}

            {showGroupManager && selectedStoreId && <MaterialGroupManager groups={materialGroups} storeId={selectedStoreId} onClose={() => setShowGroupManager(false)} onChanged={loadMaterials} />}

            {/* Delete Confirmation Dialog */}
            {showDeleteDialog && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-8 w-full max-w-md max-h-[92vh] overflow-y-auto shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200">
                        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-6 mx-auto">
                            <Trash2 className="text-red-500" size={24} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mb-2 text-center">確認要刪除嗎?</h2>
                        <p className="text-gray-500 mb-4 text-center text-sm">沒有任何關聯時，耗材及其庫存、進貨與價格紀錄將永久刪除且無法復原。</p>
                        <div className="mb-8 rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
                            {loadingDeleteUsage ? '正在檢查使用狀況…' : deleteUsage ? (
                                <div className="space-y-1">
                                    <div className="font-bold">目前有 {deleteUsage.product_count} 個商品仍在使用</div>
                                    <div className="text-xs">基本配方：{deleteUsage.direct_product_count} 個｜商品選項：{deleteUsage.option_product_count} 個｜組合耗材：{deleteUsage.composite_count} 個</div>
                                    {deleteUsage.direct_products.length > 0 && <div className="pt-2"><div className="text-xs font-bold">基本配方</div><ul className="text-xs list-disc pl-5 mt-1">{deleteUsage.direct_products.map((name) => <li key={`direct-${name}`}>{name}</li>)}</ul></div>}
                                    {deleteUsage.option_products.length > 0 && <div className="pt-2"><div className="text-xs font-bold">商品選項</div><ul className="text-xs list-disc pl-5 mt-1">{deleteUsage.option_products.map((name) => <li key={`option-${name}`}>{name}</li>)}</ul></div>}
                                    {deleteUsage.composites.length > 0 && <div className="pt-2"><div className="text-xs font-bold">組合耗材</div><ul className="text-xs list-disc pl-5 mt-1">{deleteUsage.composites.map((name) => <li key={`composite-${name}`}>{name}</li>)}</ul></div>}
                                    {(deleteUsage.product_count > 0 || deleteUsage.composite_count > 0) ? <div className="text-xs font-bold mt-3 text-red-600">仍有關聯，請使用下方的一鍵斷連或替換功能。</div> : <div className="text-xs font-bold mt-3 text-green-700">沒有配方關聯，可以永久刪除。</div>}
                                </div>
                            ) : '無法取得使用狀況，為避免資料損壞，目前不能刪除。'}
                        </div>
                        {deleteUsage && (deleteUsage.product_count > 0 || deleteUsage.composite_count > 0) && (() => {
                            const source = materials.find((item) => item.id === materialToDelete);
                            const replacements = materials.filter((item) => item.id !== materialToDelete && item.unit === source?.unit && item.material_type === source?.material_type);
                            return <div className="mb-6 space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
                                <div className="text-sm font-bold text-gray-800">快速處理關聯</div>
                                <button type="button" disabled={processingDelete} onClick={disconnectAndDelete} className="w-full rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-50">一鍵斷連並刪除</button>
                                <div className="flex gap-2">
                                    <select value={replacementMaterialId} onChange={(event) => setReplacementMaterialId(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm">
                                        <option value="">選擇同單位替代耗材</option>
                                        {replacements.map((item) => <option key={item.id} value={item.id}>{item.name}（{item.unit}）</option>)}
                                    </select>
                                    <button type="button" disabled={processingDelete || !replacementMaterialId} onClick={replaceAndDelete} className="rounded-lg bg-[#D4AF37] px-4 py-2.5 text-sm font-bold text-white disabled:bg-gray-300">一鍵替換</button>
                                </div>
                                {!replacements.length && <div className="text-xs text-gray-500">目前沒有相同基準單位的替代耗材。</div>}
                                <div className="text-[11px] text-gray-500">替換時若同一配方已有目標耗材，系統會自動合併用量。</div>
                            </div>;
                        })()}
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowDeleteDialog(false); setDeleteUsage(null); }}
                                className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                取消
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={processingDelete || loadingDeleteUsage || !deleteUsage || deleteUsage.product_count > 0 || deleteUsage.composite_count > 0}
                                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-200 transition-all transform active:scale-95 disabled:bg-gray-300 disabled:shadow-none"
                            >
                                {deleteUsage && (deleteUsage.product_count > 0 || deleteUsage.composite_count > 0) ? '請先移除關聯' : '永久刪除'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function SortableMaterialGroupRow({ group, children }: { group: MaterialGroup; children: (handle: { attributes: object; listeners: object | undefined }) => ReactNode }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: group.id });
    return <tr ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={isDragging ? 'bg-amber-50 opacity-80' : ''}>{children({ attributes, listeners })}</tr>;
}

function MaterialGroupManager({ groups, storeId, onClose, onChanged }: { groups: MaterialGroup[]; storeId: number; onClose: () => void; onChanged: () => Promise<void> }) {
    const [editing, setEditing] = useState<MaterialGroup | null>(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [orderedGroups, setOrderedGroups] = useState(groups);
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
    useEffect(() => setOrderedGroups(groups), [groups]);

    const reset = () => { setEditing(null); setName(''); setDescription(''); };
    const save = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!name.trim()) return;
        if (editing) await materialApi.updateGroup(editing.id, storeId, { name: name.trim(), description: description.trim() || null });
        else await materialApi.createGroup(storeId, { name: name.trim(), description: description.trim() || null, display_order: groups.length + 1 });
        await onChanged(); reset();
    };
    const remove = async (group: MaterialGroup) => {
        if (!confirm(`刪除分類「${group.name}」？分類內項目會移到未分類。`)) return;
        await materialApi.deleteGroup(group.id, storeId); await onChanged();
    };
    const dragEnd = async ({ active, over }: DragEndEvent) => {
        if (!over || active.id === over.id) return;
        const oldIndex = orderedGroups.findIndex((group) => group.id === active.id);
        const newIndex = orderedGroups.findIndex((group) => group.id === over.id);
        const next = arrayMove(orderedGroups, oldIndex, newIndex);
        setOrderedGroups(next);
        await materialApi.reorderGroups(storeId, next.map((group) => group.id));
        await onChanged();
    };

    return <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6"><div><h2 className="text-2xl font-bold">耗材分類管理</h2><p className="text-sm text-gray-500 mt-1">建立分類並拖曳調整顯示順序</p></div><button onClick={onClose} className="text-gray-400">關閉</button></div>
            <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 mb-6 p-4 bg-gray-50 rounded-xl">
                <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="分類名稱" className="px-3 py-2 border rounded-lg" />
                <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="描述（選填）" className="px-3 py-2 border rounded-lg" />
                <div className="flex gap-2"><button type="submit" className="px-4 py-2 bg-[#D4AF37] text-white rounded-lg font-bold">{editing ? '更新' : '新增'}</button>{editing && <button type="button" onClick={reset} className="px-3 text-gray-500">取消</button>}</div>
            </form>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={dragEnd}><SortableContext items={orderedGroups.map((group) => group.id)} strategy={verticalListSortingStrategy}><div className="border rounded-xl overflow-hidden"><table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="w-12 px-3 py-3"></th><th className="text-left px-4 py-3">分類名稱</th><th className="text-left px-4 py-3">描述</th><th className="text-right px-4 py-3">操作</th></tr></thead><tbody className="divide-y">{orderedGroups.map((group) => <SortableMaterialGroupRow key={group.id} group={group}>{({ attributes, listeners }) => <><td className="px-3 py-3"><button type="button" {...attributes} {...listeners} className="cursor-grab text-gray-400 active:cursor-grabbing"><GripVertical size={18} /></button></td><td className="px-4 py-3 font-bold">{group.name}</td><td className="px-4 py-3 text-gray-500">{group.description || '—'}</td><td className="px-4 py-3"><div className="flex justify-end gap-2"><button onClick={() => { setEditing(group); setName(group.name); setDescription(group.description || ''); }} className="p-2 text-blue-500"><Edit size={16} /></button><button onClick={() => remove(group)} className="p-2 text-red-500"><Trash2 size={16} /></button></div></td></>}</SortableMaterialGroupRow>)}{!orderedGroups.length && <tr><td colSpan={4} className="p-8 text-center text-gray-400">尚未建立分類</td></tr>}</tbody></table></div></SortableContext></DndContext>
        </div>
    </div>;
}

function CompositeMaterialDialog({
    composite,
    materials,
    groups,
    storeId,
    onClose,
    onSaved,
}: {
    composite?: Material | null;
    materials: Material[];
    groups: MaterialGroup[];
    storeId: number;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [name, setName] = useState(composite?.name || '');
    const [unit, setUnit] = useState(composite?.unit || 'ml');
    const [groupName, setGroupName] = useState(composite?.group_name || '');
    const [outputQuantity, setOutputQuantity] = useState(Number(composite?.output_quantity || 1));
    const [components, setComponents] = useState<Array<{ material_id: number; quantity: number }>>(
        composite?.components?.length
            ? composite.components.map((item) => ({ material_id: item.component_material_id, quantity: Number(item.quantity) }))
            : [{ material_id: materials[0]?.id || 0, quantity: 0 }]
    );
    const materialSections = useMemo(() => {
        const configuredGroups = groups.map((group) => group.name);
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
    }, [groups, materials]);

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!name.trim() || outputQuantity <= 0 || components.some((item) => !item.material_id || item.quantity <= 0)) {
            alert('請完整填寫名稱、產出量與原料用量');
            return;
        }
        try {
            const payload = {
                name: name.trim(), unit, output_quantity: outputQuantity, components,
                group_name: groupName.trim() || null,
            };
            if (composite) await materialApi.updateComposite(composite.id, storeId, payload);
            else await materialApi.createComposite(storeId, payload);
            onSaved();
        } catch (error) {
            console.error('儲存組合耗材失敗:', error);
            alert('儲存組合耗材失敗，請確認原料沒有重複');
        }
    };

    return <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <form onSubmit={submit} className="bg-white rounded-2xl p-8 w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl space-y-5">
            <div><h2 className="text-2xl font-bold text-gray-800">{composite ? '編輯組合耗材' : '新增組合耗材'}</h2><p className="text-sm text-gray-500 mt-1">只保存配方，不建立重複庫存。</p></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div><label className="block text-sm font-bold mb-1">名稱</label><input required value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：自製辣醬" className="w-full px-3 py-2.5 border rounded-xl" /></div>
                <div><label className="block text-sm font-bold mb-1">分類（選填）</label><select value={groupName} onChange={(e) => setGroupName(e.target.value)} className="w-full px-3 py-2.5 border rounded-xl"><option value="">未分類</option>{groups.map((group) => <option key={group.id} value={group.name}>{group.name}</option>)}</select></div>
                <div><label className="block text-sm font-bold mb-1">產出基準單位</label><select value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full px-3 py-2.5 border rounded-xl">{BASE_UNITS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
                <div><label className="block text-sm font-bold mb-1">完成後總量／{unit}</label><input type="number" min="0.01" step="0.01" value={outputQuantity} onChange={(e) => setOutputQuantity(Number(Number(e.target.value).toFixed(2)))} className="w-full px-3 py-2.5 border rounded-xl" /><p className="text-[11px] text-gray-400 mt-1">整份配方完成後實際得到的數量</p></div>
            </div>
            <div className="space-y-3">
                <div className="flex justify-between items-center"><h3 className="font-bold">使用原料</h3><button type="button" onClick={() => setComponents([...components, { material_id: materials[0]?.id || 0, quantity: 0 }])} className="text-sm text-blue-600 font-bold">＋加入原料</button></div>
                {components.map((component, index) => <div key={index} className="grid grid-cols-[1fr_160px_40px] gap-3 items-center">
                    <select value={component.material_id} onChange={(e) => setComponents(components.map((item, i) => i === index ? { ...item, material_id: Number(e.target.value) } : item))} className="px-3 py-2.5 border rounded-xl">
                        <option value={0}>選擇原料或耗材組合</option>
                        {materialSections.flatMap((section) => [
                            <option key={`${section.type}-heading`} disabled value={`${section.type}-heading`}>── {section.label} ──</option>,
                            ...section.groups.map((group) => <optgroup key={`${section.type}-${group.name}`} label={`${section.label}｜${group.name}`}>
                                {group.materials.map((material) => <option key={material.id} value={material.id}>{material.name}（{material.unit}）</option>)}
                            </optgroup>),
                        ])}
                    </select>
                    <input type="number" min="0.01" step="0.01" value={component.quantity || ''} onChange={(e) => setComponents(components.map((item, i) => i === index ? { ...item, quantity: Number(Number(e.target.value).toFixed(2)) } : item))} placeholder="用量" className="px-3 py-2.5 border rounded-xl" />
                    <button type="button" disabled={components.length === 1} onClick={() => setComponents(components.filter((_, i) => i !== index))} className="text-red-400 disabled:opacity-30"><Trash2 size={18} /></button>
                </div>)}
            </div>
            <div className="flex gap-3 pt-3"><button type="button" onClick={onClose} className="flex-1 py-3 text-gray-500 font-bold">取消</button><button type="submit" className="flex-1 py-3 bg-[#D4AF37] text-white rounded-xl font-bold">{composite ? '儲存修改' : '建立組合耗材'}</button></div>
        </form>
    </div>;
}

// Stock Update Dialog Component with Number Pad
function StockUpdateDialog({
    material,
    onClose,
    onUpdate,
    storeId,
}: {
    material: Material;
    onClose: () => void;
    onUpdate: () => void;
    storeId: number;
}) {
    const [inputValue, setInputValue] = useState('0');
    const [mode, setMode] = useState<'add' | 'subtract'>('add');
    const compatibleUnits = unitsForBase(material.unit);
    const normalizedBaseUnit = normalizeBaseUnit(material.unit);
    const preferredUnitValue = normalizedBaseUnit === 'g' ? 'kg' : normalizedBaseUnit === 'ml' ? 'L' : '個';
    const firstUnit = compatibleUnits.find((unit) => unit.value === preferredUnitValue)
        || compatibleUnits.find((unit) => unit.defaultRate === 1)
        || compatibleUnits[0]
        || PURCHASE_UNITS[0];
    const [purchaseUnit, setPurchaseUnit] = useState(firstUnit.value);
    const [conversionRate, setConversionRate] = useState(Number(conversionRateForBase(firstUnit, material.unit).toFixed(2)));
    const [unitPrice, setUnitPrice] = useState(0);
    const [supplier, setSupplier] = useState('');

    // Use the material's saved purchasing specification instead of resetting
    // the dialog to the first global unit every time it opens.
    useEffect(() => {
        let active = true;
        materialApi.getInventoryItems(material.id, storeId)
            .then((items) => {
                if (!active || !items.length) return;
                const saved = items[0];
                setPurchaseUnit(saved.purchase_unit);
                setConversionRate(Number(Number(saved.conversion_rate).toFixed(2)));
                setSupplier(saved.supplier || '');
            })
            .catch((error) => console.error('載入進貨規格失敗:', error));
        return () => { active = false; };
    }, [material.id, storeId]);

    // 當模式改變時重置輸入值
    useEffect(() => {
        setInputValue('0');
    }, [mode]);

    const handleNumberClick = (num: string) => {
        if (num === '.' && inputValue.includes('.')) return;
        if (inputValue.includes('.') && inputValue.split('.')[1].length >= 2) return;
        setInputValue(inputValue === '0' ? num : inputValue + num);
    };

    const handleBackspace = () => {
        setInputValue(inputValue.length > 1 ? inputValue.slice(0, -1) : '0');
    };

    const handleSubmit = async () => {
        const value = parseFloat(inputValue);
        if (isNaN(value)) {
            alert('請輸入有效的數字');
            return;
        }

        if (mode === 'add') {
            if (value <= 0 || conversionRate <= 0 || unitPrice < 0) {
                alert('進貨數量與換算量必須大於 0，價格不可小於 0');
                return;
            }
            try {
                await materialApi.receivePurchase(material.id, storeId, {
                    purchase_quantity: value,
                    purchase_unit: purchaseUnit,
                    conversion_rate: conversionRate,
                    unit_price: unitPrice,
                    supplier: supplier || null,
                });
                onUpdate();
                onClose();
            } catch (error) {
                console.error('進貨失敗:', error);
                alert('進貨失敗，請稍後再試');
            }
            return;
        } else {
            const newStockQuantity = Number(material.stock_quantity) - value;
            if (newStockQuantity < 0) {
                alert('庫存數量不能為負數');
                return;
            }
            try {
                await materialApi.updateMaterial(material.id, storeId, { stock_quantity: newStockQuantity });
                onUpdate();
                onClose();
            } catch (error) {
                console.error('更新庫存失敗:', error);
                alert('更新庫存失敗,請稍後再試');
            }
        }
    };

    const numberButtons = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.'];

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 w-full max-w-md max-h-[92vh] overflow-y-auto shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">進貨與庫存異動</h2>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1 font-medium italic">
                        <span>{material.name}</span>
                        <span className="text-gray-300">|</span>
                        <span>目前: {parseFloat(Number(material.stock_quantity).toFixed(2))} {material.unit}</span>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Mode Selection */}
                    <div className="flex p-1 bg-gray-100 rounded-xl">
                        {([
                            { id: 'add', label: '進貨 (+)', color: 'text-green-600' },
                            { id: 'subtract', label: '耗損 (-)', color: 'text-red-600' }
                        ] as const).map((bt) => (
                            <button
                                key={bt.id}
                                onClick={() => setMode(bt.id)}
                                className={cn(
                                    "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
                                    mode === bt.id
                                        ? "bg-white shadow-sm " + bt.color
                                        : "text-gray-400 hover:text-gray-600"
                                )}
                            >
                                {bt.label}
                            </button>
                        ))}
                    </div>

                    {mode === 'add' && (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">進貨單位</label>
                                <select
                                    value={purchaseUnit}
                                    onChange={(event) => {
                                        const selected = PURCHASE_UNITS.find((unit) => unit.value === event.target.value);
                                        setPurchaseUnit(event.target.value);
                                        setConversionRate(selected ? Number(conversionRateForBase(selected, material.unit).toFixed(2)) : 1);
                                    }}
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                                >
                                    {(['weight', 'volume', 'count', 'package'] as const).map((dimension) => (
                                        <optgroup key={dimension} label={UNIT_GROUP_LABELS[dimension]}>
                                            {PURCHASE_UNITS.filter((unit) => unit.dimension === dimension).map((unit) => (
                                                <option
                                                    key={unit.value}
                                                    value={unit.value}
                                                    disabled={Boolean(unit.baseUnit && unit.baseUnit !== normalizedBaseUnit)}
                                                >
                                                    {unit.label}
                                                </option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                                <p className="text-[11px] text-gray-400 mt-1">基準：{normalizedBaseUnit}；灰色單位與原料類型不相容。</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">每單位進貨價</label>
                                <input type="number" min="0" step="0.01" value={unitPrice}
                                    onChange={(event) => setUnitPrice(Number(Number(event.target.value).toFixed(2)))}
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">1 {purchaseUnit} 等於多少 {material.unit}</label>
                                <input type="number" min="0.01" step="0.01" value={conversionRate}
                                    onChange={(event) => setConversionRate(Number(Number(event.target.value).toFixed(2)))}
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">供應商（選填）</label>
                                <input value={supplier} onChange={(event) => setSupplier(event.target.value)}
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl" />
                            </div>
                            <div className="col-span-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                預計入庫 {(Number(inputValue || 0) * conversionRate).toFixed(2)} {material.unit}，
                                總成本 ${(Number(inputValue || 0) * unitPrice).toFixed(2)}；系統將自動更新加權平均成本。
                            </div>
                        </div>
                    )}

                    {/* Display Area */}
                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 flex flex-col items-center">
                        <div className="text-4xl font-mono font-bold text-gray-900 flex items-baseline gap-2">
                            <span className={cn(
                                "text-2xl",
                                mode === 'add' ? 'text-green-500' : 'text-red-500'
                            )}>{mode === 'add' ? '+' : '-'}</span>
                            {inputValue}
                            <span className="text-sm text-gray-400 uppercase tracking-widest">{mode === 'add' ? purchaseUnit : material.unit}</span>
                        </div>
                    </div>

                    {/* Number Pad */}
                    <div className="grid grid-cols-3 gap-3">
                        {numberButtons.map((num) => (
                            <button
                                key={num}
                                onClick={() => handleNumberClick(num)}
                                className="h-14 bg-white border border-gray-100 rounded-xl flex items-center justify-center font-bold text-lg text-gray-700 hover:bg-gray-50 hover:border-gray-200 transition-all active:scale-95 shadow-sm"
                            >
                                {num}
                            </button>
                        ))}
                        <button
                            onClick={handleBackspace}
                            className="h-14 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-all active:scale-95 shadow-sm"
                        >
                            <Trash2 size={20} />
                        </button>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 py-4 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            放棄修改
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={inputValue === '0'}
                            className="flex-[2] py-4 bg-[#D4AF37] hover:bg-[#C5A028] text-white rounded-xl font-bold shadow-lg shadow-gold/20 transition-all transform active:scale-95 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none"
                        >
                            提交庫存異動
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
