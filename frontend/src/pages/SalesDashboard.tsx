import React, { useState } from 'react';
import { useSalesDashboard, useSales, useCallQueue } from '../hooks/useSales';
import { useAuthStore } from '../store/authStore';
import { SalesMetrics } from '../components/sales/SalesMetrics';
import { SalesList } from '../components/sales/SalesList';
import { SalesCallQueue } from '../components/sales/SalesCallQueue';
import { SalesFollowUps } from '../components/sales/SalesFollowUps';
import { SalesActionModal } from '../components/sales/SalesActionModal';
import { SalesKanban } from '../components/sales/SalesKanban';
import SalesImport from './SalesImport';

const TABS = [
    { id: 'DASHBOARD', label: 'Dashboard' },
    { id: 'PIPELINE', label: 'Pipeline' },
    { id: 'LIST', label: 'List' },
    { id: 'CALL_QUEUE', label: 'Call Queue' },
    { id: 'FOLLOW_UPS', label: 'Follow-ups' },
    { id: 'ADD_SALES', label: '+ Add Sales' }
];

const SalesDashboard = () => {
    const { user } = useAuthStore();
    const [activeTab, setActiveTab] = useState('DASHBOARD');
    
    // Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'CALL' | 'UPDATE' | null>(null);
    const [selectedSale, setSelectedSale] = useState<any>(null);
    
    // Queries
    const { data: dashboard, isLoading: dashLoading } = useSalesDashboard();
    const { data: queue, isLoading: queueLoading } = useCallQueue();
    // For general list
    const { data: sales, isLoading: salesLoading } = useSales({ limit: 500 });
    // For follow-ups specifically
    const { data: followUpsData, isLoading: followUpsLoading } = useSales({ status: 'Follow-up', limit: 500 });

    const handleAction = (sale: any, mode: 'CALL' | 'UPDATE') => {
        setSelectedSale(sale);
        setModalMode(mode);
        setModalOpen(true);
    };

    if (dashLoading) return <div className="p-8 text-center text-gray-500">Loading Sales CRM...</div>;

    const renderTabContent = () => {
        switch (activeTab) {
            case 'DASHBOARD':
                return (
                    <div className="space-y-6">
                        <SalesMetrics dashboard={dashboard} />
                        {dashboard?.performance && dashboard.performance.length > 0 && (
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-6">
                                <div className="p-4 border-b border-gray-200 bg-gray-50">
                                    <h2 className="text-lg font-bold text-gray-900">Employee Performance</h2>
                                </div>
                                <div className="p-0 overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 text-gray-600">
                                            <tr>
                                                <th className="px-4 py-3 font-semibold">Employee</th>
                                                <th className="px-4 py-3 font-semibold">Total Assigned</th>
                                                <th className="px-4 py-3 font-semibold">Contacted</th>
                                                <th className="px-4 py-3 font-semibold">Interested</th>
                                                <th className="px-4 py-3 font-semibold">Converted</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {dashboard.performance.map((p: any) => (
                                                <tr key={p.employeeId} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 font-medium text-gray-900">{p.employeeName}</td>
                                                    <td className="px-4 py-3">{p.totalAssigned}</td>
                                                    <td className="px-4 py-3">{p.contacted}</td>
                                                    <td className="px-4 py-3">{p.interested}</td>
                                                    <td className="px-4 py-3 text-green-600 font-semibold">{p.converted}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                );
            case 'PIPELINE':
                return <SalesKanban sales={sales || []} onUpdate={(s) => handleAction(s, 'UPDATE')} onCall={(s) => handleAction(s, 'CALL')} />;
            case 'LIST':
                if (salesLoading) return <div className="p-8 text-center">Loading List...</div>;
                return <SalesList sales={sales || []} onUpdate={(s) => handleAction(s, 'UPDATE')} onCall={(s) => handleAction(s, 'CALL')} />;
            case 'CALL_QUEUE':
                if (queueLoading) return <div className="p-8 text-center">Loading Call Queue...</div>;
                return <SalesCallQueue queue={queue || []} onCall={(s) => handleAction(s, 'CALL')} />;
            case 'FOLLOW_UPS':
                if (followUpsLoading) return <div className="p-8 text-center">Loading Follow-ups...</div>;
                return <SalesFollowUps followUps={followUpsData || []} onUpdate={(s) => handleAction(s, 'UPDATE')} onCall={(s) => handleAction(s, 'CALL')} />;
            case 'ADD_SALES':
                return <SalesImport embedded={true} onSuccess={() => setActiveTab('LIST')} />;
            default:
                return null;
        }
    };

    return (
        <div className="p-4 md:p-6 max-w-[1600px] mx-auto pb-24 min-h-screen">
            <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Sales Management</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage pipeline, call queue, and follow-ups efficiently.</p>
                </div>
                
                {/* Horizontal scroll on mobile if tabs overflow, zero-scroll on desktop */}
                <div className="flex space-x-1 md:space-x-2 bg-gray-100 rounded-lg p-1 border border-gray-200 overflow-x-auto w-full xl:w-auto pb-1 xl:pb-1">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`whitespace-nowrap px-3 md:px-5 py-2 rounded-md text-sm font-semibold transition-all shadow-sm
                                ${activeTab === tab.id 
                                    ? 'bg-white text-indigo-700 border-b-2 border-indigo-500' 
                                    : 'text-gray-600 hover:bg-gray-200 border-b-2 border-transparent hover:text-gray-900'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="transition-all animate-in fade-in duration-300">
                {renderTabContent()}
            </div>

            <SalesActionModal 
                isOpen={modalOpen} 
                onClose={() => setModalOpen(false)} 
                sale={selectedSale} 
                mode={modalMode} 
            />
        </div>
    );
};

export default SalesDashboard;
