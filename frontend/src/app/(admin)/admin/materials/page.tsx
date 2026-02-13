'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { materialApi, Material, MaterialCreate, MaterialUpdate } from '@/lib/api/materials';
import { Search, Plus, Edit, Trash2, AlertTriangle, ArrowLeft, Calculator } from 'lucide-react';

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

    useEffect(() => {
        setMounted(true);
    }, []);

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

    const currentStore = user?.stores?.find((s) => s.id === selectedStoreId);

    if (!mounted) return null;

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">耗材管理</h1>
                        <p className="text-sm text-gray-500 mt-1">當前店鋪: {currentStore?.name}</p>
                    </div>
                    <button
                        onClick={() => {
                            resetForm();
                            setShowAddDialog(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        <Plus size={20} />
                        新增耗材
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="搜尋耗材..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* Materials Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">耗材名稱</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">單位</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">庫存數量</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">單位成本</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">低庫存閾值</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">狀態</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredMaterials.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                    {searchQuery
                                        ? '沒有符合條件的耗材'
                                        : '尚無耗材,點擊「新增耗材」開始建立'}
                                </td>
                            </tr>
                        ) : (
                            filteredMaterials.map((material) => {
                                const isLowStock = material.low_stock_threshold !== null &&
                                    Number(material.stock_quantity) <= Number(material.low_stock_threshold);
                                return (
                                    <tr key={material.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{material.name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-500">{material.unit}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <button
                                                onClick={() => openStockDialog(material)}
                                                className={`text-sm font-medium ${isLowStock ? 'text-red-600' : 'text-gray-900'} hover:underline`}
                                            >
                                                {parseFloat(Number(material.stock_quantity).toFixed(4))}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">${parseFloat(Number(material.unit_cost).toFixed(4))}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-500">
                                                {material.low_stock_threshold !== null ? material.low_stock_threshold : '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {isLowStock && (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    <AlertTriangle size={12} />
                                                    低庫存
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => openStockDialog(material)}
                                                className="text-green-600 hover:text-green-900 mr-4"
                                                title="修改庫存"
                                            >
                                                <Calculator size={18} />
                                            </button>
                                            <button
                                                onClick={() => openEditDialog(material)}
                                                className="text-blue-600 hover:text-blue-900 mr-4"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(material.id)}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add Material Dialog */}
            {showAddDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">新增耗材</h2>
                        <form onSubmit={handleAddMaterial}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">耗材名稱 *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">單位 *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.unit}
                                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                        placeholder="例如: 克、公斤、個"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">初始庫存數量 *</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="0.01"
                                        value={formData.stock_quantity}
                                        onChange={(e) => setFormData({ ...formData, stock_quantity: parseFloat(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">單位成本 *</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="0.0001"
                                        value={formData.unit_cost}
                                        onChange={(e) => setFormData({ ...formData, unit_cost: parseFloat(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">低庫存閾值</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.low_stock_threshold || ''}
                                        onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value ? parseFloat(e.target.value) : null })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddDialog(false);
                                        resetForm();
                                    }}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    取消
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    新增
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Material Dialog */}
            {showEditDialog && selectedMaterial && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">編輯耗材</h2>
                        <form onSubmit={handleEditMaterial}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">耗材名稱 *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">單位 *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.unit}
                                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">單位成本 *</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="0.0001"
                                        value={formData.unit_cost}
                                        onChange={(e) => setFormData({ ...formData, unit_cost: parseFloat(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">低庫存閾值</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.low_stock_threshold || ''}
                                        onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value ? parseFloat(e.target.value) : null })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowEditDialog(false);
                                        setSelectedMaterial(null);
                                        resetForm();
                                    }}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    取消
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    更新
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
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-sm">
                        <h2 className="text-xl font-bold mb-4">確認刪除</h2>
                        <p className="text-gray-600 mb-6">確定要刪除這個耗材嗎? 此操作無法撤銷。</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteDialog(false)}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                取消
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                                刪除
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
            alert('庫存更新成功!');
            onUpdate();
            onClose();
        } catch (error) {
            console.error('更新庫存失敗:', error);
            alert('更新庫存失敗,請稍後再試');
        }
    };

    const numberButtons = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.'];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-2">更新庫存</h2>
                <p className="text-sm text-gray-500 mb-4">
                    {material.name} - 當前庫存: {parseFloat(Number(material.stock_quantity).toFixed(4))} {material.unit}
                </p>

                {/* Mode Selection */}
                <div className="flex gap-2 mb-4">
                    <button
                        onClick={() => setMode('add')}
                        className={`flex-1 px-3 py-2 rounded-lg ${mode === 'add' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'
                            }`}
                    >
                        增加
                    </button>
                    <button
                        onClick={() => setMode('subtract')}
                        className={`flex-1 px-3 py-2 rounded-lg ${mode === 'subtract' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700'
                            }`}
                    >
                        減少
                    </button>
                    <button
                        onClick={() => setMode('set')}
                        className={`flex-1 px-3 py-2 rounded-lg ${mode === 'set' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                            }`}
                    >
                        設定
                    </button>
                </div>

                {/* Display */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="text-right text-3xl font-bold text-gray-900">
                        {mode === 'add' && '+'}
                        {mode === 'subtract' && '-'}
                        {inputValue}
                    </div>
                    {mode !== 'set' && (
                        <div className="text-right text-sm text-gray-500 mt-1">
                            結果: {parseFloat((mode === 'add' ? Number(material.stock_quantity) + Number(inputValue || '0') : Number(material.stock_quantity) - Number(inputValue || '0')).toFixed(4))} {material.unit}
                        </div>
                    )}
                </div>

                {/* Number Pad */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                    {numberButtons.map((num) => (
                        <button
                            key={num}
                            onClick={() => handleNumberClick(num)}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-900 text-xl font-semibold py-4 rounded-lg"
                        >
                            {num}
                        </button>
                    ))}
                    <button
                        onClick={handleBackspace}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-900 text-xl font-semibold py-4 rounded-lg"
                    >
                        ←
                    </button>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={handleClear}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        清除
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        確認
                    </button>
                </div>
            </div>
        </div>
    );
}
