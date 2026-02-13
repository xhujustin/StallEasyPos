'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { productApi, Product } from '@/lib/api/products';
import { categoryApi, Category } from '@/lib/api/categories';
import { Search, Filter, Plus, Edit, Trash2, Power, PowerOff } from 'lucide-react';

export default function ProductsPage() {
    const router = useRouter();
    const { user, selectedStoreId } = useAuthStore();
    const [mounted, setMounted] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');

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
    }, [mounted, user, selectedStoreId]);

    const loadData = async () => {
        if (!selectedStoreId) return;

        try {
            setLoading(true);
            const [productsData, categoriesData] = await Promise.all([
                productApi.getAll(selectedStoreId),
                categoryApi.getCategories(selectedStoreId),
            ]);
            setProducts(productsData);
            setCategories(categoriesData);
        } catch (error) {
            console.error('載入資料失敗:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = products.filter((product) => {
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
        const matchesStatus =
            statusFilter === 'all' ||
            (statusFilter === 'active' && product.is_active) ||
            (statusFilter === 'inactive' && !product.is_active);

        return matchesSearch && matchesCategory && matchesStatus;
    });

    const currentStore = user?.stores?.find((s) => s.id === selectedStoreId);

    if (!mounted || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-lg">載入中...</div>
            </div>
        );
    }

    const handleDeleteProduct = async (productId: number) => {
        if (!selectedStoreId) return;

        if (!confirm('確定要刪除這個商品嗎?')) {
            return;
        }

        try {
            await productApi.deleteProduct(productId, selectedStoreId);
            alert('商品刪除成功!');
            loadData();
        } catch (error) {
            console.error('刪除商品失敗:', error);
            alert('刪除商品失敗,請稍後再試');
        }
    };

    const calculateMetrics = (product: Product) => {
        let cost = product.cost || 0;

        // 如果有配方，優先使用配方計算成本
        if (product.materials && product.materials.length > 0) {
            const recipeCost = product.materials.reduce((sum, pm) => {
                const unitCost = pm.material?.unit_cost || 0;
                return sum + (pm.quantity * unitCost);
            }, 0);

            if (recipeCost > 0) {
                cost = recipeCost;
            }
        }

        const price = product.price || 0;
        const profit = price - cost;
        const margin = price > 0 ? (profit / price) * 100 : 0;

        return { cost, margin };
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">商品管理</h1>
                        <p className="text-gray-600 mt-1">當前店鋪: {currentStore?.name}</p>
                    </div>
                    <button
                        onClick={() => router.push('/admin/products/new')}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        <Plus size={20} />
                        新增商品
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="搜尋商品..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        {/* Category Filter */}
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                            >
                                <option value="all">全部分類</option>
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.name}>
                                        {cat.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Status Filter */}
                        <div>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="all">全部狀態</option>
                                <option value="active">啟用</option>
                                <option value="inactive">停用</option>
                            </select>
                        </div>

                        {/* Manage Categories */}
                        <button
                            onClick={() => router.push('/admin/products/categories')}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            管理分類
                        </button>
                    </div>
                </div>
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                商品名稱
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                分類
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                售價
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                成本
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                利潤率
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                狀態
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                操作
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredProducts.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                    {searchQuery || selectedCategory !== 'all' || statusFilter !== 'all'
                                        ? '沒有符合條件的商品'
                                        : '尚無商品,點擊「新增商品」開始建立'}
                                </td>
                            </tr>
                        ) : (
                            filteredProducts.map((product) => {
                                const { cost, margin } = calculateMetrics(product);
                                return (
                                    <tr key={product.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-500">{product.category || '-'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">${product.price}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-500">${cost.toFixed(2)}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${margin >= 30 ? 'bg-green-100 text-green-800' :
                                                    margin > 0 ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-red-100 text-red-800'
                                                }`}>
                                                {margin.toFixed(1)}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {product.is_active ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    <Power size={12} />
                                                    啟用
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                    <PowerOff size={12} />
                                                    停用
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => router.push(`/admin/products/${product.id}/edit`)}
                                                className="text-blue-600 hover:text-blue-900 mr-4"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteProduct(product.id)}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
