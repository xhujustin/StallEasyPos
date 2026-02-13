'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { productApi, ProductUpdate, Product, ProductMaterial, ProductMaterialCreate } from '@/lib/api/products';
import { categoryApi, Category } from '@/lib/api/categories';
import { materialApi, Material } from '@/lib/api/materials';
import { ArrowLeft, Plus, Trash2, Calculator } from 'lucide-react';

export default function EditProductPage() {
    const router = useRouter();
    const params = useParams();
    const productId = parseInt(params.id as string);
    const { user, selectedStoreId } = useAuthStore();
    const [mounted, setMounted] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingProduct, setLoadingProduct] = useState(true);

    // 配方相關 State
    const [productMaterials, setProductMaterials] = useState<ProductMaterial[]>([]);
    const [newMaterialId, setNewMaterialId] = useState<number | ''>('');
    const [newQuantity, setNewQuantity] = useState<string>('');

    const [formData, setFormData] = useState<ProductUpdate>({
        name: '',
        price: 0,
        category: '',
        description: '',
        is_active: true,
        image_url: '',
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

        loadData();
    }, [mounted, user, selectedStoreId, productId]);

    const loadData = async () => {
        if (!selectedStoreId) return;
        try {
            setLoadingProduct(true);
            const [categoriesData, materialsData, productData] = await Promise.all([
                categoryApi.getCategories(selectedStoreId),
                materialApi.getMaterials(selectedStoreId),
                productApi.getById(productId, selectedStoreId)
            ]);

            setCategories(categoriesData);
            setMaterials(materialsData);

            setFormData({
                name: productData.name,
                price: productData.price,
                category: productData.category || '',
                description: productData.description || '',
                is_active: productData.is_active,
                image_url: productData.image_url || '',
            });

            // 設定配方資料
            if (productData.materials) {
                setProductMaterials(productData.materials);
            }
        } catch (error) {
            console.error('載入資料失敗:', error);
            alert('載入資料失敗');
            router.push('/admin/products');
        } finally {
            setLoadingProduct(false);
        }
    };

    // 計算成本與利潤
    const costAnalysis = useMemo(() => {
        const totalCost = productMaterials.reduce((sum, pm) => {
            // 嘗試從 materials 列表中找到完整資訊 (包含最新成本)
            const material = materials.find(m => m.id === pm.material_id) || pm.material;
            return sum + (material?.unit_cost || 0) * pm.quantity;
        }, 0);

        const price = formData.price || 0;
        const profit = price - totalCost;
        const profitMargin = price > 0 ? (profit / price) * 100 : 0;

        return { totalCost, profit, profitMargin };
    }, [productMaterials, materials, formData.price]);

    const handleAddMaterial = () => {
        const qty = parseFloat(newQuantity);
        if (!newMaterialId || isNaN(qty) || qty <= 0) return;

        const material = materials.find(m => m.id === newMaterialId);
        if (!material) return;

        // 檢查是否已存在
        if (productMaterials.some(pm => pm.material_id === newMaterialId)) {
            alert('此耗材已在配方中');
            return;
        }

        const newPM: ProductMaterial = {
            id: Date.now(), // 臨時ID
            material_id: Number(newMaterialId),
            quantity: parseFloat(newQuantity),
            material: material
        };

        setProductMaterials([...productMaterials, newPM]);
        setNewMaterialId('');
        setNewQuantity('');
    };

    const handleRemoveMaterial = (materialId: number) => {
        setProductMaterials(productMaterials.filter(pm => pm.material_id !== materialId));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStoreId) return;

        if (!formData.name?.trim()) {
            alert('請輸入商品名稱');
            return;
        }

        if ((formData.price || 0) <= 0) {
            alert('價格必須大於0');
            return;
        }

        try {
            setLoading(true);

            // 準備配方資料
            const materialsPayload: ProductMaterialCreate[] = productMaterials.map(pm => ({
                material_id: pm.material_id,
                quantity: pm.quantity
            }));

            const payload: ProductUpdate = {
                ...formData,
                materials: materialsPayload
            };

            await productApi.updateProduct(productId, selectedStoreId, payload);
            alert('商品更新成功!');
            router.push('/admin/products');
        } catch (error) {
            console.error('更新商品失敗:', error);
            alert('更新商品失敗,請稍後再試');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        router.push('/admin/products');
    };

    if (!mounted || loadingProduct) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-lg">載入中...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={handleCancel}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
                >
                    <ArrowLeft size={20} />
                    返回商品列表
                </button>
                <h1 className="text-2xl font-bold text-gray-900">編輯商品</h1>
            </div>

            {/* Form */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl">
                {/* 左側: 基本資訊 */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-bold mb-4">基本資訊</h2>
                        <div className="space-y-6">
                            {/* 商品名稱 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    商品名稱 <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="例如: 珍珠奶茶"
                                    required
                                />
                            </div>

                            {/* 價格 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    價格 <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                    <input
                                        type="number"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="0"
                                        min="0"
                                        step="0.01"
                                        required
                                    />
                                </div>
                            </div>

                            {/* 分類 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    分類
                                </label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">未分類</option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.name}>
                                            {cat.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* 描述 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    描述
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="商品描述..."
                                    rows={3}
                                    maxLength={500}
                                />
                            </div>

                            {/* 圖片URL */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    圖片網址
                                </label>
                                <input
                                    type="url"
                                    value={formData.image_url}
                                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="https://example.com/image.jpg"
                                />
                            </div>

                            {/* 啟用狀態 */}
                            <div className="flex items-center gap-3">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                                <span className="text-sm font-medium text-gray-700">
                                    {formData.is_active ? '啟用' : '停用'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 配方設定區塊 */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Calculator size={20} />
                            配方/耗材設定
                        </h2>
                        <p className="text-sm text-gray-500 mb-4">設定此商品消耗的耗材,系統將自動計算成本。</p>

                        <div className="overflow-x-auto mb-4">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left">耗材名稱</th>
                                        <th className="px-4 py-2 text-right">消耗數量</th>
                                        <th className="px-4 py-2 text-left">單位</th>
                                        <th className="px-4 py-2 text-right">單位成本</th>
                                        <th className="px-4 py-2 text-right">預估成本</th>
                                        <th className="px-4 py-2 text-center">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {productMaterials.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-4 text-center text-gray-500">
                                                尚未設定配方
                                            </td>
                                        </tr>
                                    ) : (
                                        productMaterials.map((pm) => {
                                            const material = materials.find(m => m.id === pm.material_id) || pm.material;
                                            const subtotal = (material?.unit_cost || 0) * pm.quantity;
                                            return (
                                                <tr key={pm.material_id}>
                                                    <td className="px-4 py-2">{material?.name || '未知耗材'}</td>
                                                    <td className="px-4 py-2 text-right font-medium">{parseFloat(Number(pm.quantity).toFixed(4))}</td>
                                                    <td className="px-4 py-2">{material?.unit}</td>
                                                    <td className="px-4 py-2 text-right text-gray-500">${parseFloat(Number(material?.unit_cost || 0).toFixed(4))}</td>
                                                    <td className="px-4 py-2 text-right font-medium">${subtotal.toFixed(2)}</td>
                                                    <td className="px-4 py-2 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveMaterial(pm.material_id)}
                                                            className="text-red-500 hover:text-red-700"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                                {productMaterials.length > 0 && (
                                    <tfoot className="bg-gray-50 font-bold">
                                        <tr>
                                            <td colSpan={4} className="px-4 py-2 text-right">總成本:</td>
                                            <td className="px-4 py-2 text-right text-blue-600">${costAnalysis.totalCost.toFixed(2)}</td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>

                        {/* 新增配方表單 */}
                        <div className="flex gap-2 items-end bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-gray-700 mb-1">選擇耗材</label>
                                <select
                                    value={newMaterialId}
                                    onChange={(e) => setNewMaterialId(e.target.value ? Number(e.target.value) : '')}
                                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                                >
                                    <option value="">請選擇耗材...</option>
                                    {materials.map(m => (
                                        <option key={m.id} value={m.id}>
                                            {m.name} ({m.unit_cost}/{m.unit})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="w-24">
                                <label className="block text-xs font-medium text-gray-700 mb-1">數量</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.0001"
                                    value={newQuantity}
                                    onChange={(e) => setNewQuantity(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                                    placeholder="0.0000"
                                />
                            </div>
                            <div className="pb-1 text-sm text-gray-500 w-16">
                                {newMaterialId && materials.find(m => m.id === newMaterialId)?.unit}
                            </div>
                            <button
                                type="button"
                                onClick={handleAddMaterial}
                                disabled={!newMaterialId || !newQuantity || parseFloat(newQuantity) <= 0}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1 text-sm"
                            >
                                <Plus size={16} /> 加入
                            </button>
                        </div>
                    </div>
                </div>

                {/* 右側: 成本與利潤分析卡片 */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-lg shadow p-6 sticky top-6">
                        <h2 className="text-lg font-bold mb-4 text-gray-900">成本與利潤分析</h2>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                <span className="text-gray-600">商品售價</span>
                                <span className="text-lg font-bold text-gray-900">${(formData.price || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                <span className="text-gray-600">預估成本</span>
                                <span className="text-lg font-bold text-red-600">${costAnalysis.totalCost.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                <span className="text-gray-600">預估利潤</span>
                                <span className={`text-lg font-bold ${costAnalysis.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    ${costAnalysis.profit.toFixed(2)}
                                </span>
                            </div>
                            <div className="pt-2">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-medium text-gray-700">利潤率 (未扣除營業成本)</span>
                                    <span className={`text-sm font-bold ${costAnalysis.profitMargin >= 30 ? 'text-green-600' : costAnalysis.profitMargin >= 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                                        {costAnalysis.profitMargin.toFixed(1)}%
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div
                                        className={`h-2.5 rounded-full ${costAnalysis.profitMargin >= 30 ? 'bg-green-600' : costAnalysis.profitMargin >= 0 ? 'bg-yellow-400' : 'bg-red-600'}`}
                                        style={{ width: `${Math.max(0, Math.min(100, costAnalysis.profitMargin))}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-200">
                            <div className="flex gap-4 flex-col">
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium text-center"
                                >
                                    {loading ? '更新中...' : '更新商品'}
                                </button>
                                <button
                                    onClick={handleCancel}
                                    disabled={loading}
                                    className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed font-medium text-center"
                                >
                                    取消
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
