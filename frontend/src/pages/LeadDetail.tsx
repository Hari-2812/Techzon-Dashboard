import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useLead, useLeadActivities, useRecordCall, useVerifyCRYes, useVerifyCRNo, useScheduleFollowUp } from '../hooks/useLeads';
import { Phone, MessageCircle, CalendarPlus, UserCheck, AlertCircle, Clock, CheckCircle2, UserX, ClipboardList } from 'lucide-react';
import clsx from 'clsx';
import { Button } from '../components/ui/Button';
import { openWhatsApp } from '../utils/whatsapp';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import UpdateLeadDrawer from '../components/ui/UpdateLeadDrawer';

const LeadDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const { data: leadData, isLoading: leadLoading } = useLead(id || '');
  const { data: activities, isLoading: actLoading } = useLeadActivities(id || '');
  
  const recordCall = useRecordCall();
  const verifyCRYes = useVerifyCRYes();
  const verifyCRNo = useVerifyCRNo();
  const scheduleFollowUp = useScheduleFollowUp();

  const [activeTab, setActiveTab] = useState('timeline');
  const [showCallModal, setShowCallModal] = useState(false);
  const [showCRForm, setShowCRForm] = useState(false);
  const [showUpdateDrawer, setShowUpdateDrawer] = useState(false);
  const [showMissingInfoModal, setShowMissingInfoModal] = useState(false);
  const [crDetails, setCRDetails] = useState({ crName: '', phone: '', section: '' });
  const [missingCRInfo, setMissingCRInfo] = useState({ college: '', department: '', year: '' });

  if (leadLoading) return <div className="p-6">Loading lead...</div>;
  if (!leadData?.data) return <div className="p-6">Lead not found.</div>;

  const lead = leadData.data;
  const relationship = leadData.crRelationship;

  const handleCallOutcome = async (outcome: string) => {
    await recordCall.mutateAsync({ leadId: id!, outcome, notes: '' });
    setShowCallModal(false);
  };

  const handleVerifyCRYes = () => {
    verifyCRYes.mutate({ leadId: id! }, {
      onError: (error: any) => {
        if (error?.response?.data?.code === 'MISSING_CR_FIELDS' || error?.response?.data?.message?.includes('required')) {
          setMissingCRInfo({
            college: lead.college || '',
            department: lead.department || '',
            year: lead.year || ''
          });
          setShowMissingInfoModal(true);
        } else {
          alert(error?.response?.data?.message || 'Failed to verify CR');
        }
      }
    });
  };

  const submitMissingCRInfo = (e: React.FormEvent) => {
    e.preventDefault();
    verifyCRYes.mutate({ leadId: id!, details: missingCRInfo }, {
      onSuccess: () => {
        setShowMissingInfoModal(false);
      },
      onError: (error: any) => {
        alert(error?.response?.data?.message || 'Failed to verify CR');
      }
    });
  };

  const handleCRSubmit = async (e: any) => {
    e.preventDefault();
    await verifyCRNo.mutateAsync({ leadId: id!, details: crDetails });
    setShowCRForm(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto pb-24">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">{lead.studentName}</h1>
          <p className="text-gray-500 mt-1">{lead.college} • {lead.department} {lead.year}</p>
        </div>
        <div className="hidden md:flex space-x-2 mt-4 md:mt-0">
          <Button onClick={() => setShowUpdateDrawer(true)} variant="primary">
            <ClipboardList size={18} className="mr-2" /> <span>Daily Update</span>
          </Button>
          <Button onClick={() => setShowCallModal(true)} variant="outline">
            <Phone size={18} className="mr-2" /> <span>Quick Call</span>
          </Button>
          <button 
            onClick={() => openWhatsApp(lead.phone)}
            className="flex items-center space-x-2 bg-[#25D366] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#20b858]"
            title="WhatsApp Web opens in a new tab. Your WhatsApp login is managed by WhatsApp."
          >
            <MessageCircle size={18} /> <span>WhatsApp</span>
          </button>
        </div>
      </div>

      {/* MOBILE STICKY BOTTOM ACTION BAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--color-border-subtle)] p-3 flex gap-2 z-40 safe-area-bottom shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
         <Button onClick={() => setShowCallModal(true)} variant="primary" className="flex-1 py-3">
           <Phone size={18} className="mr-2" /> Call
         </Button>
         <button 
            onClick={() => openWhatsApp(lead.phone)}
            className="flex-1 flex justify-center items-center bg-[#25D366] text-white rounded-lg font-semibold hover:bg-[#20b858]"
            title="WhatsApp Web opens in a new tab. Your WhatsApp login is managed by WhatsApp."
          >
            <MessageCircle size={18} className="mr-2" /> WA
          </button>
         <Button variant="outline" className="flex-none px-3 py-3" onClick={() => {}}>
           <CalendarPlus size={18} />
         </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: Student Info & CR Workflow */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* CR VERIFICATION WORKFLOW */}
          {lead.crStatus === 'Not Verified' && !showCRForm && (
            <Card className="p-8 border-[var(--color-primary-container)]">
              <h2 className="text-xl font-bold mb-2 text-[var(--color-text-primary)] flex items-center">
                <UserCheck className="mr-2 text-[var(--color-primary)]" /> CR Verification
              </h2>
              <p className="text-[var(--color-text-muted)] mb-6">Is this student the Class Representative (CR)?</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={handleVerifyCRYes}
                  disabled={verifyCRYes.isPending}
                  className="bg-[#ECFDF5] text-[#047857] border-2 border-[#A7F3D0] p-4 rounded-[var(--radius-xl)] font-bold hover:bg-[#D1FAE5] transition-colors flex flex-col items-center justify-center"
                >
                  <CheckCircle2 size={32} className="mb-2" />
                  YES, I AM THE CR
                </button>
                <button 
                  onClick={() => setShowCRForm(true)}
                  className="bg-[var(--color-surface-light)] text-[var(--color-text-primary)] border-2 border-[var(--color-border-subtle)] p-4 rounded-[var(--radius-xl)] font-bold hover:bg-[var(--color-border-subtle)] transition-colors flex flex-col items-center justify-center"
                >
                  <UserX size={32} className="mb-2" />
                  NO, NOT THE CR
                </button>
              </div>
            </Card>
          )}

          {/* CR DETAILS FORM */}
          {showCRForm && (
            <Card className="p-6 border-[var(--color-primary-container)]">
              <h2 className="text-lg font-bold mb-4">Provide CR Details</h2>
              <form onSubmit={handleCRSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">CR Name *</label>
                  <Input type="text" required value={crDetails.crName} onChange={e => setCRDetails({...crDetails, crName: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">CR Phone *</label>
                  <Input type="text" required value={crDetails.phone} onChange={e => setCRDetails({...crDetails, phone: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Section (Optional)</label>
                  <Input type="text" value={crDetails.section} onChange={e => setCRDetails({...crDetails, section: e.target.value})} />
                </div>
                <div className="flex space-x-3 pt-4">
                  <Button type="submit" variant="primary" disabled={verifyCRNo.isPending}>Save CR Details</Button>
                  <Button type="button" variant="outline" onClick={() => setShowCRForm(false)}>Cancel</Button>
                </div>
              </form>
            </Card>
          )}

          {/* CR RELATIONSHIP VIEW */}
          {relationship && (
            <div className="bg-[var(--color-primary-50)] p-6 radius-card border border-[var(--color-primary-100)]">
              <h2 className="text-lg font-bold mb-4 text-[var(--color-primary-900)]">CR Connection</h2>
              <div className="flex items-center space-x-4">
                <div className="bg-white p-3 rounded shadow flex-1 text-center">
                  <p className="text-xs text-gray-500 font-bold uppercase mb-1">Current Student</p>
                  <p className="font-semibold">{lead.studentName}</p>
                </div>
                <div className="text-[var(--color-primary)] font-bold">→</div>
                <div className="bg-white p-3 rounded shadow border-2 border-[var(--color-primary)] flex-1 text-center cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/crs/${relationship.crId._id}`)}>
                  <p className="text-xs text-[var(--color-primary)] font-bold uppercase mb-1">CR Profile</p>
                  <p className="font-semibold">{relationship.crId.crName}</p>
                  <p className="text-xs text-gray-500">{relationship.crId.phone}</p>
                </div>
              </div>
            </div>
          )}

          {/* STUDENT INFO */}
          <Card className="p-6">
            <h2 className="text-lg font-bold mb-4 border-b pb-2">Student Information</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-4">
              <div><p className="text-xs text-[var(--color-text-muted)] uppercase font-bold">Phone</p><p className="font-medium text-[var(--color-primary)]">{lead.phone}</p></div>
              <div><p className="text-xs text-[var(--color-text-muted)] uppercase font-bold">Email</p><p className="font-medium">{lead.email || 'N/A'}</p></div>
              <div><p className="text-xs text-[var(--color-text-muted)] uppercase font-bold">Lead Status</p><p className="font-medium"><Badge variant="neutral">{lead.leadStatus}</Badge></p></div>
              <div><p className="text-xs text-[var(--color-text-muted)] uppercase font-bold">CR Status</p><p className="font-medium">{lead.crStatus}</p></div>
              <div><p className="text-xs text-[var(--color-text-muted)] uppercase font-bold">Priority</p><p className="font-medium"><Badge variant={lead.priority === 'HIGH' ? 'error' : lead.priority === 'MEDIUM' ? 'warning' : 'neutral'}>{lead.priority}</Badge></p></div>
              <div><p className="text-xs text-[var(--color-text-muted)] uppercase font-bold">Assigned To</p><p className="font-medium">{lead.assignedEmployeeId?.name}</p></div>
              <div className="col-span-2"><p className="text-xs text-[var(--color-text-muted)] uppercase font-bold">College</p><p className="font-medium">{lead.college}</p></div>
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: Activity Timeline */}
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="flex border-b border-[var(--color-border-subtle)]">
              <button 
                onClick={() => setActiveTab('timeline')}
                className={clsx("flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors", activeTab === 'timeline' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-text-muted)] bg-[var(--color-surface-light)]')}
              >
                Activity Timeline
              </button>
            </div>
            <CardContent className="p-4 max-h-[600px] overflow-y-auto">
              {actLoading ? (
                <p className="text-[var(--color-text-muted)] text-center py-4">Loading activities...</p>
              ) : activities?.length === 0 ? (
                <p className="text-[var(--color-text-muted)] text-center py-4">No activities yet.</p>
              ) : (
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-[var(--color-border-subtle)] before:to-transparent mt-4">
                  {activities?.map((act: any, i: number) => (
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

      {/* CALL OUTCOME MODAL */}
      <Modal isOpen={showCallModal} onClose={() => setShowCallModal(false)} title="Record Call Outcome">
        <div className="space-y-3">
          <Button fullWidth variant="outline" className="justify-start hover:bg-[#ECFDF5] hover:border-[#34D399] hover:text-[#047857]" onClick={() => handleCallOutcome('CALL_COMPLETED')}>Student Answered</Button>
          <Button fullWidth variant="outline" className="justify-start" onClick={() => handleCallOutcome('CALL_NO_ANSWER')}>No Answer</Button>
          <Button fullWidth variant="outline" className="justify-start" onClick={() => handleCallOutcome('CALL_BUSY')}>Busy</Button>
          <Button fullWidth variant="outline" className="justify-start hover:bg-[#FEF2F2] hover:border-[#F87171] hover:text-[#B91C1C]" onClick={() => handleCallOutcome('CALL_WRONG_NUMBER')}>Wrong Number</Button>
        </div>
        <div className="mt-6">
          <Button fullWidth variant="ghost" onClick={() => setShowCallModal(false)}>Cancel</Button>
        </div>
      </Modal>

      {/* MISSING CR INFO MODAL */}
      <Modal isOpen={showMissingInfoModal} onClose={() => setShowMissingInfoModal(false)} title="Missing CR Information">
        <p className="text-sm text-gray-500 mb-4">College, Department, and Year are required to verify this lead as a Class Representative. Please provide them below.</p>
        <form onSubmit={submitMissingCRInfo} className="space-y-4">
            <div>
                <label className="block text-sm font-medium mb-1">College *</label>
                <Input type="text" required value={missingCRInfo.college} onChange={e => setMissingCRInfo({...missingCRInfo, college: e.target.value})} placeholder="e.g. SRM Institute" />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Department *</label>
                <Input type="text" required value={missingCRInfo.department} onChange={e => setMissingCRInfo({...missingCRInfo, department: e.target.value})} placeholder="e.g. Computer Science" />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Year *</label>
                <Input type="text" required value={missingCRInfo.year} onChange={e => setMissingCRInfo({...missingCRInfo, year: e.target.value})} placeholder="e.g. 3rd Year" />
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <Button type="button" variant="ghost" onClick={() => setShowMissingInfoModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={verifyCRYes.isPending}>Save & Verify CR</Button>
            </div>
        </form>
      </Modal>

      {showUpdateDrawer && (
        <UpdateLeadDrawer
          lead={lead}
          isOpen={showUpdateDrawer}
          onClose={() => setShowUpdateDrawer(false)}
        />
      )}
    </div>
  );
};

export default LeadDetail;
