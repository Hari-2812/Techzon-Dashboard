import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Calendar, Clock, Coffee, LogOut, CheckCircle2, FileText, Plus } from 'lucide-react';
import moment from 'moment-timezone';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableContainer } from '../components/ui/Table';
import { useAttendance } from '../hooks/useAttendance';

const Attendance = () => {
  const { user } = useAuthStore();
  const attendance = useAttendance();
  const [currentDateTime, setCurrentDateTime] = useState(moment());
  
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
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit request');
    }
  };


  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDateTime(moment());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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
      alert(err.response?.data?.message || 'Failed to request check-in');
    }
  };

  const handleClockOut = async () => {
    try {
      await attendance.clockOut.mutateAsync();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to request check-out');
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

  if (attendance.isLoading && !attendance.data) return <div className="p-8 text-[var(--color-text-muted)]">Loading attendance profile...</div>;

  const { isClockedIn, isOnBreak, isCompleted, activeBreak, getLiveTimer, session, isPendingClockIn, isPendingClockOut, isPendingBreak, myLeaveRequests } = attendance;
  const timerStr = getLiveTimer(currentDateTime.valueOf());

  const renderContent = () => {
    if (isCompleted) {
      return (
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <CheckCircle2 size={48} className="text-green-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">ATTENDANCE COMPLETED</h2>
          <div className="grid grid-cols-2 gap-8 mt-6 text-left w-full max-w-sm">
            <div>
              <p className="text-sm text-gray-500">Clock In</p>
              <p className="font-semibold text-gray-900">{session?.clockInAt ? new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(session.clockInAt)) : '--'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Clock Out</p>
              <p className="font-semibold text-gray-900">{session?.clockOutAt ? new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(session.clockOutAt)) : '--'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-gray-500">Worked Time</p>
              <p className="font-mono font-semibold text-gray-900 text-xl">{timerStr}</p>
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
          <p className="text-gray-500">Your check-in request is waiting for admin approval.</p>
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
          <h2 className="text-xl font-bold text-gray-800 mb-2">WAITING FOR CHECK-OUT APPROVAL</h2>
          <p className="text-gray-500">Your check-out request is waiting for admin approval.</p>
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
            <Button variant="danger" size="lg" onClick={handleClockOut} className="gap-2">
               <LogOut size={18} /> CLOCK OUT
            </Button>
          </div>
        </div>
      );
    }

    // Default state: Ready to check in
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Ready to start your day?</h2>
        <p className="text-gray-500 mb-8">Click below to send a check-in request to your admin.</p>
        <div className="flex flex-col gap-4 w-full max-w-sm mx-auto">
          <Button size="lg" className="w-full h-14 text-lg" onClick={handleClockIn}>
            CHECK IN
          </Button>
          <Button size="lg" variant="outline" className="w-full h-12" onClick={() => setIsLeaveModalOpen(true)}>
            REQUEST LEAVE / PERMISSION
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-primary)] mb-1">
            Good {currentDateTime.hour() < 12 ? 'Morning' : 'Afternoon'}, {user?.name?.split(' ')[0] || 'User'} 👋
          </h1>
          <p className="text-lg text-[var(--color-text-muted)] flex items-center gap-2 flex-wrap">
            <Calendar size={18} />
            {currentDateTime.format('dddd, MMMM D, YYYY')}
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => setIsLeaveModalOpen(true)}>
          <Plus size={18} /> Request Leave / Permission
        </Button>
      </div>

      <Card className="shadow-lg border-0 overflow-hidden bg-white/50 backdrop-blur-xl">
        <CardContent className="p-0">
           {renderContent()}
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

      <Modal isOpen={isLeaveModalOpen} onClose={() => setIsLeaveModalOpen(false)} title="Today's Attendance Request">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Expected / Actual Clock-In Time *</label>
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
    </div>
  );
};

export default Attendance;
