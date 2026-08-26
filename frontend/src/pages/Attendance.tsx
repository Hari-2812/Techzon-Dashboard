import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Calendar, AlertCircle } from 'lucide-react';
import moment from 'moment-timezone';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableContainer } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { useAttendance } from '../hooks/useAttendance';
import { AttendanceControls } from '../components/ui/AttendanceControls';

const Attendance = () => {
  const { user } = useAuthStore();
  const attendance = useAttendance();
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [currentDateTime, setCurrentDateTime] = useState(moment());
  
  const [currentMonth, setCurrentMonth] = useState(moment().format('MM'));
  const [currentYear, setCurrentYear] = useState(moment().format('YYYY'));
  
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [corrDate, setCorrDate] = useState(moment().format('YYYY-MM-DD'));
  const [corrType, setCorrType] = useState('Missing Clock-Out');
  const [corrReason, setCorrReason] = useState('');
  const [corrComment, setCorrComment] = useState('');

  const fetchMonthly = async (m: string, y: string) => {
    try {
      const res = await api.get(`/attendance/monthly?month=${m}&year=${y}`);
      if (res.data.success) {
        setMonthlyData(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDateTime(moment());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchMonthly(currentMonth, currentYear);
  }, [currentMonth, currentYear, attendance.data]); // Refetch monthly when today's attendance changes

  const handleSubmitCorrection = async () => {
    if (!corrReason.trim()) {
      alert("Reason is required");
      return;
    }
    try {
      await api.post('/attendance/correction', { date: corrDate, type: corrType, reason: corrReason, comment: corrComment });
      setIsCorrectionModalOpen(false);
      alert("Correction request submitted successfully.");
      setCorrReason('');
      setCorrComment('');
    } catch (err: any) {
        alert(err.response?.data?.message || 'Error occurred');
    }
  };

  if (attendance.isLoading && !attendance.data) return <div className="p-8 text-[var(--color-text-muted)]">Loading attendance profile...</div>;

  const data = attendance.data;
  const { isClockedIn, isOnBreak, isCompleted, activeBreak, getLiveTimer } = attendance;

  // Calculate Progress
  let timerStr = getLiveTimer(new Date().getTime());
  let workedHoursStr = timerStr;
  let progressPercent = 0;
  if (isCompleted && data?.daily) {
    const h = Math.floor(data.daily.workedMinutes / 60);
    const m = data.daily.workedMinutes % 60;
    workedHoursStr = `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m`;
    progressPercent = Math.min(100, Math.round((data.daily.workedMinutes / (8 * 60)) * 100));
  } else if (isClockedIn) {
    const parts = timerStr.split(' ');
    const h = parseInt(parts[0].replace('h', '')) || 0;
    const m = parseInt(parts[1]?.replace('m', '')) || 0;
    progressPercent = Math.min(100, Math.round(((h * 60 + m) / (8 * 60)) * 100));
  }
  
  let totalBreakMinutes = 0;
  if (data?.session?.breaks) {
    data.session.breaks.forEach((b: any) => {
      if (b.durationMinutes) totalBreakMinutes += b.durationMinutes;
      else if (b.endAt) totalBreakMinutes += moment(b.endAt).diff(moment(b.startAt), 'minutes');
      else totalBreakMinutes += moment().diff(moment(b.startAt), 'minutes');
    });
  }

  let activeBreakDuration = '0m';
  if (activeBreak) {
    const diff = moment().diff(moment(activeBreak.startAt), 'minutes');
    activeBreakDuration = `${diff}m`;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-primary)] mb-1">
            Good {currentDateTime.hour() < 12 ? 'Morning' : 'Afternoon'}, {user?.name?.split(' ')[0] || 'User'} 👋
          </h1>
          <p className="text-[var(--color-text-muted)]">Here's your attendance and work summary for today.</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-medium text-[var(--color-text-primary)]">{currentDateTime.format('dddd, MMMM D, YYYY')}</p>
          <p className="text-sm text-[var(--color-text-muted)]">{currentDateTime.format('hh:mm:ss A')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-1 space-y-6">
          <Card className="overflow-hidden border-[var(--color-border-subtle)]">
            <div className="p-6 border-b border-[var(--color-border-subtle)] flex justify-between items-center bg-[var(--color-surface-light)]">
              <h2 className="font-bold text-[var(--color-text-primary)]">TODAY'S ATTENDANCE</h2>
              <span className="text-sm text-[var(--color-text-muted)] font-medium">{currentDateTime.format('MMM D')}</span>
            </div>
            
            <CardContent className="p-8 flex flex-col items-center text-center">
              {/* Status Pill */}
              <div className={`mb-6 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider border flex items-center ${
                !isClockedIn && !isCompleted ? 'bg-gray-50 border-gray-200 text-gray-500' :
                isCompleted ? 'bg-blue-50 border-blue-200 text-blue-700' :
                isOnBreak ? 'bg-orange-50 border-orange-200 text-orange-700' :
                'bg-green-50 border-green-200 text-[var(--color-success)]'
              }`}>
                <span className={`w-2 h-2 rounded-full mr-2 ${
                  !isClockedIn && !isCompleted ? 'bg-gray-400' :
                  isCompleted ? 'bg-blue-500' :
                  isOnBreak ? 'bg-orange-500' :
                  'bg-green-500'
                }`}></span>
                {!isClockedIn && !isCompleted ? 'NOT CLOCKED IN' : isCompleted ? 'COMPLETED' : isOnBreak ? 'ON BREAK' : 'WORKING'}
              </div>

              {/* Circular Progress Timer */}
              <div className="my-8 relative w-48 h-48 md:w-56 md:h-56 mx-auto flex items-center justify-center">
                 {/* Background Circle */}
                 <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                    <circle cx="50%" cy="50%" r="45%" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-100" />
                    {/* Progress Circle */}
                    <circle 
                      cx="50%" cy="50%" r="45%" 
                      stroke="currentColor" strokeWidth="8" fill="transparent" 
                      strokeDasharray="283" // 2 * PI * 45 ≈ 282.7
                      strokeDashoffset={283 - (283 * progressPercent) / 100}
                      className={`transition-all duration-1000 ease-out ${
                         !isClockedIn && !isCompleted ? 'text-gray-300' :
                         isCompleted ? 'text-blue-500' :
                         isOnBreak ? 'text-orange-500' :
                         'text-[var(--color-success)]'
                      }`} 
                    />
                 </svg>
                 <div className="z-10 flex flex-col items-center">
                    <span className="text-3xl md:text-4xl font-black text-[var(--color-text-primary)] font-mono tracking-tighter">
                      {!isClockedIn && !isCompleted ? '00h 00m' : workedHoursStr}
                    </span>
                    <p className="text-xs md:text-sm text-[var(--color-text-muted)] font-medium mt-1">Worked Time</p>
                 </div>
              </div>

              {/* Active Break Display */}
              {isOnBreak && activeBreak && (
                <div className="w-full bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 text-left">
                  <div className="text-xs font-bold text-orange-800 tracking-wider mb-2">BREAK IN PROGRESS</div>
                  <div className="text-sm text-orange-900 mb-1"><strong>Started:</strong> {moment(activeBreak.startAt).format('hh:mm A')}</div>
                  <div className="text-sm text-orange-900 mb-1"><strong>Reason:</strong> {activeBreak.reason}</div>
                  <div className="text-sm text-orange-900"><strong>Duration:</strong> {activeBreakDuration}</div>
                </div>
              )}

              {/* Controls */}
              <div className="w-full">
                {isCompleted && data?.session?.clockInAt ? (
                  <div className="bg-[var(--color-surface-light)] p-4 rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)] text-sm mb-4">
                    <div className="flex justify-between mb-2"><span className="text-[var(--color-text-muted)]">Clock In</span><span className="font-semibold text-[var(--color-text-primary)]">{new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(data.session.clockInAt))}</span></div>
                    <div className="flex justify-between"><span className="text-[var(--color-text-muted)]">Clock Out</span><span className="font-semibold text-[var(--color-text-primary)]">{new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(data.session.clockOutAt))}</span></div>
                  </div>
                ) : null}

                <AttendanceControls layout="full" />
              </div>

            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Summary Cards */}
          <div>
            <h3 className="text-sm font-bold text-[var(--color-text-muted)] tracking-wider uppercase mb-3">Today's Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SummaryCard label="Worked Today" value={!isClockedIn && !isCompleted ? '00h 00m' : workedHoursStr} />
              <SummaryCard label="Scheduled" value="08h 00m" />
              <SummaryCard label="Break Time" value={data?.session ? `${Math.floor(totalBreakMinutes/60)}h ${totalBreakMinutes%60}m` : '00h 00m'} />
              <SummaryCard label="Remaining" value={!isClockedIn && !isCompleted ? '08h 00m' : (progressPercent >= 100 ? '00h 00m' : '...')} />
            </div>
          </div>

          {/* Today's Breaks */}
          {data?.session?.breaks && data.session.breaks.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">Today's Breaks</h3>
                
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[#F8F9FA] text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)]">
                            <tr>
                                <th className="px-4 py-2 font-medium">Start</th>
                                <th className="px-4 py-2 font-medium">End</th>
                                <th className="px-4 py-2 font-medium">Duration</th>
                                <th className="px-4 py-2 font-medium">Reason</th>
                                <th className="px-4 py-2 font-medium">Comment</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border-subtle)]">
                            {data.session.breaks.map((b: any, idx: number) => (
                                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-gray-900">{moment(b.startAt).format('hh:mm A')}</td>
                                    <td className="px-4 py-3 text-gray-700">{b.endAt ? moment(b.endAt).format('hh:mm A') : 'Ongoing'}</td>
                                    <td className="px-4 py-3 font-mono">{b.durationMinutes != null ? `${b.durationMinutes}m` : `${moment().diff(moment(b.startAt), 'minutes')}m (ongoing)`}</td>
                                    <td className="px-4 py-3 font-medium text-[var(--color-primary)]">{b.reason || '-'}</td>
                                    <td className="px-4 py-3 text-gray-600 text-xs max-w-xs truncate" title={b.comment}>{b.comment || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="md:hidden space-y-3">
                  {data.session.breaks.map((b: any, idx: number) => (
                    <div key={idx} className="bg-gray-50 border border-[var(--color-border-subtle)] p-3 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                           <p className="font-bold text-[var(--color-primary)]">{b.reason || 'Break'}</p>
                           <p className="text-xs text-gray-500">{moment(b.startAt).format('hh:mm A')} - {b.endAt ? moment(b.endAt).format('hh:mm A') : 'Ongoing'}</p>
                        </div>
                        <div className="text-right">
                           <span className="font-mono font-bold text-gray-800">{b.durationMinutes != null ? `${b.durationMinutes}m` : `${moment().diff(moment(b.startAt), 'minutes')}m`}</span>
                        </div>
                      </div>
                      {b.comment && <p className="text-sm text-gray-600 mt-2">"{b.comment}"</p>}
                    </div>
                  ))}
                </div>
              </Card>
          )}

          {/* Monthly Attendance */}
          <TableContainer>
             <div className="p-6 border-b border-[var(--color-border-subtle)] flex flex-wrap justify-between items-center gap-4 bg-[var(--color-surface-light)]">
                <h3 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center">
                  <Calendar className="mr-2 text-[var(--color-primary)]" size={20} /> Attendance History
                </h3>
                <div className="flex items-center gap-4">
                  <Button variant="outline" size="sm" onClick={() => setIsCorrectionModalOpen(true)}>
                    <AlertCircle size={14} className="mr-1"/> Request Correction
                  </Button>
                  <div className="flex items-center gap-2">
                    <select 
                      value={currentMonth} 
                      onChange={e => setCurrentMonth(e.target.value)}
                      className="p-2 border border-[var(--color-border-subtle)] rounded-lg text-sm bg-white"
                    >
                      {Array.from({length: 12}).map((_, i) => (
                        <option key={i} value={(i+1).toString().padStart(2, '0')}>{moment().month(i).format('MMMM')}</option>
                      ))}
                    </select>
                    <select 
                      value={currentYear} 
                      onChange={e => setCurrentYear(e.target.value)}
                      className="p-2 border border-[var(--color-border-subtle)] rounded-lg text-sm bg-white"
                    >
                      {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
             </div>
             
             <div className="hidden md:block">
               <Table>
                   <TableHeader>
                     <TableRow>
                       <TableHead>Date</TableHead>
                       <TableHead>Clock In</TableHead>
                       <TableHead>Clock Out</TableHead>
                       <TableHead>Worked</TableHead>
                       <TableHead>Break</TableHead>
                       <TableHead>Status</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {monthlyData.length > 0 ? monthlyData.map((d, i) => (
                       <TableRow key={i}>
                         <TableCell className="font-medium text-[var(--color-text-primary)]">{moment(d.date).format('DD MMM, ddd')}</TableCell>
                         <TableCell className="text-[var(--color-text-muted)]">--:--</TableCell> 
                         <TableCell className="text-[var(--color-text-muted)]">--:--</TableCell>
                         <TableCell className="font-mono">{Math.floor(d.workedMinutes/60)}h {d.workedMinutes%60}m</TableCell>
                         <TableCell className="font-mono">{Math.floor(d.breakMinutes/60)}h {d.breakMinutes%60}m</TableCell>
                         <TableCell>
                            <Badge variant={
                              d.status === 'PRESENT' ? 'success' :
                              d.status === 'LATE' ? 'warning' :
                              d.status === 'ABSENT' ? 'error' :
                              'neutral'
                            }>
                              {d.status}
                            </Badge>
                         </TableCell>
                       </TableRow>
                     )) : (
                       <TableRow>
                         <TableCell colSpan={6} className="py-8 text-center text-[var(--color-text-muted)]">No attendance records found for this month.</TableCell>
                       </TableRow>
                     )}
                   </TableBody>
                 </Table>
             </div>

             <div className="md:hidden divide-y divide-gray-100">
               {monthlyData.length > 0 ? monthlyData.map((d, i) => (
                 <div key={i} className="p-4 bg-white">
                   <div className="flex justify-between items-center mb-2">
                     <span className="font-bold text-[var(--color-text-primary)]">{moment(d.date).format('DD MMM, ddd')}</span>
                     <Badge variant={
                        d.status === 'PRESENT' ? 'success' :
                        d.status === 'LATE' ? 'warning' :
                        d.status === 'ABSENT' ? 'error' :
                        'neutral'
                      }>
                        {d.status}
                      </Badge>
                   </div>
                   <div className="flex justify-between text-sm">
                     <div>
                       <p className="text-[var(--color-text-muted)]">Worked</p>
                       <p className="font-mono font-bold">{Math.floor(d.workedMinutes/60)}h {d.workedMinutes%60}m</p>
                     </div>
                     <div className="text-right">
                       <p className="text-[var(--color-text-muted)]">Break</p>
                       <p className="font-mono font-bold">{Math.floor(d.breakMinutes/60)}h {d.breakMinutes%60}m</p>
                     </div>
                   </div>
                 </div>
               )) : (
                 <div className="p-8 text-center text-[var(--color-text-muted)]">No attendance records found for this month.</div>
               )}
             </div>
          </TableContainer>
          
        </div>
      </div>

      {/* Correction Modal */}
      <Modal isOpen={isCorrectionModalOpen} onClose={() => setIsCorrectionModalOpen(false)} title="Request Attendance Correction">
        <div className="space-y-4 text-left">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input 
                    type="date"
                    value={corrDate}
                    onChange={(e) => setCorrDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[var(--color-primary)] outline-none"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select 
                    value={corrType}
                    onChange={(e) => setCorrType(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[var(--color-primary)] outline-none"
                >
                    <option>Missing Clock-Out</option>
                    <option>Forgot to Resume Work</option>
                    <option>Incorrect Clock-In Time</option>
                    <option>Other</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason / Details *</label>
                <textarea
                    value={corrReason}
                    onChange={(e) => setCorrReason(e.target.value)}
                    placeholder="Provide detailed explanation..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-20 resize-none focus:border-[var(--color-primary)] outline-none"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Internal Comment</label>
                <input 
                    type="text"
                    value={corrComment}
                    onChange={(e) => setCorrComment(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[var(--color-primary)] outline-none"
                />
            </div>
            <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setIsCorrectionModalOpen(false)}>Cancel</Button>
                <Button variant="primary" onClick={handleSubmitCorrection}>Submit Request</Button>
            </div>
        </div>
      </Modal>

    </div>
  );
};

const SummaryCard = ({ label, value }: { label: string, value: string }) => (
  <Card className="p-4 text-center">
    <p className="text-xs font-semibold text-[var(--color-text-muted)] mb-1 uppercase tracking-wider">{label}</p>
    <p className="text-xl font-bold text-[var(--color-text-primary)] font-mono tracking-tight">{value}</p>
  </Card>
);

export default Attendance;
