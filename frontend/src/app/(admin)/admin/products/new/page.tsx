'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { productApi, ProductCreate } from '@/lib/api/products';
import { categoryApi, Category } from '@/lib/api/categories';
import { ArrowLeft } from 'lucide-react';

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
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={handleCancel}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
                >
                    <ArrowLeft size={20} />
                    返回商品列表
                </button>
                <h1 className="text-2xl font-bold text-gray-900">新增商品</h1>
            </div>

            {/* Form */}
            <div className="bg-white rounded-lg shadow p-6 max-w-8xl">
                <form onSubmit={handleSubmit}>
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
                            <input
                                type="number"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="0"
                                min="0"
                                step="0.01"
                                required
                            />
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
                                rows={4}
                                maxLength={500}
                            />
                            <p className="text-sm text-gray-500 mt-1">
                                {formData.description?.length || 0} / 500 字元
                            </p>
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
                            <p className="text-sm text-gray-500 mt-1">
                                暫時使用圖片網址,未來將支援檔案上傳
                            </p>
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

                        {/* 按鈕 */}
                        <div className="flex gap-4 pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                            >
                                {loading ? '建立中...' : '建立商品'}
                            </button>
                            <button
                                type="button"
                                onClick={handleCancel}
                                disabled={loading}
                                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed font-medium"
                            >
                                取消
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
