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
import moment from 'moment';
import { getNotifications, getAdminNotifications } from '../api/notifications';

const RecentNotificationsWidget = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const { data: employeeData, isLoading: empLoading } = useQuery({
    queryKey: ['notifications', 'recent'],
    queryFn: () => getNotifications(1, 5),
    enabled: !isAdmin,
  });

  const { data: adminData, isLoading: adminLoading } = useQuery({
    queryKey: ['notifications', 'admin-history', 'recent'],
    queryFn: () => getAdminNotifications(1, 5),
    enabled: isAdmin,
  });

  const loading = isAdmin ? adminLoading : empLoading;
  const notifications = isAdmin ? (adminData?.data?.notifications || []) : (employeeData?.data?.notifications || []);

  if (loading) return <div className="p-6 text-center text-gray-500">Loading notifications...</div>;
  if (notifications.length === 0) return <div className="p-6 text-center text-gray-500">No recent notifications.</div>;

  return (
    <div className="divide-y divide-gray-100">
      {notifications.map((notif: any) => (
        <div key={notif._id} className="p-4 hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded uppercase tracking-wider">
              {notif.type}
            </span>
            <h4 className="text-sm font-semibold text-gray-900">{notif.title}</h4>
          </div>
          <p className="text-sm text-gray-600 mb-1">{notif.message}</p>
          <span className="text-[10px] text-gray-400 font-medium">{moment(notif.createdAt).fromNow()}</span>
        </div>
      ))}
    </div>
  );
};

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
          const res = await api.get('/attendance-management/today');
          return res.data.data;
      },
      enabled: isAdmin,
      refetchInterval: 30000 // Refresh every 30s
  });

  // Admin Attendance Reminders
  const { data: attendanceReminders } = useQuery({
      queryKey: ['adminAttendanceRemindersDashboard'],
      queryFn: async () => {
          const res = await api.get('/attendance/reminders/today');
          return res.data.data;
      },
      enabled: isAdmin,
      refetchInterval: 60000 // Refresh every 60s
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

    const refreshAttendanceDashboard = () => {
        console.log('[Dashboard Attendance] Received event, forcing refetch.');
        // Explicitly invalidate and forcefully refetch the precise query key
        queryClient.invalidateQueries({ queryKey: ['adminAttendanceTodayDashboard'] });
        queryClient.refetchQueries({ queryKey: ['adminAttendanceTodayDashboard'] });
        queryClient.invalidateQueries({ queryKey: ['adminAttendanceRemindersDashboard'] });
        queryClient.refetchQueries({ queryKey: ['adminAttendanceRemindersDashboard'] });
    };

    socket.on('leads:synced', handleLeadsSynced);
    
    const attendanceEvents = [
        'attendance:reminder-status-updated',
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
        'leaveRequest:updated'
    ];

    if (isAdmin) {
        attendanceEvents.forEach(evt => socket.on(evt, refreshAttendanceDashboard));
    }

    return () => {
      socket.off('leads:synced', handleLeadsSynced);
      if (isAdmin) {
          attendanceEvents.forEach(evt => socket.off(evt, refreshAttendanceDashboard));
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              
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

      {/* ADMIN ONLY: ATTENDANCE REMINDERS WIDGET */}
      {isAdmin && attendanceReminders && (
        <Card className="p-0 overflow-hidden border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
            <h2 className="text-lg font-bold text-gray-900 flex items-center">
              <ClipboardList className="mr-2 text-[var(--color-primary)]" size={20} /> ATTENDANCE REMINDERS
            </h2>
          </div>
          <div className="p-6 bg-gray-50/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6">
              
              <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between hover:border-gray-300 transition-colors">
                 <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Not Clocked In</p>
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                       <Users size={16} className="text-gray-600" />
                    </div>
                 </div>
                 <p className="text-3xl font-black text-gray-900">{attendanceReminders.summary.totalNotClockedIn}</p>
              </div>

              <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between hover:border-green-300 transition-colors">
                 <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Reminder Sent</p>
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                       <UserCheck size={16} className="text-green-600" />
                    </div>
                 </div>
                 <p className="text-3xl font-black text-gray-900">{attendanceReminders.summary.sent}</p>
              </div>

              <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between hover:border-red-300 transition-colors">
                 <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Failed</p>
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                       <AlertCircle size={16} className="text-red-600" />
                    </div>
                 </div>
                 <p className="text-3xl font-black text-gray-900">{attendanceReminders.summary.failed}</p>
              </div>

              <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between hover:border-orange-300 transition-colors">
                 <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Pending</p>
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                       <Clock size={16} className="text-orange-600" />
                    </div>
                 </div>
                 <p className="text-3xl font-black text-gray-900">{attendanceReminders.summary.pending}</p>
              </div>

            </div>

            {attendanceReminders.employees && attendanceReminders.employees.length > 0 && (
               <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                 <div className="overflow-x-auto">
                   <table className="min-w-full divide-y divide-gray-200">
                     <thead className="bg-gray-50">
                       <tr>
                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reminder</th>
                       </tr>
                     </thead>
                     <tbody className="bg-white divide-y divide-gray-200">
                       {attendanceReminders.employees.map((emp: any) => (
                         <tr key={emp.employeeId} className="hover:bg-gray-50">
                           <td className="px-6 py-4 whitespace-nowrap">
                             <div className="flex flex-col">
                               <span className="text-sm font-medium text-gray-900">{emp.employeeName}</span>
                               <span className="text-xs text-gray-500">{emp.employeeDisplayId}</span>
                             </div>
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap">
                             <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                               ${emp.currentStatus === 'Not Clocked In' || emp.currentStatus === 'ABSENT' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}
                             `}>
                               {emp.currentStatus}
                             </span>
                           </td>
                           <td className="px-6 py-4">
                             <div className="flex flex-col">
                               <div className="flex items-center">
                                 {emp.status === 'SENT' && <span className="inline-flex items-center text-sm text-green-600 font-medium"><UserCheck size={16} className="mr-1"/> ✓ Mail Sent</span>}
                                 {emp.status === 'FAILED' && <span className="inline-flex items-center text-sm text-red-600 font-medium"><AlertCircle size={16} className="mr-1"/> ✕ Mail Failed</span>}
                                 {emp.status === 'PENDING' && <span className="inline-flex items-center text-sm text-orange-600 font-medium"><Clock size={16} className="mr-1"/> ○ Pending</span>}
                                 {emp.status === 'NOT_REQUIRED' && <span className="inline-flex items-center text-sm text-gray-500 font-medium">— Not Required</span>}
                               </div>
                               {emp.status === 'FAILED' && emp.failureReason && (
                                 <span className="text-xs text-red-500 mt-1 truncate max-w-xs block" title={emp.failureReason}>
                                   "{emp.failureReason}"
                                 </span>
                               )}
                             </div>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               </div>
            )}
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
                <p className="text-[var(--color-text-primary)] font-semibold text-lg">Not Logged In</p>
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
                <p className="text-sm text-[var(--color-text-muted)] mt-1">Login: {new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(attData.session.clockInAt))} &bull; Logout: {new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(attData.session.clockOutAt))}</p>
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
                <p className="text-sm text-[var(--color-text-muted)] mt-1">Logged in at {new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(attData.session.clockInAt))}</p>
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
        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
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

      {/* Recent Notifications Widget */}
      <Card className="p-0 overflow-hidden border border-gray-200 shadow-sm mt-8">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <h2 className="text-lg font-bold text-gray-900 flex items-center">
            <MessageCircle className="mr-2 text-[var(--color-primary)]" size={20} /> RECENT NOTIFICATIONS
          </h2>
          <Button onClick={() => navigate('/notifications')} variant="outline" size="sm">
            View All
          </Button>
        </div>
        <div className="p-0">
          <RecentNotificationsWidget />
        </div>
      </Card>

    </div>
  );
};
export default Dashboard;
