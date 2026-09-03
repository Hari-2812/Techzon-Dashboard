import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Calendar, Clock, Coffee, LogOut, CheckCircle2, FileText, Plus, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import moment from 'moment-timezone';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableContainer } from '../components/ui/Table';
import { useAttendance } from '../hooks/useAttendance';

const Attendance = () => {
  const { user } = useAuthStore();
  const [currentDateTime, setCurrentDateTime] = useState(moment());
  
  // Date and View State
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));
  const [activeTab, setActiveTab] = useState<'DAILY' | 'MONTHLY'>('DAILY');
  
  // Monthly State
  const [monthCursor, setMonthCursor] = useState(moment().startOf('month'));
  const [monthlyData, setMonthlyData] = useState<any>(null);
  const [loadingMonthly, setLoadingMonthly] = useState(false);
  const [monthlyError, setMonthlyError] = useState(false);

  // Pass selectedDate to our hook for historical daily views
  const attendance = useAttendance(selectedDate);
  const { isClockedIn, isOnBreak, isCompleted, activeBreak, getLiveTimer, session, isPendingClockIn, isPendingClockOut, isPendingBreak, myLeaveRequests, data: dailyData, fetchMonthlySummary } = attendance;
  
  const isToday = selectedDate === moment().format('YYYY-MM-DD');

  const [isBreakModalOpen, setIsBreakModalOpen] = useState(false);
  const [breakReason, setBreakReason] = useState('Lunch');
  const [breakComment, setBreakComment] = useState('');

  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveType, setLeaveType] = useState('LEAVE');
  const [leaveDate, setLeaveDate] = useState(moment().format('YYYY-MM-DD'));
  const [leaveStartTime, setLeaveStartTime] = useState('');
  const [leaveEndTime, setLeaveEndTime] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveClockInTime, setLeaveClockInTime] = useState('');
  
  const [isClockInModalOpen, setIsClockInModalOpen] = useState(false);
  const [lateLoginReason, setLateLoginReason] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDateTime(moment());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
      if (activeTab === 'MONTHLY') {
          loadMonthlyData();
      }
  }, [monthCursor, activeTab]);

  const loadMonthlyData = async () => {
      setLoadingMonthly(true);
      setMonthlyError(false);
      try {
          const m = monthCursor.format('MM');
          const y = monthCursor.format('YYYY');
          const data = await fetchMonthlySummary(m, y);
          setMonthlyData(data);
      } catch (err) {
          console.error("Failed to load monthly attendance", err);
          setMonthlyError(true);
      }
      setLoadingMonthly(false);
  };

  const handlePrevMonth = () => setMonthCursor(prev => prev.clone().subtract(1, 'month'));
  const handleNextMonth = () => setMonthCursor(prev => prev.clone().add(1, 'month'));

  const handleSubmitLeave = async () => {
    try {
      if (!leaveDate || !leaveReason) return alert('Date and Reason are required.');
      if (leaveType === 'PERMISSION' && (!leaveStartTime || !leaveEndTime)) return alert('Start and End time are required for permissions.');
      if (leaveType === 'PERMISSION' && leaveStartTime >= leaveEndTime) return alert('End time must be after start time.');
      
      await attendance.submitLeaveRequest.mutateAsync({
        requestType: leaveType,
        date: leaveDate,
        startTime: leaveType === 'PERMISSION' ? leaveStartTime : undefined,
        endTime: leaveType === 'PERMISSION' ? leaveEndTime : undefined,
        clockInTime: leaveType === 'LATE' ? leaveClockInTime : undefined,
        reason: leaveReason
      });
      setIsLeaveModalOpen(false);
      setLeaveReason('');
      setLeaveStartTime('');
      setLeaveEndTime('');
      setLeaveClockInTime('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit request');
    }
  };

  const handleClockIn = async () => {
    if (attendance.data?.hasReminder) {
        setIsClockInModalOpen(true);
        return;
    }
    await executeClockIn();
  };

  const executeClockIn = async (reason?: string) => {
    try {
      await attendance.clockIn.mutateAsync({ lateReason: reason });
      setIsClockInModalOpen(false);
      setLateLoginReason('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to request login');
    }
  };

  const handleClockOut = async () => {
    try {
      await attendance.clockOut.mutateAsync();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to request logout');
    }
  };

  const handleStartBreak = async () => {
    try {
      await attendance.startBreak.mutateAsync({ reason: breakReason, comment: breakComment });
      setIsBreakModalOpen(false);
      setBreakReason('Lunch');
      setBreakComment('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to request break');
    }
  };

  const handleResumeWork = async () => {
    try {
      await attendance.endBreak.mutateAsync({ resumeComment: '' });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to resume work');
    }
  };

  const timerStr = getLiveTimer(currentDateTime.valueOf());

  const renderDailyContent = () => {
    if (attendance.isLoading && !attendance.data) return <div className="p-8 text-[var(--color-text-muted)] text-center">Loading...</div>;

    // View historical or completed
    if (!isToday || isCompleted || dailyData?.daily?.status === 'WEEK_OFF' || dailyData?.daily?.status === 'ABSENT' || dailyData?.daily?.status === 'HOLIDAY' || dailyData?.daily?.status === 'LEAVE') {
      const daily = dailyData?.daily;
      const s = dailyData?.session;
      
      return (
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <div className="mb-4 text-[var(--color-primary)]">
            <CheckCircle2 size={48} className={`mx-auto ${daily?.status === 'WEEK_OFF' ? 'text-blue-400' : daily?.status === 'ABSENT' ? 'text-red-500' : 'text-green-500'}`} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2 uppercase">{daily?.status ? daily.status.replace('_', ' ') : 'NO RECORD'}</h2>
          
          <div className="grid grid-cols-2 gap-8 mt-6 text-left w-full max-w-sm">
            <div>
              <p className="text-sm text-gray-500">Login</p>
              <p className="font-semibold text-gray-900">{s?.clockInAt ? new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(s.clockInAt)) : '--'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Logout</p>
              <p className="font-semibold text-gray-900">{s?.clockOutAt ? new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(s.clockOutAt)) : '--'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-gray-500">Worked Time</p>
              <p className="font-mono font-semibold text-gray-900 text-xl">{s?.clockOutAt || isToday ? timerStr : `${daily?.workedMinutes ? Math.floor(daily.workedMinutes/60) + 'h ' + (daily.workedMinutes%60) + 'm' : '00h 00m'}`}</p>
            </div>
          </div>
        </div>
      );
    }

    if (isPendingClockIn) {
      return (
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <div className="animate-pulse w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center mb-4">
             <Clock size={24} className="text-yellow-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">WAITING FOR APPROVAL</h2>
          <p className="text-gray-500">Your login request is waiting for admin approval.</p>
        </div>
      );
    }

    if (isPendingBreak) {
      return (
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <div className="animate-pulse w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center mb-4">
             <Clock size={24} className="text-yellow-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">WAITING FOR BREAK APPROVAL</h2>
          <p className="text-gray-500">Your break request is waiting for admin approval.</p>
        </div>
      );
    }
    
    if (isPendingClockOut) {
      return (
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <div className="animate-pulse w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center mb-4">
             <Clock size={24} className="text-yellow-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">WAITING FOR LOGOUT APPROVAL</h2>
          <p className="text-gray-500">Your logout request is waiting for admin approval.</p>
          <div className="mt-6 text-3xl font-mono font-bold text-gray-800">{timerStr}</div>
        </div>
      );
    }

    if (isOnBreak && activeBreak) {
      return (
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mb-4">
             <Coffee size={32} className="text-orange-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">ON BREAK</h2>
          <div className="flex flex-col gap-2 mt-2 mb-6">
            <p className="text-gray-600">Reason: <strong>{activeBreak.reason}</strong></p>
            <p className="text-sm text-gray-500">Started: {new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(activeBreak.startAt))}</p>
          </div>
          <Button size="lg" onClick={handleResumeWork}>RESUME WORK</Button>
        </div>
      );
    }

    if (isClockedIn) {
      return (
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse mb-2"></div>
          <h2 className="text-sm font-semibold text-green-600 uppercase tracking-widest mb-6">WORKING</h2>
          
          <div className="mb-8">
            <p className="text-sm text-gray-500 mb-1">WORKED TIME</p>
            <div className="text-5xl font-mono font-bold text-gray-900 tracking-tight">{timerStr}</div>
            <p className="text-xs text-gray-400 mt-2">Started {session?.clockInAt ? new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(session.clockInAt)) : '--'}</p>
          </div>
          
          <div className="flex gap-4 flex-wrap">
            <Button variant="outline" size="lg" onClick={() => setIsBreakModalOpen(true)} className="gap-2">
               <Coffee size={18} /> TAKE BREAK
            </Button>
            <Button variant="danger" size="lg" onClick={handleClockOut} className="gap-2" disabled={attendance.clockOut.isPending}>
               <LogOut size={18} /> {attendance.clockOut.isPending ? 'Submitting Logout...' : 'LOGOUT'}
            </Button>
          </div>
        </div>
      );
    }

    // Default state: Ready to check in
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Ready to start your day?</h2>
        <p className="text-gray-500 mb-8">Click below to send a login request to your admin.</p>
        <div className="flex flex-col gap-4 w-full max-w-sm mx-auto">
          <Button size="lg" className="w-full h-14 text-lg" onClick={handleClockIn} disabled={attendance.clockIn.isPending}>
            {attendance.clockIn.isPending ? 'Submitting Login...' : 'LOGIN'}
          </Button>
        </div>
      </div>
    );
  };

  const renderMonthlyContent = () => {
      if (loadingMonthly) {
          return <div className="text-center py-12 text-gray-500">Loading monthly attendance...</div>;
      }
      if (monthlyError) {
          return (
              <div className="text-center py-12 text-red-500">
                  <p>Unable to load monthly attendance.</p>
                  <Button variant="outline" className="mt-4" onClick={loadMonthlyData}>Retry</Button>
              </div>
          );
      }
      if (!monthlyData || !monthlyData.records || monthlyData.records.length === 0) {
          return <div className="text-center py-12 text-gray-500">No attendance records found for this month.</div>;
      }
      
      
      const { summary, records } = monthlyData;

      const getStatusColor = (status: string) => {
          switch(status) {
              case 'PRESENT': case 'COMPLETED': case 'WORKING': return 'bg-green-100 text-green-700';
              case 'ABSENT': return 'bg-red-100 text-red-700';
              case 'LATE': case 'HALF_DAY': return 'bg-yellow-100 text-yellow-700';
              case 'LEAVE': case 'PAID_LEAVE': case 'Leave Approved': return 'bg-purple-100 text-purple-700';
              case 'WEEK_OFF': return 'bg-blue-50 text-blue-600';
              case 'HOLIDAY': return 'bg-teal-100 text-teal-700';
              default: return 'bg-gray-100 text-gray-600';
          }
      };

      const getStatusAbbr = (status: string) => {
          switch(status) {
              case 'PRESENT': case 'COMPLETED': case 'WORKING': return 'P';
              case 'ABSENT': return 'A';
              case 'LATE': return 'L';
              case 'HALF_DAY': return 'HD';
              case 'LEAVE': case 'PAID_LEAVE': case 'Leave Approved': return 'LV';
              case 'WEEK_OFF': return 'WO';
              case 'HOLIDAY': return 'H';
              case 'PERMISSION': return 'PM';
              default: return '-';
          }
      };

      // Generate Calendar Grid
      const daysInMonth = monthCursor.daysInMonth();
      const firstDay = monthCursor.clone().startOf('month').day();
      const calendarCells = [];
      
      for (let i = 0; i < firstDay; i++) calendarCells.push(<div key={`empty-${i}`} className="h-10"></div>);
      
      for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = `${monthCursor.format('YYYY-MM')}-${d.toString().padStart(2, '0')}`;
          const record = records.find((r: any) => r.date === dateStr);
          
          let colorClass = 'bg-gray-50 text-gray-400';
          let label = '';
          
          if (record) {
              colorClass = getStatusColor(record.status);
              label = getStatusAbbr(record.status);
          } else if (moment(dateStr).isAfter(moment(), 'day')) {
              colorClass = 'bg-gray-50 text-gray-300';
          }
          
          calendarCells.push(
              <div key={d} className="aspect-square flex flex-col items-center justify-center border border-gray-100 rounded-md p-1">
                  <span className="text-xs text-gray-400 mb-1">{d}</span>
                  <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${colorClass}`}>
                      {label}
                  </span>
              </div>
          );
      }

      return (
          <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-800">{monthCursor.format('MMMM YYYY')} Summary</h3>
                  <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handlePrevMonth}><ChevronLeft size={16} /></Button>
                      <Button variant="outline" size="sm" onClick={handleNextMonth}><ChevronRight size={16} /></Button>
                  </div>
              </div>
              
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                  <div className="bg-white p-3 rounded-lg border text-center shadow-sm">
                      <div className="text-xs text-gray-500 uppercase font-semibold">Present</div>
                      <div className="text-xl font-bold text-green-600">{summary.present}</div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border text-center shadow-sm">
                      <div className="text-xs text-gray-500 uppercase font-semibold">Late</div>
                      <div className="text-xl font-bold text-yellow-600">{summary.late}</div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border text-center shadow-sm">
                      <div className="text-xs text-gray-500 uppercase font-semibold">Absent</div>
                      <div className="text-xl font-bold text-red-600">{summary.absent}</div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border text-center shadow-sm">
                      <div className="text-xs text-gray-500 uppercase font-semibold">Leave</div>
                      <div className="text-xl font-bold text-purple-600">{summary.onLeave}</div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border text-center shadow-sm">
                      <div className="text-xs text-gray-500 uppercase font-semibold">Half Day</div>
                      <div className="text-xl font-bold text-orange-500">{summary.halfDay}</div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border text-center shadow-sm">
                      <div className="text-xs text-gray-500 uppercase font-semibold">Week Off</div>
                      <div className="text-xl font-bold text-blue-600">{summary.weekOff}</div>
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
                      {calendarCells}
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-primary)] mb-1">
            Good {currentDateTime.hour() < 12 ? 'Morning' : 'Afternoon'}, {user?.name?.split(' ')[0] || 'User'} 👋
          </h1>
          <p className="text-lg text-[var(--color-text-muted)] flex items-center gap-2 flex-wrap">
            <Clock size={18} />
            {currentDateTime.format('dddd, MMMM D, YYYY - hh:mm A')}
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => setIsLeaveModalOpen(true)}>
          <Plus size={18} /> Request Leave / Permission
        </Button>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-1 rounded-xl shadow-sm border border-gray-200/60">
        <div className="flex gap-1 p-1 bg-gray-100/50 rounded-lg w-full sm:w-auto">
            <button 
                onClick={() => setActiveTab('DAILY')}
                className={`flex-1 sm:flex-none px-6 py-2 rounded-md text-sm font-semibold transition-all ${activeTab === 'DAILY' ? 'bg-white text-[var(--color-primary)] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Daily View
            </button>
            <button 
                onClick={() => setActiveTab('MONTHLY')}
                className={`flex-1 sm:flex-none px-6 py-2 rounded-md text-sm font-semibold transition-all ${activeTab === 'MONTHLY' ? 'bg-white text-[var(--color-primary)] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Monthly Summary
            </button>
        </div>
        
        {activeTab === 'DAILY' && (
            <div className="flex items-center gap-2 px-2 pb-2 sm:pb-0">
                <Calendar size={18} className="text-gray-400" />
                <input 
                    type="date" 
                    value={selectedDate} 
                    onChange={(e) => setSelectedDate(e.target.value)}
                    max={moment().format('YYYY-MM-DD')}
                    className="border-none bg-transparent text-sm font-medium text-gray-700 focus:ring-0 outline-none cursor-pointer"
                />
            </div>
        )}
      </div>

      <Card className="shadow-lg border-0 overflow-hidden bg-white/50 backdrop-blur-xl">
        <CardContent className="p-4 sm:p-6">
           {activeTab === 'DAILY' ? renderDailyContent() : renderMonthlyContent()}
        </CardContent>
      </Card>

      {/* My Requests Section */}
      <Card className="shadow-sm border-0 overflow-hidden bg-white mt-8">
        <CardContent className="p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><FileText size={20}/> My Requests History</h2>
          <TableContainer>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Admin Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myLeaveRequests?.length ? (
                  myLeaveRequests.map((req: any) => (
                    <TableRow key={req._id}>
                      <TableCell className="font-medium">{req.requestType}</TableCell>
                      <TableCell>{new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium' }).format(new Date(req.date))}</TableCell>
                      <TableCell>{req.requestType === 'PERMISSION' ? `${req.startTime} - ${req.endTime}` : req.requestType === 'LATE' ? req.clockInTime : '--'}</TableCell>
                      <TableCell>{req.reason}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          req.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                          req.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {req.status}
                        </span>
                      </TableCell>
                      <TableCell>{req.adminRemarks || '--'}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-gray-500">No requests found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Modals */}
      <Modal isOpen={isLeaveModalOpen} onClose={() => setIsLeaveModalOpen(false)} title="Attendance Request">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Request Type *</label>
            <select
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
            >
              <option value="LATE">Late Arrival</option>
              <option value="LEAVE">Leave</option>
              <option value="PERMISSION">Permission (Short Leave)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded-md p-2"
              value={leaveDate}
              onChange={(e) => setLeaveDate(e.target.value)}
            />
          </div>
          {leaveType === 'PERMISSION' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
                <input
                  type="time"
                  className="w-full border border-gray-300 rounded-md p-2"
                  value={leaveStartTime}
                  onChange={(e) => setLeaveStartTime(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time *</label>
                <input
                  type="time"
                  className="w-full border border-gray-300 rounded-md p-2"
                  value={leaveEndTime}
                  onChange={(e) => setLeaveEndTime(e.target.value)}
                />
              </div>
            </div>
          )}
          {leaveType === 'LATE' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expected / Actual Login Time *</label>
              <input
                type="time"
                className="w-full border border-gray-300 rounded-md p-2"
                value={leaveClockInTime}
                onChange={(e) => setLeaveClockInTime(e.target.value)}
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
            <textarea
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
              rows={3}
              placeholder="Please explain the reason..."
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setIsLeaveModalOpen(false)}>CANCEL</Button>
            <Button onClick={handleSubmitLeave}>SUBMIT REQUEST</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isBreakModalOpen} onClose={() => setIsBreakModalOpen(false)} title="Request Break">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for break *</label>
            <select
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
              value={breakReason}
              onChange={(e) => setBreakReason(e.target.value)}
            >
              <option value="Lunch">Lunch</option>
              <option value="Tea / Coffee">Tea / Coffee</option>
              <option value="Personal Work">Personal Work</option>
              <option value="Client Discussion">Client Discussion</option>
              <option value="Internal Meeting">Internal Meeting</option>
              <option value="Technical Issue">Technical Issue</option>
              <option value="Training">Training</option>
              <option value="Official Work">Official Work</option>
              <option value="Other">Other</option>
            </select>
          </div>
          {breakReason === 'Other' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Comment *</label>
              <textarea
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                rows={3}
                placeholder="Please specify..."
                value={breakComment}
                onChange={(e) => setBreakComment(e.target.value)}
              />
            </div>
          )}
          <div className="flex justify-end gap-3 mt-6 flex-wrap">
            <Button variant="outline" onClick={() => setIsBreakModalOpen(false)}>CANCEL</Button>
            <Button onClick={handleStartBreak}>REQUEST BREAK</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isClockInModalOpen} onClose={() => setIsClockInModalOpen(false)} title="Login Explanation">
          <div className="space-y-4">
              <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded border border-yellow-200">
                  You are logging in late today. Please provide a reason for the delay.
              </p>
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                  <textarea
                      className="w-full border border-gray-300 rounded-md p-2 focus:ring-[var(--color-primary)]"
                      rows={3}
                      placeholder="Why are you checking in late?"
                      value={lateLoginReason}
                      onChange={(e) => setLateLoginReason(e.target.value)}
                  />
              </div>
              <div className="flex justify-end gap-3 mt-6 flex-wrap">
                  <Button variant="outline" onClick={() => setIsClockInModalOpen(false)}>CANCEL</Button>
                  <Button onClick={() => executeClockIn(lateLoginReason)} disabled={!lateLoginReason.trim()}>SUBMIT & LOGIN</Button>
              </div>
          </div>
      </Modal>
    </div>
  );
};

export default Attendance;
