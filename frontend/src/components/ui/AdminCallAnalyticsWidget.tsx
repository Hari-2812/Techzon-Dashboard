import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Users, CheckCircle, TrendingUp, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { Card, CardContent } from './Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableContainer } from './Table';

export const AdminCallAnalyticsWidget = () => {
    const navigate = useNavigate();
    const token = useAuthStore(state => state.token) || localStorage.getItem('token');
    
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('today');

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                setLoading(true);
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
                const res = await fetch(`${apiUrl}/call-analytics/dashboard?dateRange=${dateRange}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const result = await res.json();
                if (result.success) setData(result.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, [dateRange, token]);

    if (loading) return <div className="p-4 text-center text-[var(--color-text-muted)] border rounded-xl">Loading Call Analytics...</div>;
    if (!data) return null;

    const { summary, employees } = data;

    return (
        <Card className="p-0 overflow-hidden border border-gray-200 shadow-sm mt-8">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white flex-wrap gap-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center uppercase tracking-wider">
                    <Phone className="mr-2 text-blue-600" size={20} /> Employee Call Analytics
                </h2>
                <select 
                    className="px-3 py-1 border rounded-md text-sm bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={dateRange}
                    onChange={e => setDateRange(e.target.value)}
                >
                    <option value="today">Today</option>
                    <option value="this_week">This Week</option>
                    <option value="this_month">This Month</option>
                    <option value="last_month">Last Month</option>
                </select>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 border-b bg-gray-50/50">
                <div className="p-4 text-center">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Total Calls</p>
                    <p className="text-2xl font-black text-blue-600">{summary.totalCalls}</p>
                </div>
                <div className="p-4 text-center">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Connected</p>
                    <p className="text-2xl font-black text-green-600">{summary.connectedCalls}</p>
                </div>
                <div className="p-4 text-center">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Follow-ups</p>
                    <p className="text-2xl font-black text-orange-600">{summary.followUps}</p>
                </div>
                <div className="p-4 text-center">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Conversions</p>
                    <p className="text-2xl font-black text-purple-600">{summary.conversions}</p>
                </div>
            </div>

            <TableContainer>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Employee</TableHead>
                            <TableHead className="text-center">Calls</TableHead>
                            <TableHead className="text-center">Connected</TableHead>
                            <TableHead className="text-center">Not Connected</TableHead>
                            <TableHead className="text-center">Follow-ups</TableHead>
                            <TableHead className="text-center">Converted</TableHead>
                            <TableHead className="text-center">Rate</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {employees.map((emp: any) => (
                            <TableRow key={emp.employeeId} className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => navigate(`/admin/call-analytics/${emp.employeeId}`)}>
                                <TableCell>
                                    <p className="font-semibold text-[var(--color-primary)] truncate">{emp.name}</p>
                                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">{emp.role}</p>
                                </TableCell>
                                <TableCell className="text-center font-semibold">{emp.totalCalls}</TableCell>
                                <TableCell className="text-center font-medium text-green-700">
                                    {emp.connectedCalls} <span className="text-[10px] text-gray-400 block font-normal">CB: {emp.callBackCalls || 0}</span>
                                </TableCell>
                                <TableCell className="text-center font-medium text-red-500">
                                    {(emp.totalCalls - emp.connectedCalls)}
                                    <span className="text-[10px] text-gray-400 block font-normal text-nowrap">NA: {emp.noAnswerCalls || 0} | B: {emp.busyCalls || 0}</span>
                                </TableCell>
                                <TableCell className="text-center text-orange-600">{emp.followUps}</TableCell>
                                <TableCell className="text-center font-bold text-purple-600">{emp.conversions}</TableCell>
                                <TableCell className="text-center text-gray-600">{emp.conversionRate}%</TableCell>
                                <TableCell className="text-right">
                                    <button className="p-1 hover:bg-gray-200 rounded-full transition-colors text-gray-400 hover:text-[var(--color-primary)]">
                                        <ChevronRight size={18} />
                                    </button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {employees.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-6 text-gray-500">No active employees found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Card>
    );
};
