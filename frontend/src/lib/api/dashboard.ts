import { apiClient, ResponseBase } from './client';

export interface DailyMetric {
    date: string;
    revenue: number;
    net_profit: number;
    gross_margin: number;
    order_count: number;
}

export interface TopProduct {
    id: number;
    name: string;
    quantity: number;
    revenue: number;
}

export interface DashboardStats {
    today_revenue: number;
    today_orders: number;
    avg_order_value: number;
    revenue_growth: number;
    recent_sales: DailyMetric[];
    top_products: TopProduct[];
}

export const dashboardApi = {
    getStats: (storeId: number, trendDays: number = 7) =>
        apiClient.get<ResponseBase<DashboardStats>>(`/dashboard/stats?store_id=${storeId}&trend_days=${trendDays}`),
};
