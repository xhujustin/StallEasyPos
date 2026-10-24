'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { shiftApi, Shift } from '@/lib/api/shifts';
import { orderApi, Order } from '@/lib/api/orders';
import { productApi, Product } from '@/lib/api/products';
import { settingsApi } from '@/lib/api/settings';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft, Loader2, Download, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

// ==================================================================================
// Types & Interfaces
// ==================================================================================

interface AnalyticsData {
    revenue: {
        gross: number;
        discount: number;
        refund: number;
        net: number;
        orderCount: number;
        aov: number;
        tax: number;
    };
    categories: {
        name: string;
        amount: number;
        count: number;
        percentage: number;
    }[];
    topProducts: {
        name: string;
        count: number;
        amount: number;
        profit: number;
    }[];
    hourly: {
        hour: string;
        amount: number;
        count: number;
    }[];
    profitability: {
        cogs: number; // Cost of Goods Sold
        tax: number;
        revenueExcludingTax: number;
        fixedCosts: number;
        grossProfit: number;
        netProfit: number;
        margin: number;
        netMargin: number;
    };
    payments: {
        method: string;
        amount: number;
        percentage: number;
    }[];
    exceptions: {
        voidCount: number;
        voidAmount: number;
        voidReasons: { reason: string; count: number }[];
    };
    cashRec: {
        opening: number;
        sales: number;
        netChange: number; // Added - Removed
        expected: number;
        actual: number;
        shortage: number;
    };
}

// ==================================================================================
// Analytics Calculation
// ==================================================================================

type FixedCostSettings = {
    monthly_fixed_costs: { amount: number }[];
    business_days: number[];
};

const parseLocalDate = (value: string) => {
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    return new Date(year, month - 1, day, 12);
};

const calculateAllocatedFixedCosts = (
    startDate: string | null,
    endDate: string | null,
    settings: FixedCostSettings,
) => {
    if (!startDate || !endDate) return 0;
    const monthlyTotal = settings.monthly_fixed_costs.reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0
    );
    const businessDays = settings.business_days.length > 0
        ? settings.business_days
        : [1, 2, 3, 4, 5, 6, 0];
    const first = parseLocalDate(startDate);
    const last = parseLocalDate(endDate);
    if (Number.isNaN(first.getTime()) || Number.isNaN(last.getTime()) || first > last) return 0;

    const operatingDaysPerMonth = new Map<string, number>();
    const countMonthDays = (year: number, month: number) => {
        const key = `${year}-${month}`;
        const cached = operatingDaysPerMonth.get(key);
        if (cached !== undefined) return cached;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let count = 0;
        for (let day = 1; day <= daysInMonth; day += 1) {
            if (businessDays.includes(new Date(year, month, day, 12).getDay())) count += 1;
        }
        operatingDaysPerMonth.set(key, count);
        return count;
    };

    let allocated = 0;
    for (const cursor = new Date(first); cursor <= last; cursor.setDate(cursor.getDate() + 1)) {
        if (!businessDays.includes(cursor.getDay())) continue;
        const monthOperatingDays = countMonthDays(cursor.getFullYear(), cursor.getMonth());
        if (monthOperatingDays > 0) allocated += monthlyTotal / monthOperatingDays;
    }
    return allocated;
};

const calculateAnalytics = (
    orders: Order[],
    products: Product[],
    shifts: Shift[],
    fixedCostSettings: FixedCostSettings,
    requestedStartDate: string | null,
    requestedEndDate: string | null,
): AnalyticsData => {
    // 1. Basic Revenue
    const validOrders = orders.filter(o => !o.is_voided && (o.status === 'paid' || o.status === 'completed'));
    const voidedOrders = orders.filter(o => o.is_voided);

    const grossRevenue = validOrders.reduce(
        (sum, o) => sum + Number(o.subtotal || 0) + Number(o.service_fee || 0),
        0
    );
    const discount = validOrders.reduce((sum, o) => sum + Number(o.discount_amount || 0), 0);
    const refund = 0;
    const netRevenue = validOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    const totalTax = validOrders.reduce((sum, o) => sum + Number(o.tax_amount || 0), 0);
    const revenueExcludingTax = netRevenue - totalTax;
    const aov = validOrders.length > 0 ? netRevenue / validOrders.length : 0;

    // 2. Categories & Products
    const productMap = new Map(products.map(p => [p.id, p]));
    const categoryStats = new Map<string, { amount: number; count: number }>();
    const productStats = new Map<string, { count: number; amount: number; profit: number }>();
    let totalCogs = 0;

    validOrders.forEach(order => {
        if (!order.items) return;
        order.items.forEach(item => {
            const product = productMap.get(item.product_id);
            const category = product?.category || '未分類';

            // Category stat
            const cat = categoryStats.get(category) || { amount: 0, count: 0 };
            cat.amount += (item.price_snapshot || 0) * (item.quantity || 0);
            cat.count += (item.quantity || 0);
            categoryStats.set(category, cat);

            // Product stat
            const pStat = productStats.get(item.name_snapshot || '未知商品') || { count: 0, amount: 0, profit: 0 };
            const itemRevenue = (item.price_snapshot || 0) * (item.quantity || 0);
            const recipeUnitCost = (product?.materials || []).reduce(
                (sum, recipe) => sum + Number(recipe.quantity || 0) * Number(recipe.material?.unit_cost || 0),
                0
            );
            const optionUnitCost = (item.options || []).reduce((sum: number, selected: any) => {
                const configuredOption = (product?.attributes || [])
                    .flatMap(attribute => attribute.options || [])
                    .find(option => option.id === selected.option_id);
                return sum + (configuredOption?.materials || []).reduce(
                    (optionSum, recipe) => optionSum + Number(recipe.quantity || 0) * Number(recipe.material?.unit_cost || 0),
                    0
                );
            }, 0);
            const savedUnitCost = Number(item.cost_snapshot || 0);
            const unitCost = savedUnitCost > 0
                ? savedUnitCost
                : Number(product?.cost ?? recipeUnitCost) + optionUnitCost;
            const itemCost = unitCost * Number(item.quantity || 0);
            pStat.count += item.quantity;
            pStat.amount += itemRevenue;
            pStat.profit += (itemRevenue - itemCost);
            productStats.set(item.name_snapshot || '未知商品', pStat);

            totalCogs += itemCost;
        });
    });

    // 3. Hourly Analysis
    const hourlyMap = new Map<number, { amount: number; count: number }>();
    for (let i = 0; i < 24; i++) hourlyMap.set(i, { amount: 0, count: 0 });

    validOrders.forEach(o => {
        const hour = new Date(o.created_at).getHours();
        const stat = hourlyMap.get(hour)!;
        stat.amount += o.total_amount;
        stat.count += 1;
    });

    // 4. Payments
    const paymentMap = new Map<string, number>();
    validOrders.forEach(o => {
        const method = o.delivery_platform || o.payment_provider || o.payment_method || '未知';
        paymentMap.set(method, (paymentMap.get(method) || 0) + o.total_amount);
    });

    // 5. Cash Reconciliation (from shifts)
    const opening = shifts.reduce((sum, s) => sum + s.initial_cash, 0);
    const cashSales = shifts.reduce((sum, s) => sum + (s.cash_sales || 0), 0);
    const cashAdded = shifts.reduce((sum, s) => sum + (s.cash_added || 0), 0);
    const cashRemoved = shifts.reduce((sum, s) => sum + (s.cash_removed || 0), 0);
    const actual = shifts.reduce((sum, s) => sum + (s.final_cash || 0), 0);
    const expected = opening + cashSales + cashAdded - cashRemoved;
    const orderDates = validOrders.map((order) => order.created_at).sort();
    const fixedCosts = calculateAllocatedFixedCosts(
        requestedStartDate || orderDates[0] || null,
        requestedEndDate || orderDates[orderDates.length - 1] || null,
        fixedCostSettings,
    );
    const grossProfit = revenueExcludingTax - totalCogs;
    const netProfit = grossProfit - fixedCosts;

    return {
        revenue: {
            gross: grossRevenue,
            discount,
            refund,
            net: netRevenue,
            orderCount: validOrders.length,
            aov,
            tax: totalTax
        },
        categories: Array.from(categoryStats.entries()).map(([name, stat]) => ({
            name,
            amount: stat.amount,
            count: stat.count,
            percentage: netRevenue > 0 ? (stat.amount / netRevenue) * 100 : 0
        })).sort((a, b) => b.amount - a.amount),
        topProducts: Array.from(productStats.entries()).map(([name, stat]) => ({
            name,
            count: stat.count,
            amount: stat.amount,
            profit: stat.profit
        })).sort((a, b) => b.count - a.count || b.amount - a.amount).slice(0, 10),
        hourly: Array.from(hourlyMap.entries()).map(([hour, stat]) => ({
            hour: `${hour.toString().padStart(2, '0')}:00`,
            amount: stat.amount,
            count: stat.count
        })),
        profitability: {
            cogs: totalCogs,
            tax: totalTax,
            revenueExcludingTax,
            fixedCosts,
            grossProfit,
            netProfit,
            margin: revenueExcludingTax > 0 ? (grossProfit / revenueExcludingTax) * 100 : 0,
            netMargin: revenueExcludingTax > 0 ? (netProfit / revenueExcludingTax) * 100 : 0,
        },
        payments: Array.from(paymentMap.entries()).map(([method, amount]) => ({
            method,
            amount,
            percentage: netRevenue > 0 ? (amount / netRevenue) * 100 : 0
        })),
        exceptions: {
            voidCount: voidedOrders.length,
            voidAmount: voidedOrders.reduce((sum, o) => sum + o.total_amount, 0),
            voidReasons: []
        },
        cashRec: {
            opening,
            sales: cashSales,
            netChange: cashAdded - cashRemoved,
            expected,
            actual,
            shortage: actual - expected
        }
    };
};

// ==================================================================================
// UI Components
// ==================================================================================

const SectionTitle = ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div className="mb-4 border-l-4 border-black pl-3 mt-8 first:mt-0">
        <h3 className="text-lg font-bold uppercase tracking-tight">{title}</h3>
        {subtitle && <p className="text-[10px] text-gray-500 uppercase">{subtitle}</p>}
    </div>
);

const StatRow = ({ label, value, subValue, isBold, className }: { label: string; value: string; subValue?: string; isBold?: boolean; className?: string }) => (
    <div className={cn("flex justify-between py-1 border-b border-gray-100 last:border-0", className)}>
        <span className={cn("text-xs text-gray-600", isBold && "font-bold text-black")}>{label}</span>
        <div className="text-right">
            <span className={cn("text-sm font-mono", isBold && "font-bold underline decoration-double")}>{value}</span>
            {subValue && <span className="text-[10px] text-gray-400 block">{subValue}</span>}
        </div>
    </div>
);

const AccountantReportContent = ({
    data,
    dateRange,
    storeName
}: {
    data: AnalyticsData;
    dateRange: string;
    storeName: string
}) => {
    return (
        <div className="accountant-report-container print-content">
            <style jsx global>{`
                @media print {
                    @page {
                        size: A4;
                        margin: 10mm;
                    }
                    
                    /* Hide everything by default but be selective */
                    body {
                        background: white !important;
                    }

                    /* Hide known UI elements */
                    nav, header:not(.print-header), .no-print {
                        display: none !important;
                    }

                    /* Ensure print content is visible and takes full width */
                    .print-content {
                        display: block !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        visibility: visible !important;
                        background: transparent !important; /* 重要：改為透明，防止底色被遮擋 */
                    }

                    html, body {
                        width: 210mm !important;
                        height: auto !important;
                        overflow: visible !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                    }

                    .a4-preview {
                        width: 210mm !important; /* 強制寬度回歸 210mm */
                        max-width: 210mm !important;
                        padding: 10mm !important; /* 改為內容 padding 而非外部 margin */
                        box-sizing: border-box !important;
                        box-shadow: none !important;
                        margin: 0 !important;
                        transform: none !important; /* 移除 scale，改用精確寬度 */
                        background: transparent !important;
                    }

                    .report-section {
                        page-break-inside: avoid;
                        break-inside: avoid;
                        margin-bottom: 2rem !important;
                        width: 100% !important;
                    }

                    /* Avoid grid issues in some print engines */
                    .flex-row {
                        display: flex !important;
                        flex-direction: row !important;
                        width: 100% !important;
                    }
                }
                
                .accountant-report-container {
                    font-family: serif;
                    color: black;
                    background: white;
                }

                .report-section {
                    break-inside: avoid;
                    page-break-inside: avoid;
                    margin-bottom: 2rem;
                }

                .a4-preview {
                    width: 210mm;
                    min-height: 297mm;
                    padding: 20mm;
                    margin: 0 auto;
                    box-shadow: 0 0 10px rgba(0,0,0,0.1);
                    background: white;
                    display: block;
                }

                @media print {
                    .a4-preview {
                        width: 100% !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                        margin: 0 !important;
                        min-height: auto !important;
                        display: block !important;
                        visibility: visible !important;
                    }
                }
            `}</style>

            <div className="a4-preview">
                {/* Header (Section 1) */}
                <div className="text-center mb-8 border-b-4 border-double border-gray-800 pb-6 relative">
                    <div className="absolute left-0 top-0 text-left no-print">
                        <p className="text-[10px] font-sans font-bold text-gray-400">STORE</p>
                        <p className="text-lg font-bold">{storeName}</p>
                    </div>
                    <div className="print-header hidden print:block absolute left-0 top-0 text-left">
                        <p className="text-[10px] font-sans font-bold text-gray-400">STORE</p>
                        <p className="text-lg font-bold">{storeName}</p>
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 tracking-widest uppercase">經營損益報表</h2>
                    <p className="text-xs mt-2 italic font-sans text-gray-500">Comprehensive Business Performance Report</p>

                    <div className="flex justify-between items-end mt-8 text-[10px] font-sans">
                        <div className="text-left">
                            <p>報表期間: <span className="font-bold border-b border-black">{dateRange}</span></p>
                            <p>店鋪名稱: <span className="font-bold">{storeName}</span></p>
                            <p>幣別: <span className="font-bold">TWD (新台幣)</span></p>
                        </div>
                        <div className="text-right">
                            <p>產出時間: {new Date().toLocaleString('zh-TW', { hour12: false })}</p>
                            <p>資料版本: v{new Date().toISOString().slice(2, 10).replace(/-/g, '')}.REV1</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-row gap-8">
                    {/* Left Column: Key Stats */}
                    <div className="w-[35%] space-y-8">
                        {/* Revenue Summary (Section 2) */}
                        <div className="report-section">
                            <SectionTitle title="營收總覽" subtitle="Revenue Summary" />
                            <div className="bg-gray-50 p-4 border border-gray-200">
                                <StatRow label="總營業額 (Gross)" value={`$${data.revenue.gross.toLocaleString()}`} isBold />
                                <StatRow label="折扣金額 (Discount)" value={`-$${data.revenue.discount.toLocaleString()}`} />
                                <StatRow label="退款與作廢 (Refund/Void)" value={`-$${data.revenue.refund.toLocaleString()}`} />
                                <div className="my-2 border-t-2 border-gray-300"></div>
                                <StatRow label="淨營收 (Net Revenue)" value={`$${data.revenue.net.toLocaleString()}`} isBold className="bg-white p-1" />
                                <StatRow label="有效訂單數" value={`${data.revenue.orderCount.toLocaleString()} 筆`} />
                                <StatRow label="平均客單價 (AOV)" value={`$${Math.round(data.revenue.aov).toLocaleString()}`} />
                            </div>
                        </div>

                        {/* Profitability (Section 4) */}
                        <div className="report-section">
                            <SectionTitle title="成本與毛利" subtitle="Profitability Analysis" />
                            <div className="bg-gray-50 p-4 border border-gray-200">
                                <StatRow label="食材成本 (COGS)" value={`$${data.profitability.cogs.toLocaleString()}`} />
                                <StatRow label="營業稅額" value={`$${Math.round(data.profitability.tax).toLocaleString()}`} />
                                <StatRow label="未稅營收" value={`$${Math.round(data.profitability.revenueExcludingTax).toLocaleString()}`} />
                                <StatRow label="期間分攤固定成本" value={`$${Math.round(data.profitability.fixedCosts).toLocaleString()}`} />
                                <div className="my-2 border-t border-gray-300"></div>
                                <StatRow label="毛利 (Gross Profit)" value={`$${data.profitability.grossProfit.toLocaleString()}`} isBold />
                                <StatRow label="毛利率 (Margin %)" value={`${data.profitability.margin.toFixed(1)}%`} isBold className="text-blue-800" />
                                <div className="my-2 border-t-2 border-gray-300"></div>
                                <StatRow label="營業淨利 (Net Profit)" value={`$${Math.round(data.profitability.netProfit).toLocaleString()}`} isBold />
                                <StatRow label="淨利率 (Net Margin %)" value={`${data.profitability.netMargin.toFixed(1)}%`} isBold className="text-emerald-800" />
                            </div>
                        </div>

                        {/* Payment Breakdown (Section 5) */}
                        <div className="report-section">
                            <SectionTitle title="支付方式分析" subtitle="Payment Breakdown" />
                            <div className="space-y-1">
                                {data.payments.map(p => (
                                    <div key={p.method} className="flex items-center justify-between text-xs py-1 border-b border-gray-100">
                                        <span>{p.method === 'cash' ? '現金' : p.method === 'linepay' ? '多元支付' : p.method === 'platform_collect' ? '外送平台（未指定）' : p.method}</span>
                                        <div className="flex gap-4 font-mono">
                                            <span>{p.percentage.toFixed(1)}%</span>
                                            <span className="w-20 text-right">${p.amount.toLocaleString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Detailed Breakdown */}
                    <div className="w-[65%] space-y-8">
                        {/* Sales Breakdown (Section 3) */}
                        <div className="report-section">
                            <SectionTitle title="商品分類占比" subtitle="Sales Structure by Category" />
                            <div className="grid grid-cols-2 gap-4">
                                <table className="col-span-2 w-full text-xs">
                                    <thead className="border-b-2 border-black bg-gray-50">
                                        <tr>
                                            <th className="text-left py-2">分類名稱</th>
                                            <th className="text-right py-2">銷售數量</th>
                                            <th className="text-right py-2">銷售金額</th>
                                            <th className="text-right py-2">占比 %</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.categories.map(c => (
                                            <tr key={c.name} className="border-b border-gray-100">
                                                <td className="py-2 font-bold">{c.name}</td>
                                                <td className="py-2 text-right font-mono">{c.count.toLocaleString()}</td>
                                                <td className="py-2 text-right font-mono">${c.amount.toLocaleString()}</td>
                                                <td className="py-2 text-right font-mono">{c.percentage.toFixed(1)}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Top Products (Section 3.2) */}
                        <div className="report-section">
                            <SectionTitle title="商品銷售數量排行" subtitle="Product Quantity Leaderboard" />
                            <table className="w-full text-xs">
                                <thead className="border-b-2 border-black bg-gray-50">
                                    <tr>
                                        <th className="text-left py-2">排名</th>
                                        <th className="text-left py-2">商品名稱</th>
                                        <th className="text-right py-2">數量</th>
                                        <th className="text-right py-2">總金額</th>
                                        <th className="text-right py-2">預估毛利</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.topProducts.map((p, i) => (
                                        <tr key={p.name} className="border-b border-gray-100">
                                            <td className="py-2 text-gray-400 font-mono">#{(i + 1).toString().padStart(2, '0')}</td>
                                            <td className="py-2 font-bold">{p.name}</td>
                                            <td className="py-2 text-right font-mono">{p.count.toLocaleString()}</td>
                                            <td className="py-2 text-right font-mono">${p.amount.toLocaleString()}</td>
                                            <td className="py-2 text-right font-mono text-green-700">${p.profit.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Hourly Analysis & Trends (Section 5 / 9) */}
                <div className="report-section mt-12">
                    <SectionTitle title="時段營收趨勢" subtitle="Hourly Business Peak Analysis" />
                    <div className="flex items-end justify-between h-40 gap-1 border-b-2 border-black pb-1 bg-gray-50/50 p-6 rounded">
                        {data.hourly.map((h) => {
                            const maxVal = Math.max(...data.hourly.map(d => d.amount), 1);
                            const height = (h.amount / maxVal) * 100;
                            const isPeak = h.amount === maxVal && h.amount > 0;
                            return (
                                <div key={h.hour} className="flex flex-col items-center flex-1 h-full relative group">
                                    <div
                                        className={cn("w-full transition-all duration-300", isPeak ? "bg-black" : "bg-gray-300")}
                                        style={{ height: `${Math.max(height, 2)}%` }}
                                    ></div>
                                    <span className={cn("text-[9px] mt-2 font-mono", isPeak && "font-bold text-black")}>
                                        {h.hour.split(':')[0]}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-between text-[10px] mt-2 text-gray-400 font-sans italic">
                        <span>* 數據依 00:00 至 23:00 排序，顯示各時段加總營收</span>
                        <div className="flex gap-4">
                            <span className="flex items-center gap-1"><div className="w-2 h-2 bg-black"></div> 最高峰 (Peak)</span>
                            <span className="flex items-center gap-1"><div className="w-2 h-2 bg-gray-300"></div> 營業數據 (Revenue)</span>
                        </div>
                    </div>
                </div>

                {/* Bottom Section: Cash & Reconciliation (Section 10) */}
                <div className="report-section mt-12 bg-white text-black p-8 border-t-4 border-black">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        <div>
                            <h4 className="text-sm font-bold uppercase mb-4 border-b-2 border-black pb-2">現金帳目對帳表 (Reconciliation)</h4>
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span>1. 期初現金總額 (Opening)</span>
                                    <span className="font-mono">${data.cashRec.opening.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>2. 現金銷售總額 (Cash Sales)</span>
                                    <span className="font-mono">${data.cashRec.sales.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>3. 現金變動紀錄 (In/Out)</span>
                                    <span className="font-mono">{(data.cashRec.netChange >= 0 ? '+' : '')}${data.cashRec.netChange.toLocaleString()}</span>
                                </div>
                                <div className="border-t border-gray-200 my-2"></div>
                                <div className="flex justify-between font-bold text-sm">
                                    <span>理論結存 (Expected)</span>
                                    <span className="font-mono underline decoration-double">${data.cashRec.expected.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col justify-end">
                            <div className="text-right">
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-sans font-bold">實際清點總額 (Actual Counted)</p>
                                <p className="text-4xl font-bold font-mono mt-1 underline underline-offset-8">${data.cashRec.actual.toLocaleString()}</p>
                                <div className="mt-6 flex items-center justify-end gap-3 px-4 py-3 rounded border-2 border-black bg-gray-50">
                                    <span className="text-xs font-bold uppercase">短溢金額 (Shortage)</span>
                                    <div className="flex items-center gap-2">
                                        {data.cashRec.shortage > 0 ? <TrendingUp className="w-5 h-5 text-green-700" /> : data.cashRec.shortage < 0 ? <TrendingDown className="w-5 h-5 text-red-700" /> : <Minus className="w-5 h-5" />}
                                        <span className={cn("text-2xl font-bold font-mono", data.cashRec.shortage > 0 ? "text-green-700" : data.cashRec.shortage < 0 ? "text-red-700" : "")}>
                                            {(data.cashRec.shortage > 0 ? '+' : '')}{data.cashRec.shortage.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-12 text-[10px] text-gray-400 text-center uppercase tracking-[0.2em] border-t pt-4">
                    Powered by StallEasy POS Intelligence System • Professional Enterprise Report
                </div>
            </div>
        </div>
    );
};

// ==================================================================================
// Main Logic Component
// ==================================================================================

function ReportPrintContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Get params
    const storeId = searchParams.get('storeId');
    const storeName = searchParams.get('storeName') || '店鋪報表';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const shiftId = searchParams.get('shiftId');
    const shiftNumber = searchParams.get('shiftNumber');

    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!storeId) return;
            try {
                const sId = parseInt(storeId);

                // Fetch shifts, orders, and products in parallel
                const [allShifts, ordersResponse, products, storeSettings] = await Promise.all([
                    shiftApi.history(sId, 0, 1000, startDate || undefined, endDate || undefined),
                    orderApi.list(sId, {
                        start_date: startDate || undefined,
                        end_date: endDate || undefined,
                        shift_id: shiftId ? Number(shiftId) : undefined
                    }),
                    productApi.getAll(sId),
                    settingsApi.getStoreProfile(sId),
                ]);

                // Calculate analytics
                const shifts = shiftId
                    ? allShifts.filter(shift => shift.id === Number(shiftId))
                    : allShifts;
                const data = calculateAnalytics(
                    ordersResponse.data,
                    products,
                    shifts,
                    {
                        monthly_fixed_costs: storeSettings.monthly_fixed_costs || [],
                        business_days: storeSettings.business_days || [1, 2, 3, 4, 5, 6, 0],
                    },
                    startDate,
                    endDate,
                );
                setAnalytics(data);
            } catch (error) {
                console.error("Failed to fetch report data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [storeId, startDate, endDate, shiftId]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-white">
                <Loader2 className="w-10 h-10 animate-spin text-[#D4AF37] mb-4" />
                <p className="text-gray-500 font-medium">深度數據分析中...</p>
                <p className="text-xs text-gray-300 mt-2">正在彙集 訂單、成本、班次 與 支付統計</p>
            </div>
        );
    }

    if (!analytics || (analytics.revenue.orderCount === 0 && analytics.cashRec.opening === 0)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-white p-10 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                    <Minus className="text-gray-400 w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-2">此期間查無營業數據</h3>
                <p className="text-gray-500 mb-8 max-w-xs mx-auto text-sm">請確認您選擇的日期範圍是否有訂單成交或班次結算資料。</p>
                <div className="flex gap-4">
                    <Button variant="outline" onClick={() => router.back()} className="rounded-full px-8">
                        返回重新選擇
                    </Button>
                </div>
            </div>
        );
    }

    const dateRangeStr = shiftId
        ? `班次 ${shiftNumber || shiftId}｜${startDate || ''}${startDate !== endDate ? ` ~ ${endDate || ''}` : ''}`
        : startDate === endDate ? (startDate || '') : `${startDate} ~ ${endDate}`;

    return (
        <div className="report-print-page-wrapper">
            <style jsx global>{`
                @media print {
                    .no-print { display: none !important; }
                    body, html { 
                        margin: 0 !important; 
                        padding: 0 !important;
                        overflow: visible !important;
                        height: auto !important;
                    }
                }
            `}</style>

            {/* Top Toolbar (Hidden on Print) */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 px-8 py-4 flex items-center justify-between print:hidden no-print shadow-sm">
                <div className="flex items-center gap-6">
                    <Button variant="ghost" onClick={() => router.back()} className="text-slate-600 hover:text-slate-900 group">
                        <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
                        返回後台
                    </Button>
                    <div className="h-4 w-px bg-gray-300"></div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900">{shiftId ? '單次班次報表' : '進階經營報表'}</h1>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">{storeName} • {dateRangeStr || ''}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <Button variant="outline" onClick={handlePrint} className="border-gray-300 shadow-sm px-6">
                        <Printer className="w-4 h-4 mr-2" />
                        列印報表
                    </Button>
                    <Button onClick={handlePrint} className="bg-black hover:bg-gray-800 text-white shadow-xl px-8 border-none font-bold">
                        <Download className="w-4 h-4 mr-2" />
                        下載 PDF
                    </Button>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="min-h-screen bg-gray-100 print:bg-white print:min-h-0 pb-12 print:pb-0">
                <AccountantReportContent
                    data={analytics}
                    dateRange={dateRangeStr || ''}
                    storeName={storeName}
                />
            </main>
        </div>
    );
}

// 4. Page Component with Suspense
export default function AdvancedReportPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-screen bg-white">
                <Loader2 className="w-10 h-10 animate-spin text-[#D4AF37] mb-4" />
                <p className="text-gray-500">正在準備數據...</p>
            </div>
        }>
            <ReportPrintContent />
        </Suspense>
    );
}
