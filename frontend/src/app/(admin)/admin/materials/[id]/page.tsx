'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ArrowDown, ArrowUp, ChevronLeft, ChevronRight, History, Package, TrendingUp } from 'lucide-react';

import { InventoryTransaction, Material, MaterialPurchase, materialApi } from '@/lib/api/materials';
import { baseUnitFactor, normalizeBaseUnit, PURCHASE_UNITS } from '@/lib/material-units';
import { useAuthStore } from '@/lib/store/auth-store';

const transactionLabels: Record<string, string> = {
    OPENING_BALANCE: '期初庫存',
    PURCHASE: '進貨',
    SALE: '銷售扣料',
    WASTE: '耗損／出庫',
    ADJUSTMENT_IN: '盤點增加',
    RESTOCK: '取消訂單還原',
};

const number = (value: number, digits = 4) => Number(value || 0).toLocaleString('zh-TW', { maximumFractionDigits: digits });
const money = (value: number, maximumDigits = 2) => `$${Number(value || 0).toLocaleString('zh-TW', {
    minimumFractionDigits: 2,
    maximumFractionDigits: maximumDigits,
})}`;
const dateTime = (value: string) => new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
}).format(new Date(value));
const PAGE_SIZE = 10;
const trendPeriods = [
    { value: 7, label: '7天' },
    { value: 14, label: '14天' },
    { value: 30, label: '30天' },
    { value: 182, label: '半年' },
    { value: 365, label: '一年' },
] as const;

export default function MaterialHistoryPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const { selectedStoreId } = useAuthStore();
    const materialId = Number(params.id);
    const [material, setMaterial] = useState<Material | null>(null);
    const [purchases, setPurchases] = useState<MaterialPurchase[]>([]);
    const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [transactionPage, setTransactionPage] = useState(1);
    const [purchasePage, setPurchasePage] = useState(1);
    const [trendDays, setTrendDays] = useState<number>(30);
    const [displayUnit, setDisplayUnit] = useState('g');
    const materialBaseFactor = material ? baseUnitFactor(material.unit) : 1;

    useEffect(() => {
        if (!selectedStoreId || !materialId) return;
        Promise.all([
            materialApi.getMaterial(materialId, selectedStoreId),
            materialApi.getPurchases(materialId, selectedStoreId),
            materialApi.getTransactions(materialId, selectedStoreId),
        ]).then(([materialData, purchaseData, transactionData]) => {
            setMaterial(materialData);
            setDisplayUnit(normalizeBaseUnit(materialData.unit));
            setPurchases(purchaseData);
            setTransactions(transactionData);
        }).catch((error) => {
            console.error('載入耗材履歷失敗:', error);
            alert('載入耗材履歷失敗');
        }).finally(() => setLoading(false));
    }, [materialId, selectedStoreId]);

    const priceStats = useMemo(() => {
        if (!purchases.length) return { latest: 0, previous: 0, change: 0, max: 1 };
        const normalizedPrices = purchases.map((purchase) => Number(purchase.total_cost) / (Number(purchase.base_quantity) * materialBaseFactor));
        const latest = normalizedPrices[0];
        const previous = normalizedPrices[1] || latest;
        return {
            latest,
            previous,
            change: previous ? ((latest - previous) / previous) * 100 : 0,
            max: Math.max(...normalizedPrices, 0.0001),
        };
    }, [purchases, materialBaseFactor]);

    const trendPurchases = useMemo(() => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - trendDays);
        return purchases.filter((purchase) => new Date(purchase.purchased_at) >= cutoff);
    }, [purchases, trendDays]);
    const trendMax = useMemo(() => Math.max(
        ...trendPurchases.map((purchase) => Number(purchase.total_cost) / (Number(purchase.base_quantity) * materialBaseFactor)),
        0.0001,
    ), [trendPurchases, materialBaseFactor]);
    const transactionPageCount = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE));
    const purchasePageCount = Math.max(1, Math.ceil(purchases.length / PAGE_SIZE));
    const visibleTransactions = transactions.slice((transactionPage - 1) * PAGE_SIZE, transactionPage * PAGE_SIZE);
    const visiblePurchases = purchases.slice((purchasePage - 1) * PAGE_SIZE, purchasePage * PAGE_SIZE);

    useEffect(() => {
        setTransactionPage((page) => Math.min(page, transactionPageCount));
    }, [transactionPageCount]);
    useEffect(() => {
        setPurchasePage((page) => Math.min(page, purchasePageCount));
    }, [purchasePageCount]);

    if (loading) return <div className="p-8 text-gray-500">載入履歷中…</div>;
    if (!material) return <div className="p-8 text-red-500">找不到耗材資料</div>;

    const canonicalUnit = normalizeBaseUnit(material.unit);
    const canonicalFactor = materialBaseFactor;
    const displayUnits = [
        { value: canonicalUnit, label: canonicalUnit, factor: 1 },
        ...PURCHASE_UNITS
            .filter((unit) => unit.baseUnit === canonicalUnit && unit.value !== canonicalUnit)
            .map((unit) => ({ value: unit.value, label: unit.label, factor: unit.defaultRate || 1 })),
    ];
    const displayFactor = displayUnits.find((unit) => unit.value === displayUnit)?.factor || 1;
    const displayStock = Number(material.stock_quantity) * canonicalFactor / displayFactor;
    const displayAverageCost = Number(material.unit_cost) / canonicalFactor * displayFactor;

    return (
        <div className="p-6 max-w-[1500px] mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push('/admin/materials')} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                        <ArrowLeft size={22} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{material.name}｜耗材履歷</h1>
                        <p className="text-sm text-gray-500 mt-1">價格波動、進出庫與成本追蹤</p>
                    </div>
                </div>
                <label className="flex items-center gap-2 self-end sm:self-auto text-sm text-gray-500">
                    顯示單位
                    <select value={displayUnit} onChange={(event) => setDisplayUnit(event.target.value)} className="min-w-36 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-sm outline-none focus:border-[#D4AF37]">
                        {displayUnits.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
                    </select>
                </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <SummaryCard icon={<Package size={20} />} label="目前庫存" value={`${number(displayStock)} ${displayUnit}`} />
                <SummaryCard icon={<TrendingUp size={20} />} label={`平均成本／${displayUnit}`} value={money(displayAverageCost, 4)} />
                <SummaryCard icon={<History size={20} />} label="庫存價值" value={money(Number(material.stock_quantity) * Number(material.unit_cost))} />
                <SummaryCard
                    icon={priceStats.change >= 0 ? <ArrowUp size={20} /> : <ArrowDown size={20} />}
                    label="最近進價變動"
                    value={purchases.length ? `${priceStats.change >= 0 ? '+' : ''}${priceStats.change.toFixed(2)}%` : '尚無進貨'}
                    alert={priceStats.change > 10}
                />
            </div>

            <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                    <div>
                        <h2 className="font-bold text-gray-900">進貨價格趨勢</h2>
                        <p className="text-xs text-gray-400 mt-1">期間內 {trendPurchases.length} 筆；不同包裝均換算成每 {displayUnit} 成本後比較</p>
                    </div>
                    <div className="inline-flex self-start rounded-xl bg-gray-100 p-1">
                        {trendPeriods.map((period) => <button key={period.value} type="button" onClick={() => setTrendDays(period.value)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${trendDays === period.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{period.label}</button>)}
                    </div>
                </div>
                {trendPurchases.length === 0 ? <Empty text="此期間尚無進貨價格紀錄" /> : (
                    <div className="overflow-x-auto">
                    <div className="h-48 flex items-end gap-2 border-b border-gray-200 px-2" style={{ minWidth: Math.max(600, trendPurchases.length * 44) }}>
                        {[...trendPurchases].reverse().map((purchase) => {
                            const normalizedPrice = Number(purchase.total_cost) / (Number(purchase.base_quantity) * canonicalFactor) * displayFactor;
                            const height = Math.max(8, (normalizedPrice / displayFactor) / trendMax * 160);
                            return <div key={purchase.id} className="flex-1 min-w-0 flex flex-col items-center justify-end group h-full">
                                <div className="text-[10px] text-gray-500 opacity-0 group-hover:opacity-100 whitespace-nowrap">{money(normalizedPrice, 4)}</div>
                                <div className="w-full max-w-12 bg-[#D4AF37] rounded-t-md hover:bg-[#b9962d]" style={{ height }} title={`${dateTime(purchase.purchased_at)}｜${money(normalizedPrice, 4)}/${displayUnit}`} />
                                <div className="text-[10px] text-gray-400 py-1 truncate w-full text-center">{new Date(purchase.purchased_at).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })}</div>
                            </div>;
                        })}
                    </div>
                    </div>
                )}
            </section>

            <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-gray-100"><h2 className="font-bold text-gray-900">庫存進出紀錄</h2></div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500"><tr>
                            <th className="px-5 py-3 text-left">時間</th><th className="px-5 py-3 text-left">類型</th>
                            <th className="px-5 py-3 text-right">異動</th><th className="px-5 py-3 text-right">異動後庫存</th>
                            <th className="px-5 py-3 text-right">當時成本</th><th className="px-5 py-3 text-left">備註</th>
                        </tr></thead>
                        <tbody className="divide-y divide-gray-100">
                            {visibleTransactions.map((transaction) => <tr key={transaction.id} className="hover:bg-gray-50">
                                <td className="px-5 py-3 whitespace-nowrap text-gray-500">{dateTime(transaction.created_at)}</td>
                                <td className="px-5 py-3 font-medium">{transactionLabels[transaction.transaction_type] || transaction.transaction_type}</td>
                                <td className={`px-5 py-3 text-right font-mono font-bold ${Number(transaction.quantity_change) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {Number(transaction.quantity_change) >= 0 ? '+' : ''}{number(Number(transaction.quantity_change) * canonicalFactor / displayFactor)} {displayUnit}
                                </td>
                                <td className="px-5 py-3 text-right font-mono">{number(Number(transaction.balance_after) * canonicalFactor / displayFactor)} {displayUnit}</td>
                                <td className="px-5 py-3 text-right font-mono">{money(Number(transaction.unit_cost_snapshot) / canonicalFactor * displayFactor, 4)}/{displayUnit}</td>
                                <td className="px-5 py-3 text-gray-500">{transaction.note || '—'}</td>
                            </tr>)}
                            {!transactions.length && <tr><td colSpan={6}><Empty text="尚無庫存異動紀錄" /></td></tr>}
                        </tbody>
                    </table>
                </div>
                <Pagination page={transactionPage} pageCount={transactionPageCount} total={transactions.length} onChange={setTransactionPage} />
            </section>

            <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-gray-100"><h2 className="font-bold text-gray-900">進貨明細與價格歷史</h2></div>
                <div className="overflow-x-auto"><table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500"><tr>
                        <th className="px-5 py-3 text-left">日期</th><th className="px-5 py-3 text-left">供應商</th>
                        <th className="px-5 py-3 text-right">數量</th><th className="px-5 py-3 text-right">進貨單價</th>
                        <th className="px-5 py-3 text-right">總成本</th><th className="px-5 py-3 text-right">進貨後平均成本</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-100">{visiblePurchases.map((purchase) => <tr key={purchase.id}>
                        <td className="px-5 py-3 text-gray-500">{dateTime(purchase.purchased_at)}</td>
                        <td className="px-5 py-3">{purchase.supplier || '—'}</td>
                        <td className="px-5 py-3 text-right">{number(purchase.purchase_quantity)} {purchase.purchase_unit}</td>
                        <td className="px-5 py-3 text-right">{money(purchase.unit_price)}</td>
                        <td className="px-5 py-3 text-right">{money(purchase.total_cost)}</td>
                        <td className="px-5 py-3 text-right">{money(Number(purchase.resulting_average_cost) / canonicalFactor * displayFactor, 4)}/{displayUnit}</td>
                    </tr>)}{!purchases.length && <tr><td colSpan={6}><Empty text="尚無進貨明細" /></td></tr>}</tbody>
                </table></div>
                <Pagination page={purchasePage} pageCount={purchasePageCount} total={purchases.length} onChange={setPurchasePage} />
            </section>
        </div>
    );
}

function SummaryCard({ icon, label, value, alert = false }: { icon: ReactNode; label: string; value: string; alert?: boolean }) {
    return <div className={`rounded-2xl border p-5 bg-white shadow-sm ${alert ? 'border-red-200' : 'border-gray-200'}`}>
        <div className={`flex items-center gap-2 text-sm ${alert ? 'text-red-500' : 'text-gray-500'}`}>{icon}{label}</div>
        <div className={`text-xl font-bold mt-3 ${alert ? 'text-red-600' : 'text-gray-900'}`}>{value}</div>
    </div>;
}

function Empty({ text }: { text: string }) {
    return <div className="py-12 text-center text-sm text-gray-400">{text}</div>;
}

function Pagination({ page, pageCount, total, onChange }: { page: number; pageCount: number; total: number; onChange: (page: number) => void }) {
    if (total <= PAGE_SIZE) return null;
    const start = (page - 1) * PAGE_SIZE + 1;
    const end = Math.min(page * PAGE_SIZE, total);
    return <div className="flex items-center justify-between gap-4 px-5 py-4 border-t border-gray-100 text-sm">
        <span className="text-gray-500">顯示 {start}–{end}，共 {total} 筆</span>
        <div className="flex items-center gap-2">
            <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed" aria-label="上一頁"><ChevronLeft size={16} /></button>
            <span className="min-w-16 text-center font-medium text-gray-700">{page} / {pageCount}</span>
            <button type="button" disabled={page >= pageCount} onClick={() => onChange(page + 1)} className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed" aria-label="下一頁"><ChevronRight size={16} /></button>
        </div>
    </div>;
}
