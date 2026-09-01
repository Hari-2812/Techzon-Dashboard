import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useCR, useCRActivities, useCRSourceStudents, useUpdateCRStatus, useCreateWhatsAppGroup, useUpdateWhatsAppGroup, useCreateCRFollowUp } from '../hooks/useCRs';
import { Phone, MessageCircle, CalendarPlus, UserCheck, AlertCircle, Clock, CheckCircle2, UserX, Users } from 'lucide-react';
import clsx from 'clsx';
import { Button } from '../components/ui/Button';
import { openWhatsApp } from '../utils/whatsapp';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableContainer } from '../components/ui/Table';

const CRDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const { data: cr, isLoading: crLoading } = useCR(id || '');
  const { data: activities, isLoading: actLoading } = useCRActivities(id || '');
  const { data: sourceStudents, isLoading: stuLoading } = useCRSourceStudents(id || '');
  
  const updateStatus = useUpdateCRStatus();
  const createGroup = useCreateWhatsAppGroup();
  const updateGroup = useUpdateWhatsAppGroup();
  const createFollowUp = useCreateCRFollowUp();

  const [activeTab, setActiveTab] = useState('students');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);

  const [newStatus, setNewStatus] = useState('');
  const [groupForm, setGroupForm] = useState({ groupName: '', expectedStudents: 0 });
  const [updateJoinedForm, setUpdateJoinedForm] = useState({ joinedStudents: 0 });
  const [followUpForm, setFollowUpForm] = useState({ type: 'CR Follow-up', dueDate: '', notes: '', priority: 'MEDIUM' });

  if (crLoading) return <div className="p-6">Loading CR...</div>;
  if (!cr) return <div className="p-6">CR not found.</div>;

  const completionPercent = cr.expectedStudents ? Math.round((cr.joinedStudents / cr.expectedStudents) * 100) : 0;

  const handleStatusUpdate = async () => {
    if (!newStatus) return;
    await updateStatus.mutateAsync({ id: id!, status: newStatus });
    setShowStatusModal(false);
  };

  const handleCreateGroup = async (e: any) => {
    e.preventDefault();
    await createGroup.mutateAsync({ id: id!, ...groupForm });
    setShowGroupModal(false);
  };

  const handleUpdateJoined = async () => {
    await updateGroup.mutateAsync({ id: id!, joinedStudents: Number(updateJoinedForm.joinedStudents) });
  };

  const handleCreateFollowUp = async (e: any) => {
    e.preventDefault();
    await createFollowUp.mutateAsync({ id: id!, payload: followUpForm });
    setShowFollowUpModal(false);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto pb-28 md:pb-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start mb-6">
        <div>
          <div className="flex items-center space-x-3">
             <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">{cr.crName}</h1>
             <Badge variant="neutral" className="mt-1">{cr.status}</Badge>
          </div>
          <p className="text-gray-500 mt-1">{cr.college} • {cr.department} {cr.year}</p>
        </div>
        <div className="hidden md:flex space-x-2 mt-4 md:mt-0">
          <a href={`tel:${cr.phone}`} className="flex items-center space-x-2 bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700">
            <Phone size={18} /> <span>Call</span>
          </a>
          <button 
            onClick={() => openWhatsApp(cr.phone)}
            className="flex items-center space-x-2 bg-[#25D366] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#20b858]"
            title="WhatsApp Web opens in a new tab. Your WhatsApp login is managed by WhatsApp."
          >
            <MessageCircle size={18} /> <span>WhatsApp</span>
          </button>
          <Button variant="outline" onClick={() => setShowStatusModal(true)}>
             Change Status
          </Button>
          <Button variant="outline" onClick={() => setShowFollowUpModal(true)}>
            <CalendarPlus size={18} className="mr-2" /> <span>Follow-up</span>
          </Button>
        </div>
      </div>

      {/* MOBILE STICKY BOTTOM ACTION BAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--color-border-subtle)] p-3 flex gap-2 z-40 safe-area-bottom shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex-wrap">
         <a href={`tel:${cr.phone}`} className="flex-1 flex justify-center items-center bg-[var(--color-primary)] text-white rounded-lg font-semibold hover:bg-indigo-700 py-3">
           <Phone size={18} className="mr-2" /> Call
         </a>
         <button 
            onClick={() => openWhatsApp(cr.phone)}
            className="flex-1 flex justify-center items-center bg-[#25D366] text-white rounded-lg font-semibold hover:bg-[#20b858]"
            title="WhatsApp Web opens in a new tab. Your WhatsApp login is managed by WhatsApp."
          >
            <MessageCircle size={18} className="mr-2" /> WA
          </button>
         <Button variant="outline" className="flex-none px-3 py-3" onClick={() => setShowStatusModal(true)}>
           <UserCheck size={18} />
         </Button>
         <Button variant="outline" className="flex-none px-3 py-3" onClick={() => setShowFollowUpModal(true)}>
           <CalendarPlus size={18} />
         </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <div className="bg-[var(--color-surface-light)] p-4 rounded-xl border border-[var(--color-border-subtle)] text-center">
                <p className="text-xs text-[var(--color-text-muted)] font-bold uppercase">Source Students</p>
                <p className="text-2xl font-black text-[var(--color-text-primary)] mt-1">{sourceStudents?.length || 0}</p>
             </div>
             <div className="bg-[var(--color-surface-light)] p-4 rounded-xl border border-[var(--color-border-subtle)] text-center">
                <p className="text-xs text-[var(--color-text-muted)] font-bold uppercase">Expected</p>
                <p className="text-2xl font-black text-[var(--color-text-primary)] mt-1">{cr.expectedStudents || 0}</p>
             </div>
             <div className="bg-green-50 p-4 rounded-xl border border-green-200 text-center">
                <p className="text-xs text-green-700 font-bold uppercase">Joined</p>
                <p className="text-2xl font-black text-green-600 mt-1">{cr.joinedStudents || 0}</p>
             </div>
             <div className="bg-[var(--color-surface-light)] p-4 rounded-xl border border-[var(--color-border-subtle)] text-center">
                <p className="text-xs text-[var(--color-text-muted)] font-bold uppercase">Completion</p>
                <p className="text-2xl font-black text-[var(--color-primary)] mt-1">{completionPercent}%</p>
             </div>
          </div>

          <Card className="p-6">
             <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-4 border-b pb-2">
                <h2 className="text-lg font-bold">WhatsApp Group</h2>
                {cr.status !== 'Group Created' && cr.status !== 'Students Joining' && cr.status !== 'Completed' && (
                   <Button variant="primary" size="sm" onClick={() => setShowGroupModal(true)}>Create Group</Button>
                )}
             </div>
             {cr.group ? (
                <div>
                   <div className="grid grid-cols-2 gap-4 mb-4">
                      <div><p className="text-xs text-[var(--color-text-muted)] font-bold uppercase">Group Name</p><p className="font-medium">{cr.group.groupName}</p></div>
                      <div><p className="text-xs text-[var(--color-text-muted)] font-bold uppercase">Status</p><p className="font-medium">{cr.group.status}</p></div>
                   </div>
                   <div className="flex items-center space-x-3 mt-4">
                      <Input type="number" className="w-24" value={updateJoinedForm.joinedStudents} onChange={(e) => setUpdateJoinedForm({ joinedStudents: e.target.value as any })} placeholder="Joined" />
                      <Button variant="outline" size="sm" onClick={handleUpdateJoined}>Update Joined Count</Button>
                   </div>
                </div>
             ) : (
                <p className="text-[var(--color-text-muted)] text-sm">No WhatsApp group created yet.</p>
             )}
          </Card>

          <Card className="overflow-hidden">
            <div className="flex border-b border-[var(--color-border-subtle)]">
              <button 
                onClick={() => setActiveTab('students')}
                className={clsx("flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors", activeTab === 'students' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-text-muted)] bg-[var(--color-surface-light)]')}
              >
                Source Students
              </button>
            </div>
            <CardContent className="p-0">
               {activeTab === 'students' && (
                  <TableContainer>
                     <Table>
                        <TableHeader>
                           <TableRow>
                              <TableHead>Student</TableHead>
                              <TableHead>Phone</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Assigned</TableHead>
                           </TableRow>
                        </TableHeader>
                        <TableBody>
                           {stuLoading ? (
                              <TableRow><TableCell colSpan={4} className="text-center py-4">Loading...</TableCell></TableRow>
                           ) : sourceStudents?.length === 0 ? (
                              <TableRow><TableCell colSpan={4} className="text-center py-4 text-[var(--color-text-muted)]">No source students.</TableCell></TableRow>
                           ) : (
                              sourceStudents?.map((rel: any) => (
                                 <TableRow key={rel._id}>
                                    <TableCell className="font-medium cursor-pointer text-[var(--color-primary)] hover:underline" onClick={() => navigate(`/leads/${rel.studentId._id}`)}>
                                       {rel.studentId.studentName}
                                    </TableCell>
                                    <TableCell>{rel.studentId.phone}</TableCell>
                                    <TableCell><Badge variant="neutral">{rel.studentId.leadStatus}</Badge></TableCell>
                                    <TableCell>{rel.studentId.assignedEmployeeId?.name}</TableCell>
                                 </TableRow>
                              ))
                           )}
                        </TableBody>
                     </Table>
                  </TableContainer>
               )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Activity Timeline */}
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="flex border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-light)]">
              <div className="flex-1 py-3 text-sm font-bold text-center text-[var(--color-text-primary)]">
                Activity Timeline
              </div>
            </div>
            <CardContent className="p-4 max-h-[600px] overflow-y-auto">
              {actLoading ? (
                <p className="text-[var(--color-text-muted)] text-center py-4">Loading activities...</p>
              ) : activities?.length === 0 ? (
                <p className="text-[var(--color-text-muted)] text-center py-4">No activities yet.</p>
              ) : (
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-[var(--color-border-subtle)] before:to-transparent mt-4">
                  {activities?.map((act: any) => (
                    <div key={act._id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-blue-100 text-[var(--color-primary)] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm">
                        <Clock size={16} />
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-[var(--color-surface-light)] p-3 rounded-lg border border-[var(--color-border-subtle)]">
                        <div className="flex justify-between mb-1">
                          <span className="font-bold text-sm text-[var(--color-text-primary)]">{act.activityType.replace(/_/g, ' ')}</span>
                          <span className="text-xs text-[var(--color-text-muted)]">{new Date(act.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        <p className="text-xs text-[var(--color-text-secondary)]">{act.description}</p>
                        <p className="text-[10px] text-[var(--color-text-muted)] mt-2 font-semibold">By: {act.employeeId?.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Modal isOpen={showStatusModal} onClose={() => setShowStatusModal(false)} title="Change CR Status">
         <div className="space-y-4">
            <select className="w-full p-2 border border-[var(--color-border-subtle)] rounded-lg focus:outline-none focus:border-[var(--color-primary)]" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
               <option value="">Select Status</option>
               <option value="Contacted">Contacted</option>
               <option value="Interested">Interested</option>
               <option value="Follow-up">Follow-up</option>
               <option value="Agreed">Agreed</option>
               <option value="Not Interested">Not Interested</option>
               <option value="No Response">No Response</option>
            </select>
            <Button fullWidth variant="primary" onClick={handleStatusUpdate} disabled={!newStatus || updateStatus.isPending}>Save Status</Button>
         </div>
      </Modal>

      <Modal isOpen={showGroupModal} onClose={() => setShowGroupModal(false)} title="Create WhatsApp Group">
         <form onSubmit={handleCreateGroup} className="space-y-4">
            <div>
               <label className="block text-sm font-medium mb-1">Group Name *</label>
               <Input type="text" required value={groupForm.groupName} onChange={e => setGroupForm({...groupForm, groupName: e.target.value})} />
            </div>
            <div>
               <label className="block text-sm font-medium mb-1">Expected Students</label>
               <Input type="number" required min="0" value={groupForm.expectedStudents} onChange={e => setGroupForm({...groupForm, expectedStudents: Number(e.target.value)})} />
            </div>
            <div className="flex space-x-3 pt-4">
               <Button type="submit" variant="primary" disabled={createGroup.isPending}>Create Group</Button>
            </div>
         </form>
      </Modal>

      <Modal isOpen={showFollowUpModal} onClose={() => setShowFollowUpModal(false)} title="Schedule Follow-up">
         <form onSubmit={handleCreateFollowUp} className="space-y-4">
            <div>
               <label className="block text-sm font-medium mb-1">Type *</label>
               <select className="w-full p-2 border border-[var(--color-border-subtle)] rounded-lg focus:outline-none focus:border-[var(--color-primary)]" value={followUpForm.type} onChange={e => setFollowUpForm({...followUpForm, type: e.target.value})}>
                  <option value="CR Follow-up">CR Follow-up</option>
                  <option value="Group Creation">Group Creation</option>
                  <option value="Group Link Collection">Group Link Collection</option>
                  <option value="Student Joining Follow-up">Student Joining Follow-up</option>
               </select>
            </div>
            <div>
               <label className="block text-sm font-medium mb-1">Due Date *</label>
               <Input type="datetime-local" required value={followUpForm.dueDate} onChange={e => setFollowUpForm({...followUpForm, dueDate: e.target.value})} />
            </div>
            <div>
               <label className="block text-sm font-medium mb-1">Notes</label>
               <Input type="text" value={followUpForm.notes} onChange={e => setFollowUpForm({...followUpForm, notes: e.target.value})} />
            </div>
            <div className="flex space-x-3 pt-4">
               <Button type="submit" variant="primary" disabled={createFollowUp.isPending}>Schedule</Button>
            </div>
         </form>
      </Modal>
    </div>
  );
};

export default CRDetail;
