import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { Users, PhoneCall, CalendarClock, TrendingUp, CheckCircle2 } from 'lucide-react';

interface SalesMetricsProps {
    dashboard: any;
}

export const SalesMetrics = ({ dashboard }: SalesMetricsProps) => {
    if (!dashboard || !dashboard.kpis) return null;

    const { kpis } = dashboard;
    const total = kpis.totalSalesLeads || 0;
    const converted = kpis.convertedStudents || 0;
    const conversionRate = total > 0 ? ((converted / total) * 100).toFixed(1) : '0.0';

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <Card>
                <CardContent className="p-4 flex flex-col items-center text-center">
                    <Users className="w-8 h-8 text-blue-500 mb-2" />
                    <p className="text-sm font-medium text-gray-500">Total Sales</p>
                    <h3 className="text-2xl font-bold text-gray-900">{total}</h3>
                </CardContent>
            </Card>
            
            <Card>
                <CardContent className="p-4 flex flex-col items-center text-center">
                    <PhoneCall className="w-8 h-8 text-orange-500 mb-2" />
                    <p className="text-sm font-medium text-gray-500">New / Uncalled</p>
                    <h3 className="text-2xl font-bold text-gray-900">{kpis.notContacted || 0}</h3>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-4 flex flex-col items-center text-center">
                    <TrendingUp className="w-8 h-8 text-indigo-500 mb-2" />
                    <p className="text-sm font-medium text-gray-500">Contacted / Int.</p>
                    <h3 className="text-2xl font-bold text-gray-900">{(kpis.contactedStudents || 0) + (kpis.interestedStudents || 0)}</h3>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-4 flex flex-col items-center text-center relative overflow-hidden">
                    {kpis.followUpsDue > 0 && (
                        <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-bl font-bold">
                            Action Due
                        </div>
                    )}
                    <CalendarClock className={`w-8 h-8 mb-2 ${kpis.followUpsDue > 0 ? 'text-red-500' : 'text-purple-500'}`} />
                    <p className="text-sm font-medium text-gray-500">Follow-ups</p>
                    <h3 className="text-2xl font-bold text-gray-900">{kpis.followUpsDue || 0}</h3>
                </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50/50">
                <CardContent className="p-4 flex flex-col items-center text-center">
                    <CheckCircle2 className="w-8 h-8 text-green-600 mb-2" />
                    <p className="text-sm font-medium text-gray-600">Converted</p>
                    <h3 className="text-2xl font-bold text-green-700">{converted}</h3>
                </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50/50">
                <CardContent className="p-4 flex flex-col items-center text-center justify-center">
                    <div className="text-2xl font-black text-blue-600 mb-1 mt-1">{conversionRate}%</div>
                    <p className="text-sm font-medium text-gray-600 mt-1">Conversion Rate</p>
                </CardContent>
            </Card>
        </div>
    );
};
