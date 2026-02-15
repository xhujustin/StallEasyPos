'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { productApi, ProductCreate } from '@/lib/api/products';
import { categoryApi, Category } from '@/lib/api/categories';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function NewProductPage() {
    const router = useRouter();
    const { user, selectedStoreId } = useAuthStore();
    const [mounted, setMounted] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<ProductCreate>({
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

        loadCategories();
    }, [mounted, user, selectedStoreId]);

    const loadCategories = async () => {
        if (!selectedStoreId) return;

        try {
            const data = await categoryApi.getCategories(selectedStoreId);
            setCategories(data);
        } catch (error) {
            console.error('載入分類失敗:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStoreId) return;

        // 驗證
        if (!formData.name.trim()) {
            alert('請輸入商品名稱');
            return;
        }

        if (formData.price <= 0) {
            alert('價格必須大於0');
            return;
        }

        try {
            setLoading(true);
            await productApi.createProduct(selectedStoreId, formData);
            alert('商品建立成功!');
            router.push('/admin/products');
        } catch (error) {
            console.error('建立商品失敗:', error);
            alert('建立商品失敗,請稍後再試');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        router.push('/admin/products');
    };

    if (!mounted) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-lg">載入中...</div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-[1000px] mx-auto">
            {/* Header */}
            <div className="mb-8">
                <button
                    onClick={handleCancel}
                    className="flex items-center gap-2 text-gray-400 hover:text-gray-900 mb-6 transition-colors group"
                >
                    <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-medium">返回商品列表</span>
                </button>
                <h1 className="text-3xl font-bold text-gray-800">新增商品</h1>
                <p className="text-gray-500 text-sm mt-1">填寫下方資訊以建立新的販售項目</p>
            </div>

            {/* Form Container */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <form onSubmit={handleSubmit} className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Basic Info Section */}
                        <div className="space-y-6">
                            <h2 className="text-lg font-bold text-gray-800 border-l-4 border-[#D4AF37] pl-3 mb-4">基本資訊</h2>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    商品名稱 <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none transition-all"
                                    placeholder="例如: 珍珠奶茶"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    分類
                                </label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none transition-all appearance-none cursor-pointer"
                                >
                                    <option value="">未分類</option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.name}>
                                            {cat.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    銷售價格 <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                                    <input
                                        type="number"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                                        className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none transition-all"
                                        placeholder="0"
                                        min="0"
                                        step="0.01"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Additional Info Section */}
                        <div className="space-y-6">
                            <h2 className="text-lg font-bold text-gray-800 border-l-4 border-gray-300 pl-3 mb-4">詳細內容</h2>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    商品描述
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none transition-all min-h-[120px]"
                                    placeholder="輸入商品詳細介紹..."
                                    rows={4}
                                    maxLength={500}
                                />
                                <div className="text-right text-[10px] text-gray-400 mt-1 font-mono">
                                    {formData.description?.length || 0} / 500
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    商品圖片 (URL)
                                </label>
                                <input
                                    type="url"
                                    value={formData.image_url}
                                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none transition-all text-sm"
                                    placeholder="https://example.com/image.jpg"
                                />
                            </div>

                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <div>
                                    <div className="text-sm font-bold text-gray-800">上架狀態</div>
                                    <div className="text-[11px] text-gray-500">控制商品是否在 POS 介面顯示</div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Form Actions */}
                    <div className="flex items-center justify-end gap-4 mt-12 pt-8 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={handleCancel}
                            disabled={loading}
                            className="px-8 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-10 py-2.5 bg-[#D4AF37] hover:bg-[#C5A028] text-white rounded-xl shadow-md shadow-gold/20 disabled:bg-gray-400 disabled:cursor-not-allowed font-bold transition-all transform active:scale-95"
                        >
                            {loading ? '建立中...' : '建立商品'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
