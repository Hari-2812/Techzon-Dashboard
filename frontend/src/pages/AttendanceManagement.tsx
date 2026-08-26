import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { io, Socket } from 'socket.io-client';
import { Users, Clock, AlertCircle, CalendarX2, Search, Filter, X, Calendar, ChevronRight, Play, Square, Coffee } from 'lucide-react';
import moment from 'moment-timezone';
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
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [requestAction, setRequestAction] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [editedTime, setEditedTime] = useState('');
  const [adminComment, setAdminComment] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchAdminAttendance = async () => {
    try {
      const token = localStorage.getItem('token') || '';
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
      const [res, reqRes] = await Promise.all([
         fetch(`${apiUrl}/attendance-management/today`, { headers: { 'Authorization': `Bearer ${token}` } }),
         fetch(`${apiUrl}/attendance/requests/pending`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      const result = await res.json();
      const reqResult = await reqRes.json();

      if (result.success) setData(result.data);
      if (reqResult.success) setPendingRequests(reqResult.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminAttendance();

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
    const baseUrl = apiUrl.replace('/api', '');
    const socket: Socket = io(baseUrl, {
      withCredentials: true,
    });

    socket.on('employee:clocked-in', fetchAdminAttendance);
    socket.on('employee:clocked-out', fetchAdminAttendance);
    socket.on('employee:on-break', fetchAdminAttendance);
    socket.on('employee:resumed', fetchAdminAttendance);
    socket.on('attendance:clock-in-request', fetchAdminAttendance);
    socket.on('attendance:clock-out-request', fetchAdminAttendance);

    return () => {
      socket.disconnect();
    };
  }, []);

  if (loading && !data) return <div className="p-8 text-[var(--color-text-muted)]">Loading Admin Dashboard...</div>;

  const totalEmployees = data?.dailies?.length || 0;
  
  // Dynamic Chart Data
  const chartData = [
    { name: 'Present', value: data?.summary?.present || 0 },
    { name: 'On Break', value: data?.sessions?.filter((s:any) => s.status === 'ACTIVE' && s.breaks?.length > 0 && !s.breaks[s.breaks.length-1].endAt).length || 0 },
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
      const isActive = item.session?.status === 'ACTIVE';
      const isOnBreak = isActive && item.session?.breaks?.length > 0 && !item.session.breaks[item.session.breaks.length-1].endAt;
      const isCompleted = item.session?.status === 'COMPLETED';
      
      if (statusFilter === 'Working' && (!isActive || isOnBreak)) return false;
      if (statusFilter === 'On Break' && !isOnBreak) return false;
      if (statusFilter === 'Completed' && !isCompleted) return false;
      if (statusFilter === 'Not Clocked In' && item.session) return false;
      if (statusFilter === 'Late' && item.status !== 'LATE') return false;
      if (statusFilter === 'Absent' && item.status !== 'ABSENT') return false;
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
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm">
           <Calendar className="text-[var(--color-primary)]" size={20} />
           <span className="font-semibold text-[var(--color-text-primary)]">Today, {moment().format('MMM DD, YYYY')}</span>
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
          <p className="text-2xl font-black text-orange-600">{data?.sessions?.filter((s:any) => s.status === 'ACTIVE' && s.breaks?.length > 0 && !s.breaks[s.breaks.length-1].endAt).length || 0}</p>
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
             <div className="flex items-center gap-2">
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
                       <Badge variant={req.requestType === 'CLOCK_IN' ? 'success' : 'neutral'}>{req.requestType.replace('_', ' ')}</Badge>
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
              <div className="flex gap-4">
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
                  <option value="Not Clocked In">Not Clocked In</option>
                  <option value="Late">Late</option>
                  <option value="Absent">Absent</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Break Count</TableHead>
                  <TableHead>Break Time</TableHead>
                  <TableHead>Expected Out</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mergedData.map((item: any) => {
                  const session = item.session;
                  const isActive = session?.status === 'ACTIVE';
                  const isOnBreak = isActive && session?.breaks?.length > 0 && !session.breaks[session.breaks.length-1].endAt;
                  const isCompleted = session?.status === 'COMPLETED';

                  return (
                    <TableRow key={item._id} className="cursor-pointer" onClick={() => setSelectedEmployee(item)}>
                      <TableCell>
                        <p className="font-bold text-[var(--color-text-primary)]">{item.employeeId?.name}</p>
                        <p className="text-xs text-[var(--color-text-muted)] font-medium mt-0.5">{item.employeeId?.role}</p>
                      </TableCell>
                      <TableCell>
                        <StatusBadge 
                          isActive={isActive && !isOnBreak} 
                          isOnBreak={isOnBreak} 
                          isCompleted={isCompleted} 
                          dailyStatus={item.status} 
                        />
                      </TableCell>
                      <TableCell className="text-[var(--color-text-muted)] font-medium">
                        {session ? moment(session.clockInAt).format('hh:mm A') : '—'}
                      </TableCell>
                      <TableCell className="text-[var(--color-text-primary)]">
                        {isActive ? (
                          <LiveTimer startTime={session.clockInAt} breaks={session.breaks} />
                        ) : isCompleted ? (
                          <span className="font-mono tracking-tight font-semibold">{Math.floor(item.workedMinutes/60)}h {item.workedMinutes%60}m</span>
                        ) : (
                          <span className="text-[var(--color-text-muted)]">—</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-center">
                        <Badge variant="neutral">{session?.breaks?.length || 0}</Badge>
                      </TableCell>
                      <TableCell className="text-[var(--color-text-muted)] font-mono">
                        {session ? `${Math.floor(item.breakMinutes/60) || 0}h ${item.breakMinutes%60 || 0}m` : '—'}
                      </TableCell>
                      <TableCell className="text-[var(--color-text-muted)] font-medium">
                         {session ? moment(session.clockInAt).add(8, 'hours').format('hh:mm A') : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedEmployee(item); }}>
                          <ChevronRight size={20} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {mergedData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-[var(--color-text-muted)]">
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
                   <div className="flex items-center gap-2">
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

      {/* Detail Drawer overlay */}
      <Drawer isOpen={!!selectedEmployee} onClose={() => setSelectedEmployee(null)} title={selectedEmployee?.employeeId?.name || ''}>
        {selectedEmployee && (
            <div className="space-y-8">
               <p className="text-[var(--color-text-muted)] font-medium mt-[-20px] mb-4">{selectedEmployee.employeeId?.role}</p>
               <Card className="p-5">
                 <h3 className="text-sm font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-4">Today's Attendance</h3>
                 <div className="space-y-4">
                   <div className="flex justify-between items-center pb-3 border-b border-[var(--color-border-subtle)]">
                     <span className="text-[var(--color-text-muted)]">Status</span>
                     <StatusBadge 
                        isActive={selectedEmployee.session?.status === 'ACTIVE' && !(selectedEmployee.session?.breaks?.length > 0 && !selectedEmployee.session.breaks[selectedEmployee.session.breaks.length-1].endAt)} 
                        isOnBreak={selectedEmployee.session?.status === 'ACTIVE' && selectedEmployee.session?.breaks?.length > 0 && !selectedEmployee.session.breaks[selectedEmployee.session.breaks.length-1].endAt} 
                        isCompleted={selectedEmployee.session?.status === 'COMPLETED'} 
                        dailyStatus={selectedEmployee.status} 
                      />
                   </div>
                   <div className="flex justify-between items-center">
                     <span className="text-[var(--color-text-muted)]">Clock In</span>
                     <span className="font-semibold">{selectedEmployee.session ? moment(selectedEmployee.session.clockInAt).format('hh:mm A') : '—'}</span>
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
            <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setSelectedRequest(null)}>Cancel</Button>
                <Button variant="primary" onClick={async () => {
                   try {
                     const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
                     
                     // Ensure the editedTime is parsed as IST before sending to the UTC backend
                     const formattedEditedTime = editedTime ? moment.tz(editedTime, 'Asia/Kolkata').toISOString() : undefined;

                     await fetch(`${apiUrl}/attendance/requests/${selectedRequest._id}/approve`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
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
            <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setSelectedRequest(null)}>Cancel</Button>
                <Button variant="danger" onClick={async () => {
                   try {
                     const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
                     await fetch(`${apiUrl}/attendance/requests/${selectedRequest._id}/reject`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ rejectionReason })
                     });
                     setSelectedRequest(null);
                     fetchAdminAttendance();
                   } catch(e) { console.error(e); }
                }}>Reject</Button>
            </div>
         </div>
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
