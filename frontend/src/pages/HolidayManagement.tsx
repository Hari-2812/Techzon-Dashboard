import React, { useState, useEffect } from 'react';
import { useHolidays } from '../hooks/useHolidays';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableContainer } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Calendar, Bell, Plus, Users, Edit, Trash2 } from 'lucide-react';
import moment from 'moment-timezone';
import api from '../services/api';
import socket from '../services/socket';

const HolidayManagement = () => {
  const { allHolidays, createHoliday, updateHoliday, deleteHoliday, reviewResponse, sendReminder } = useHolidays();
  
  const [activeTab, setActiveTab] = useState<'calendar' | 'responses'>('calendar');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', date: '', type: 'Government Holiday', description: '', isActive: true });

  // Responses state
  const [selectedHolidayId, setSelectedHolidayId] = useState('');
  const [holidayResponses, setHolidayResponses] = useState<any[]>([]);

  useEffect(() => {
    if (activeTab === 'responses' && selectedHolidayId) {
      fetchResponses(selectedHolidayId);
    }
  }, [activeTab, selectedHolidayId]);

  const fetchResponses = async (id: string) => {
    try {
      const res = await api.get(`/holiday-responses/${id}`);
      setHolidayResponses(res.data.data);
    } catch (e) {
       console.error(e);
    }
  };

  useEffect(() => {
    socket.on('holiday:response-submitted', (res) => {
      if (res.holidayId === selectedHolidayId) {
         fetchResponses(selectedHolidayId);
      }
    });
    return () => {
      socket.off('holiday:response-submitted');
    };
  }, [selectedHolidayId]);

  const handleSave = async () => {
    if (!formData.name || !formData.date) return alert("Name and Date are required");
    try {
      if (editingHoliday) {
        await updateHoliday.mutateAsync({ id: editingHoliday._id, payload: formData });
      } else {
        await createHoliday.mutateAsync(formData);
      }
      setIsModalOpen(false);
      setEditingHoliday(null);
      setFormData({ name: '', date: '', type: 'Government Holiday', description: '', isActive: true });
    } catch (e: any) {
      alert(e.response?.data?.message || 'Error');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this holiday?')) {
       try {
         await deleteHoliday.mutateAsync(id);
       } catch(e: any) {
         alert(e.response?.data?.message || 'Error');
       }
    }
  };

  const testHolidayNotification = () => {
     // Trigger socket event directly or call a custom test endpoint. 
     // We will emit the socket manually for admin testing.
     socket.emit('test:holiday-trigger');
     alert("Test notification triggered. Employees should see it if there's a holiday scheduled tomorrow.");
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-primary)] flex items-center">
            <Calendar className="mr-2" /> Holiday Management
          </h1>
          <p className="text-[var(--color-text-muted)] text-sm mt-1">Configure company holidays and manage employee leave requests.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={testHolidayNotification}>
             <Bell size={16} className="mr-2" /> Test 7PM Trigger
          </Button>
          {activeTab === 'calendar' && (
            <Button onClick={() => { setEditingHoliday(null); setFormData({ name: '', date: '', type: 'Government Holiday', description: '', isActive: true }); setIsModalOpen(true); }}>
              <Plus size={16} className="mr-2"/> Add Holiday
            </Button>
          )}
        </div>
      </div>

      <div className="flex border-b border-[var(--color-border-subtle)]">
        <button 
          className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'calendar' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-text-muted)] hover:text-gray-700'}`}
          onClick={() => setActiveTab('calendar')}
        >
          Holiday Calendar
        </button>
        <button 
          className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'responses' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-text-muted)] hover:text-gray-700'}`}
          onClick={() => setActiveTab('responses')}
        >
          Employee Responses
        </button>
      </div>

      {activeTab === 'calendar' && (
         <Card>
            <TableContainer>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Holiday Name</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                   {allHolidays?.map((h: any) => (
                      <TableRow key={h._id}>
                        <TableCell className="font-semibold text-[var(--color-text-primary)]">{h.name}</TableCell>
                        <TableCell>{moment(h.date).format('DD MMM YYYY')}</TableCell>
                        <TableCell><Badge variant="neutral">{h.type}</Badge></TableCell>
                        <TableCell><Badge variant={h.isActive ? 'success' : 'neutral'}>{h.isActive ? 'Active' : 'Disabled'}</Badge></TableCell>
                        <TableCell className="text-right">
                           <div className="flex justify-end gap-2">
                             <button onClick={() => { setEditingHoliday(h); setFormData(h); setIsModalOpen(true); }} className="text-gray-500 hover:text-blue-600"><Edit size={16}/></button>
                             <button onClick={() => handleDelete(h._id)} className="text-gray-500 hover:text-red-600"><Trash2 size={16}/></button>
                           </div>
                        </TableCell>
                      </TableRow>
                   ))}
                </TableBody>
              </Table>
            </TableContainer>
         </Card>
      )}

      {activeTab === 'responses' && (
         <div className="space-y-6">
            <Card className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 bg-[var(--color-surface-light)] border border-[var(--color-border-subtle)]">
               <div className="flex-1">
                 <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">Select Holiday</label>
                 <select 
                    className="w-full md:max-w-md border border-[var(--color-border-subtle)] rounded-lg p-2 outline-none focus:border-[var(--color-primary)]"
                    value={selectedHolidayId}
                    onChange={(e) => setSelectedHolidayId(e.target.value)}
                 >
                    <option value="">-- Select Holiday --</option>
                    {allHolidays?.filter((h:any) => h.isActive).map((h:any) => (
                       <option key={h._id} value={h._id}>{h.name} - {moment(h.date).format('DD MMM YYYY')}</option>
                    ))}
                 </select>
               </div>
               {selectedHolidayId && (
                 <Button variant="outline" onClick={async () => {
                    if (window.confirm('Send reminder to all employees who have not responded?')) {
                        await sendReminder.mutateAsync(selectedHolidayId).then(res => alert(res.message)).catch(e => alert(e.response?.data?.message || 'Error'));
                    }
                 }}>
                   <Bell size={16} className="mr-2" /> Remind Pending
                 </Button>
               )}
            </Card>

            {selectedHolidayId && (
               <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     <div className="bg-white p-4 rounded-xl border border-[var(--color-border-subtle)] text-center">
                        <p className="text-3xl font-bold text-blue-600">{holidayResponses.length}</p>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-1">Total Responses</p>
                     </div>
                     <div className="bg-white p-4 rounded-xl border border-[var(--color-border-subtle)] text-center">
                        <p className="text-3xl font-bold text-orange-600">{holidayResponses.filter(r => r.response === 'TAKE_LEAVE').length}</p>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-1">Leave Requested</p>
                     </div>
                     <div className="bg-white p-4 rounded-xl border border-[var(--color-border-subtle)] text-center">
                        <p className="text-3xl font-bold text-green-600">{holidayResponses.filter(r => r.response === 'WILL_WORK').length}</p>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-1">Will Work</p>
                     </div>
                     <div className="bg-white p-4 rounded-xl border border-[var(--color-border-subtle)] text-center">
                        <p className="text-3xl font-bold text-gray-700">{holidayResponses.filter(r => r.status === 'PENDING').length}</p>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-1">Pending Approval</p>
                     </div>
                  </div>

                  <Card>
                     <TableContainer>
                        <Table>
                           <TableHeader>
                              <TableRow>
                                 <TableHead>Employee</TableHead>
                                 <TableHead>Role</TableHead>
                                 <TableHead>Response</TableHead>
                                 <TableHead>Comment</TableHead>
                                 <TableHead>Status</TableHead>
                                 <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                           </TableHeader>
                           <TableBody>
                              {holidayResponses.map(r => (
                                 <TableRow key={r._id}>
                                    <TableCell className="font-semibold">{r.employeeId?.name || 'Unknown'}</TableCell>
                                    <TableCell><Badge variant="neutral">{r.employeeId?.role}</Badge></TableCell>
                                    <TableCell>
                                       {r.response === 'TAKE_LEAVE' ? <span className="text-orange-600 font-medium">Take Leave</span> : <span className="text-green-600 font-medium">Will Work</span>}
                                    </TableCell>
                                    <TableCell className="text-xs text-gray-600 max-w-xs truncate">{r.comment || '-'}</TableCell>
                                    <TableCell>
                                       <Badge variant={r.status === 'APPROVED' ? 'success' : r.status === 'REJECTED' ? 'error' : r.status === 'CONFIRMED' ? 'info' : 'warning'}>
                                          {r.status}
                                       </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                       {r.response === 'TAKE_LEAVE' && r.status === 'PENDING' && (
                                          <div className="flex justify-end gap-2">
                                             <Button size="sm" variant="primary" onClick={async () => {
                                                await reviewResponse.mutateAsync({ id: r._id, status: 'APPROVED' });
                                                fetchResponses(selectedHolidayId);
                                             }}>Approve</Button>
                                             <Button size="sm" variant="danger" onClick={async () => {
                                                await reviewResponse.mutateAsync({ id: r._id, status: 'REJECTED' });
                                                fetchResponses(selectedHolidayId);
                                             }}>Reject</Button>
                                          </div>
                                       )}
                                    </TableCell>
                                 </TableRow>
                              ))}
                              {holidayResponses.length === 0 && (
                                 <TableRow>
                                    <TableCell colSpan={6} className="text-center py-6 text-gray-500">No responses yet for this holiday.</TableCell>
                                 </TableRow>
                              )}
                           </TableBody>
                        </Table>
                     </TableContainer>
                  </Card>
               </>
            )}
         </div>
      )}

      {/* Holiday Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingHoliday ? "Edit Holiday" : "Add Holiday"}>
         <div className="space-y-4">
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Holiday Name</label>
               <input type="text" className="w-full border p-2 rounded-lg" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
               <input type="date" className="w-full border p-2 rounded-lg" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
            </div>
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
               <select className="w-full border p-2 rounded-lg" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                  <option>Government Holiday</option>
                  <option>Public Holiday</option>
                  <option>Company Holiday</option>
                  <option>Optional Holiday</option>
               </select>
            </div>
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
               <textarea className="w-full border p-2 rounded-lg h-20" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
            <div className="flex items-center gap-2 mt-4">
               <input type="checkbox" id="isActive" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} />
               <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Active</label>
            </div>
            <div className="flex justify-end gap-3 mt-6">
               <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
               <Button onClick={handleSave}>{editingHoliday ? 'Save Changes' : 'Create Holiday'}</Button>
            </div>
         </div>
      </Modal>

    </div>
  );
};

export default HolidayManagement;
