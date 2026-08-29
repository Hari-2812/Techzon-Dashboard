import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useDashboard } from '../hooks/useDashboard';
import { Users, UserCheck, MessageCircle, TrendingUp, Clock, AlertCircle, ClipboardList } from 'lucide-react';
import { KpiCard } from '../components/ui/KpiCard';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAttendance } from '../hooks/useAttendance';
import { AttendanceControls } from '../components/ui/AttendanceControls';
import { HolidayPopup } from '../components/ui/HolidayPopup';
import { useHolidays } from '../hooks/useHolidays';
import { useDailyUpdates } from '../hooks/useDailyUpdates';
import socket from '../services/socket';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import api from '../services/api';

const Dashboard = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'ADMIN';
  const queryClient = useQueryClient();

  const { data: metrics, isLoading: dashboardLoading } = useDashboard(user?.role);

  // Admin Attendance Stats
  const { data: adminAttendance } = useQuery({
      queryKey: ['adminAttendanceTodayDashboard'],
      queryFn: async () => {
          const res = await api.get('/attendance/admin/today');
          return res.data.data;
      },
      enabled: isAdmin,
      refetchInterval: 30000 // Refresh every 30s
  });


  
  // Daily Updates
  const { getAnalytics } = useDailyUpdates();
  const { data: updatesAnalytics } = getAnalytics();
  const summary = updatesAnalytics?.summary || {};
  
  // Attendance State
  const attendance = useAttendance();
  const { myResponses } = useHolidays();
  const isDev = import.meta.env.MODE === 'development';

  useEffect(() => {
    const handleLeadsSynced = (data: any) => {
        // Just invalidate queries for real-time update
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    };

    const handleAttendanceUpdate = () => {
        queryClient.invalidateQueries({ queryKey: ['adminAttendanceTodayDashboard'] });
    };

    socket.on('leads:synced', handleLeadsSynced);
    
    // Attendance Socket Events
    if (isAdmin) {
        socket.on('employee:clocked-in', handleAttendanceUpdate);
        socket.on('employee:clocked-out', handleAttendanceUpdate);
        socket.on('employee:on-break', handleAttendanceUpdate);
        socket.on('employee:resumed', handleAttendanceUpdate);
        socket.on('attendance:clock-in-request', handleAttendanceUpdate);
        socket.on('attendance:clock-in-approved', handleAttendanceUpdate);
        socket.on('attendance:clock-out-request', handleAttendanceUpdate);
        socket.on('attendance:clock-out-approved', handleAttendanceUpdate);
        socket.on('attendance:break-approved', handleAttendanceUpdate);
        socket.on('attendance:admin-force-clock-out', handleAttendanceUpdate);
        socket.on('attendance:admin-edit-clock-out', handleAttendanceUpdate);
        socket.on('attendance:admin-edit-attendance', handleAttendanceUpdate);
        socket.on('leaveRequest:updated', handleAttendanceUpdate);
    }

    return () => {
      socket.off('leads:synced', handleLeadsSynced);
      if (isAdmin) {
          socket.off('employee:clocked-in', handleAttendanceUpdate);
          socket.off('employee:clocked-out', handleAttendanceUpdate);
          socket.off('employee:on-break', handleAttendanceUpdate);
          socket.off('employee:resumed', handleAttendanceUpdate);
          socket.off('attendance:clock-in-request', handleAttendanceUpdate);
          socket.off('attendance:clock-out-request', handleAttendanceUpdate);
          socket.off('attendance:admin-force-clock-out', handleAttendanceUpdate);
          socket.off('attendance:admin-edit-clock-out', handleAttendanceUpdate);
          socket.off('attendance:admin-edit-attendance', handleAttendanceUpdate);
          socket.off('leaveRequest:updated', handleAttendanceUpdate);
      }
    };
  }, [queryClient, isAdmin]);

  const [now, setNow] = useState(Date.now());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const { data: attData, isLoading: attLoading, isClockedIn, isOnBreak, isCompleted, isTestSession, getLiveTimer, testReset } = attendance;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
            Good Morning, {user?.name.split(' ')[0] || (isAdmin ? 'Admin' : 'Employee')} 👋
          </h1>
          <p className="text-gray-500 font-medium mt-1">Here is what's happening with your workflow today.</p>
        </div>
        
        {isAdmin && (
          <Button onClick={() => navigate('/leads')} className="shadow-sm">
            + Add New Lead
          </Button>
        )}
      </div>

      <HolidayPopup />

      {/* Holiday Response Banner (Employee Only) */}
      {!isAdmin && myResponses && myResponses.length > 0 && (
         <div className="space-y-3 mb-6">
            {myResponses.map((res: any) => (
               <div key={res._id} className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
                  <div>
                     <p className="text-sm font-semibold text-blue-900 tracking-wide">Government Holiday: {res.holidayId?.name} &bull; {new Date(res.holidayDate).toLocaleDateString()}</p>
                     <p className="text-xs text-blue-700 mt-1">
                        Your response: <span className="font-bold">{res.response === 'TAKE_LEAVE' ? 'Leave Requested' : 'Will Work'}</span>
                        {' | '}Status: <span className="font-bold">{res.status}</span>
                     </p>
                  </div>
               </div>
            ))}
         </div>
      )}

      {/* ADMIN ONLY: ATTENDANCE WIDGET */}
      {isAdmin && (
        <Card className="p-0 overflow-hidden border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
            <h2 className="text-lg font-bold text-gray-900 flex items-center">
              <Clock className="mr-2 text-[var(--color-primary)]" size={20} /> LIVE ATTENDANCE
            </h2>
          </div>
          <div className="p-6 bg-gray-50/50">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              
              <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between hover:border-green-300 transition-colors">
                 <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Present</p>
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                       <UserCheck size={16} className="text-green-600" />
                    </div>
                 </div>
                 <p className="text-3xl font-black text-gray-900">{adminAttendance?.summary?.present || 0}</p>
              </div>

              <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between hover:border-blue-300 transition-colors">
                 <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Working</p>
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                       <TrendingUp size={16} className="text-blue-600" />
                    </div>
                 </div>
                 <p className="text-3xl font-black text-gray-900">{adminAttendance?.summary?.currentlyWorking || 0}</p>
              </div>

              <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between hover:border-orange-300 transition-colors">
                 <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">On Break</p>
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                       <Clock size={16} className="text-orange-600" />
                    </div>
                 </div>
                 <p className="text-3xl font-black text-gray-900">{adminAttendance?.summary?.onBreak || 0}</p>
              </div>

              <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between hover:border-red-300 transition-colors">
                 <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Not Clocked In</p>
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                       <AlertCircle size={16} className="text-red-600" />
                    </div>
                 </div>
                 <p className="text-3xl font-black text-gray-900">{adminAttendance?.summary?.notClockedIn || 0}</p>
              </div>

            </div>
          </div>
          <div className="px-6 py-3 bg-white border-t border-gray-100 flex justify-end">
            <button 
              onClick={() => navigate('/attendance-management')}
              className="text-sm font-semibold text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] transition-colors flex items-center gap-1"
            >
              View Full Attendance List <span aria-hidden="true">&rarr;</span>
            </button>
          </div>
        </Card>
      )}

      {/* EMPLOYEE ONLY: ATTENDANCE WIDGET */}
      {!isAdmin && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-[var(--color-primary)] flex items-center">
              <Clock className="mr-2" size={20} /> TODAY'S ATTENDANCE {isTestSession && <span className="ml-2 text-[10px] bg-orange-100 text-[var(--color-accent)] px-2 py-1 rounded-full font-bold">TEST MODE</span>}
            </h2>
            {isDev && (
               <button 
                 onClick={() => attendance.clockIn.mutateAsync({})}
                 className="text-xs text-[var(--color-accent)] hover:underline"
                 disabled={attendance.clockIn.isPending}
               >
                 Test Cycle
               </button>
            )}
          </div>
          
          {attLoading && !attData ? (
            <p className="text-[var(--color-text-muted)]">Loading attendance...</p>
          ) : !isClockedIn && !isCompleted ? (
            <div className="flex flex-col sm:flex-row items-center justify-between bg-[var(--color-surface-light)] p-5 rounded-xl border border-[var(--color-border-subtle)]">
              <div>
                <p className="text-[var(--color-text-primary)] font-semibold text-lg">Not Clocked In</p>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">Ready to start your day?</p>
              </div>
              <div className="mt-4 sm:mt-0 w-full sm:w-auto">
                 <AttendanceControls layout="dashboard" />
              </div>
            </div>
          ) : isCompleted ? (
            <div className="flex flex-col sm:flex-row items-center justify-between bg-[var(--color-surface-light)] p-5 rounded-xl border border-[var(--color-border-subtle)]">
              <div>
                <p className="text-[var(--color-text-primary)] font-semibold text-lg flex items-center">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-text-muted)] mr-2"></span> Completed
                </p>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">Clock In: {new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(attData.session.clockInAt))} &bull; Clock Out: {new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(attData.session.clockOutAt))}</p>
              </div>
              <div className="mt-4 sm:mt-0 text-right">
                <p className="font-semibold text-[var(--color-text-primary)]">{attData.daily?.status || 'PRESENT'}</p>
                {isDev && isTestSession && (
                  <button onClick={() => testReset.mutateAsync()} className="text-xs text-[var(--color-accent)] hover:underline mt-1">Reset Test</button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between bg-[var(--color-surface-light)] p-5 rounded-xl border border-[var(--color-border-subtle)]">
              <div className="mb-4 sm:mb-0">
                <p className="font-semibold text-lg flex items-center text-[var(--color-text-primary)]">
                  <span className={`w-2 h-2 rounded-full mr-2 ${isOnBreak ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-success)]'}`}></span>
                  {isOnBreak ? 'ON BREAK' : 'WORKING'}
                </p>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">Clocked in at {new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(attData.session.clockInAt))}</p>
              </div>
              <div className="text-center mb-4 sm:mb-0">
                <div className="text-3xl font-bold text-[var(--color-text-primary)] font-mono tracking-tight">{getLiveTimer(now)}</div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                 <Button onClick={() => navigate('/attendance')} variant="outline" className="w-full sm:w-auto">View Attendance</Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* KPI Cards */}
      {dashboardLoading ? (
        <p className="text-gray-500">Loading metrics...</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <KpiCard 
            label={isAdmin ? "Total Student Leads" : "My Leads"}
            value={metrics?.totalLeads || 0} 
            icon={<Users size={24} />} 
            color="primary"
          />
          <KpiCard 
            label={isAdmin ? "New Leads" : "New / Pending"}
            value={isAdmin ? metrics?.newLeads || 0 : (metrics?.newLeads || 0) + (metrics?.pendingCalls || 0)} 
            icon={<AlertCircle size={24} />} 
            color="accent"
          />
          <KpiCard 
            label="CRs Identified" 
            value={metrics?.crsIdentified || 0} 
            icon={<UserCheck size={24} />} 
            color="info"
          />
          <KpiCard 
            label={isAdmin ? "Groups Created" : "My Groups"}
            value={metrics?.groupsCreated || 0} 
            icon={<MessageCircle size={24} />} 
            color="success"
          />
          <KpiCard 
            label="Follow-ups Due" 
            value={metrics?.followupsDue || 0} 
            icon={<TrendingUp size={24} />} 
            color="error"
          />
          <KpiCard 
            label="Updates Today" 
            value={summary?.totalUpdates || summary?.updatedLeads || 0} 
            icon={<ClipboardList size={24} />} 
            color="success"
          />
        </div>
      )}

    </div>
  );
};
export default Dashboard;
