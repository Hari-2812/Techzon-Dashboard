import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { useFollowUps, useCompleteFollowUp, useRescheduleFollowUp } from '../hooks/useFollowUps';
import { Phone, MessageCircle, CheckCircle, Clock } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import moment from 'moment-timezone';

const FollowUps = () => {
  const [activeTab, setActiveTab] = useState<'OVERDUE' | 'TODAY' | 'UPCOMING' | 'COMPLETED'>('TODAY');
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [reason, setReason] = useState('');

  const { data: allFollowUps, isLoading } = useFollowUps();
  const completeMutation = useCompleteFollowUp();
  const rescheduleMutation = useRescheduleFollowUp();
  const user = useAuthStore(state => state.user);

  if (isLoading) return <div className="p-6">Loading...</div>;

  const followUps = allFollowUps || [];
  
  const overdue = followUps.filter((f: any) => f.status === 'Overdue');
  
  const now = moment().tz('Asia/Kolkata');
  const todayStart = now.clone().startOf('day');
  const todayEnd = now.clone().endOf('day');
  
  const today = followUps.filter((f: any) => {
    const fDate = moment(f.dueDate).tz('Asia/Kolkata');
    return f.status !== 'Completed' && f.status !== 'Overdue' && fDate.isBetween(todayStart, todayEnd, null, '[]');
  });

  const upcoming = followUps.filter((f: any) => {
    const fDate = moment(f.dueDate).tz('Asia/Kolkata');
    return f.status !== 'Completed' && f.status !== 'Overdue' && fDate.isAfter(todayEnd);
  });

  const completed = followUps.filter((f: any) => f.status === 'Completed');

  const getActiveData = () => {
    switch (activeTab) {
      case 'OVERDUE': return overdue;
      case 'TODAY': return today;
      case 'UPCOMING': return upcoming;
      case 'COMPLETED': return completed;
      default: return today;
    }
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFollowUp) return;
    await completeMutation.mutateAsync({ id: selectedFollowUp._id, notes });
    setIsCompleteModalOpen(false);
    setNotes('');
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFollowUp || !newDate || !newTime) return;
    const dateObj = new Date(`${newDate}T${newTime}`);
    await rescheduleMutation.mutateAsync({ id: selectedFollowUp._id, data: { newDate: dateObj, reason } });
    setIsRescheduleModalOpen(false);
    setNewDate('');
    setNewTime('');
    setReason('');
  };

  const activeData = getActiveData();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Follow-ups</h1>
          <p className="text-[var(--color-text-muted)] text-sm">Manage your calls and student connections</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card 
          className={`p-4 cursor-pointer border-l-4 transition-all ${activeTab === 'OVERDUE' ? 'border-l-red-500 bg-red-50' : 'border-l-red-200 hover:bg-gray-50'}`}
          onClick={() => setActiveTab('OVERDUE')}
        >
          <div className="text-sm font-medium text-red-600 mb-1">OVERDUE</div>
          <div className="text-2xl font-bold text-gray-900">{overdue.length}</div>
        </Card>
        
        <Card 
          className={`p-4 cursor-pointer border-l-4 transition-all ${activeTab === 'TODAY' ? 'border-l-[var(--color-accent)] bg-orange-50' : 'border-l-orange-200 hover:bg-gray-50'}`}
          onClick={() => setActiveTab('TODAY')}
        >
          <div className="text-sm font-medium text-[var(--color-accent)] mb-1">TODAY</div>
          <div className="text-2xl font-bold text-gray-900">{today.length}</div>
        </Card>
        
        <Card 
          className={`p-4 cursor-pointer border-l-4 transition-all ${activeTab === 'UPCOMING' ? 'border-l-[var(--color-primary)] bg-indigo-50' : 'border-l-indigo-200 hover:bg-gray-50'}`}
          onClick={() => setActiveTab('UPCOMING')}
        >
          <div className="text-sm font-medium text-[var(--color-primary)] mb-1">UPCOMING</div>
          <div className="text-2xl font-bold text-gray-900">{upcoming.length}</div>
        </Card>

        <Card 
          className={`p-4 cursor-pointer border-l-4 transition-all ${activeTab === 'COMPLETED' ? 'border-l-green-500 bg-green-50' : 'border-l-green-200 hover:bg-gray-50'}`}
          onClick={() => setActiveTab('COMPLETED')}
        >
          <div className="text-sm font-medium text-green-600 mb-1">COMPLETED</div>
          <div className="text-2xl font-bold text-gray-900">{completed.length}</div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-[var(--color-text-primary)]">
            <thead className="bg-gray-50 text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)]">
              <tr>
                <th className="px-4 py-3 font-medium">Due Date & Time</th>
                <th className="px-4 py-3 font-medium">Student / CR</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                {user?.role === 'ADMIN' && <th className="px-4 py-3 font-medium">Employee</th>}
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-subtle)]">
              {activeData.map((f: any) => (
                <tr key={f._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="font-medium">{moment(f.dueDate).format('DD MMM YYYY')}</div>
                    <div className="text-xs text-[var(--color-text-muted)]">{moment(f.dueDate).format('hh:mm A')}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-medium">{f.crId ? f.crId.crName : (f.leadId ? f.leadId.studentName : 'Unknown')}</div>
                    <div className="text-xs text-[var(--color-text-muted)]">{f.crId ? 'CR' : 'Student'} • {f.crId ? f.crId.college : (f.leadId ? f.leadId.college : '')}</div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium">
                      {f.type}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      f.priority === 'HIGH' ? 'bg-red-100 text-red-700' :
                      f.priority === 'MEDIUM' ? 'bg-orange-100 text-orange-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {f.priority}
                    </span>
                  </td>
                  {user?.role === 'ADMIN' && (
                    <td className="px-4 py-4">{f.assignedEmployeeId?.name}</td>
                  )}
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a href={`tel:${f.crId ? f.crId.phone : (f.leadId ? f.leadId.phone : '')}`} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Call">
                        <Phone size={16} />
                      </a>
                      <a href={`https://wa.me/${f.crId ? f.crId.phone : (f.leadId ? f.leadId.phone : '')}`} target="_blank" rel="noreferrer" className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="WhatsApp">
                        <MessageCircle size={16} />
                      </a>
                      {activeTab !== 'COMPLETED' && (
                        <>
                          <button 
                            onClick={() => { setSelectedFollowUp(f); setIsRescheduleModalOpen(true); }}
                            className="p-1.5 text-orange-600 hover:bg-orange-50 rounded" title="Reschedule"
                          >
                            <Clock size={16} />
                          </button>
                          <button 
                            onClick={() => { setSelectedFollowUp(f); setIsCompleteModalOpen(true); }}
                            className="p-1.5 text-[var(--color-primary)] hover:bg-indigo-50 rounded" title="Complete"
                          >
                            <CheckCircle size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {activeData.length === 0 && (
                <tr>
                  <td colSpan={user?.role === 'ADMIN' ? 6 : 5} className="px-4 py-8 text-center text-[var(--color-text-muted)]">
                    No follow-ups found in this section.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-gray-100 bg-gray-50/50">
          {activeData.length === 0 ? (
            <div className="py-12 text-center text-[var(--color-text-muted)] flex flex-col items-center justify-center">
              <Clock size={40} className="text-[var(--color-border-subtle)] mb-3" />
              <p className="font-semibold">No follow-ups found.</p>
            </div>
          ) : (
            activeData.map((f: any) => (
              <div key={f._id} className="p-4 bg-white">
                <div className="flex justify-between items-start mb-2">
                   <div>
                     <h3 className="font-bold text-[var(--color-text-primary)] text-lg">
                       {f.crId ? f.crId.crName : (f.leadId ? f.leadId.studentName : 'Unknown')}
                     </h3>
                     <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                       {f.crId ? 'CR' : 'Student'}
                     </p>
                   </div>
                   <div className="text-right">
                     <span className={`px-2 py-1 inline-block rounded text-[10px] font-bold ${
                        f.priority === 'HIGH' ? 'bg-red-100 text-red-700' :
                        f.priority === 'MEDIUM' ? 'bg-orange-100 text-orange-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {f.priority}
                      </span>
                   </div>
                </div>
                <div className="space-y-1 mb-4">
                   <p className="text-sm text-[var(--color-text-secondary)] flex items-center gap-2">
                     <Clock size={14} className="text-[var(--color-primary)]"/> 
                     <span className="font-medium text-[var(--color-text-primary)]">{moment(f.dueDate).format('DD MMM, hh:mm A')}</span>
                   </p>
                   <p className="text-sm text-[var(--color-text-secondary)]"><strong>College:</strong> {f.crId ? f.crId.college : (f.leadId ? f.leadId.college : '')}</p>
                   <p className="text-sm text-[var(--color-text-secondary)]"><strong>Type:</strong> {f.type}</p>
                   {user?.role === 'ADMIN' && <p className="text-sm text-[var(--color-text-secondary)]"><strong>Assigned:</strong> {f.assignedEmployeeId?.name}</p>}
                </div>
                <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-[var(--color-border-subtle)]">
                   <a href={`tel:${f.crId ? f.crId.phone : (f.leadId ? f.leadId.phone : '')}`} className="flex flex-col items-center justify-center p-2 rounded-lg bg-blue-50 text-blue-600">
                     <Phone size={18} className="mb-1" />
                     <span className="text-[10px] font-bold">CALL</span>
                   </a>
                   <a href={`https://wa.me/${f.crId ? f.crId.phone : (f.leadId ? f.leadId.phone : '')}`} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center p-2 rounded-lg bg-green-50 text-green-600">
                     <MessageCircle size={18} className="mb-1" />
                     <span className="text-[10px] font-bold">CHAT</span>
                   </a>
                   {activeTab !== 'COMPLETED' ? (
                     <>
                        <button onClick={() => { setSelectedFollowUp(f); setIsRescheduleModalOpen(true); }} className="flex flex-col items-center justify-center p-2 rounded-lg bg-orange-50 text-orange-600">
                           <Clock size={18} className="mb-1" />
                           <span className="text-[10px] font-bold">DELAY</span>
                        </button>
                        <button onClick={() => { setSelectedFollowUp(f); setIsCompleteModalOpen(true); }} className="flex flex-col items-center justify-center p-2 rounded-lg bg-[var(--color-primary-50)] text-[var(--color-primary)]">
                           <CheckCircle size={18} className="mb-1" />
                           <span className="text-[10px] font-bold">DONE</span>
                        </button>
                     </>
                   ) : (
                     <div className="col-span-2 flex items-center justify-center">
                        <span className="text-xs text-green-600 font-bold bg-green-50 px-3 py-1 rounded-full"><CheckCircle size={14} className="inline mr-1"/> Completed</span>
                     </div>
                   )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Complete Modal */}
      {isCompleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Complete Follow-up</h2>
            <form onSubmit={handleComplete}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Completion Notes (Optional)</label>
                <textarea 
                  value={notes} onChange={(e) => setNotes(e.target.value)}
                  className="w-full border rounded p-2 text-sm focus:border-[var(--color-primary)] outline-none" 
                  rows={3} placeholder="What was discussed?"
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setIsCompleteModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-medium">Cancel</button>
                <button type="submit" disabled={completeMutation.isPending} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium">
                  {completeMutation.isPending ? 'Saving...' : 'Mark Completed'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {isRescheduleModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Reschedule Follow-up</h2>
            <form onSubmit={handleReschedule}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">New Date</label>
                  <input type="date" required value={newDate} onChange={(e) => setNewDate(e.target.value)} className="w-full border rounded p-2 text-sm focus:border-[var(--color-primary)] outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">New Time</label>
                  <input type="time" required value={newTime} onChange={(e) => setNewTime(e.target.value)} className="w-full border rounded p-2 text-sm focus:border-[var(--color-primary)] outline-none" />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Reason (Optional)</label>
                <textarea 
                  value={reason} onChange={(e) => setReason(e.target.value)}
                  className="w-full border rounded p-2 text-sm focus:border-[var(--color-primary)] outline-none" 
                  rows={2} placeholder="Why is this being rescheduled?"
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setIsRescheduleModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-medium">Cancel</button>
                <button type="submit" disabled={rescheduleMutation.isPending} className="px-4 py-2 bg-[var(--color-accent)] hover:bg-orange-600 text-white rounded font-medium">
                  {rescheduleMutation.isPending ? 'Saving...' : 'Reschedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FollowUps;
