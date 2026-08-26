import { useEffect } from 'react';
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
import { useQueryClient } from '@tanstack/react-query';

const Dashboard = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'ADMIN';
  const queryClient = useQueryClient();

  const { data: metrics, isLoading: dashboardLoading } = useDashboard(user?.role);
  
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

    socket.on('leads:synced', handleLeadsSynced);

    return () => {
      socket.off('leads:synced', handleLeadsSynced);
    };
  }, [queryClient]);

  const [now, setNow] = useState(Date.now());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const { data: attData, isLoading: attLoading, isClockedIn, isOnBreak, isCompleted, isTestSession, getLiveTimer, testReset } = attendance;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            Good Morning, {user?.name.split(' ')[0] || (isAdmin ? 'Admin' : 'Employee')} 👋
          </h1>
          <p className="text-[var(--color-text-muted)] mt-1">Here is what's happening with your workflow today.</p>
        </div>
        
        {isAdmin && (
          <Button onClick={() => navigate('/leads')}>
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
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-[var(--color-primary)] flex items-center">
              <Clock className="mr-2" size={20} /> LIVE ATTENDANCE
            </h2>
            <button 
              onClick={() => navigate('/attendance-management')}
              className="text-sm font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-light)] transition-colors"
            >
              View Attendance &rarr;
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-[var(--color-surface-light)] rounded-xl text-center">
                <p className="text-xs text-[var(--color-text-muted)] font-medium mb-1 uppercase tracking-wide">Present</p>
                <p className="text-2xl font-bold text-[var(--color-text-primary)]">View in Admin Panel</p>
              </div>
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
                 onClick={() => attendance.clockIn.mutateAsync()}
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
                 <AttendanceControls layout="dashboard" />
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
