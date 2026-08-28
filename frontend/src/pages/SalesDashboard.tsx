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
import SalesImport from './SalesImport';

const SalesDashboard = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState(user?.role === 'ADMIN' ? 'DASHBOARD' : 'MY_CONTACTS');
    
    const { data: dashboard, isLoading: dashLoading } = useSalesDashboard();
    const { data: queue, isLoading: queueLoading } = useCallQueue();
    const { data: sales, isLoading: salesLoading } = useSales({ limit: 100 });
    
    if (dashLoading) return <div className="p-6">Loading...</div>;

    const { kpis, performance } = dashboard || {};

    return (
        <div className="p-6 max-w-7xl mx-auto pb-24">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
                <div className="flex items-center gap-4 flex-wrap">
                    <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
                        {user?.role === 'ADMIN' ? 'Sales Management' : 'Sales Contacts'}
                    </h1>
                </div>
                <div className="flex space-x-2 bg-white rounded-lg p-1 border border-gray-200">
                    {(user?.role === 'ADMIN' ? ['DASHBOARD', 'PIPELINE', 'CALL_QUEUE'] : ['MY_CONTACTS', 'PASTE_CONTACTS']).map(tab => (
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

            {user?.role === 'ADMIN' && activeTab === 'DASHBOARD' && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
                        <Card className="p-4 border-l-4 border-l-indigo-500">
                            <p className="text-xs text-gray-500 font-medium">Total Contacts</p>
                            <p className="text-xl font-bold mt-1">{kpis?.totalSalesLeads || 0}</p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-gray-400">
                            <p className="text-xs text-gray-500 font-medium">Not Contacted</p>
                            <p className="text-xl font-bold mt-1">{kpis?.notContacted || 0}</p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-blue-500">
                            <p className="text-xs text-gray-500 font-medium">Contacted</p>
                            <p className="text-xl font-bold mt-1">{kpis?.contactedStudents || 0}</p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-orange-500">
                            <p className="text-xs text-gray-500 font-medium">Interested</p>
                            <p className="text-xl font-bold mt-1">{kpis?.interestedStudents || 0}</p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-red-500">
                            <p className="text-xs text-gray-500 font-medium">Follow-up Due</p>
                            <p className="text-xl font-bold mt-1 text-red-600">{kpis?.followUpsDue || 0}</p>
                        </Card>
                        <Card className="p-4 border-l-4 border-l-green-500">
                            <p className="text-xs text-gray-500 font-medium">Converted</p>
                            <p className="text-xl font-bold mt-1 text-green-600">{kpis?.convertedStudents || 0}</p>
                        </Card>
                    </div>

                    {performance && performance.length > 0 && (
                        <Card className="mb-8">
                            <div className="p-4 border-b border-gray-200">
                                <h2 className="text-lg font-bold">Employee Performance</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <div className="overflow-x-auto w-full"><table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-500 uppercase">
                                        <tr>
                                            <th className="px-4 py-3">Employee</th>
                                            <th className="px-4 py-3">Total Leads</th>
                                            <th className="px-4 py-3">Contacted</th>
                                            <th className="px-4 py-3">Interested</th>
                                            <th className="px-4 py-3">Follow-Up</th>
                                            <th className="px-4 py-3">Converted</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {performance.map((p: any) => (
                                            <tr key={p._id} className="border-b">
                                                <td className="px-4 py-3 font-semibold">{p.name}</td>
                                                <td className="px-4 py-3">{p.totalLeads}</td>
                                                <td className="px-4 py-3">{p.contacted}</td>
                                                <td className="px-4 py-3">{p.interested}</td>
                                                <td className="px-4 py-3 text-red-500 font-medium">{p.followUp}</td>
                                                <td className="px-4 py-3 text-green-600 font-bold">{p.conversions}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table></div>
                            </div>
                        </Card>
                    )}
                </>
            )}

            {user?.role === 'ADMIN' && activeTab === 'PIPELINE' && (
                <SalesKanban leads={sales?.leads || []} />
            )}

            {user?.role === 'ADMIN' && activeTab === 'CALL_QUEUE' && (
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
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-bold text-[var(--color-text-primary)]">{lead.studentName}</p>
                                            {lead.nextFollowUp && new Date(lead.nextFollowUp) < new Date() && (
                                                <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">OVERDUE</span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500">{lead.phone} • {lead.interestedDomain || lead.department || 'N/A'}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">Status: {lead.salesStatus}</p>
                                        <p className="text-[10px] text-gray-400 mt-1">Submitted by: {lead.importedBy?.name || 'Employee'} • {new Date(lead.importedAt || lead.createdAt).toLocaleDateString()}</p>
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
                            <div className="p-8 text-center text-gray-500">
                                <p className="font-bold">No employee sales contacts available.</p>
                                <p className="text-sm mt-1">Contacts pasted by employees will appear here dynamically.</p>
                            </div>
                        )}
                    </div>
                </Card>
            )}

            {user?.role !== 'ADMIN' && activeTab === 'MY_CONTACTS' && (
                <Card>
                    <div className="p-4 border-b border-gray-200">
                        <h2 className="text-lg font-bold">My Submitted Contacts</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <div className="overflow-x-auto w-full"><table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 uppercase">
                                <tr>
                                    <th className="px-4 py-3">Student</th>
                                    <th className="px-4 py-3">Phone</th>
                                    <th className="px-4 py-3">Domain</th>
                                    <th className="px-4 py-3">Submitted Date</th>
                                    <th className="px-4 py-3">Sales Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sales?.leads?.map((lead: any) => (
                                    <tr key={lead._id} className="border-b hover:bg-gray-50">
                                        <td className="px-4 py-3 font-semibold">{lead.studentName}</td>
                                        <td className="px-4 py-3">{lead.phone}</td>
                                        <td className="px-4 py-3">{lead.interestedDomain || lead.department || 'N/A'}</td>
                                        <td className="px-4 py-3">{new Date(lead.createdAt).toLocaleDateString()}</td>
                                        <td className="px-4 py-3">
                                            <Badge variant={lead.salesStatus === 'Converted' ? 'success' : lead.salesStatus === 'Not Contacted' ? 'neutral' : 'info'}>
                                                {lead.salesStatus}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                                {(!sales?.leads || sales.leads.length === 0) && (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No contacts submitted yet.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table></div>
                    </div>
                </Card>
            )}

            {user?.role !== 'ADMIN' && activeTab === 'PASTE_CONTACTS' && (
                <SalesImport />
            )}
        </div>
    );
};

export default SalesDashboard;
