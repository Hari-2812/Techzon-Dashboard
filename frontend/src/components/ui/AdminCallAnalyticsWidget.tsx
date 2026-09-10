import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, CheckCircle, TrendingUp, ChevronRight, Calendar, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { Card } from './Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableContainer } from './Table';

// Helper to get initials
const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

export const AdminCallAnalyticsWidget = () => {
    const navigate = useNavigate();
    const token = useAuthStore(state => state.token) || localStorage.getItem('token');
    
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [dateRange, setDateRange] = useState('today');

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            setError(false);
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
            const res = await fetch(`${apiUrl}/call-analytics/dashboard?dateRange=${dateRange}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();
            if (result.success) {
                setData(result.data);
            } else {
                setError(true);
            }
        } catch (err) {
            console.error(err);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, [dateRange, token]);

    if (loading && !data) {
        return (
            <Card className="p-0 overflow-hidden border border-gray-200 shadow-sm mt-8 animate-pulse">
                <div className="px-6 py-6 border-b border-gray-100 flex items-center justify-between bg-white">
                    <div className="h-6 w-48 bg-gray-200 rounded"></div>
                    <div className="h-8 w-24 bg-gray-200 rounded"></div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 border-b bg-gray-50/50">
                    {[1,2,3,4].map(i => (
                        <div key={i} className="p-6">
                            <div className="h-3 w-20 bg-gray-200 rounded mb-4"></div>
                            <div className="h-8 w-16 bg-gray-200 rounded"></div>
                        </div>
                    ))}
                </div>
                <div className="p-8">
                    <div className="space-y-4">
                        {[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 rounded w-full"></div>)}
                    </div>
                </div>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="p-8 text-center border border-gray-200 shadow-sm mt-8 flex flex-col items-center justify-center bg-red-50">
                <AlertCircle className="text-red-500 mb-3" size={32} />
                <h3 className="text-red-800 font-semibold mb-1">Unable to load employee call analytics.</h3>
                <p className="text-sm text-red-600 mb-4">There was a problem fetching the data from the server.</p>
                <button onClick={fetchAnalytics} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">
                    Retry
                </button>
            </Card>
        );
    }

    if (!data) return null;

    const { summary, employees } = data;
    const globalConnectionRate = summary.totalCalls > 0 ? ((summary.connectedCalls / summary.totalCalls) * 100).toFixed(1) : '0.0';
    const globalConversionRate = summary.totalCalls > 0 ? ((summary.conversions / summary.totalCalls) * 100).toFixed(1) : '0.0';

    return (
        <Card className="p-0 overflow-hidden border border-gray-200 shadow-sm mt-8 bg-white">
            {/* HEADER */}
            <div className="px-6 py-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-bold text-gray-900 flex items-center">
                        <span className="bg-blue-100 p-1.5 rounded-md mr-3">
                            <Phone className="text-blue-600" size={18} />
                        </span>
                        Employee Call Analytics
                    </h2>
                    <p className="text-xs text-gray-500 mt-1 ml-10">Track employee calls, connections, follow-ups and conversions.</p>
                </div>
                
                <div className="relative min-w-[140px] ml-10 md:ml-0">
                    <select 
                        className="w-full appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg text-sm font-medium bg-gray-50 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors cursor-pointer"
                        value={dateRange}
                        onChange={e => setDateRange(e.target.value)}
                    >
                        <option value="today">Today</option>
                        <option value="yesterday">Yesterday</option>
                        <option value="this_week">This Week</option>
                        <option value="this_month">This Month</option>
                        <option value="last_month">Last Month</option>
                        <option value="all">All Time</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                        <ChevronRight className="rotate-90" size={14} />
                    </div>
                </div>
            </div>
            
            {/* SUMMARY CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-4 bg-gray-50/50 p-4 gap-4 border-b border-gray-100">
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center gap-2 mb-2 text-gray-500">
                        <Phone size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Total Calls</span>
                    </div>
                    <div>
                        <p className="text-3xl font-black text-gray-900">{summary.totalCalls}</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center gap-2 mb-2 text-green-600">
                        <CheckCircle size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Connected</span>
                    </div>
                    <div>
                        <p className="text-3xl font-black text-gray-900">{summary.connectedCalls}</p>
                        <p className="text-xs text-green-600 font-medium mt-1">{globalConnectionRate}% rate</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center gap-2 mb-2 text-orange-500">
                        <Calendar size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Follow-ups</span>
                    </div>
                    <div>
                        <p className="text-3xl font-black text-gray-900">{summary.followUps}</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center gap-2 mb-2 text-purple-600">
                        <TrendingUp size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Conversions</span>
                    </div>
                    <div>
                        <p className="text-3xl font-black text-gray-900">{summary.conversions}</p>
                        <p className="text-xs text-purple-600 font-medium mt-1">{globalConversionRate}% rate</p>
                    </div>
                </div>
            </div>

            {/* EMPLOYEE LIST */}
            {employees.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center text-center px-4">
                    <div className="bg-gray-50 p-4 rounded-full mb-4">
                        <Phone className="text-gray-400" size={32} />
                    </div>
                    <h3 className="text-gray-900 font-semibold mb-1">No employee call activity</h3>
                    <p className="text-sm text-gray-500 max-w-sm">No active employees or recorded call activity is available for this period.</p>
                </div>
            ) : (
                <>
                    {/* DESKTOP TABLE */}
                    <div className="hidden md:block">
                        <TableContainer className="border-none rounded-none">
                            <Table>
                                <TableHeader className="bg-white">
                                    <TableRow className="border-b border-gray-200">
                                        <TableHead className="py-4 font-semibold text-gray-600">Employee</TableHead>
                                        <TableHead className="py-4 text-center font-semibold text-gray-600">Calls</TableHead>
                                        <TableHead className="py-4 text-center font-semibold text-gray-600">Connected</TableHead>
                                        <TableHead className="py-4 text-center font-semibold text-gray-600">Not Connected</TableHead>
                                        <TableHead className="py-4 text-center font-semibold text-gray-600">Follow-ups</TableHead>
                                        <TableHead className="py-4 text-center font-semibold text-gray-600">Converted</TableHead>
                                        <TableHead className="py-4 font-semibold text-gray-600 min-w-[120px]">Rate</TableHead>
                                        <TableHead className="py-4 text-right font-semibold text-gray-600">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="divide-y divide-gray-100">
                                    {employees.map((emp: any) => {
                                        const notConnected = emp.totalCalls - emp.connectedCalls;
                                        const connectionRate = emp.totalCalls > 0 ? (emp.connectedCalls / emp.totalCalls) * 100 : 0;
                                        
                                        const notConnectedReasons = [];
                                        if (emp.noAnswerCalls > 0) notConnectedReasons.push(`No Answer: ${emp.noAnswerCalls}`);
                                        if (emp.busyCalls > 0) notConnectedReasons.push(`Busy: ${emp.busyCalls}`);
                                        if (emp.wrongNumberCalls > 0) notConnectedReasons.push(`Wrong Number: ${emp.wrongNumberCalls}`);
                                        if (emp.failedCalls > 0) notConnectedReasons.push(`Failed: ${emp.failedCalls}`);

                                        return (
                                            <TableRow 
                                                key={emp.employeeId} 
                                                className="cursor-pointer hover:bg-gray-50/80 transition-colors group" 
                                                onClick={() => navigate(`/admin/call-analytics/${emp.employeeId}`)}
                                            >
                                                <TableCell className="py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                                                            {getInitials(emp.name)}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-gray-900 text-sm">{emp.name}</p>
                                                            <p className="text-[11px] text-gray-500 font-medium">{emp.role}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-3 text-center">
                                                    <span className="inline-block px-2 py-1 bg-gray-100 text-gray-800 rounded font-semibold text-sm">
                                                        {emp.totalCalls}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="py-3 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="font-semibold text-green-600 text-sm">{emp.connectedCalls}</span>
                                                        {emp.callBackCalls > 0 && <span className="text-[10px] text-gray-500 mt-0.5">Call Back: {emp.callBackCalls}</span>}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-3 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="font-medium text-gray-600 text-sm">{notConnected}</span>
                                                        {notConnectedReasons.length > 0 && (
                                                            <span className="text-[10px] text-gray-400 mt-0.5 max-w-[120px] truncate" title={notConnectedReasons.join(' | ')}>
                                                                {notConnectedReasons[0]} {notConnectedReasons.length > 1 && '...'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-3 text-center">
                                                    <span className="font-medium text-orange-600 text-sm">{emp.followUps}</span>
                                                </TableCell>
                                                <TableCell className="py-3 text-center">
                                                    {emp.conversions > 0 ? (
                                                        <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-bold text-xs">
                                                            {emp.conversions}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400 text-sm">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                            <div 
                                                                className="h-full bg-blue-500 rounded-full"
                                                                style={{ width: `${Math.min(connectionRate, 100)}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs font-semibold text-gray-600 min-w-[36px] text-right">{connectionRate.toFixed(0)}%</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-3 text-right">
                                                    <button className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-blue-600 hover:border-blue-200 transition-colors opacity-0 group-hover:opacity-100">
                                                        View <ChevronRight size={14} />
                                                    </button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </div>

                    {/* MOBILE CARDS */}
                    <div className="md:hidden flex flex-col p-4 gap-3 bg-gray-50/30">
                        {employees.map((emp: any) => {
                            const connectionRate = emp.totalCalls > 0 ? (emp.connectedCalls / emp.totalCalls) * 100 : 0;
                            return (
                                <div 
                                    key={emp.employeeId} 
                                    className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm active:bg-gray-50 transition-colors"
                                    onClick={() => navigate(`/admin/call-analytics/${emp.employeeId}`)}
                                >
                                    <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shadow-sm">
                                                {getInitials(emp.name)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 text-sm leading-tight">{emp.name}</p>
                                                <p className="text-[11px] text-gray-500 font-medium">{emp.role}</p>
                                            </div>
                                        </div>
                                        <button className="p-1.5 bg-gray-50 text-gray-400 rounded-full">
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm mb-3">
                                        <div>
                                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Calls</p>
                                            <p className="font-bold text-gray-800">{emp.totalCalls}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Connected</p>
                                            <p className="font-bold text-green-600">{emp.connectedCalls}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Not Connected</p>
                                            <p className="font-semibold text-gray-600">{emp.totalCalls - emp.connectedCalls}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Follow-ups</p>
                                            <p className="font-semibold text-orange-600">{emp.followUps}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Converted</span>
                                            {emp.conversions > 0 ? (
                                                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-bold text-xs">{emp.conversions}</span>
                                            ) : (
                                                <span className="text-gray-400 font-medium text-xs">0</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Rate</span>
                                            <span className="font-bold text-gray-700 text-xs">{connectionRate.toFixed(0)}%</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </Card>
    );
};
