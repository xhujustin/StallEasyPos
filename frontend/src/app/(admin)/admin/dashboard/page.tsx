import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, ShoppingBag, Users as UsersIcon, TrendingUp } from 'lucide-react';

export default function AdminDashboard() {
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
                        <div className="text-2xl font-bold text-slate-900">$12,450</div>
                        <p className="text-xs text-green-600 flex items-center mt-1">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            +15% 較昨日
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">訂單數</CardTitle>
                        <ShoppingBag className="w-4 h-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">85</div>
                        <p className="text-xs text-slate-500 mt-1">
                            平均客單 $146
                        </p>
                    </CardContent>
                </Card>

                {/* Add more cards as needed */}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="h-[400px]">
                    <CardHeader>
                        <CardTitle>營收趨勢</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center text-slate-300">
                        Chart Placeholder
                    </CardContent>
                </Card>

                <Card className="h-[400px]">
                    <CardHeader>
                        <CardTitle>熱門商品</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-100 rounded"></div>
                                    <div className="font-medium">招牌滷肉飯</div>
                                </div>
                                <div className="font-mono">450 份</div>
                            </div>
                            {/* More items */}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
