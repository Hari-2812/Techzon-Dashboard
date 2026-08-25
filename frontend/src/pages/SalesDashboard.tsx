import React, { useState } from 'react';
import { useSalesDashboard, useSales, useCallQueue, useBulkUpdateSales } from '../hooks/useSales';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { Wallet, Phone, MessageCircle, BarChart3, Users, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { openWhatsApp } from '../utils/whatsapp';
import { SalesKanban } from '../components/sales/SalesKanban';

const SalesDashboard = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('DASHBOARD');
    
    const { data: dashboard, isLoading: dashLoading } = useSalesDashboard();
    const { data: queue, isLoading: queueLoading } = useCallQueue();
    const { data: sales, isLoading: salesLoading } = useSales({ limit: 100 });
    
    if (dashLoading) return <div className="p-6">Loading...</div>;

    const { kpis, performance } = dashboard || {};

    return (
        <div className="p-6 max-w-7xl mx-auto pb-24">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Sales Management</h1>
                <div className="flex space-x-2 bg-white rounded-lg p-1 border border-gray-200">
                    {['DASHBOARD', 'PIPELINE', 'CALL_QUEUE'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${activeTab === tab ? 'bg-[var(--color-primary-container)] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            {tab.replace('_', ' ')}
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === 'DASHBOARD' && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <Card className="p-4 border-l-4 border-l-indigo-500">
                            <p className="text-sm text-gray-500 font-medium">Total Sales Leads</p>
                            <p className="text-2xl font-bold mt-1">{kpis?.totalSalesLeads || 0}</p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-green-500">
                            <p className="text-sm text-gray-500 font-medium">New Responses Today</p>
                            <p className="text-2xl font-bold mt-1">{kpis?.newResponsesToday || 0}</p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-orange-500">
                            <p className="text-sm text-gray-500 font-medium">Calls Pending</p>
                            <p className="text-2xl font-bold mt-1">{kpis?.callsPending || 0}</p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-purple-500">
                            <p className="text-sm text-gray-500 font-medium">Converted</p>
                            <p className="text-2xl font-bold mt-1">{kpis?.convertedStudents || 0}</p>
                        </Card>
                    </div>

                    {user?.role === 'ADMIN' && performance && performance.length > 0 && (
                        <Card className="mb-8">
                            <div className="p-4 border-b border-gray-200">
                                <h2 className="text-lg font-bold">Employee Performance</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-500 uppercase">
                                        <tr>
                                            <th className="px-4 py-3">Employee</th>
                                            <th className="px-4 py-3">Total Leads</th>
                                            <th className="px-4 py-3">Conversions</th>
                                            <th className="px-4 py-3">Conv %</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {performance.map((p: any) => (
                                            <tr key={p._id} className="border-b">
                                                <td className="px-4 py-3 font-semibold">{p.name}</td>
                                                <td className="px-4 py-3">{p.totalLeads}</td>
                                                <td className="px-4 py-3">{p.conversions}</td>
                                                <td className="px-4 py-3">
                                                    {p.totalLeads > 0 ? ((p.conversions / p.totalLeads) * 100).toFixed(1) : 0}%
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}
                </>
            )}

            {activeTab === 'PIPELINE' && (
                <SalesKanban leads={sales?.leads || []} />
            )}

            {activeTab === 'CALL_QUEUE' && (
                <Card>
                    <div className="p-4 border-b border-gray-200 bg-orange-50">
                        <h2 className="text-lg font-bold text-orange-800 flex items-center"><Phone className="mr-2" /> Today's Call Queue</h2>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {queue?.map((lead: any, idx: number) => (
                            <div key={lead._id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                                <div className="flex items-center space-x-4">
                                    <div className="text-gray-400 font-bold text-lg w-6">#{idx + 1}</div>
                                    <div>
                                        <p className="font-bold text-[var(--color-text-primary)]">{lead.studentName}</p>
                                        <p className="text-sm text-gray-500">{lead.phone} • {lead.interestedDomain || lead.department || 'N/A'}</p>
                                    </div>
                                    <Badge variant={lead.priority === 'HIGH' ? 'error' : lead.priority === 'MEDIUM' ? 'warning' : 'neutral'}>
                                        {lead.priority}
                                    </Badge>
                                </div>
                                <div className="flex space-x-2">
                                    <a href={`tel:${lead.phone}`} className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200" title="Call">
                                        <Phone size={18} />
                                    </a>
                                    <button onClick={() => openWhatsApp(lead.phone)} className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200" title="WhatsApp">
                                        <MessageCircle size={18} />
                                    </button>
                                    <Button size="sm" onClick={() => navigate(`/sales/${lead._id}`)}>Action</Button>
                                </div>
                            </div>
                        ))}
                        {(!queue || queue.length === 0) && (
                            <div className="p-4 text-center text-gray-500">No calls pending in the queue.</div>
                        )}
                    </div>
                </Card>
            )}
        </div>
    );
};

export default SalesDashboard;
