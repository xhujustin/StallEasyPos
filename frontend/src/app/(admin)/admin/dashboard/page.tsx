'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, ShoppingBag, TrendingUp, Loader2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/store/auth-store';
import { dashboardApi, DashboardStats } from '@/lib/api/dashboard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function AdminDashboard() {
    const { selectedStoreId: storeId } = useAuthStore();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [trendRange, setTrendRange] = useState<number>(7); // 7, 30, 180, 365
    const [topProductRange, setTopProductRange] = useState<number>(30);
    const [activeDay, setActiveDay] = useState<number | null>(null);

    const rangeOptions = [7, 30, 180, 365];
    const topProductRangeOptions = [
        { days: 1, label: '今日' },
        { days: 7, label: '近 7 天' },
        { days: 30, label: '近 30 天' },
        { days: 180, label: '半年' },
        { days: 365, label: '一年' },
    ];

    const handleRangeChange = (direction: 'prev' | 'next') => {
        const currentIndex = rangeOptions.indexOf(trendRange);
        if (direction === 'next' && currentIndex < rangeOptions.length - 1) {
            setTrendRange(rangeOptions[currentIndex + 1]);
        } else if (direction === 'prev' && currentIndex > 0) {
            setTrendRange(rangeOptions[currentIndex - 1]);
        }
    };

    const handleTopProductRangeChange = (direction: 'prev' | 'next') => {
        const currentIndex = topProductRangeOptions.findIndex((option) => option.days === topProductRange);
        const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

        if (nextIndex >= 0 && nextIndex < topProductRangeOptions.length) {
            setTopProductRange(topProductRangeOptions[nextIndex].days);
        }
    };

    useEffect(() => {
        const fetchStats = async () => {
            if (!storeId) return;
            setIsLoading(true);
            setError(null);
            try {
                const response = await dashboardApi.getStats(storeId, trendRange, topProductRange);
                setStats(response.data.data);
            } catch (err) {
                console.error("Failed to load dashboard stats:", err);
                setError("無法載入儀表板數據");
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
    }, [storeId, trendRange, topProductRange]);

    if (!storeId) {
        return <div className="p-8 text-center text-slate-500">請先選擇店鋪</div>;
    }

    if (isLoading) {
        return (
            <div className="flex h-96 items-center justify-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mr-2" />
                載入數據中...
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>錯誤</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        );
    }

    if (!stats) return null;

    const formatCurrency = (val: number) => new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0 }).format(val);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-900">儀表板</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">今日營收</CardTitle>
                        <DollarSign className="w-4 h-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{formatCurrency(stats.today_revenue || 0)}</div>
                        <p className={`text-xs flex items-center mt-1 ${stats.revenue_growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            <TrendingUp className={`w-3 h-3 mr-1 ${stats.revenue_growth < 0 ? 'rotate-180' : ''}`} />
                            {stats.revenue_growth >= 0 ? '+' : ''}{(stats.revenue_growth || 0).toFixed(0)}% 較昨日
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">今日訂單數</CardTitle>
                        <ShoppingBag className="w-4 h-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{stats.today_orders}</div>
                        <p className="text-xs text-slate-500 mt-1">
                            平均客單 {formatCurrency(stats.avg_order_value || 0)}
                        </p>
                    </CardContent>
                </Card>
            </div>



            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="h-[400px]">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>
                            營收趨勢
                            <span className="text-sm font-normal text-slate-500 ml-2">
                                ({new Date(new Date().setDate(new Date().getDate() - trendRange + 1)).toLocaleDateString()} - {new Date().toLocaleDateString()})
                            </span>
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" onClick={() => handleRangeChange('prev')} disabled={trendRange === 7}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="font-mono w-24 text-center font-bold">
                                {trendRange === 7 ? '近 7 天' :
                                    trendRange === 30 ? '近 30 天' :
                                        trendRange === 180 ? '近 6 個月' : '近 1 年'}
                            </span>
                            <Button variant="outline" size="icon" onClick={() => handleRangeChange('next')} disabled={trendRange === 365}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="h-[450px] flex items-end justify-between px-2 pb-2 pt-32 gap-1 overflow-x-auto relative">
                        {/* Dynamic Bar Chart */}
                        {(stats.recent_sales || []).map((day, index) => {
                            const maxRevenue = Math.max(...(stats.recent_sales || []).map(d => d.revenue), 1);
                            const heightPercent = (day.revenue / maxRevenue) * 100;
                            // Format date based on range
                            const dateObj = new Date(day.date);
                            let dateLabel = '';
                            if (trendRange > 30) {
                                // Monthly: 2023-10
                                dateLabel = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}`;
                            } else {
                                // Daily: 10/25
                                dateLabel = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
                            }

                            const isActive = activeDay === index;

                            return (
                                <div
                                    key={day.date}
                                    className="flex flex-col items-center flex-1 h-full justify-end group min-w-[30px] relative"
                                    onMouseEnter={() => setActiveDay(index)}
                                    onMouseLeave={() => setActiveDay(null)}
                                    onTouchStart={() => setActiveDay(index)}
                                    onTouchEnd={(e) => {
                                        e.preventDefault();
                                        setActiveDay(null);
                                    }}
                                    onTouchCancel={() => setActiveDay(null)}
                                >
                                    {/* Tooltip (Hover or Active) */}
                                    <div className={`absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-3 py-2 rounded shadow-lg z-50 pointer-events-none transition-opacity w-max
                                        ${isActive ? 'opacity-100' : 'opacity-0'}
                                    `}>
                                        <div className="font-bold border-b border-slate-600 pb-1 mb-1">{dateLabel}</div>
                                        <div>營收: {formatCurrency(day.revenue)}</div>
                                        <div className="text-green-400">淨利: {formatCurrency(day.net_profit)}</div>
                                        <div className="text-slate-300">訂單: {day.order_count} 筆</div>
                                        <div className="text-slate-400 text-[10px] mt-1">平均: {formatCurrency(day.order_count > 0 ? day.revenue / day.order_count : 0)}</div>
                                    </div>

                                    <div
                                        className={`w-full ${isActive ? 'bg-indigo-600 ring-2 ring-indigo-300' : (trendRange > 30 ? 'bg-indigo-500' : 'bg-blue-500')} rounded-t-sm transition-all relative min-h-[4px] cursor-pointer`}
                                        style={{ height: `${heightPercent}%` }}
                                    >
                                    </div>
                                    <span className={`text-[10px] ${isActive ? 'text-slate-900 font-bold' : 'text-slate-500'} mt-2 font-mono whitespace-nowrap transform -rotate-45 origin-top-left translate-y-2 select-none`}>
                                        {dateLabel}
                                    </span>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>

                <Card className="h-[400px] flex flex-col">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>熱門商品</CardTitle>
                        <div className="flex items-center gap-2" role="group" aria-label="熱門商品統計區間">
                            <Button
                                variant="outline"
                                size="icon"
                                aria-label="縮短熱門商品統計區間"
                                onClick={() => handleTopProductRangeChange('prev')}
                                disabled={topProductRange === topProductRangeOptions[0].days}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="font-mono w-24 text-center font-bold" aria-live="polite">
                                {topProductRangeOptions.find((option) => option.days === topProductRange)?.label}
                            </span>
                            <Button
                                variant="outline"
                                size="icon"
                                aria-label="延長熱門商品統計區間"
                                onClick={() => handleTopProductRangeChange('next')}
                                disabled={topProductRange === topProductRangeOptions[topProductRangeOptions.length - 1].days}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto">
                        <div className="space-y-4">
                            {(stats.top_products || []).length === 0 ? (
                                <div className="text-center text-slate-500 py-8">尚無銷售數據</div>
                            ) : (
                                (stats.top_products || []).map((product, idx) => (
                                    <div key={product.id} className="flex justify-between items-center group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded text-slate-400 font-bold text-xs">
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <div className="font-medium text-slate-900 line-clamp-1">{product.name}</div>
                                                <div className="text-xs text-slate-500">{formatCurrency(product.revenue)}</div>
                                            </div>
                                        </div>
                                        <div className="font-mono font-medium text-slate-700 bg-slate-50 px-2 py-1 rounded text-sm">
                                            {product.quantity} 份
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div >
    );
}
