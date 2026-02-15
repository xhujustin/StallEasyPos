'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { materialApi, Material, MaterialCreate, MaterialUpdate } from '@/lib/api/materials';
import { Search, Plus, Edit, Trash2, AlertTriangle, ArrowLeft, Calculator, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function MaterialsPage() {
    const router = useRouter();
    const { user, selectedStoreId } = useAuthStore();
    const [mounted, setMounted] = useState(false);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showStockDialog, setShowStockDialog] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
    const [formData, setFormData] = useState<MaterialCreate>({
        store_id: selectedStoreId || 0,
        name: '',
        unit: '',
        stock_quantity: 0,
        unit_cost: 0,
        low_stock_threshold: null,
    });
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    useEffect(() => {
        setMounted(true);
    }, []);

    // Reset to page 1 when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

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
            setMaterials(data);
        } catch (error) {
            console.error('載入耗材失敗:', error);
            alert('載入耗材失敗,請稍後再試');
        }
    };

    const handleAddMaterial = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStoreId) return;

        try {
            await materialApi.createMaterial(selectedStoreId, formData);
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

    const handleDeleteClick = (materialId: number) => {
        setMaterialToDelete(materialId);
        setShowDeleteDialog(true);
    };

    const confirmDelete = async () => {
        if (!materialToDelete || !selectedStoreId) return;

        try {
            await materialApi.deleteMaterial(materialToDelete, selectedStoreId);
            alert('耗材刪除成功!');
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
            unit: '',
            stock_quantity: 0,
            unit_cost: 0,
            low_stock_threshold: null,
        });
    };

    const filteredMaterials = materials.filter((material) =>
        material.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                    <Button
                        onClick={() => {
                            resetForm();
                            setShowAddDialog(true);
                        }}
                        className="h-10 bg-[#D4AF37] hover:bg-[#C5A028] text-white transition-all shadow-sm"
                    >
                        <Plus size={20} className="mr-2" />
                        新增耗材
                    </Button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 transition-all">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="搜尋耗材名稱..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none transition-all text-sm"
                    />
                </div>
            </div>

            {/* Materials Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider">
                                <th className="px-6 py-4 font-semibold">耗材名稱</th>
                                <th className="px-6 py-4 font-semibold text-center">單位</th>
                                <th className="px-6 py-4 font-semibold text-right">當前庫存</th>
                                <th className="px-6 py-4 font-semibold text-right">單位成本</th>
                                <th className="px-6 py-4 font-semibold text-center">庫存狀態</th>
                                <th className="px-6 py-4 font-semibold text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {paginatedMaterials.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">
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
                                        <tr key={material.id} className="hover:bg-gray-50/80 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{material.name}</div>
                                                <div className="text-[10px] text-gray-400 font-mono mt-0.5">ID: #{material.id}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-[11px] font-medium">
                                                    {material.unit}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => openStockDialog(material)}
                                                    className={cn(
                                                        "text-sm font-bold transition-all px-2 py-1 rounded hover:bg-gray-100 inline-block",
                                                        isLowStock ? 'text-red-600' : 'text-gray-900'
                                                    )}
                                                    title="點擊修改庫存"
                                                >
                                                    {parseFloat(Number(material.stock_quantity).toFixed(2))}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="text-sm text-gray-500 font-medium">
                                                    ${parseFloat(Number(material.unit_cost).toFixed(2))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {isLowStock ? (
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
                                                    <button
                                                        onClick={() => openStockDialog(material)}
                                                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                                                        title="修改庫存"
                                                    >
                                                        <Calculator size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => openEditDialog(material)}
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
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
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
                    <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200">
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
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">單位 <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.unit}
                                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                        placeholder="例如: 克、公斤、個"
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none transition-all"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">初始庫存量 <span className="text-red-500">*</span></label>
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            step="0.01"
                                            value={formData.stock_quantity}
                                            onChange={(e) => setFormData({ ...formData, stock_quantity: parseFloat(e.target.value) })}
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none transition-all font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">進貨成本 <span className="text-red-500">*</span></label>
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            step="0.0001"
                                            value={formData.unit_cost}
                                            onChange={(e) => setFormData({ ...formData, unit_cost: parseFloat(e.target.value) })}
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none transition-all font-mono"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">低庫存預警值</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.low_stock_threshold || ''}
                                        onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value ? parseFloat(e.target.value) : null })}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none transition-all font-mono"
                                        placeholder="低於此值將顯示紅字"
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
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">進貨單位 <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.unit}
                                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">進貨成本 <span className="text-red-500">*</span></label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="0.0001"
                                        value={formData.unit_cost}
                                        onChange={(e) => setFormData({ ...formData, unit_cost: parseFloat(e.target.value) })}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none transition-all font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">低庫存預警值</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.low_stock_threshold || ''}
                                        onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value ? parseFloat(e.target.value) : null })}
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

            {/* Delete Confirmation Dialog */}
            {showDeleteDialog && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200">
                        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-6 mx-auto">
                            <Trash2 className="text-red-500" size={24} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mb-2 text-center">確認要刪除嗎?</h2>
                        <p className="text-gray-500 mb-8 text-center text-sm">此耗材刪除後將無法恢復，且可能會影響到相關商品的配方計算。</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteDialog(false)}
                                className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                取消
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-200 transition-all transform active:scale-95"
                            >
                                確認刪除
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
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
    const [mode, setMode] = useState<'set' | 'add' | 'subtract'>('add');

    // 當模式改變時重置輸入值
    useEffect(() => {
        setInputValue('0');
    }, [mode]);

    const handleNumberClick = (num: string) => {
        if (num === '.' && inputValue.includes('.')) return;
        setInputValue(inputValue === '0' ? num : inputValue + num);
    };

    const handleBackspace = () => {
        setInputValue(inputValue.length > 1 ? inputValue.slice(0, -1) : '0');
    };

    const handleClear = () => {
        setInputValue('0');
    };

    const handleSubmit = async () => {
        const value = parseFloat(inputValue);
        if (isNaN(value)) {
            alert('請輸入有效的數字');
            return;
        }

        let newStockQuantity = value;
        if (mode === 'add') {
            newStockQuantity = Number(material.stock_quantity) + value;
        } else if (mode === 'subtract') {
            newStockQuantity = Number(material.stock_quantity) - value;
            if (newStockQuantity < 0) {
                alert('庫存數量不能為負數');
                return;
            }
        }

        try {
            await materialApi.updateMaterial(material.id, storeId, {
                stock_quantity: newStockQuantity,
            });
            onUpdate();
            onClose();
        } catch (error) {
            console.error('更新庫存失敗:', error);
            alert('更新庫存失敗,請稍後再試');
        }
    };

    const numberButtons = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.'];

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">更新庫存</h2>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1 font-medium italic">
                        <span>{material.name}</span>
                        <span className="text-gray-300">|</span>
                        <span>目前: {parseFloat(Number(material.stock_quantity).toFixed(4))} {material.unit}</span>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Mode Selection */}
                    <div className="flex p-1 bg-gray-100 rounded-xl">
                        {[
                            { id: 'add', label: '進貨 (+)', color: 'text-green-600', bg: 'bg-green-50' },
                            { id: 'subtract', label: '耗損 (-)', color: 'text-red-600', bg: 'bg-red-50' }
                        ].map((bt) => (
                            <button
                                key={bt.id}
                                onClick={() => setMode(bt.id as any)}
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

                    {/* Display Area */}
                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 flex flex-col items-center">
                        <div className="text-4xl font-mono font-bold text-gray-900 flex items-baseline gap-2">
                            <span className={cn(
                                "text-2xl",
                                mode === 'add' ? 'text-green-500' : 'text-red-500'
                            )}>{mode === 'add' ? '+' : '-'}</span>
                            {inputValue}
                            <span className="text-sm text-gray-400 uppercase tracking-widest">{material.unit}</span>
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
