import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, PhoneCall, PhoneOff, CheckCircle, Clock } from 'lucide-react';
import moment from 'moment-timezone';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuthStore } from '../store/authStore';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableContainer } from '../components/ui/Table';

const EmployeeCallAnalytics = () => {
    const { employeeId } = useParams();
    const navigate = useNavigate();
    const token = useAuthStore(state => state.token) || localStorage.getItem('token');
    
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [dateRange, setDateRange] = useState('this_month');

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                setLoading(true);
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
                const res = await fetch(`${apiUrl}/call-analytics/employee/${employeeId}?dateRange=${dateRange}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const result = await res.json();
                
                if (result.success) {
                    setData(result.data);
                } else {
                    setError(result.message || 'Error loading analytics');
                }
            } catch (err: any) {
                setError(err.message || 'Network error');
            } finally {
                setLoading(false);
            }
        };

        if (employeeId) fetchAnalytics();
    }, [employeeId, dateRange, token]);

    if (loading) return <div className="p-8 text-[var(--color-text-muted)]">Loading call analytics...</div>;
    if (error) return <div className="p-8 text-red-500 font-semibold">{error}</div>;
    if (!data) return <div className="p-8 text-[var(--color-text-muted)]">No data found</div>;

    const { employee, summary, trend, history } = data;

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6">
            <div className="flex items-center gap-4 mb-4">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <ArrowLeft size={20} className="text-gray-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-[var(--color-primary)] uppercase">{employee.name}</h1>
                    <p className="text-[var(--color-text-muted)]">Employee Call Analytics</p>
                </div>
            </div>

            <div className="flex justify-between items-center bg-white p-4 rounded-xl border shadow-sm">
                <h2 className="font-semibold text-gray-700">Analytics Overview</h2>
                <select 
                    className="px-4 py-2 border rounded-lg text-sm bg-white outline-none focus:border-[var(--color-primary)]"
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
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
                <Card className="p-4 border-t-4 border-blue-500 shadow-sm text-center flex flex-col justify-center items-center">
                    <p className="text-xs font-bold text-[var(--color-text-muted)] mb-1 uppercase">Total Calls</p>
                    <p className="text-3xl font-black text-[var(--color-text-primary)]">{summary.totalCalls}</p>
                </Card>
                <Card className="p-4 border-t-4 border-green-500 shadow-sm text-center">
                    <p className="text-xs font-bold text-[var(--color-text-muted)] mb-1 uppercase">Connected ({summary.connectionRate}%)</p>
                    <p className="text-3xl font-black text-green-600">{summary.connectedCalls}</p>
                    <div className="mt-2 flex flex-wrap justify-center gap-2">
                         <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-semibold">Call Back: {summary.callBackCalls}</span>
                    </div>
                </Card>
                <Card className="p-4 border-t-4 border-red-500 shadow-sm text-center">
                    <p className="text-xs font-bold text-[var(--color-text-muted)] mb-1 uppercase">Not Connected</p>
                    <p className="text-3xl font-black text-red-600">{summary.notConnectedCalls}</p>
                    <div className="mt-2 flex flex-wrap justify-center gap-2">
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-semibold">No Ans: {summary.noAnswerCalls}</span>
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-semibold">Busy: {summary.busyCalls}</span>
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-semibold">Wrong #: {summary.wrongNumberCalls}</span>
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-semibold">Failed: {summary.failedCalls}</span>
                    </div>
                </Card>
                <Card className="p-4 border-t-4 border-purple-500 shadow-sm text-center">
                    <p className="text-xs font-bold text-[var(--color-text-muted)] mb-1 uppercase">Conversions</p>
                    <p className="text-3xl font-black text-purple-600">{summary.conversions}</p>
                    <p className="text-xs text-gray-500 font-semibold mt-1">Rate: {summary.conversionRate}%</p>
                </Card>
            </div>

            {/* Trend Chart */}
            <Card className="p-6">
                <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-6">Call Trend</h3>
                <div className="h-64 w-full">
                    {trend.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={trend}>
                                <XAxis dataKey="date" tickFormatter={(v: any) => moment(v).format('DD MMM')} axisLine={false} tickLine={false} tick={{fill:'var(--color-text-muted)', fontSize: 12}} />
                                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{fill:'var(--color-text-muted)', fontSize: 12}} />
                                <Tooltip cursor={{fill:'var(--color-surface-light)'}} labelFormatter={(v: any) => moment(v).format('DD MMM YYYY')} />
                                <Bar dataKey="calls" name="Calls" fill="var(--color-primary)" radius={[4,4,0,0]} barSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-[var(--color-text-muted)]">No call data available for this range.</div>
                    )}
                </div>
            </Card>

            {/* History Table */}
            <Card className="overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                    <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Call History</h3>
                </div>
                <TableContainer>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date & Time</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Result</TableHead>
                                <TableHead>Response</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {history.length > 0 ? history.map((record: any) => (
                                <TableRow key={record._id}>
                                    <TableCell>
                                        <div className="font-semibold">{moment(record.date).tz('Asia/Kolkata').format('DD/MM/YYYY')}</div>
                                        <div className="text-xs text-gray-500">{moment(record.date).tz('Asia/Kolkata').format('hh:mm A')}</div>
                                    </TableCell>
                                    <TableCell className="font-medium">{record.customerName}</TableCell>
                                    <TableCell className="font-mono text-sm">{record.phone}</TableCell>
                                    <TableCell>
                                        <Badge variant={record.callResult === 'Connected' ? 'success' : record.callResult === 'CALL_COMPLETED' ? 'success' : record.callResult === 'No Answer' ? 'warning' : record.callResult === 'Busy' ? 'warning' : record.callResult === 'Wrong Number' ? 'error' : record.callResult === 'Failed' ? 'error' : 'neutral'}>
                                            {record.callResult === 'CALL_COMPLETED' ? 'Completed / Unknown' : record.callResult}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-gray-600 max-w-[200px] truncate" title={record.response}>{record.response}</TableCell>
                                    <TableCell>
                                        <Badge variant={record.salesStatus === 'Converted' ? 'primary' : 'neutral'}>{record.salesStatus}</Badge>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-8 text-center text-gray-500">
                                        No recorded calls for this employee in the selected range.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>
        </div>
    );
};

export default EmployeeCallAnalytics;
