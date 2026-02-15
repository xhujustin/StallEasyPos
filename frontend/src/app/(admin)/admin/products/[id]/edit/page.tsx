'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { productApi, ProductUpdate, Product, ProductMaterial, ProductMaterialCreate, ProductAttribute } from '@/lib/api/products';
import { categoryApi, Category } from '@/lib/api/categories';
import { materialApi, Material } from '@/lib/api/materials';
import { ArrowLeft, Plus, Trash2, Calculator, Settings, Info } from 'lucide-react';
import AttributeManager from '@/components/admin/products/AttributeManager';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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

    // 屬性相關 State
    const [productAttributes, setProductAttributes] = useState<ProductAttribute[]>([]);
    const [activeTab, setActiveTab] = useState<'basic' | 'recipe' | 'attributes'>('basic');

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
            if (productData.attributes) {
                setProductAttributes(productData.attributes);
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
                materials: materialsPayload,
                attributes: productAttributes
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
        <div className="p-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="mb-8">
                <button
                    onClick={handleCancel}
                    className="flex items-center gap-2 text-gray-400 hover:text-gray-900 mb-6 transition-colors group"
                >
                    <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-medium">返回商品列表</span>
                </button>
                <div className="flex items-end gap-3">
                    <h1 className="text-3xl font-bold text-gray-800">編輯商品</h1>
                    <span className="text-gray-400 text-sm mb-1">ID: #{productId}</span>
                </div>
            </div>

            {/* Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Simplified Tabs */}
                    <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
                        {[
                            { id: 'basic', label: '基本資訊', icon: Info },
                            { id: 'recipe', label: '配方設定', icon: Calculator },
                            { id: 'attributes', label: '客製選項', icon: Settings }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={cn(
                                    "flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-lg transition-all",
                                    activeTab === tab.id
                                        ? "bg-white text-gray-900 shadow-sm"
                                        : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
                                )}
                            >
                                <tab.icon size={16} />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Basic Info Tab */}
                    <div className={cn(
                        "bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300",
                        activeTab === 'basic' ? "opacity-100 translate-y-0" : "sr-only opacity-0 translate-y-4"
                    )}>
                        <div className="p-8 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700 ml-1">商品名稱 <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none transition-all"
                                        placeholder="例如: 珍珠奶茶"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700 ml-1">商品分類</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="">未分類</option>
                                        {categories.map((cat) => (
                                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700 ml-1">銷售價格 <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                                        <input
                                            type="number"
                                            value={formData.price}
                                            onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                                            className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none transition-all font-bold"
                                            placeholder="0.00"
                                            min="0"
                                            step="0.01"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700 ml-1">商品狀態</label>
                                    <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                                        <span className="text-sm text-gray-600 ml-2">{formData.is_active ? '銷售中' : '已下架'}</span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.is_active}
                                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700 ml-1">詳細描述</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none transition-all min-h-[100px]"
                                    placeholder="輸入商品詳細介紹..."
                                    rows={3}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700 ml-1">圖片網址 (URL)</label>
                                <input
                                    type="url"
                                    value={formData.image_url}
                                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none transition-all text-sm"
                                    placeholder="https://"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Recipe Tab */}
                    <div className={cn(
                        "bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300",
                        activeTab === 'recipe' ? "opacity-100 translate-y-0" : "hidden opacity-0 translate-y-4"
                    )}>
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-gray-800">配方組成</h3>
                                <p className="text-xs text-gray-400 font-medium italic">系統將根據配方自動演算成本與毛利</p>
                            </div>

                            <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden mb-8">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-gray-100/50 text-[11px] uppercase tracking-wider text-gray-500 font-bold border-b border-gray-200">
                                            <th className="px-6 py-3">耗材項目</th>
                                            <th className="px-6 py-3 text-right">消耗量</th>
                                            <th className="px-6 py-3 text-right">單位成本</th>
                                            <th className="px-6 py-3 text-right">小計</th>
                                            <th className="px-6 py-3 text-center">操作</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200/50">
                                        {productMaterials.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">尚未設定配方內容</td>
                                            </tr>
                                        ) : (
                                            productMaterials.map((pm) => {
                                                const material = materials.find(m => m.id === pm.material_id) || pm.material;
                                                const subtotal = (material?.unit_cost || 0) * pm.quantity;
                                                return (
                                                    <tr key={pm.material_id} className="hover:bg-white transition-colors">
                                                        <td className="px-6 py-4 font-bold text-gray-800">{material?.name || '未知耗材'}</td>
                                                        <td className="px-6 py-4 text-right">
                                                            <span className="font-mono text-gray-900">{parseFloat(Number(pm.quantity).toFixed(4))}</span>
                                                            <span className="text-[10px] text-gray-400 ml-1">{material?.unit}</span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right text-gray-400 text-xs">${parseFloat(Number(material?.unit_cost || 0).toFixed(4))}</td>
                                                        <td className="px-6 py-4 text-right font-bold text-gray-600">${subtotal.toFixed(2)}</td>
                                                        <td className="px-6 py-4 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveMaterial(pm.material_id)}
                                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Add Material Tool */}
                            <div className="bg-gray-50 p-6 rounded-2xl border border-dashed border-gray-300">
                                <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                                    <Plus size={16} className="text-[#D4AF37]" /> 新增耗材至配方
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                    <div className="md:col-span-6 space-y-1.5">
                                        <label className="text-[11px] font-bold text-gray-400 ml-1">選擇耗材</label>
                                        <select
                                            value={newMaterialId}
                                            onChange={(e) => setNewMaterialId(e.target.value ? Number(e.target.value) : '')}
                                            className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none text-sm appearance-none cursor-pointer"
                                        >
                                            <option value="">請選擇耗材項目...</option>
                                            {materials.map(m => (
                                                <option key={m.id} value={m.id}>{m.name} (${m.unit_cost}/{m.unit})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="md:col-span-4 space-y-1.5">
                                        <label className="text-[11px] font-bold text-gray-400 ml-1">消耗數量</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.0001"
                                                value={newQuantity}
                                                onChange={(e) => setNewQuantity(e.target.value)}
                                                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none text-sm font-mono"
                                                placeholder="0.0000"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
                                                {newMaterialId && materials.find(m => m.id === newMaterialId)?.unit}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="md:col-span-2">
                                        <button
                                            type="button"
                                            onClick={handleAddMaterial}
                                            disabled={!newMaterialId || !newQuantity || parseFloat(newQuantity) <= 0}
                                            className="w-full h-10 bg-gray-900 text-white rounded-xl hover:bg-black disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed font-bold text-sm transition-all shadow-sm"
                                        >
                                            新增
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Attributes Tab */}
                    <div className={cn(
                        "bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden",
                        activeTab === 'attributes' ? "block" : "hidden"
                    )}>
                        <div className="p-8">
                            <AttributeManager attributes={productAttributes} onChange={setProductAttributes} materials={materials} />
                        </div>
                    </div>
                </div>

                {/* Right Column: Analysis & Actions */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 sticky top-6">
                        <h3 className="text-xl font-bold text-gray-800 mb-6">財務分析報告</h3>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-3 border-b border-gray-50">
                                <span className="text-sm text-gray-500 font-medium">目前的商品定價</span>
                                <span className="text-xl font-bold text-gray-900">${(formData.price || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-gray-50">
                                <span className="text-sm text-gray-500 font-medium">物料成本分析</span>
                                <span className="text-lg font-bold text-red-500">${costAnalysis.totalCost.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-gray-50">
                                <span className="text-sm text-gray-500 font-medium">預估毛利額</span>
                                <span className={cn(
                                    "text-lg font-bold",
                                    costAnalysis.profit >= 0 ? 'text-green-600' : 'text-red-600'
                                )}>
                                    ${costAnalysis.profit.toFixed(2)}
                                </span>
                            </div>

                            <div className="pt-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-bold text-gray-700">商品毛利率指標</span>
                                    <span className={cn(
                                        "text-sm font-bold px-2 py-0.5 rounded-lg",
                                        costAnalysis.profitMargin >= 40 ? 'bg-green-100 text-green-700' :
                                            costAnalysis.profitMargin >= 20 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                                    )}>
                                        {costAnalysis.profitMargin.toFixed(1)}%
                                    </span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-3 p-0.5 border border-gray-100 shadow-inner">
                                    <div
                                        className={cn(
                                            "h-full rounded-full transition-all duration-500",
                                            costAnalysis.profitMargin >= 40 ? 'bg-green-500' :
                                                costAnalysis.profitMargin >= 20 ? 'bg-blue-500' : 'bg-red-500'
                                        )}
                                        style={{ width: `${Math.max(0, Math.min(100, costAnalysis.profitMargin))}%` }}
                                    ></div>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-2 text-center italic">* 以上數據未包含固定店租、人力與水電成本</p>
                            </div>
                        </div>

                        {/* Page Actions */}
                        <div className="mt-12 flex flex-col gap-3">
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="w-full py-3.5 bg-[#D4AF37] hover:bg-[#C5A028] text-white rounded-xl shadow-lg shadow-gold/20 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed font-bold transition-all transform active:scale-95 flex items-center justify-center gap-2"
                            >
                                {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                                {loading ? '正在儲存...' : '儲存更新變更'}
                            </button>
                            <button
                                onClick={handleCancel}
                                disabled={loading}
                                className="w-full py-3.5 text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-xl font-bold transition-all"
                            >
                                放棄修改並返回
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
