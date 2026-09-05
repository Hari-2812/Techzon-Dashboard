import { useQuery } from '@tanstack/react-query';
import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import socket from '../services/socket';
import { Users, Clock, AlertCircle, CalendarX2, Search, Filter, X, Calendar, ChevronRight, ChevronLeft, Play, Square, Coffee, Plus, Mail, UserCheck } from 'lucide-react';
import moment from 'moment-timezone';
import { useAuthStore } from '../store/authStore';
import { useEmployees } from '../hooks/useEmployees';
import { Card, CardContent } from '../components/ui/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableContainer } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Drawer } from '../components/ui/Drawer';
import { Modal } from '../components/ui/Modal';

const COLORS = ['#15803D', '#F57C20', '#DC2626', '#31206B']; // Present, Break, Absent, Leave

const LiveTimer = ({ startTime, breaks }: { startTime: string, breaks: any[] }) => {
  const [timer, setTimer] = useState('00h 00m');

  useEffect(() => {
    const interval = setInterval(() => {
      const start = new Date(startTime).getTime();
      const now = new Date().getTime();
      
      let totalBreakMs = 0;
      if (breaks) {
        breaks.forEach((b: any) => {
          if (b.endAt) {
            totalBreakMs += new Date(b.endAt).getTime() - new Date(b.startAt).getTime();
          } else {
             totalBreakMs += now - new Date(b.startAt).getTime();
          }
        });
      }
      
      const diff = Math.floor((now - start - totalBreakMs) / 1000);
      const hours = Math.floor(diff / 3600);
      const mins = Math.floor((diff % 3600) / 60);
      setTimer(`${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m`);
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime, breaks]);

  return <span className="font-mono tracking-tight font-semibold">{timer}</span>;
};

const AttendanceManagement = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [requestAction, setRequestAction] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [editedTime, setEditedTime] = useState('');
  const [adminComment, setAdminComment] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  
  const [forceClockOutModalOpen, setForceClockOutModalOpen] = useState(false);
  const [editAttendanceModalOpen, setEditAttendanceModalOpen] = useState(false);
  const [editClockInTime, setEditClockInTime] = useState('');
  const [editClockOutTime, setEditClockOutTime] = useState('');
  const [editBreakDuration, setEditBreakDuration] = useState('');
  const [editAttendanceReason, setEditAttendanceReason] = useState('');

  const [manualCorrectionModalOpen, setManualCorrectionModalOpen] = useState(false);
  const [manualEmployeeId, setManualEmployeeId] = useState('');
  const [manualDate, setManualDate] = useState(moment().format('YYYY-MM-DD'));
  const [manualStatus, setManualStatus] = useState('PRESENT');
  const [manualClockIn, setManualClockIn] = useState('');
  const [manualClockOut, setManualClockOut] = useState('');
  const [manualStartTime, setManualStartTime] = useState('');
  const [manualEndTime, setManualEndTime] = useState('');
  const [manualReason, setManualReason] = useState('');
  const [manualAdminRemarks, setManualAdminRemarks] = useState('');

  const [activeTab, setActiveTab] = useState<'LOGS' | 'LEAVE_PERMISSION'>('LOGS');
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [selectedLeaveRequest, setSelectedLeaveRequest] = useState<any>(null);
  const [leaveRequestAction, setLeaveRequestAction] = useState<'APPROVE'|'REJECT'|null>(null);
  const [leaveRejectReason, setLeaveRejectReason] = useState('');

  const { allEmployees } = useEmployees();
  const [adminCreateLeaveModalOpen, setAdminCreateLeaveModalOpen] = useState(false);
  const [adminLeaveEmployeeId, setAdminLeaveEmployeeId] = useState('');
  const [adminLeaveType, setAdminLeaveType] = useState('LEAVE');
  const [adminLeaveDate, setAdminLeaveDate] = useState(moment().format('YYYY-MM-DD'));
  const [adminLeaveStartTime, setAdminLeaveStartTime] = useState('');
  const [adminLeaveEndTime, setAdminLeaveEndTime] = useState('');
  const [adminLeaveReason, setAdminLeaveReason] = useState('');

  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [selectedEmployeesForReminder, setSelectedEmployeesForReminder] = useState<string[]>([]);
  const [reminderReason, setReminderReason] = useState('Late Login');
  const [reminderCustomReason, setReminderCustomReason] = useState('');
  const [reminderMessage, setReminderMessage] = useState('');

  // Admin Drawer State
  const [adminDrawerTab, setAdminDrawerTab] = useState<'DAILY' | 'MONTHLY'>('DAILY');
  const [adminDrawerMonth, setAdminDrawerMonth] = useState(moment().startOf('month'));
  const [adminDrawerMonthlyData, setAdminDrawerMonthlyData] = useState<any>(null);
  const [loadingDrawerMonthly, setLoadingDrawerMonthly] = useState(false);
  const [adminDrawerMonthlyError, setAdminDrawerMonthlyError] = useState(false);

  const fetchDrawerMonthlyData = async (employeeId: string, cursor: moment.Moment) => {
      setLoadingDrawerMonthly(true);
      setAdminDrawerMonthlyError(false);
      try {
          const m = cursor.format('MM');
          const y = cursor.format('YYYY');
          const token = (useAuthStore.getState().token || localStorage.getItem('token')) || '';
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
          const res = await fetch(`${apiUrl}/attendance-management/employees/${employeeId}?month=${m}&year=${y}`, {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!res.ok) {
              setAdminDrawerMonthlyError(true);
          } else {
              const result = await res.json();
              if (result.success) {
                  setAdminDrawerMonthlyData(result.data);
              } else {
                  setAdminDrawerMonthlyError(true);
              }
          }
      } catch (err) {
          console.error("Failed to load admin drawer monthly data", err);
          setAdminDrawerMonthlyError(true);
      }
      setLoadingDrawerMonthly(false);
  };

  useEffect(() => {
      if (selectedEmployee && adminDrawerTab === 'MONTHLY') {
          fetchDrawerMonthlyData(selectedEmployee.employeeId._id || selectedEmployee.employeeId, adminDrawerMonth);
      }
  }, [selectedEmployee, adminDrawerTab, adminDrawerMonth]);

  const handleDrawerPrevMonth = () => setAdminDrawerMonth(prev => prev.clone().subtract(1, 'month'));
  const handleDrawerNextMonth = () => setAdminDrawerMonth(prev => prev.clone().add(1, 'month'));

  const { data: notLoggedInEmployees, refetch: fetchNotLoggedIn, isError: notLoggedInError } = useQuery({
      queryKey: ['notLoggedInEmployees'],
      queryFn: async () => {
          const token = (useAuthStore.getState().token || localStorage.getItem('token')) || '';
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
          const res = await fetch(`${apiUrl}/attendance/not-logged-in`, {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          return data.data || [];
      }
  });

  const handleSendReminder = async () => {
      try {
          if (selectedEmployeesForReminder.length === 0) return alert('Select employees to remind.');
          const finalReason = reminderReason === 'Other' ? reminderCustomReason : reminderReason;
          if (!finalReason) return alert('Reason is required.');
          
          if (!window.confirm(`You are about to send an attendance reminder to ${selectedEmployeesForReminder.length} employee(s). Continue?`)) return;

          const token = (useAuthStore.getState().token || localStorage.getItem('token')) || '';
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
          
          const res = await fetch(`${apiUrl}/attendance/send-reminders-bulk`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  employeeIds: selectedEmployeesForReminder,
                  reason: finalReason,
                  message: reminderMessage
              })
          });
          const data = await res.json();
          if (res.ok && data.success) {
              alert(`Attendance reminder sent successfully. ${data.message || ''}`);
              setReminderModalOpen(false);
              setSelectedEmployeesForReminder([]);
              setReminderMessage('');
              setReminderReason('Late Login');
              setReminderCustomReason('');
          } else {
              alert(`Unable to send reminder. ${data.message || 'Please try again.'}`);
          }
      } catch (err) {
          alert('Unable to send the attendance reminder. Please check your network connection.');
      }
  };

  const openReminderModalSingle = (empId: string) => {
      setSelectedEmployeesForReminder([empId]);
      setReminderModalOpen(true);
  };

  const openReminderModalBulk = () => {
      if (!notLoggedInEmployees || notLoggedInEmployees.length === 0) return alert('No employees available to remind.');
      setSelectedEmployeesForReminder(notLoggedInEmployees.map((e: any) => e._id));
      setReminderModalOpen(true);
  };


  const handleAdminCreateLeave = async () => {
    try {
      if (!adminLeaveEmployeeId || !adminLeaveDate || !adminLeaveReason) {
         return alert('Employee, Date, and Reason are required.');
      }
      if (adminLeaveType === 'PERMISSION' && (!adminLeaveStartTime || !adminLeaveEndTime)) {
         return alert('Start Time and End Time are required for permissions.');
      }
      
      const token = (useAuthStore.getState().token || localStorage.getItem('token')) || '';
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
      
      const payload = {
         employeeId: adminLeaveEmployeeId,
         requestType: adminLeaveType,
         date: adminLeaveDate,
         startTime: adminLeaveType === 'PERMISSION' ? adminLeaveStartTime : undefined,
         endTime: adminLeaveType === 'PERMISSION' ? adminLeaveEndTime : undefined,
         reason: adminLeaveReason
      };

      const res = await fetch(`${apiUrl}/attendance/leave-permission/admin`, {
         method: 'POST',
         headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
         body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (data.success) {
         setAdminCreateLeaveModalOpen(false);
         setAdminLeaveEmployeeId('');
         setAdminLeaveReason('');
         setAdminLeaveStartTime('');
         setAdminLeaveEndTime('');
         fetchAdminAttendance();
      } else {
         alert(data.message || 'Error processing request');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to create leave.');
    }
  };


  const handleLeaveAction = async () => {
    try {
      const token = (useAuthStore.getState().token || localStorage.getItem('token')) || '';
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
      const endpoint = leaveRequestAction === 'APPROVE' ? 'approve' : 'reject';
      
      if (leaveRequestAction === 'REJECT' && !leaveRejectReason) {
         return alert('Rejection reason is required.');
      }

      const res = await fetch(`${apiUrl}/attendance/leave-permission/${selectedLeaveRequest._id}/${endpoint}`, {
         method: 'PUT',
         headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
         body: JSON.stringify({ reason: leaveRejectReason })
      });
      const data = await res.json();
      if (data.success) {
         setSelectedLeaveRequest(null);
         setLeaveRequestAction(null);
         setLeaveRejectReason('');
         fetchAdminAttendance();
      } else {
         alert(data.message || 'Error processing request');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to process leave request.');
    }
  };


  const [adminSelectedDate, setAdminSelectedDate] = useState(moment().tz('Asia/Kolkata').format('YYYY-MM-DD'));

  const fetchAdminAttendance = async () => {
    try {
      const token = (useAuthStore.getState().token || localStorage.getItem('token')) || '';
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
      
      const [res, reqRes, leaveRes] = await Promise.all([
         fetch(`${apiUrl}/attendance-management/today?date=${adminSelectedDate}`, { headers: { 'Authorization': `Bearer ${token}` } }),
         fetch(`${apiUrl}/attendance/requests/pending`, { headers: { 'Authorization': `Bearer ${token}` } }),
         fetch(`${apiUrl}/attendance/leave-permission/all`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      const result = await res.json();
      const reqResult = await reqRes.json();
      const leaveResult = await leaveRes.json();

      if (!res.ok || !result.success) {
        setError(result.message || 'Failed to load attendance data. Please check your connection or login again.');
        return;
      }

      setError(null);
      if (result.success) setData(result.data);
      if (reqResult.success) setPendingRequests(reqResult.data);
      if (leaveResult.success) setLeaveRequests(leaveResult.requests);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminAttendance();
  }, [adminSelectedDate]);

  useEffect(() => {
    fetchAdminAttendance();

    const attendanceEvents = [
        'employee:clocked-in',
        'employee:clocked-out',
        'employee:on-break',
        'employee:resumed',
        'attendance:clock-in-request',
        'attendance:clock-out-request',
        'attendance:break-request',
        'attendance:clock-in-approved',
        'attendance:clock-out-approved',
        'attendance:break-approved',
        'employee:break-ended',
        'attendance:admin-force-clock-out',
        'attendance:admin-edit-clock-out',
        'attendance:admin-edit-attendance',
        'attendance:request-rejected',
        'leaveRequest:updated',
        'attendance:reminder-status-updated'
    ];

    const handleAttendanceEvent = () => {
        fetchAdminAttendance();
        fetchNotLoggedIn();
    };

    attendanceEvents.forEach(evt => socket.on(evt, handleAttendanceEvent));

    return () => {
        attendanceEvents.forEach(evt => socket.off(evt, handleAttendanceEvent));
    };
  }, []);

  if (loading && !data) return <div className="p-8 text-[var(--color-text-muted)]">Loading Admin Dashboard...</div>;

  if (error && !data) return (
    <div className="p-8 text-center flex flex-col items-center justify-center space-y-4">
      <AlertCircle className="w-12 h-12 text-red-500" />
      <h2 className="text-xl font-bold text-[var(--color-text)]">Error Loading Attendance Data</h2>
      <p className="text-[var(--color-text-muted)]">{error}</p>
      <Button onClick={fetchAdminAttendance} variant="primary">Retry</Button>
    </div>
  );

  const totalEmployees = data?.dailies?.length || 0;
  
  // Dynamic Chart Data
  const chartData = [
    { name: 'Present', value: data?.summary?.present || 0 },
    { name: 'On Break', value: data?.sessions?.filter((s:any) => (s.status === 'ACTIVE' || s.status === 'RUNNING') && s.breaks?.length > 0 && !s.breaks[s.breaks.length-1].endAt).length || 0 },
    { name: 'Absent', value: data?.summary?.absent || 0 },
    { name: 'On Leave', value: data?.summary?.onLeave || 0 },
  ];

  const presentPercent = totalEmployees > 0 
    ? Math.round(((data.summary.present || 0) / totalEmployees) * 100) 
    : 0;

  // Filter combined data for the table
  let mergedData = (data?.dailies || []).map((daily: any) => {
    const session = (data?.sessions || []).find((s:any) => s.employeeId?._id === daily.employeeId?._id);
    return { ...daily, session };
  });

  mergedData = mergedData.filter((item: any) => {
    if (search && !item.employeeId?.name.toLowerCase().includes(search.toLowerCase())) return false;
    
    if (statusFilter !== 'All') {
      const isActive = (item.session?.status === 'ACTIVE' || item.session?.status === 'RUNNING');
      const isOnBreak = isActive && item.session?.breaks?.length > 0 && !item.session.breaks[item.session.breaks.length-1].endAt;
      const isCompleted = item.session?.status === 'COMPLETED';
      
      if (statusFilter === 'Working' && (!isActive || isOnBreak)) return false;
      if (statusFilter === 'On Break' && !isOnBreak) return false;
      if (statusFilter === 'Completed' && !isCompleted) return false;
      
      if (statusFilter === 'Late' && item.status !== 'LATE') return false;
      if (statusFilter === 'Absent' && item.status !== 'ABSENT') return false;
      
      // Synthesized statuses for not logged in
      if (statusFilter === 'Not Logged In' && item.session) return false;
      if (statusFilter === 'Leave Requested' && item.status !== 'Leave Requested') return false;
      if (statusFilter === 'Permission Requested' && item.status !== 'Permission Requested') return false;
      if (statusFilter === 'Leave Approved' && item.status !== 'Leave Approved' && item.status !== 'PAID_LEAVE') return false;
      if (statusFilter === 'Permission Approved' && item.status !== 'Permission Approved') return false;
      if (statusFilter === 'No Prior Information' && item.status !== 'No Prior Information') return false;
    }
    return true;
  });

  return (
    <div className="max-w-[1600px] mx-auto p-6 space-y-8 relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-primary)] mb-1">Attendance Management</h1>
          <p className="text-[var(--color-text-muted)]">Monitor today's workforce attendance and employee work sessions.</p>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm flex-wrap">
           <Calendar className="text-[var(--color-primary)]" size={20} />
           <input 
              type="date"
              className="border-none bg-transparent font-semibold text-[var(--color-text-primary)] focus:ring-0 outline-none cursor-pointer p-0"
              value={adminSelectedDate}
              onChange={(e) => setAdminSelectedDate(e.target.value)}
              max={moment().tz('Asia/Kolkata').format('YYYY-MM-DD')}
           />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card className="p-4 rounded-xl border-t-4 border-gray-200 shadow-sm border-x border-b border-[var(--color-border-subtle)] text-center">
          <p className="text-xs font-bold text-[var(--color-text-muted)] mb-1 uppercase tracking-tight">Total Employees</p>
          <p className="text-2xl font-black text-[var(--color-text-primary)]">{totalEmployees}</p>
        </Card>
        <Card className="p-4 rounded-xl border-t-4 border-green-500 shadow-sm border-x border-b border-[var(--color-border-subtle)] text-center">
          <p className="text-xs font-bold text-[var(--color-text-muted)] mb-1 uppercase tracking-tight">Present</p>
          <p className="text-2xl font-black text-green-600">{data?.summary?.present || 0}</p>
        </Card>
        <Card className="p-4 rounded-xl border-t-4 border-blue-500 shadow-sm border-x border-b border-[var(--color-border-subtle)] text-center">
          <p className="text-xs font-bold text-[var(--color-text-muted)] mb-1 uppercase tracking-tight">Working Now</p>
          <p className="text-2xl font-black text-blue-600">{data?.summary?.currentlyWorking || 0}</p>
        </Card>
        <Card className="p-4 rounded-xl border-t-4 border-orange-500 shadow-sm border-x border-b border-[var(--color-border-subtle)] text-center">
          <p className="text-xs font-bold text-[var(--color-text-muted)] mb-1 uppercase tracking-tight">On Break</p>
          <p className="text-2xl font-black text-orange-600">{data?.sessions?.filter((s:any) => (s.status === 'ACTIVE' || s.status === 'RUNNING') && s.breaks?.length > 0 && !s.breaks[s.breaks.length-1].endAt).length || 0}</p>
        </Card>
        <Card className="p-4 rounded-xl border-t-4 border-yellow-500 shadow-sm border-x border-b border-[var(--color-border-subtle)] text-center">
          <p className="text-xs font-bold text-[var(--color-text-muted)] mb-1 uppercase tracking-tight">Late</p>
          <p className="text-2xl font-black text-yellow-600">{data?.summary?.late || 0}</p>
        </Card>
        <Card className="p-4 rounded-xl border-t-4 border-red-500 shadow-sm border-x border-b border-[var(--color-border-subtle)] text-center">
          <p className="text-xs font-bold text-[var(--color-text-muted)] mb-1 uppercase tracking-tight">Absent</p>
          <p className="text-2xl font-black text-red-600">{data?.summary?.absent || 0}</p>
        </Card>
        <Card className="p-4 rounded-xl border-t-4 border-purple-500 shadow-sm border-x border-b border-[var(--color-border-subtle)] text-center">
          <p className="text-xs font-bold text-[var(--color-text-muted)] mb-1 uppercase tracking-tight">Leave</p>
          <p className="text-2xl font-black text-purple-600">{data?.summary?.onLeave || 0}</p>
        </Card>
      </div>

      {pendingRequests.length > 0 && (
        <Card className="border-orange-200 shadow-sm overflow-hidden">
           <div className="bg-orange-50 p-4 border-b border-orange-200 flex justify-between items-center">
             <div className="flex items-center gap-2 flex-wrap">
               <AlertCircle className="text-orange-600" size={20} />
               <h2 className="text-lg font-bold text-orange-900">Pending Requests ({pendingRequests.length})</h2>
             </div>
           </div>
           <TableContainer>
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Employee</TableHead>
                   <TableHead>Request Type</TableHead>
                   <TableHead>Requested Time</TableHead>
                   <TableHead>Location</TableHead>
                   <TableHead className="text-right">Actions</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {pendingRequests.map(req => (
                   <TableRow key={req._id}>
                     <TableCell>
                       <p className="font-bold text-[var(--color-text-primary)]">{req.employeeId?.name}</p>
                       <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{req.employeeId?.employeeId}</p>
                     </TableCell>
                     <TableCell>
                       <Badge variant={req.requestType === 'CHECK_IN' ? 'success' : 'neutral'}>{req.requestType.replace('_', ' ')}</Badge>
                     </TableCell>
                     <TableCell className="font-semibold text-[var(--color-text-primary)]">
                       {moment(req.requestedTime).format('hh:mm A')}
                     </TableCell>
                     <TableCell>
                       {req.location?.insideOfficeRadius ? (
                         <span className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded-md border border-green-200">Inside Office</span>
                       ) : req.location?.latitude ? (
                         <span className="text-xs text-red-700 bg-red-50 px-2 py-1 rounded-md border border-red-200">
                           Outside ({req.location.distanceFromOffice}m)
                         </span>
                       ) : (
                         <span className="text-xs text-gray-700 bg-gray-50 px-2 py-1 rounded-md border border-gray-200">No GPS</span>
                       )}
                       <div className="text-[10px] text-[var(--color-text-muted)] mt-1">Acc: ±{Math.round(req.location?.accuracy || 0)}m</div>
                     </TableCell>
                     <TableCell className="text-right">
                       <Button size="sm" variant="outline" className="mr-2 border-red-200 text-red-600 hover:bg-red-50" onClick={() => { setSelectedRequest(req); setRequestAction('REJECT'); }}>Reject</Button>
                       <Button size="sm" variant="primary" onClick={() => { 
                         setSelectedRequest(req); 
                         setRequestAction('APPROVE'); 
                         setEditedTime(moment(req.requestedTime).format('YYYY-MM-DDTHH:mm'));
                       }}>Approve</Button>
                     </TableCell>
                   </TableRow>
                 ))}
               </TableBody>
             </Table>
           </TableContainer>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Main Board */}
        <div className="lg:col-span-3 space-y-6">
          <TableContainer>
            {/* Filters */}
            <div className="p-4 border-b border-[var(--color-border-subtle)] bg-white flex flex-wrap gap-4 items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Live Attendance Board</h2>
              <div className="flex gap-4 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" size={16} />
                  <Input 
                    type="text" 
                    placeholder="Search employee..." 
                    className="pl-9 w-64"
                    value={search}
                    onChange={(e: any) => setSearch(e.target.value)}
                  />
                </div>
                <select 
                  className="px-4 py-2 border border-[var(--color-border-subtle)] rounded-[var(--radius-lg)] text-sm bg-white font-medium text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                >
                  <option value="All">All Status</option>
                  <option value="Working">Working</option>
                  <option value="On Break">On Break</option>
                  <option value="Completed">Completed</option>
                  <option value="Not Logged In">Not Logged In</option>
                  <option value="Late">Late</option>
                  <option value="Absent">Absent</option>
                  <option value="Leave Requested">Leave Requested</option>
                  <option value="Permission Requested">Permission Requested</option>
                  <option value="Leave Approved">Leave Approved</option>
                  <option value="Permission Approved">Permission Approved</option>
                  <option value="No Prior Information">No Prior Information</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <Table className="table-fixed w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50%] overflow-hidden text-ellipsis">Employee</TableHead>
                  <TableHead className="w-[25%] overflow-hidden text-ellipsis">Status</TableHead>
                  <TableHead className="w-[25%] text-right overflow-hidden text-ellipsis">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mergedData.map((item: any) => {
                  const session = item.session;
                  const isActive = (session?.status === 'ACTIVE' || session?.status === 'RUNNING');
                  const isOnBreak = isActive && session?.breaks?.length > 0 && !session.breaks[session.breaks.length-1].endAt;
                  const isCompleted = session?.status === 'COMPLETED';

                  return (
                    <TableRow key={item._id} className="cursor-pointer" onClick={() => setSelectedEmployee(item)}>
                      <TableCell className="w-[50%] overflow-hidden">
                        <p className="font-bold text-[var(--color-text-primary)] truncate" title={item.employeeId?.name}>{item.employeeId?.name}</p>
                        <p className="text-xs text-[var(--color-text-muted)] font-medium mt-0.5 truncate" title={item.employeeId?.role}>{item.employeeId?.role}</p>
                      </TableCell>
                      <TableCell className="w-[25%] overflow-hidden">
                        <div className="flex items-center">
                          <StatusBadge 
                            isActive={isActive && !isOnBreak} 
                            isOnBreak={isOnBreak} 
                            isCompleted={isCompleted} 
                            dailyStatus={item.status} 
                          />
                        </div>
                      </TableCell>
                      <TableCell className="w-[25%] text-right overflow-hidden">
                        <div className="flex items-center justify-end flex-nowrap">
                          {item.isSynthesized && (
                            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openReminderModalSingle(item.employeeId._id); }} className="gap-1 mr-1 px-2 shrink-0">
                              <Mail size={14} /> <span className="hidden xl:inline text-xs">Reminder</span>
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedEmployee(item); }} className="px-1 shrink-0">
                            <ChevronRight size={18} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {mergedData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-12 text-center text-[var(--color-text-muted)]">
                      No employees found matching filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </div>

        {/* Analytics Side */}
        <div className="lg:col-span-1 space-y-6">
          
          <Card className="p-6">
            <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-6 text-center">Attendance Overview</h3>
            <div className="relative w-full h-48 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                <span className="text-3xl font-bold text-[var(--color-primary)]">{presentPercent}%</span>
                <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase mt-1">Present</p>
              </div>
            </div>

            <div className="space-y-3">
               {chartData.map((c, i) => (
                 <div key={i} className="flex justify-between items-center text-sm">
                   <div className="flex items-center gap-2 flex-wrap">
                     <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }}></span>
                     <span className="text-[var(--color-text-muted)] font-medium">{c.name}</span>
                   </div>
                   <span className="font-bold text-[var(--color-text-primary)]">{c.value}</span>
                 </div>
               ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-6 text-center">Weekly Trend</h3>
            <div className="h-48 w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={[{day:'M', v:95}, {day:'T', v:88}, {day:'W', v:92}, {day:'T', v:90}, {day:'F', v:85}]}>
                   <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill:'var(--color-text-muted)', fontSize: 12}} />
                   <Tooltip cursor={{fill:'var(--color-surface-light)'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                   <Bar dataKey="v" fill="var(--color-primary)" radius={[4,4,0,0]} barSize={20} />
                 </BarChart>
               </ResponsiveContainer>
            </div>
          </Card>

        </div>
      </div>


      {/* Not Logged In Today Section */}
      <Card className="mt-8 border-red-100 shadow-sm overflow-hidden">
         <div className="bg-red-50 p-4 border-b border-red-100 flex justify-between items-center flex-wrap gap-4">
           <div className="flex items-center gap-2">
             <AlertCircle className="text-red-600" size={20} />
             <h2 className="text-lg font-bold text-red-900">Not Logged In Today</h2>
             <Badge variant="error" className="ml-2">{notLoggedInEmployees?.length || 0}</Badge>
           </div>
           <Button variant="outline" size="sm" onClick={openReminderModalBulk} className="border-red-200 text-red-700 hover:bg-red-100">
             <Mail size={16} className="mr-2" /> Remind All
           </Button>
         </div>
         <TableContainer>
           <Table>
             <TableHeader>
               <TableRow>
                 <TableHead>Employee</TableHead>
                 <TableHead>Department</TableHead>
                 <TableHead>Status/Reason</TableHead>
                 <TableHead>Clock In</TableHead>
                 <TableHead>Reminder Status</TableHead>
                 <TableHead className="text-right">Action</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
               {notLoggedInError ? (
                 <TableRow>
                   <TableCell colSpan={6} className="py-8 text-center text-red-500 font-medium">
                     Failed to load employees who have not clocked in.
                   </TableCell>
                 </TableRow>
               ) : notLoggedInEmployees?.length > 0 ? (
                 notLoggedInEmployees.map((emp: any) => (
                   <TableRow key={emp._id}>
                     <TableCell>
                       <p className="font-bold text-[var(--color-text-primary)]">{emp.name}</p>
                       <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{emp.employeeId}</p>
                     </TableCell>
                     <TableCell className="text-[var(--color-text-muted)] font-medium">
                       {emp.department || '—'}
                     </TableCell>
                     <TableCell>
                       <div className="flex flex-col gap-1">
                          <span className={`px-2 py-1 text-xs font-bold rounded-md inline-block w-max ${
                             emp.status === 'Leave Requested' ? 'bg-orange-100 text-orange-700' :
                             emp.status === 'Leave Approved' ? 'bg-green-100 text-green-700' :
                             emp.status === 'Permission Requested' ? 'bg-purple-100 text-purple-700' :
                             emp.status === 'Permission Approved' ? 'bg-blue-100 text-blue-700' :
                             'bg-gray-100 text-gray-700'
                          }`}>
                            {emp.status}
                          </span>
                          {emp.requestStatus && <span className="text-[10px] text-gray-500 font-medium">{emp.requestStatus}</span>}
                       </div>
                     </TableCell>
                     <TableCell className="text-[var(--color-text-muted)]">
                       —
                     </TableCell>
                     <TableCell>
                       <div className="flex flex-col">
                         <div className="flex items-center gap-1">
                           {emp.reminderStatus === 'SENT' && emp.triggerType === 'AUTOMATIC' && <span className="inline-flex items-center text-[10px] font-bold px-2 py-1 bg-green-100 text-green-700 rounded-md whitespace-nowrap"><UserCheck size={12} className="mr-1"/> SENT AUTOMATICALLY</span>}
                           {emp.reminderStatus === 'SENT' && emp.triggerType === 'MANUAL' && <span className="inline-flex items-center text-[10px] font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded-md whitespace-nowrap"><UserCheck size={12} className="mr-1"/> SENT MANUALLY</span>}
                           {emp.reminderStatus === 'FAILED' && <span className="inline-flex items-center text-[10px] font-bold px-2 py-1 bg-red-100 text-red-700 rounded-md whitespace-nowrap" title={emp.failureReason}><AlertCircle size={12} className="mr-1"/> FAILED</span>}
                           {emp.reminderStatus === 'PENDING' && <span className="inline-flex items-center text-[10px] font-bold px-2 py-1 bg-orange-100 text-orange-700 rounded-md whitespace-nowrap"><Clock size={12} className="mr-1"/> PENDING</span>}
                           {emp.reminderStatus === 'NOT SENT' && <span className="inline-flex items-center text-[10px] font-bold px-2 py-1 bg-gray-100 text-gray-700 rounded-md whitespace-nowrap">NOT SENT</span>}
                         </div>
                         {emp.reminderStatus === 'SENT' && emp.sentAt && <span className="text-[10px] text-gray-500 mt-1">{moment(emp.sentAt).format('h:mm A')}</span>}
                       </div>
                     </TableCell>
                     <TableCell className="text-right">
                       <div className="flex justify-end gap-2">
                         <Button size="sm" variant="outline" onClick={() => {
                             setManualEmployeeId(emp._id);
                             setManualDate(moment().format('YYYY-MM-DD'));
                             setManualStatus('PRESENT');
                             setManualClockIn('');
                             setManualClockOut('');
                             setManualStartTime('');
                             setManualEndTime('');
                             setManualAdminRemarks('');
                             setManualCorrectionModalOpen(true);
                         }}>Update</Button>
                         <Button size="sm" variant="outline" onClick={() => openReminderModalSingle(emp._id)} className="gap-2">
                           <Mail size={14} /> Remind
                         </Button>
                       </div>
                     </TableCell>
                   </TableRow>
                 ))
               ) : (
                 <TableRow>
                   <TableCell colSpan={6} className="py-8 text-center text-[var(--color-text-muted)]">
                     No employees found in this category.
                   </TableCell>
                 </TableRow>
               )}
             </TableBody>
           </Table>
         </TableContainer>
      </Card>

      {/* Manual Correction Modal */}
      <Modal isOpen={manualCorrectionModalOpen} onClose={() => setManualCorrectionModalOpen(false)} title="Update Today's Attendance">
         <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Status</label>
              <select 
                value={manualStatus}
                onChange={(e) => setManualStatus(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--color-border-subtle)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-surface)] text-[var(--color-text-primary)]"
              >
                <option value="PRESENT">Present</option>
                <option value="LATE">Late</option>
                <option value="ABSENT">Absent</option>
                <option value="LEAVE">Leave</option>
                <option value="PERMISSION">Permission</option>
              </select>
            </div>

            {(manualStatus === 'PRESENT' || manualStatus === 'LATE') && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Clock In Time</label>
                  <input
                    type="time"
                    value={manualClockIn}
                    onChange={(e) => setManualClockIn(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--color-border-subtle)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Clock Out Time (Optional)</label>
                  <input
                    type="time"
                    value={manualClockOut}
                    onChange={(e) => setManualClockOut(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--color-border-subtle)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text-primary)]"
                  />
                </div>
              </div>
            )}

            {manualStatus === 'PERMISSION' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Start Time</label>
                  <input
                    type="time"
                    value={manualStartTime}
                    onChange={(e) => setManualStartTime(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--color-border-subtle)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">End Time</label>
                  <input
                    type="time"
                    value={manualEndTime}
                    onChange={(e) => setManualEndTime(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--color-border-subtle)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text-primary)]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Admin Remarks / Reason</label>
              <textarea
                value={manualAdminRemarks}
                onChange={(e) => setManualAdminRemarks(e.target.value)}
                placeholder="Reason for manual update"
                className="w-full px-3 py-2 border border-[var(--color-border-subtle)] rounded-lg h-24 resize-none bg-[var(--color-surface)] text-[var(--color-text-primary)]"
              ></textarea>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setManualCorrectionModalOpen(false)}>Cancel</Button>
              <Button onClick={async () => {
                 try {
                     if (!manualStatus) return alert('Status is required');
                     if (manualStatus === 'PERMISSION' && (!manualStartTime || !manualEndTime)) return alert('Start and End time are required for permission');
                     if ((manualStatus === 'PRESENT' || manualStatus === 'LATE') && !manualClockIn) return alert('Clock In time is required for Present/Late');

                     const token = (useAuthStore.getState().token || localStorage.getItem('token')) || '';
                     const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
                     
                     const res = await fetch(`${apiUrl}/attendance/admin/manual-correction`, {
                         method: 'POST',
                         headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                         body: JSON.stringify({
                             employeeId: manualEmployeeId,
                             date: manualDate,
                             status: manualStatus,
                             clockInTime: manualClockIn,
                             clockOutTime: manualClockOut,
                             startTime: manualStartTime,
                             endTime: manualEndTime,
                             reason: manualAdminRemarks,
                             adminRemarks: manualAdminRemarks
                         })
                     });
                     
                     const data = await res.json();
                     if (data.success) {
                         alert('Attendance updated successfully');
                         setManualCorrectionModalOpen(false);
                         fetchAdminAttendance();
                         fetchNotLoggedIn();
                     } else {
                         alert(data.message || 'Error updating attendance');
                     }
                 } catch (err) {
                     alert('Failed to update attendance');
                 }
              }}>Update</Button>
            </div>
         </div>
      </Modal>

      {/* Detail Drawer overlay */}
      <Drawer isOpen={!!selectedEmployee} onClose={() => setSelectedEmployee(null)} title={selectedEmployee?.employeeId?.name || ''}>
        {selectedEmployee && (
            <div className="space-y-6">
               <p className="text-[var(--color-text-muted)] font-medium mt-[-20px] mb-4">{selectedEmployee.employeeId?.role}</p>
               
               <div className="flex gap-1 p-1 bg-gray-100/50 rounded-lg w-full sm:w-max">
                  <button 
                      onClick={() => setAdminDrawerTab('DAILY')}
                      className={`flex-1 sm:flex-none px-6 py-2 rounded-md text-sm font-semibold transition-all ${adminDrawerTab === 'DAILY' ? 'bg-white text-[var(--color-primary)] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                      Daily View
                  </button>
                  <button 
                      onClick={() => setAdminDrawerTab('MONTHLY')}
                      className={`flex-1 sm:flex-none px-6 py-2 rounded-md text-sm font-semibold transition-all ${adminDrawerTab === 'MONTHLY' ? 'bg-white text-[var(--color-primary)] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                      Monthly Summary
                  </button>
               </div>

               {adminDrawerTab === 'DAILY' && (
                  <div className="space-y-6">
                     <Card className="p-5">
                       <h3 className="text-sm font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-4">Today's Attendance</h3>
                       <div className="space-y-4">
                         <div className="flex justify-between items-center pb-3 border-b border-[var(--color-border-subtle)]">
                           <span className="text-[var(--color-text-muted)]">Status</span>
                           <div className="flex gap-2 items-center flex-wrap">
                             <StatusBadge 
                                isActive={(selectedEmployee.session?.status === 'ACTIVE' || selectedEmployee.session?.status === 'RUNNING') && !(selectedEmployee.session?.breaks?.length > 0 && !selectedEmployee.session.breaks[selectedEmployee.session.breaks.length-1].endAt)} 
                                isOnBreak={(selectedEmployee.session?.status === 'ACTIVE' || selectedEmployee.session?.status === 'RUNNING') && selectedEmployee.session?.breaks?.length > 0 && !selectedEmployee.session.breaks[selectedEmployee.session.breaks.length-1].endAt} 
                                isCompleted={selectedEmployee.session?.status === 'COMPLETED'} 
                                dailyStatus={selectedEmployee.status} 
                              />
                              { (selectedEmployee.session?.status === 'ACTIVE' || selectedEmployee.session?.status === 'RUNNING' || selectedEmployee.session?.status === 'ON_BREAK') && (
                                <Button variant="danger" size="sm" onClick={() => setForceClockOutModalOpen(true)}>
                                  Force Clock Out
                                </Button>
                              )}
                              { (!selectedEmployee.session) && (
                                <Button variant="outline" size="sm" onClick={() => {
                                   setManualEmployeeId(selectedEmployee.employeeId._id || selectedEmployee.employeeId);
                                   setManualDate(moment().format('YYYY-MM-DD'));
                                   setManualStatus('PRESENT');
                                   setManualClockIn('');
                                   setManualClockOut('');
                                   setManualStartTime('');
                                   setManualEndTime('');
                                   setManualAdminRemarks('');
                                   setManualCorrectionModalOpen(true);
                                }}>
                                  Update Attendance
                                </Button>
                              )}
                              { (selectedEmployee.session) && (
                                <Button variant="outline" size="sm" onClick={() => {
                                   setEditClockInTime(moment(selectedEmployee.session.clockInAt).format('YYYY-MM-DDTHH:mm'));
                                   setEditClockOutTime(selectedEmployee.session.clockOutAt ? moment(selectedEmployee.session.clockOutAt).format('YYYY-MM-DDTHH:mm') : '');
                                   setEditBreakDuration(selectedEmployee.breakMinutes ? selectedEmployee.breakMinutes.toString() : '0');
                                   setEditAttendanceReason('');
                                   setEditAttendanceModalOpen(true);
                                }}>
                                  Edit Attendance
                                </Button>
                              )}
                           </div>
                         </div>
                         <div className="flex justify-between items-center">
                           <span className="text-[var(--color-text-muted)]">Clock In</span>
                           <span className="font-semibold">{selectedEmployee.session ? moment(selectedEmployee.session.clockInAt).format('hh:mm A') : '—'}</span>
                         </div>
                         <div className="flex justify-between items-center">
                           <span className="text-[var(--color-text-muted)]">Clock Out</span>
                           <span className="font-semibold">{selectedEmployee.session?.clockOutAt ? moment(selectedEmployee.session.clockOutAt).format('hh:mm A') : '—'}</span>
                         </div>
                         <div className="flex justify-between items-center">
                           <span className="text-[var(--color-text-muted)]">Worked</span>
                           <span className="font-semibold font-mono">{selectedEmployee.session ? `${Math.floor(selectedEmployee.workedMinutes/60)}h ${selectedEmployee.workedMinutes%60}m` : '—'}</span>
                         </div>
                         <div className="flex justify-between items-center">
                           <span className="text-[var(--color-text-muted)]">Break</span>
                           <span className="font-semibold font-mono">{selectedEmployee.session ? `${Math.floor(selectedEmployee.breakMinutes/60)}h ${selectedEmployee.breakMinutes%60}m` : '—'}</span>
                         </div>
                         <div className="flex justify-between items-center">
                           <span className="text-[var(--color-text-muted)]">Expected Out</span>
                           <span className="font-semibold">{selectedEmployee.session ? moment(selectedEmployee.session.clockInAt).add(8, 'hours').format('hh:mm A') : '—'}</span>
                         </div>
                       </div>
                     </Card>
      
                     {selectedEmployee.session && (
                     <Card className="p-5">
                       <h3 className="text-sm font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-4">Break History</h3>
                       {selectedEmployee.session.breaks?.length > 0 ? (
                         <div className="space-y-4">
                           {selectedEmployee.session.breaks.map((b:any, i:number) => {
                             const start = moment(b.startAt);
                             const end = b.endAt ? moment(b.endAt) : null;
                             const duration = b.durationMinutes != null ? `${b.durationMinutes}m` : (end ? `${end.diff(start, 'minutes')}m` : `${moment().diff(start, 'minutes')}m (ongoing)`);
                             
                             return (
                               <div key={i} className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                                 <div className="flex justify-between items-center mb-2">
                                   <span className="font-bold text-[var(--color-text-primary)]">{i + 1}. {start.format('hh:mm A')} → {end ? end.format('hh:mm A') : 'Ongoing'}</span>
                                   <span className="font-mono text-[var(--color-text-muted)]">Duration: {duration}</span>
                                 </div>
                                 <div className="mb-1"><strong className="text-gray-700">Reason:</strong> <span className="text-[var(--color-primary)] font-medium">{b.reason || '-'}</span></div>
                                 <div><strong className="text-gray-700">Comment:</strong> <span className="text-gray-600">{b.comment || '-'}</span></div>
                                 {b.resumeComment && <div className="mt-1"><strong className="text-gray-700">Resume:</strong> <span className="text-gray-600 italic">{b.resumeComment}</span></div>}
                               </div>
                             );
                           })}
                         </div>
                       ) : (
                         <p className="text-sm text-[var(--color-text-muted)] italic">No breaks taken today.</p>
                       )}
                     </Card>
                     )}
      
                     {selectedEmployee.session && (
                     <Card className="p-5">
                       <h3 className="text-sm font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-4">Today's Timeline</h3>
                       <div className="space-y-5 relative before:absolute before:inset-0 before:ml-3.5 before:-translate-x-px before:h-full before:w-0.5 before:bg-[var(--color-border-subtle)]">
                          <TimelineItem time={moment(selectedEmployee.session.clockInAt).format('hh:mm A')} text="Clock In" icon={<Play size={12}/>} color="bg-green-100 text-green-600 border-green-200" />
                          {selectedEmployee.session.breaks?.map((b:any, i:number) => (
                            <React.Fragment key={i}>
                              <TimelineItem time={moment(b.startAt).format('hh:mm A')} text={`Break (${b.reason || 'Started'})`} icon={<Coffee size={12}/>} color="bg-orange-100 text-orange-600 border-orange-200" />
                              {b.endAt && <TimelineItem time={moment(b.endAt).format('hh:mm A')} text="Resume" icon={<Play size={12}/>} color="bg-blue-100 text-blue-600 border-blue-200" />}
                            </React.Fragment>
                          ))}
                          {selectedEmployee.session.clockOutAt && (
                            <TimelineItem time={moment(selectedEmployee.session.clockOutAt).format('hh:mm A')} text="Clock Out" icon={<Square size={12}/>} color="bg-[var(--color-surface-light)] text-[var(--color-text-muted)] border-[var(--color-border-subtle)]" />
                          )}
                       </div>
                     </Card>
                     )}
                  </div>
               )}

               {adminDrawerTab === 'MONTHLY' && (
                  <div className="space-y-6">
                      {loadingDrawerMonthly ? (
                          <div className="text-center py-12 text-gray-500">Loading monthly attendance...</div>
                      ) : adminDrawerMonthlyError ? (
                          <div className="text-center py-12 text-red-500">
                              <p>Unable to load monthly attendance.</p>
                              <Button variant="outline" className="mt-4" onClick={() => fetchDrawerMonthlyData(selectedEmployee.employeeId._id || selectedEmployee.employeeId, adminDrawerMonth)}>Retry</Button>
                          </div>
                      ) : !adminDrawerMonthlyData || !adminDrawerMonthlyData.records || adminDrawerMonthlyData.records.length === 0 ? (
                          <div className="text-center py-12 text-gray-500">No attendance records found for this month.</div>
                      ) : (
                          <>
                              <div className="flex items-center justify-between mb-4">
                                  <h3 className="text-lg font-bold text-gray-800">{adminDrawerMonth.format('MMMM YYYY')} Summary</h3>
                                  <div className="flex gap-2">
                                      <Button variant="outline" size="sm" onClick={handleDrawerPrevMonth}><ChevronLeft size={16} /></Button>
                                      <Button variant="outline" size="sm" onClick={handleDrawerNextMonth}><ChevronRight size={16} /></Button>
                                  </div>
                              </div>
                              
                              <div className="grid grid-cols-3 gap-4">
                                  <div className="bg-white p-3 rounded-lg border text-center shadow-sm">
                                      <div className="text-xs text-gray-500 uppercase font-semibold">Present</div>
                                      <div className="text-xl font-bold text-green-600">{adminDrawerMonthlyData.summary?.present || 0}</div>
                                  </div>
                                  <div className="bg-white p-3 rounded-lg border text-center shadow-sm">
                                      <div className="text-xs text-gray-500 uppercase font-semibold">Late</div>
                                      <div className="text-xl font-bold text-yellow-600">{adminDrawerMonthlyData.summary?.late || 0}</div>
                                  </div>
                                  <div className="bg-white p-3 rounded-lg border text-center shadow-sm">
                                      <div className="text-xs text-gray-500 uppercase font-semibold">Absent</div>
                                      <div className="text-xl font-bold text-red-600">{adminDrawerMonthlyData.summary?.absent || 0}</div>
                                  </div>
                                  <div className="bg-white p-3 rounded-lg border text-center shadow-sm">
                                      <div className="text-xs text-gray-500 uppercase font-semibold">Leave</div>
                                      <div className="text-xl font-bold text-purple-600">{adminDrawerMonthlyData.summary?.onLeave || 0}</div>
                                  </div>
                                  <div className="bg-white p-3 rounded-lg border text-center shadow-sm">
                                      <div className="text-xs text-gray-500 uppercase font-semibold">Half Day</div>
                                      <div className="text-xl font-bold text-orange-500">{adminDrawerMonthlyData.summary?.halfDay || 0}</div>
                                  </div>
                                  <div className="bg-white p-3 rounded-lg border text-center shadow-sm">
                                      <div className="text-xs text-gray-500 uppercase font-semibold">Week Off</div>
                                      <div className="text-xl font-bold text-blue-600">{adminDrawerMonthlyData.summary?.weekOff || 0}</div>
                                  </div>
                              </div>
                
                              <div className="bg-white rounded-lg border shadow-sm p-4 mt-6">
                                  <div className="grid grid-cols-7 text-center mb-2">
                                      <div className="text-xs font-semibold text-gray-500">Sun</div>
                                      <div className="text-xs font-semibold text-gray-500">Mon</div>
                                      <div className="text-xs font-semibold text-gray-500">Tue</div>
                                      <div className="text-xs font-semibold text-gray-500">Wed</div>
                                      <div className="text-xs font-semibold text-gray-500">Thu</div>
                                      <div className="text-xs font-semibold text-gray-500">Fri</div>
                                      <div className="text-xs font-semibold text-gray-500">Sat</div>
                                  </div>
                                  <div className="grid grid-cols-7 gap-2">
                                      {Array.from({ length: adminDrawerMonth.daysInMonth() + adminDrawerMonth.clone().startOf('month').day() }).map((_, i) => {
                                          const firstDay = adminDrawerMonth.clone().startOf('month').day();
                                          if (i < firstDay) return <div key={`empty-${i}`} className="h-10"></div>;
                                          
                                          const d = i - firstDay + 1;
                                          const dateStr = `${adminDrawerMonth.format('YYYY-MM')}-${d.toString().padStart(2, '0')}`;
                                          const record = (adminDrawerMonthlyData.records || []).find((r: any) => r.date === dateStr);
                                          
                                          let colorClass = 'bg-gray-50 text-gray-400';
                                          let label = '';
                                          
                                          if (record) {
                                              const status = record.status;
                                              switch(status) {
                                                  case 'PRESENT': case 'COMPLETED': case 'WORKING': colorClass = 'bg-green-100 text-green-700'; label = 'P'; break;
                                                  case 'ABSENT': colorClass = 'bg-red-100 text-red-700'; label = 'A'; break;
                                                  case 'LATE': colorClass = 'bg-yellow-100 text-yellow-700'; label = 'L'; break;
                                                  case 'HALF_DAY': colorClass = 'bg-yellow-100 text-yellow-700'; label = 'HD'; break;
                                                  case 'LEAVE': case 'PAID_LEAVE': case 'Leave Approved': colorClass = 'bg-purple-100 text-purple-700'; label = 'LV'; break;
                                                  case 'WEEK_OFF': colorClass = 'bg-blue-50 text-blue-600'; label = 'WO'; break;
                                                  case 'HOLIDAY': colorClass = 'bg-teal-100 text-teal-700'; label = 'H'; break;
                                                  case 'PERMISSION': colorClass = 'bg-purple-100 text-purple-700'; label = 'PM'; break;
                                                  default: colorClass = 'bg-gray-100 text-gray-600'; label = '-';
                                              }
                                          } else if (moment(dateStr).isAfter(moment(), 'day')) {
                                              colorClass = 'bg-gray-50 text-gray-300';
                                          }
                                          
                                          return (
                                              <div key={d} className="aspect-square flex flex-col items-center justify-center border border-gray-100 rounded-md p-1" title={record?.status || 'No Record'}>
                                                  <span className="text-xs text-gray-400 mb-1">{d}</span>
                                                  <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${colorClass}`}>
                                                      {label}
                                                  </span>
                                              </div>
                                          );
                                      })}
                                  </div>
                              </div>
                          </>
                      )}
                  </div>
               )}

               <Card className="p-5">
                 <h3 className="text-sm font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-4">Monthly Summary</h3>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-[var(--color-surface-light)] rounded-lg border border-[var(--color-border-subtle)]">
                      <p className="text-2xl font-bold text-[var(--color-text-primary)]">18</p>
                      <p className="text-xs text-[var(--color-text-muted)] font-medium mt-1">Present Days</p>
                    </div>
                    <div className="text-center p-3 bg-[var(--color-surface-light)] rounded-lg border border-[var(--color-border-subtle)]">
                      <p className="text-2xl font-bold text-[var(--color-primary)]">94.7%</p>
                      <p className="text-xs text-[var(--color-text-muted)] font-medium mt-1">Attendance</p>
                    </div>
                 </div>
               </Card>
            </div>
        )}
      </Drawer>

      <Modal isOpen={reminderModalOpen} onClose={() => setReminderModalOpen(false)} title="Send Attendance Reminder">
         <div className="space-y-4">
            <div className="p-3 bg-blue-50 text-blue-800 rounded-lg text-sm border border-blue-100">
               You are about to send an email reminder to <strong>{selectedEmployeesForReminder.length}</strong> employee(s).
            </div>
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
               <select 
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[var(--color-primary)] outline-none bg-white"
                  value={reminderReason}
                  onChange={e => setReminderReason(e.target.value)}
               >
                  <option value="Late Login">Late Login</option>
                  <option value="Leave Request">Leave Request</option>
                  <option value="Permission Request">Permission Request</option>
                  <option value="No Prior Information">No Prior Information</option>
                  <option value="Other">Other</option>
               </select>
            </div>
            {reminderReason === 'Other' && (
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Custom Reason</label>
                  <input 
                     type="text" 
                     className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[var(--color-primary)] outline-none"
                     value={reminderCustomReason}
                     onChange={e => setReminderCustomReason(e.target.value)}
                     placeholder="Enter custom reason..."
                  />
               </div>
            )}
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Additional Message (Optional)</label>
               <textarea 
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[var(--color-primary)] outline-none min-h-[80px]"
                  value={reminderMessage}
                  onChange={e => setReminderMessage(e.target.value)}
                  placeholder="e.g., Please log in immediately or update your leave status."
               />
            </div>
            <div className="flex justify-end gap-3 mt-6 flex-wrap">
                <Button variant="outline" onClick={() => setReminderModalOpen(false)}>Cancel</Button>
                <Button variant="primary" onClick={handleSendReminder} className="gap-2"><Mail size={16}/> Send Email</Button>
            </div>
         </div>
      </Modal>

      <Modal isOpen={!!selectedRequest && requestAction === 'APPROVE'} onClose={() => setSelectedRequest(null)} title="Approve Request">
         <div className="space-y-4">
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Requested Time</label>
               <input 
                  type="datetime-local" 
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[var(--color-primary)] outline-none"
                  value={editedTime}
                  onChange={e => setEditedTime(e.target.value)}
               />
               <p className="text-xs text-gray-500 mt-1">You can edit the exact clock-in/out time before approving.</p>
            </div>
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Comment (Optional)</label>
               <input 
                  type="text" 
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[var(--color-primary)] outline-none"
                  value={adminComment}
                  onChange={e => setAdminComment(e.target.value)}
               />
            </div>
            <div className="flex justify-end gap-3 mt-6 flex-wrap">
                <Button variant="outline" onClick={() => setSelectedRequest(null)}>Cancel</Button>
                <Button variant="primary" onClick={async () => {
                   try {
                     const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
                     
                     // Ensure the editedTime is parsed as IST before sending to the UTC backend
                     const formattedEditedTime = editedTime ? moment.tz(editedTime, 'Asia/Kolkata').toISOString() : undefined;

                     await fetch(`${apiUrl}/attendance/requests/${selectedRequest._id}/approve`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${(useAuthStore.getState().token || localStorage.getItem('token'))}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ editedTime: formattedEditedTime, adminComment })
                     });
                     setSelectedRequest(null);
                     fetchAdminAttendance();
                   } catch(e) { console.error(e); }
                }}>Approve</Button>
            </div>
         </div>
      </Modal>

      <Modal isOpen={!!selectedRequest && requestAction === 'REJECT'} onClose={() => setSelectedRequest(null)} title="Reject Request">
         <div className="space-y-4">
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason</label>
               <input 
                  type="text" 
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[var(--color-primary)] outline-none"
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  placeholder="e.g. Too far from office"
               />
            </div>
             <div className="flex justify-end gap-3 mt-6 flex-wrap">
                 <Button variant="outline" onClick={() => setSelectedRequest(null)}>Cancel</Button>
                 <Button variant="danger" onClick={async () => {
                    try {
                      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
                      await fetch(`${apiUrl}/attendance/requests/${selectedRequest._id}/reject`, {
                         method: 'POST',
                         headers: { 'Authorization': `Bearer ${(useAuthStore.getState().token || localStorage.getItem('token'))}`, 'Content-Type': 'application/json' },
                         body: JSON.stringify({ rejectionReason })
                      });
                      setSelectedRequest(null);
                      fetchAdminAttendance();
                    } catch(e) { console.error(e); }
                 }}>Reject</Button>
             </div>
          </div>
       </Modal>

       <Modal isOpen={forceClockOutModalOpen} onClose={() => setForceClockOutModalOpen(false)} title="Force Clock Out Employee?">
          {selectedEmployee && (
             <div className="space-y-4">
               <div className="p-4 bg-red-50 text-red-800 rounded-lg border border-red-100 text-sm">
                 <p className="font-semibold mb-2">Are you sure you want to forcefully clock out this employee?</p>
                 <p className="mb-1"><strong>Employee:</strong> {selectedEmployee.employeeId?.name}</p>
                 <p className="mb-1"><strong>Clock In:</strong> {selectedEmployee.session ? moment(selectedEmployee.session.clockInAt).format('hh:mm A') : '—'}</p>
                 <p>The session will be closed immediately using the current server time.</p>
               </div>
               
               <div className="flex justify-end gap-3 mt-6 flex-wrap">
                   <Button variant="outline" onClick={() => setForceClockOutModalOpen(false)}>Cancel</Button>
                   <Button variant="danger" onClick={async () => {
                      try {
                        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
                        const res = await fetch(`${apiUrl}/attendance/admin/force-clock-out/${selectedEmployee.employeeId._id}`, {
                           method: 'POST',
                           headers: { 'Authorization': `Bearer ${(useAuthStore.getState().token || localStorage.getItem('token'))}` }
                        });
                        const data = await res.json();
                        
                        setForceClockOutModalOpen(false);
                        
                        if (data.success) {
                           setSelectedEmployee(null); // Close drawer to refresh fully
                           fetchAdminAttendance();
                        } else {
                           alert(data.message || 'Unable to clock out employee.');
                        }
                      } catch(e) { 
                        console.error(e); 
                        alert('Unable to clock out employee. Please try again.');
                      }
                   }}>Confirm Clock Out</Button>
               </div>
             </div>
          )}
       </Modal>

       <Modal isOpen={editAttendanceModalOpen} onClose={() => setEditAttendanceModalOpen(false)} title="Edit Attendance">
          {selectedEmployee && (
             <div className="space-y-4 max-h-[80vh] overflow-y-auto p-1">
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                  <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed" value={selectedEmployee.employeeId?.name || ''} disabled />
               </div>
               
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed" value={selectedEmployee.date || ''} disabled />
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-[var(--color-primary)] mb-1">Clock-In Time</label>
                    <input 
                       type="datetime-local" 
                       className="w-full border-2 border-[var(--color-primary)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                       value={editClockInTime}
                       onChange={e => setEditClockInTime(e.target.value)}
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-[var(--color-primary)] mb-1">Clock-Out Time</label>
                    <div className="flex gap-2 flex-wrap">
                      <input 
                         type="datetime-local" 
                         className="w-full border-2 border-[var(--color-primary)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                         value={editClockOutTime}
                         onChange={e => setEditClockOutTime(e.target.value)}
                      />
                      <Button variant="outline" size="sm" type="button" onClick={() => setEditClockOutTime('')} title="Clear Clock-Out">
                        Clear
                      </Button>
                    </div>
                 </div>
               </div>

               <div>
                  <label className="block text-sm font-medium text-[var(--color-primary)] mb-1">Break Duration (Minutes)</label>
                  <input 
                     type="number" 
                     min="0"
                     className="w-full border-2 border-[var(--color-primary)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                     value={editBreakDuration}
                     onChange={e => setEditBreakDuration(e.target.value)}
                  />
               </div>

               <div>
                  <label className="block text-sm font-medium text-[var(--color-primary)] mb-1">Reason for Edit</label>
                  <textarea 
                     className="w-full border-2 border-[var(--color-primary)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                     placeholder="e.g., Employee forgot to clock out"
                     rows={3}
                     value={editAttendanceReason}
                     onChange={e => setEditAttendanceReason(e.target.value)}
                  ></textarea>
               </div>
               
               <div className="flex justify-end gap-3 mt-6 flex-wrap">
                   <Button variant="outline" onClick={() => setEditAttendanceModalOpen(false)}>Cancel</Button>
                   <Button variant="primary" onClick={async () => {
                      if (!editClockInTime) return alert("Please select a clock-in time.");
                      
                      const formattedClockIn = moment.tz(editClockInTime, 'Asia/Kolkata').toISOString();
                      const formattedClockOut = editClockOutTime ? moment.tz(editClockOutTime, 'Asia/Kolkata').toISOString() : undefined;
                      const clearClockOut = !editClockOutTime;
                      const breakDurationMinutes = editBreakDuration ? parseInt(editBreakDuration, 10) : 0;

                      try {
                        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
                        const res = await fetch(`${apiUrl}/attendance/admin/edit-attendance/${selectedEmployee.session._id}`, {
                           method: 'PUT',
                           headers: { 'Authorization': `Bearer ${(useAuthStore.getState().token || localStorage.getItem('token'))}`, 'Content-Type': 'application/json' },
                           body: JSON.stringify({ 
                             clockIn: formattedClockIn, 
                             clockOut: formattedClockOut, 
                             clearClockOut, 
                             breakDurationMinutes, 
                             reason: editAttendanceReason 
                           })
                        });
                        const data = await res.json();
                        
                        if (data.success) {
                           setEditAttendanceModalOpen(false);
                           setSelectedEmployee(null);
                           fetchAdminAttendance();
                        } else {
                           alert(data.message || 'Unable to update attendance.');
                        }
                      } catch(e) { 
                        console.error(e); 
                        alert('Unable to update attendance. Please try again.');
                      }
                   }}>Save Changes</Button>
               </div>
             </div>
          )}
       </Modal>

    </div>
  );
};


const TimelineItem = ({ time, text, icon, color }: any) => (
  <div className="relative flex items-center z-10">
    <div className={`flex items-center justify-center w-7 h-7 rounded-full border shadow-sm ${color}`}>
      {icon}
    </div>
    <div className="ml-4 flex justify-between w-full">
      <span className="font-semibold text-sm text-[var(--color-text-primary)]">{text}</span>
      <span className="text-xs text-[var(--color-text-muted)] font-medium">{time}</span>
    </div>
  </div>
);

const StatusBadge = ({ isActive, isOnBreak, isCompleted, dailyStatus }: any) => {
  if (isActive) return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-green-100 text-green-700 border border-green-200">● WORKING</span>;
  if (isOnBreak) return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-100 text-orange-700 border border-orange-200">● ON BREAK</span>;
  if (isCompleted) return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 border border-blue-200">COMPLETED</span>;
  
  if (dailyStatus === 'LATE') return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-yellow-100 text-yellow-700 border border-yellow-200">LATE</span>;
  if (dailyStatus === 'ABSENT') return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-700 border border-red-200">ABSENT</span>;
  
  return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600 border border-gray-200">NOT CLOCKED IN</span>;
}

export default AttendanceManagement;
