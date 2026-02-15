'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { productApi, Product } from '@/lib/api/products';
import { categoryApi, Category } from '@/lib/api/categories';
import { Search, Filter, Plus, Edit, Trash2, Power, PowerOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    useEffect(() => {
        setMounted(true);
    }, []);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedCategory, statusFilter]);

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

    const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
    const paginatedProducts = filteredProducts.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

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
        <div className="p-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">商品管理</h1>
                    <p className="text-gray-500 text-sm mt-1">管理店鋪商品項目與價格資訊</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={() => router.push('/admin/products/categories')}
                        className="h-10 border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                        <Filter className="mr-2 h-4 w-4 text-gray-400" />
                        管理分類
                    </Button>
                    <Button
                        onClick={() => router.push('/admin/products/new')}
                        className="h-10 bg-[#D4AF37] hover:bg-[#C5A028] text-white"
                    >
                        <Plus size={20} className="mr-2" />
                        新增商品
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="搜尋商品名稱..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none transition-all text-sm"
                        />
                    </div>

                    {/* Category Filter */}
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none transition-all text-sm appearance-none cursor-pointer"
                        >
                            <option value="all">所有分類</option>
                            {categories.map((cat) => (
                                <option key={cat.id} value={cat.name}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Status Filter */}
                    <div className="relative">
                        <Power className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none transition-all text-sm appearance-none cursor-pointer"
                        >
                            <option value="all">所有狀態</option>
                            <option value="active">啟用中</option>
                            <option value="inactive">已停用</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider">
                                <th className="px-6 py-4 font-semibold">商品名稱</th>
                                <th className="px-6 py-4 font-semibold">分類</th>
                                <th className="px-6 py-4 font-semibold text-right">售價</th>
                                <th className="px-6 py-4 font-semibold text-right">成本估算</th>
                                <th className="px-6 py-4 font-semibold text-center">毛利率</th>
                                <th className="px-6 py-4 font-semibold text-center">狀態</th>
                                <th className="px-6 py-4 font-semibold text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {paginatedProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400 italic">
                                        {searchQuery || selectedCategory !== 'all' || statusFilter !== 'all'
                                            ? '找不到符合條件的商品'
                                            : '尚未建立任何商品'}
                                    </td>
                                </tr>
                            ) : (
                                paginatedProducts.map((product) => {
                                    const { cost, margin } = calculateMetrics(product);
                                    return (
                                        <tr key={product.id} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="px-6 py-4 capitalize">
                                                <div className="text-sm font-bold text-gray-900">{product.name}</div>
                                                <div className="text-[10px] text-gray-400 font-mono mt-0.5">ID: #{product.id}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-[11px] font-medium">
                                                    {product.category || '未分類'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="text-sm font-bold text-gray-900">${product.price}</div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="text-sm text-gray-500">${cost.toFixed(1)}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={cn(
                                                    "inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold",
                                                    margin >= 40 ? 'bg-green-100 text-green-700' :
                                                        margin >= 20 ? 'bg-blue-100 text-blue-700' :
                                                            margin > 0 ? 'bg-yellow-100 text-yellow-700' :
                                                                'bg-red-100 text-red-700'
                                                )}>
                                                    {margin.toFixed(0)}%
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {product.is_active ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-50 text-green-600 border border-green-100">
                                                        <span className="w-1 h-1 rounded-full bg-green-600 animate-pulse"></span>
                                                        啟用中
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-50 text-gray-400 border border-gray-100">
                                                        已停用
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => router.push(`/admin/products/${product.id}/edit`)}
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                        title="編輯"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteProduct(product.id)}
                                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                        title="刪除"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Info & Pagination */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-[12px] text-gray-500 font-medium order-2 sm:order-1">
                        顯示第 {(currentPage - 1) * ITEMS_PER_PAGE + 1} 至 {Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)} 筆，共 {filteredProducts.length} 筆
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
                                    // 只顯示當前頁面附近個頁碼，避免過多
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
        </div>
    );
}
