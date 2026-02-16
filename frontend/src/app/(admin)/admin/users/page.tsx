'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { userApi, StoreUser, UserRole } from '@/lib/api/users';
import { Search, Plus, Edit, Trash2, UserCircle, Shield, Key, Loader2, Mail, Phone, MapPin, Calendar, Users, ChevronLeft, ChevronRight, X, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function AdminUsersPage() {
    const router = useRouter();
    const { user, selectedStoreId } = useAuthStore();
    const [mounted, setMounted] = useState(false);
    const [users, setUsers] = useState<StoreUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<StoreUser | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [showPin, setShowPin] = useState(false);
    const ITEMS_PER_PAGE = 10;

    // Form states
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        role: UserRole.STAFF,
        pin: '',
        full_name: '',
        nickname: '',
        email: '',
        phone: '',
        gender: 'male',
        address: '',
        birthday: ''
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
        loadUsers();
    }, [mounted, user, selectedStoreId]);

    const loadUsers = async () => {
        if (!selectedStoreId) return;
        try {
            setLoading(true);
            const response = await userApi.list(selectedStoreId);
            setUsers(response.data);
        } catch (error) {
            console.error('載入人員失敗:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (targetUser: StoreUser | null = null) => {
        setEditingUser(targetUser);
        if (targetUser) {
            setFormData({
                username: targetUser.username || '',
                password: '',
                role: targetUser.role,
                pin: '',
                full_name: targetUser.full_name || '',
                nickname: targetUser.nickname || '',
                email: targetUser.email || '',
                phone: targetUser.phone || '',
                gender: targetUser.gender || 'male',
                address: targetUser.address || '',
                birthday: targetUser.birthday ? format(new Date(targetUser.birthday), 'yyyy-MM-dd') : ''
            });
        } else {
            setFormData({
                username: '',
                password: '',
                role: UserRole.STAFF,
                pin: '',
                full_name: '',
                nickname: '',
                email: '',
                phone: '',
                gender: 'male',
                address: '',
                birthday: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStoreId) return;

        try {
            const submitData: any = {
                role: formData.role,
                full_name: formData.full_name || null,
                nickname: formData.nickname || null,
                email: formData.email || null,
                phone: formData.phone || null,
                gender: formData.gender || null,
                address: formData.address || null,
                birthday: formData.birthday || null,
            };
            if (formData.pin) submitData.pin = formData.pin;

            if (editingUser) {
                await userApi.update(selectedStoreId, editingUser.id, submitData);
            } else {
                // Create
                const createData = {
                    ...submitData,
                    username: formData.role === UserRole.OWNER ? formData.username : `staff_${Date.now().toString().slice(-6)}`,
                    password: 'nopassword', // 系統統一使用 PIN，密碼設為固定預設值
                };

                if (formData.role === UserRole.OWNER && !formData.username) {
                    alert('身為 OWNER 需填寫登入帳號');
                    return;
                }

                await userApi.create(selectedStoreId, createData);
            }
            setIsModalOpen(false);
            loadUsers();
        } catch (error: any) {
            console.error('儲存失敗:', error);
            alert(error.response?.data?.detail || '儲存失敗，請檢查資料格式');
        }
    };

    const handleDelete = async (userId: number) => {
        if (!selectedStoreId) return;
        if (!confirm('確定要將此人員從店鋪移除嗎？')) return;

        try {
            await userApi.remove(selectedStoreId, userId);
            loadUsers();
        } catch (error) {
            console.error('移除失敗:', error);
        }
    };

    const filteredUsers = users.filter(u =>
        (u.full_name || u.username).toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.nickname || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
    const paginatedUsers = filteredUsers.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    if (!mounted || loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="w-10 h-10 animate-spin text-[#D4AF37] mb-4" />
                <p className="text-gray-500">載入人員資料中...</p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-[1400px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">人員管理</h1>
                    <p className="text-gray-500 text-sm mt-1">管理店員、設定職務角色與 POS 連動資訊</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        onClick={() => handleOpenModal()}
                        className="h-10 bg-[#D4AF37] hover:bg-[#C5A028] text-white shadow-lg shadow-gold/10"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        新增人員
                    </Button>
                </div>
            </div>

            {/* Filter */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="relative col-span-1 lg:col-span-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="搜尋姓名、暱稱或帳號..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none transition-all text-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                                <th className="px-6 py-4">人員資訊</th>
                                <th className="px-6 py-4">暱稱</th>
                                <th className="px-6 py-4">聯絡資訊</th>
                                <th className="px-6 py-4 text-center">角色職務</th>
                                <th className="px-6 py-4 text-center">POS PIN</th>
                                <th className="px-6 py-4 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {paginatedUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">
                                        查無人員資料
                                    </td>
                                </tr>
                            ) : (
                                paginatedUsers.map((u) => (
                                    <tr key={u.id} className="hover:bg-gray-50/80 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-[#D4AF37]/10 group-hover:text-[#D4AF37] transition-all">
                                                    <UserCircle className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-gray-900">{u.full_name || u.username}</div>
                                                    <div className="text-[10px] text-gray-400 font-mono">UID: #{u.id.toString().padStart(5, '0')}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-600 font-medium">{u.nickname || '--'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                {u.phone && <div className="text-[11px] text-gray-500 flex items-center gap-1"><Phone size={10} /> {u.phone}</div>}
                                                {u.email && <div className="text-[11px] text-gray-500 flex items-center gap-1"><Mail size={10} /> {u.email}</div>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={cn(
                                                "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ring-1 ring-inset",
                                                u.is_admin ? "bg-red-50 text-red-700 ring-red-600/20" :
                                                    u.role === UserRole.OWNER ? "bg-purple-50 text-purple-700 ring-purple-600/20" :
                                                        u.role === UserRole.MANAGER ? "bg-blue-50 text-blue-700 ring-blue-600/20" :
                                                            "bg-slate-100 text-slate-700 ring-slate-600/20"
                                            )}>
                                                {u.is_admin ? "ADMIN" : u.role.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center">
                                                <Key size={14} className={cn(u.role !== UserRole.STAFF ? "text-[#D4AF37]" : "text-gray-300")} />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleOpenModal(u)}
                                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                    title="編輯"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(u.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                    title="刪除"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-[12px] text-gray-500 font-medium order-2 sm:order-1">
                        顯示第 {(currentPage - 1) * ITEMS_PER_PAGE + 1} 至 {Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)} 筆，共 {filteredUsers.length} 筆
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center gap-1 order-1 sm:order-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-gray-700 disabled:opacity-50"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-gray-700 disabled:opacity-50"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={() => setIsModalOpen(false)}></div>
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-20">
                            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <Users className="w-5 h-5 text-[#D4AF37]" />
                                {editingUser ? '編輯人員資訊' : '新增店員'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 scrollbar-hide">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
                                {/* Row 1: 姓名 & 暱稱 */}
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">店員姓名</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                        className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-lg focus:border-[#D4AF37] outline-none text-sm transition-all box-border"
                                        placeholder="本名"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">店員暱稱</label>
                                    <input
                                        type="text"
                                        value={formData.nickname}
                                        onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                                        className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-lg focus:border-[#D4AF37] outline-none text-sm transition-all"
                                        placeholder="別名"
                                    />
                                </div>

                                {/* Row 2: 角色職務 */}
                                <div className="md:col-span-2">
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">角色職務</label>
                                    <div className="relative">
                                        <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                                        <select
                                            value={formData.role}
                                            onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                                            className="w-full h-12 pl-10 pr-10 bg-slate-100/50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none text-sm font-bold cursor-pointer transition-all appearance-none leading-[3rem] box-border"
                                        >
                                            <option value={UserRole.STAFF}>STAFF (一般員工)</option>
                                            <option value={UserRole.MANAGER}>MANAGER (經理)</option>
                                            <option value={UserRole.OWNER}>OWNER (店長/擁有者)</option>
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <div className="border-l border-r border-b border-gray-400 w-1.5 h-1.5 rotate-45 mb-1"></div>
                                        </div>
                                    </div>
                                </div>

                                {/* Dynamic Row: Account (Only for OWNER) */}
                                {formData.role === UserRole.OWNER && !editingUser && (
                                    <div className="md:col-span-2">
                                        <label className="block text-[11px] font-bold text-[#D4AF37] uppercase tracking-widest mb-1.5">登入帳號 (僅 OWNER 需設定)</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.username}
                                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                            className="w-full px-4 py-2 bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-lg focus:border-[#D4AF37] outline-none text-sm font-bold text-gray-800"
                                            placeholder="登入系統使用"
                                        />
                                    </div>
                                )}

                                {/* Other Details */}
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">電子郵件</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm focus:border-[#D4AF37] transition-all"
                                        placeholder="example@mail.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">電話號碼</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm focus:border-[#D4AF37] transition-all"
                                        placeholder="09xx-xxx-xxx"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">性別</label>
                                    <div className="flex gap-2 h-12">
                                        {['male', 'female', 'other'].map(g => (
                                            <button
                                                key={g}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, gender: g })}
                                                className={cn(
                                                    "flex-1 py-2 text-xs font-bold rounded-lg border transition-all",
                                                    formData.gender === g ? "bg-[#D4AF37] text-white border-[#D4AF37]" : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                                                )}
                                            >
                                                {g === 'male' ? '男' : g === 'female' ? '女' : '其他'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">生日</label>
                                    <div className="relative group/birth">
                                        <input
                                            type="date"
                                            value={formData.birthday}
                                            onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                                            className="w-full h-12 pl-4 pr-10 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none text-sm transition-all flex items-center box-border appearance-none text-gray-600"
                                        />
                                        <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-focus-within/birth:text-[#D4AF37] transition-colors" size={16} />
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">通訊地址</label>
                                    <input
                                        type="text"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm focus:border-[#D4AF37] transition-all"
                                        placeholder="詳細地址資訊"
                                    />
                                </div>

                                <div className="md:col-span-2 pt-4 border-t border-gray-100">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="flex items-center gap-2 text-[11px] font-bold text-[#D4AF37] uppercase tracking-widest">
                                            <Key className="w-4 h-4" />
                                            POS 密碼 (PIN 登入碼, 6-8 位數字)
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setShowPin(!showPin)}
                                            className="text-gray-400 hover:text-[#D4AF37] transition-colors p-1"
                                        >
                                            {showPin ? <Eye size={16} /> : <EyeOff size={16} />}
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type={showPin ? "text" : "password"}
                                            maxLength={8}
                                            value={formData.pin}
                                            onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })}
                                            className="w-full h-14 bg-slate-100/50 border-2 border-slate-200 rounded-xl focus:border-[#D4AF37] focus:bg-white focus:ring-4 focus:ring-[#D4AF37]/5 outline-none font-mono tracking-widest text-center text-3xl font-bold text-slate-800 placeholder:tracking-normal placeholder:font-sans placeholder:text-sm transition-all"
                                            placeholder={editingUser?.has_pin ? "已設定 PIN (點此輸入新密碼)" : "請設定 6-8 位數字"}
                                        />
                                        <p className="text-[10px] text-gray-400 mt-2 text-center italic">
                                            {editingUser?.has_pin ? '已設定密碼，若不修改請留空' : '請設定一組店員專屬的登入碼'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-4">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="flex-1 rounded-xl h-12 font-bold text-gray-500"
                                    onClick={() => setIsModalOpen(false)}
                                >
                                    取消
                                </Button>
                                <Button
                                    type="submit"
                                    className="flex-[2] bg-[#D4AF37] hover:bg-[#C5A028] text-white rounded-xl h-12 font-black shadow-lg shadow-gold/20"
                                >
                                    {editingUser ? '確認更新' : '新增人員'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
