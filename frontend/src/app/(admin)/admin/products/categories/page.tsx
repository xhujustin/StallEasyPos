'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { categoryApi, type Category, type CategoryCreate } from '@/lib/api/categories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Search, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function CategoriesPage() {
    const router = useRouter();
    const { user, selectedStoreId } = useAuthStore();
    const [mounted, setMounted] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [formData, setFormData] = useState<{ name: string; description: string; display_order: number }>({
        name: '',
        description: '',
        display_order: 0,
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
            setLoading(true);
            const data = await categoryApi.getCategories(selectedStoreId);
            setCategories(data);
        } catch (error) {
            console.error('載入分類失敗:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (category?: Category) => {
        if (category) {
            setEditingCategory(category);
            setFormData({
                name: category.name,
                description: category.description || '',
                display_order: category.display_order || 0,
            });
        } else {
            setEditingCategory(null);
            setFormData({
                name: '',
                description: '',
                display_order: 0,
            });
        }
        setIsDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setEditingCategory(null);
        setFormData({
            name: '',
            description: '',
            display_order: 0,
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStoreId) return;

        try {
            if (editingCategory) {
                await categoryApi.updateCategory(editingCategory.id, selectedStoreId, {
                    name: formData.name,
                    description: formData.description,
                    display_order: formData.display_order,
                });
            } else {
                await categoryApi.createCategory(selectedStoreId, {
                    name: formData.name,
                    description: formData.description,
                    display_order: formData.display_order,
                });
            }
            await loadCategories();
            handleCloseDialog();
        } catch (error) {
            console.error('儲存分類失敗:', error);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('確定要刪除此分類嗎?')) return;
        if (!selectedStoreId) return;

        try {
            await categoryApi.deleteCategory(id, selectedStoreId);
            await loadCategories();
        } catch (error) {
            console.error('刪除分類失敗:', error);
        }
    };

    const filteredCategories = categories.filter((category) =>
        category.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!mounted || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-lg">載入中...</div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <button
                        onClick={() => router.push('/admin/products')}
                        className="flex items-center gap-2 text-gray-400 hover:text-gray-900 mb-6 transition-colors group"
                    >
                        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-medium">返回商品列表</span>
                    </button>
                    <h1 className="text-3xl font-bold text-gray-800">商品分類管理</h1>
                    <p className="text-gray-500 text-sm mt-1">管理店鋪商品分類，協助顧客快速尋找商品</p>
                </div>
                <button
                    onClick={() => handleOpenDialog()}
                    className="h-11 px-6 bg-[#D4AF37] hover:bg-[#C5A028] text-white rounded-xl font-bold shadow-lg shadow-gold/20 transition-all transform active:scale-95 flex items-center justify-center gap-2"
                >
                    <Plus size={20} />
                    <span>新增分類</span>
                </button>
            </div>

            {/* Content Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-6 py-4 text-xs uppercase tracking-wider text-gray-400 font-bold">分類名稱</th>
                            <th className="px-6 py-4 text-xs uppercase tracking-wider text-gray-400 font-bold">描述</th>
                            <th className="px-6 py-4 text-xs uppercase tracking-wider text-gray-400 font-bold">顯示排序</th>
                            <th className="px-6 py-4 text-xs uppercase tracking-wider text-gray-400 font-bold text-center">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-gray-400">載入中...</td>
                            </tr>
                        ) : categories.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-gray-400">尚無分類數據</td>
                            </tr>
                        ) : (
                            categories.map((category) => (
                                <tr key={category.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-gray-800">{category.name}</td>
                                    <td className="px-6 py-4 text-gray-500 text-sm">{category.description || '-'}</td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 rounded text-xs font-bold text-gray-600">
                                            Priority: {category.display_order}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => handleOpenDialog(category)}
                                                className="p-2 text-gray-400 hover:text-[#D4AF37] hover:bg-gold/5 rounded-lg transition-all"
                                                title="編輯"
                                            >
                                                <Pencil size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(category.id)}
                                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                title="刪除"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Form Dialog */}
            {isDialogOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">
                            {editingCategory ? '編輯分類' : '建立新分類'}
                        </h2>
                        <form onSubmit={handleSubmit}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">分類名稱 <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none transition-all"
                                        placeholder="例如: 推薦特調、茶飲系列"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">分類描述</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none transition-all min-h-[80px]"
                                        placeholder="簡單描述此分類內容..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">顯示排序 (數字越小越前面)</label>
                                    <input
                                        type="number"
                                        value={formData.display_order}
                                        onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none transition-all font-mono"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 mt-8">
                                <button
                                    type="button"
                                    onClick={handleCloseDialog}
                                    className="flex-1 px-4 py-3 text-sm font-bold text-gray-400 hover:text-gray-800 transition-colors"
                                >
                                    取消返回
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] px-4 py-3 bg-[#D4AF37] hover:bg-[#C5A028] text-white rounded-xl font-bold shadow-lg shadow-gold/20 transition-all transform active:scale-95"
                                >
                                    {editingCategory ? '儲存變更' : '確認建立'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
