import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { Button } from './Button';
import { useDailyUpdates } from '../../hooks/useDailyUpdates';
import { useLeads } from '../../hooks/useLeads';

interface UpdateLeadDrawerProps {
  lead?: any; // Optional, if opened directly from LeadDetail
  isOpen: boolean;
  onClose: () => void;
}

const UpdateLeadDrawer: React.FC<UpdateLeadDrawerProps> = ({ lead, isOpen, onClose }) => {
  const { createUpdate } = useDailyUpdates();
  
  const [entryType, setEntryType] = useState<'existing' | 'manual'>(lead ? 'existing' : 'manual');
  
  // Search state for 'existing' mode
  const [searchQuery, setSearchQuery] = useState('');
  const { data: leadsData, isLoading: leadsLoading } = useLeads({ search: searchQuery, limit: 10 });
  const [selectedLead, setSelectedLead] = useState<any>(lead || null);

  const [formData, setFormData] = useState({
    createLead: false,
    
    // Student Info
    studentName: lead?.studentName || '',
    phone: lead?.phone || '',
    email: lead?.email || '',
    college: lead?.college || '',
    department: lead?.department || '',
    year: lead?.year || '',
    courseInterested: lead?.course || '',
    
    // Statuses
    callOutcome: '',
    studentResponse: '',
    leadStatus: lead?.leadStatus || 'New',
    crStatus: lead?.crStatus || 'Not Asked',
    salesStatus: lead?.salesStatus || 'Not Contacted',
    expectedConversionDate: '',
    
    // CR Specifics
    crName: '',
    crPhone: '',
    crCollege: '',
    crDepartment: '',
    crYear: '',
    crSection: '',

    // Follow-up
    followUpRequired: false,
    followUpDate: '',
    followUpTime: '',
    followUpType: 'Final Follow-up',
    followUpPriority: 'MEDIUM',
    followUpNotes: '',

    // Notes
    notes: ''
  });

  // Populate form if an existing lead is selected dynamically
  useEffect(() => {
    if (selectedLead && entryType === 'existing') {
      setFormData(prev => ({
        ...prev,
        studentName: selectedLead.studentName || '',
        phone: selectedLead.phone || '',
        email: selectedLead.email || '',
        college: selectedLead.college || '',
        department: selectedLead.department || '',
        year: selectedLead.year || '',
        courseInterested: selectedLead.course || '',
        leadStatus: selectedLead.leadStatus || 'New',
        crStatus: selectedLead.crStatus || 'Not Asked',
      }));
    }
  }, [selectedLead, entryType]);

  if (!isOpen) return null;

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (entryType === 'existing' && !selectedLead) {
        alert("Please select a lead first.");
        return;
    }

    if (entryType === 'manual' && !formData.createLead) {
        const confirmSave = window.confirm("Create this student as a Lead?\n\nOK = YES (Create Lead)\nCancel = NO (Save only as Daily Update)");
        if (confirmSave) {
            formData.createLead = true;
        }
    }

    try {
      await createUpdate.mutateAsync({
        entryType,
        leadId: selectedLead?._id,
        ...formData
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Failed to save update';
      alert(`Error: ${errorMessage}`);
    }
  };

  const showCRFields = ['Student Is Not CR', 'CR Details Received', 'CR Confirmed'].includes(formData.crStatus);
  const showExpectedDate = formData.salesStatus === 'Interested' || formData.salesStatus === 'Follow-up' || formData.salesStatus === 'Negotiation';

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 overflow-hidden">
      <div className="bg-white w-full max-w-lg h-full overflow-y-auto flex flex-col animate-slide-in-right shadow-2xl">
        
        <div className="flex justify-between items-center p-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-hover)] sticky top-0 z-20">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Add Daily Update</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-6 flex-1">
            
          {/* Mode Toggle */}
          {!lead && (
              <div className="flex p-1 bg-gray-100 rounded-lg">
                  <button 
                    type="button"
                    onClick={() => setEntryType('manual')}
                    className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${entryType === 'manual' ? 'bg-white shadow text-[var(--color-primary)]' : 'text-gray-500'}`}
                  >
                      Manual Entry
                  </button>
                  <button 
                    type="button"
                    onClick={() => setEntryType('existing')}
                    className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${entryType === 'existing' ? 'bg-white shadow text-[var(--color-primary)]' : 'text-gray-500'}`}
                  >
                      Select Existing Lead
                  </button>
              </div>
          )}

          {/* Existing Lead Search */}
          {entryType === 'existing' && !lead && (
              <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Search Lead (Name, Phone, College)</label>
                  <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input 
                        type="text" 
                        placeholder="Search..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input w-full pl-9"
                      />
                  </div>
                  {searchQuery && (
                      <div className="border border-gray-200 rounded-md max-h-48 overflow-y-auto shadow-sm">
                          {leadsLoading ? (
                              <div className="p-3 text-sm text-gray-500">Searching...</div>
                          ) : leadsData?.data?.length > 0 ? (
                              leadsData.data.map((l: any) => (
                                  <div 
                                    key={l._id} 
                                    className="p-3 border-b last:border-0 hover:bg-gray-50 cursor-pointer text-sm"
                                    onClick={() => {
                                        setSelectedLead(l);
                                        setSearchQuery('');
                                    }}
                                  >
                                      <div className="font-semibold">{l.studentName}</div>
                                      <div className="text-xs text-gray-500">{l.phone} • {l.college}</div>
                                  </div>
                              ))
                          ) : (
                              <div className="p-3 text-sm text-gray-500">No leads found.</div>
                          )}
                      </div>
                  )}
              </div>
          )}

          {/* Student Info Card */}
          <div className="bg-gray-50 p-4 rounded-xl border border-[var(--color-border-subtle)] space-y-4">
              <h3 className="font-bold text-[var(--color-text-primary)] border-b pb-2">Student Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Student Name *</label>
                      <input type="text" name="studentName" value={formData.studentName} onChange={handleChange} required disabled={entryType === 'existing' && !!selectedLead} className="input w-full bg-white" />
                  </div>
                  <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number *</label>
                      <input type="text" name="phone" value={formData.phone} onChange={handleChange} required disabled={entryType === 'existing' && !!selectedLead} className="input w-full bg-white" />
                  </div>
                  <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">College *</label>
                      <input type="text" name="college" value={formData.college} onChange={handleChange} required disabled={entryType === 'existing' && !!selectedLead} className="input w-full bg-white" />
                  </div>
                  <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Department / Domain *</label>
                      <input type="text" name="department" value={formData.department} onChange={handleChange} required disabled={entryType === 'existing' && !!selectedLead} className="input w-full bg-white" />
                  </div>
                  <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
                      <input type="text" name="year" value={formData.year} onChange={handleChange} disabled={entryType === 'existing' && !!selectedLead} className="input w-full bg-white" />
                  </div>
                  <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                      <input type="email" name="email" value={formData.email} onChange={handleChange} disabled={entryType === 'existing' && !!selectedLead && !!selectedLead.email} className="input w-full bg-white" />
                  </div>
              </div>
          </div>

          <div className="space-y-5">
            {/* Lead Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lead Status *</label>
              <select name="leadStatus" value={formData.leadStatus} onChange={handleChange} className="input w-full" required>
                <option value="New">New</option>
                <option value="Contact Pending">Contact Pending</option>
                <option value="Contacted">Contacted</option>
                <option value="Interested">Interested</option>
                <option value="Follow-up">Follow-up</option>
                <option value="CR Identified">CR Identified</option>
                <option value="Converted">Converted</option>
                <option value="Not Interested">Not Interested</option>
                <option value="No Response">No Response</option>
                <option value="Invalid">Invalid</option>
              </select>
            </div>

            {/* Call Status & Response */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Today's Call Status</label>
                <select name="callOutcome" value={formData.callOutcome} onChange={handleChange} className="input w-full">
                    <option value="">Not Called</option>
                    <option value="Connected">Connected</option>
                    <option value="Not Connected">Not Connected</option>
                    <option value="Busy">Busy</option>
                    <option value="Switched Off">Switched Off</option>
                    <option value="Call Back Requested">Call Back Requested</option>
                    <option value="Wrong Number">Wrong Number</option>
                </select>
                </div>
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student Response</label>
                <select name="studentResponse" value={formData.studentResponse} onChange={handleChange} className="input w-full">
                    <option value="">None</option>
                    <option value="Interested">Interested</option>
                    <option value="Not Interested">Not Interested</option>
                    <option value="Need More Information">Need More Information</option>
                    <option value="Will Discuss With Parents">Will Discuss With Parents</option>
                    <option value="Already Enrolled">Already Enrolled</option>
                    <option value="Looking For Another Course">Looking For Another Course</option>
                    <option value="Call Later">Call Later</option>
                    <option value="No Response">No Response</option>
                </select>
                </div>
            </div>

            {/* CR Block */}
            <div className="border border-purple-100 bg-purple-50/30 p-4 rounded-xl">
                <label className="block text-sm font-medium text-purple-900 mb-1">CR Status</label>
                <select name="crStatus" value={formData.crStatus} onChange={handleChange} className="input w-full border-purple-200">
                  <option value="Not Asked">Not Asked</option>
                  <option value="Student Is CR">Student Is CR</option>
                  <option value="Student Is Not CR">Student Is Not CR</option>
                  <option value="CR Details Received">CR Details Received</option>
                  <option value="CR Confirmed">CR Confirmed</option>
                  <option value="Not Applicable">Not Applicable</option>
                </select>

                {showCRFields && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-white border border-purple-100 rounded-lg">
                        <div className="md:col-span-2 text-xs font-semibold text-purple-800 uppercase tracking-wide">CR Details</div>
                        <div>
                            <input type="text" name="crName" placeholder="CR Name" value={formData.crName} onChange={handleChange} className="input w-full text-sm" />
                        </div>
                        <div>
                            <input type="text" name="crPhone" placeholder="CR Phone" value={formData.crPhone} onChange={handleChange} className="input w-full text-sm" />
                        </div>
                        <div className="md:col-span-2">
                            <input type="text" name="crCollege" placeholder="CR College (if different)" value={formData.crCollege} onChange={handleChange} className="input w-full text-sm" />
                        </div>
                        <div>
                            <input type="text" name="crDepartment" placeholder="CR Dept" value={formData.crDepartment} onChange={handleChange} className="input w-full text-sm" />
                        </div>
                        <div>
                            <input type="text" name="crYear" placeholder="CR Year" value={formData.crYear} onChange={handleChange} className="input w-full text-sm" />
                        </div>
                        <div className="md:col-span-2">
                            <input type="text" name="crSection" placeholder="CR Section" value={formData.crSection} onChange={handleChange} className="input w-full text-sm" />
                        </div>
                    </div>
                )}
            </div>

            {/* Sales Block */}
            <div className="border border-green-100 bg-green-50/30 p-4 rounded-xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-green-900 mb-1">Sales Status</label>
                        <select name="salesStatus" value={formData.salesStatus} onChange={handleChange} className="input w-full border-green-200">
                        <option value="NOT_CONTACTED">Not Contacted</option>
                        <option value="CONTACTED">Contacted</option>
                        <option value="INTERESTED">Interested</option>
                        <option value="FOLLOW_UP">Follow Up</option>
                        <option value="NOT_INTERESTED">Not Interested</option>
                        <option value="CONVERTED">Converted</option>
                        <option value="CALL_BACK">Call Back</option>
                        <option value="NO_RESPONSE">No Response</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-green-900 mb-1">Course Interested In</label>
                        <input type="text" name="courseInterested" value={formData.courseInterested} onChange={handleChange} className="input w-full border-green-200" placeholder="e.g. Full Stack" />
                    </div>
                </div>
                {showExpectedDate && (
                    <div className="mt-3">
                        <label className="block text-sm font-medium text-green-900 mb-1">Expected Conversion Date (Optional)</label>
                        <input type="date" name="expectedConversionDate" value={formData.expectedConversionDate} onChange={handleChange} className="input w-full border-green-200" />
                    </div>
                )}
            </div>

            {/* Follow-up Section */}
            <div className="pt-2">
              <label className="flex items-center space-x-2 mb-4 p-3 border border-orange-200 bg-orange-50 rounded-lg cursor-pointer">
                <input type="checkbox" name="followUpRequired" checked={formData.followUpRequired} onChange={handleChange} className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500 border-gray-300" />
                <span className="text-sm font-bold text-orange-900">Follow-up Required?</span>
              </label>

              {formData.followUpRequired && (
                <div className="space-y-4 pl-4 md:pl-6 border-l-2 border-orange-400">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Follow-up Date *</label>
                      <input type="date" name="followUpDate" value={formData.followUpDate} onChange={handleChange} className="input w-full" required />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Time *</label>
                      <input type="time" name="followUpTime" value={formData.followUpTime} onChange={handleChange} className="input w-full" required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Follow-up Type</label>
                    <select name="followUpType" value={formData.followUpType} onChange={handleChange} className="input w-full">
                      <option value="Student Verification">Student Verification</option>
                      <option value="CR Identification">CR Identification</option>
                      <option value="CR First Contact">CR First Contact</option>
                      <option value="CR Follow-up">CR Follow-up</option>
                      <option value="Group Creation">Group Creation</option>
                      <option value="Group Link Collection">Group Link Collection</option>
                      <option value="Student Joining Follow-up">Student Joining Follow-up</option>
                      <option value="Final Follow-up">Final Follow-up</option>
                      <option value="Sales Follow-up">Sales Follow-up</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
                    <select name="followUpPriority" value={formData.followUpPriority} onChange={handleChange} className="input w-full">
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Follow-up Notes</label>
                    <textarea name="followUpNotes" value={formData.followUpNotes} onChange={handleChange} className="input w-full h-16 resize-none" placeholder="Call student tomorrow after 5 PM." />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Today's Update / Call Notes <span className="text-red-500">*</span></label>
              <textarea 
                name="notes" 
                value={formData.notes} 
                onChange={handleChange} 
                className="input w-full h-24 resize-none" 
                placeholder="Student is interested in Full Stack Development. Asked to call tomorrow evening after discussing with parents."
                required
              />
            </div>
          </div>
        </form>

        <div className="p-4 border-t border-[var(--color-border-subtle)] bg-white sticky bottom-0 z-20 flex justify-end space-x-3">
          <Button variant="outline" onClick={onClose} disabled={createUpdate.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createUpdate.isPending}>
            {createUpdate.isPending ? 'Saving...' : 'Save Daily Update'}
          </Button>
        </div>

      </div>
    </div>
  );
};

export default UpdateLeadDrawer;
