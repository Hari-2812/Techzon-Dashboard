import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import moment from 'moment-timezone';
import { Card, CardContent } from '../components/ui/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { ArrowLeft, Edit } from 'lucide-react';

const EmployeeAttendanceHistory = () => {
    const { employeeId } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [selectedMonth, setSelectedMonth] = useState(moment().format('YYYY-MM'));
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<any>(null);

    // Edit states
    const [editStatus, setEditStatus] = useState('PRESENT');
    const [editClockIn, setEditClockIn] = useState('');
    const [editClockOut, setEditClockOut] = useState('');

    const { data: historyData, isLoading } = useQuery({
        queryKey: ['employee-history', employeeId, selectedMonth],
        queryFn: async () => {
            const res = await api.get(`/attendance/admin/employee/${employeeId}/history?month=${selectedMonth}`);
            return res.data;
        },
        enabled: !!employeeId
    });

    const updateMutation = useMutation({
        mutationFn: async (payload: any) => {
            const res = await api.post('/attendance/admin/manual-correction', payload);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employee-history', employeeId, selectedMonth] });
            queryClient.invalidateQueries({ queryKey: ['admin-attendance'] });
            setEditModalOpen(false);
            alert('Attendance updated successfully.');
        },
        onError: (err: any) => {
            alert(err?.response?.data?.message || 'Error updating attendance');
        }
    });

    const handleEditClick = (record: any) => {
        setSelectedRecord(record);
        const mappedStatus = ['WORKING', 'COMPLETED'].includes(record.status) ? 'PRESENT' 
                           : ['PAID_LEAVE'].includes(record.status) ? 'LEAVE'
                           : record.status || 'PRESENT';
        setEditStatus(mappedStatus);
        
        if (record.session?.clockInAt) {
            setEditClockIn(moment(record.session.clockInAt).tz('Asia/Kolkata').format('HH:mm'));
        } else {
            setEditClockIn('');
        }
        
        if (record.session?.clockOutAt) {
            setEditClockOut(moment(record.session.clockOutAt).tz('Asia/Kolkata').format('HH:mm'));
        } else {
            setEditClockOut('');
        }
        
        setEditModalOpen(true);
    };

    const handleSave = () => {
        if (!selectedRecord) return;
        
        const payload = {
            employeeId,
            date: selectedRecord.date,
            status: editStatus,
            clockInTime: editClockIn || undefined,
            clockOutTime: editClockOut || undefined
        };
        
        updateMutation.mutate(payload);
    };

    if (isLoading) {
        return <div className="p-8 text-center text-gray-500">Loading attendance history...</div>;
    }

    const { employee, history } = historyData?.data || {};

    const isFullDay = (logoutStr: string) => {
        if (!logoutStr) return false;
        const logoutTime = moment(logoutStr).tz('Asia/Kolkata');
        const hour = logoutTime.hour();
        const min = logoutTime.minute();
        if ((hour === 19 && min >= 30) || (hour === 20 && min === 0)) {
            return true;
        }
        return false;
    };

    const formatTime = (timeStr: string) => {
        if (!timeStr) return '--';
        return moment(timeStr).tz('Asia/Kolkata').format('hh:mm A');
    };

    const renderStatus = (status: string, session?: any) => {
        if (['PRESENT', 'WORKING', 'COMPLETED', 'ON_BREAK'].includes(status)) {
            if (session?.clockOutAt && isFullDay(session.clockOutAt)) {
                return <Badge className="bg-green-100 text-green-800">Full Day</Badge>;
            }
            return <Badge className="bg-blue-100 text-blue-800">Present</Badge>;
        }
        if (status === 'ABSENT') return <Badge className="bg-red-100 text-red-800">Absent</Badge>;
        if (status === 'LEAVE') return <Badge className="bg-purple-100 text-purple-800">Leave</Badge>;
        if (status === 'LATE') return <Badge className="bg-yellow-100 text-yellow-800">Late</Badge>;
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    };

    // Calculate Summary Stats
    let presentCount = 0;
    let absentCount = 0;
    let leaveCount = 0;
    let lateCount = 0;
    let fullDayCount = 0;

    history?.forEach((h: any) => {
        const isFD = h.session?.clockOutAt && isFullDay(h.session.clockOutAt);
        if (['PRESENT', 'WORKING', 'COMPLETED', 'ON_BREAK'].includes(h.status)) {
            presentCount++;
            if (isFD) fullDayCount++;
        } else if (h.status === 'ABSENT') {
            absentCount++;
        } else if (h.status === 'LEAVE' || h.status === 'PAID_LEAVE') {
            leaveCount++;
        } else if (h.status === 'LATE') {
            lateCount++;
        }
    });

    const todayRecord = history?.find((h: any) => h.date === moment().tz('Asia/Kolkata').format('YYYY-MM-DD'));

    return (
        <div className="max-w-[1200px] mx-auto p-4 md:p-6 space-y-6 pb-24">
            <div className="flex items-center gap-2 mb-2">
                <Button variant="outline" size="sm" onClick={() => navigate('/attendance-management')} className="text-gray-500 hover:text-gray-900 border-none bg-transparent shadow-none p-0">
                    <ArrowLeft className="w-5 h-5 mr-1" />
                    Back to Attendance Management
                </Button>
            </div>

            {/* Top Summary */}
            <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-4 mb-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{employee?.name}</h1>
                            <p className="text-sm text-gray-500 mt-1">Attendance History</p>
                        </div>
                        {todayRecord && (
                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 flex items-center gap-4 text-sm">
                                <div>
                                    <span className="text-gray-500 block text-xs font-semibold">Today's Login</span>
                                    <span className="font-bold text-gray-900">{formatTime(todayRecord.session?.clockInAt)}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block text-xs font-semibold">Today's Logout</span>
                                    <span className="font-bold text-gray-900">{formatTime(todayRecord.session?.clockOutAt)}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block text-xs font-semibold">Status</span>
                                    {renderStatus(todayRecord.status, todayRecord.session)}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="bg-green-50 p-3 rounded-lg text-center">
                            <div className="text-xl font-bold text-green-700">{presentCount}</div>
                            <div className="text-xs font-semibold text-green-600 uppercase">Present Days</div>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-lg text-center border border-blue-100">
                            <div className="text-xl font-bold text-blue-700">{fullDayCount}</div>
                            <div className="text-xs font-semibold text-blue-600 uppercase">Full Days</div>
                        </div>
                        <div className="bg-red-50 p-3 rounded-lg text-center">
                            <div className="text-xl font-bold text-red-700">{absentCount}</div>
                            <div className="text-xs font-semibold text-red-600 uppercase">Absent Days</div>
                        </div>
                        <div className="bg-purple-50 p-3 rounded-lg text-center">
                            <div className="text-xl font-bold text-purple-700">{leaveCount}</div>
                            <div className="text-xs font-semibold text-purple-600 uppercase">Leave Days</div>
                        </div>
                        <div className="bg-yellow-50 p-3 rounded-lg text-center">
                            <div className="text-xl font-bold text-yellow-700">{lateCount}</div>
                            <div className="text-xs font-semibold text-yellow-600 uppercase">Late Days</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* History Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <h2 className="text-lg font-bold text-gray-900">Attendance Log</h2>
                    <input 
                        type="month" 
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50">
                                <TableHead className="py-3">Date</TableHead>
                                <TableHead className="py-3">Login Time</TableHead>
                                <TableHead className="py-3">Logout Time</TableHead>
                                <TableHead className="py-3">Status</TableHead>
                                <TableHead className="text-right py-3">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {history?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                        No attendance records found for this month.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                history?.map((record: any) => (
                                    <TableRow key={record._id} className="hover:bg-gray-50">
                                        <TableCell className="font-medium text-gray-900">
                                            {moment(record.date, 'YYYY-MM-DD').format('DD/MM/YYYY')}
                                        </TableCell>
                                        <TableCell className="font-mono text-sm text-gray-600">
                                            {formatTime(record.session?.clockInAt)}
                                        </TableCell>
                                        <TableCell className="font-mono text-sm text-gray-600">
                                            {formatTime(record.session?.clockOutAt)}
                                        </TableCell>
                                        <TableCell>
                                            {renderStatus(record.status, record.session)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                                                onClick={() => handleEditClick(record)}
                                            >
                                                <Edit className="w-3.5 h-3.5 mr-1.5" />
                                                Edit
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Edit Modal */}
            <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Attendance">
                <div className="space-y-4 pt-2">
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mb-4">
                        <div className="text-sm font-semibold text-gray-700">Date: {selectedRecord ? moment(selectedRecord.date).format('DD/MM/YYYY') : ''}</div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select 
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value)}
                        >
                            <option value="PRESENT">Present</option>
                            <option value="ABSENT">Absent</option>
                            <option value="LEAVE">Leave</option>
                            <option value="LATE">Late</option>
                        </select>
                    </div>

                    {['PRESENT', 'LATE'].includes(editStatus) && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Login Time</label>
                                <input 
                                    type="time" 
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                    value={editClockIn}
                                    onChange={(e) => setEditClockIn(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Logout Time</label>
                                <input 
                                    type="time" 
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                    value={editClockOut}
                                    onChange={(e) => setEditClockOut(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 mt-6">
                        <Button variant="outline" onClick={() => setEditModalOpen(false)}>Cancel</Button>
                        <Button 
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            onClick={handleSave}
                            disabled={updateMutation.isPending}
                        >
                            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default EmployeeAttendanceHistory;


