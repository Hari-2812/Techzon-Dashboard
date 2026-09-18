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
    crBulkText: '',

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
        crName: selectedLead.crName || '',
        crPhone: selectedLead.crPhone || '',
        crCollege: selectedLead.crCollege || '',
        crYear: selectedLead.crYear || '',
        crBulkText: [selectedLead.crName, selectedLead.crPhone, selectedLead.crYear, selectedLead.crCollege]
          .filter(val => val && val.trim() !== '')
          .join(', ') || '',
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

  const handleCRBulkChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const parts = value.split(',').map(part => part.trim());
    setFormData(prev => ({
      ...prev,
      crBulkText: value,
      crName: parts[0] || '',
      crPhone: parts[1] || '',
      crYear: parts[2] || '',
      crCollege: parts[3] || ''
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
      {/* Changed to max-w-3xl to allow more breathing room for a 2-column layout */}
      <div className="bg-gray-50 w-full max-w-3xl h-full overflow-y-auto flex flex-col animate-slide-in-right shadow-2xl">
        
        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-white sticky top-0 z-20">
          <h2 className="text-xl font-bold text-gray-900">Add Daily Update</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        <form id="update-lead-form" onSubmit={handleSubmit} className="p-6 md:p-8 space-y-10 flex-1">
            
          {/* Mode Toggle */}
          {!lead && (
              <div className="flex p-1.5 bg-gray-200 rounded-lg max-w-md mx-auto">
                  <button 
                    type="button"
                    onClick={() => setEntryType('manual')}
                    className={`flex-1 py-2.5 text-sm font-semibold rounded-md transition-colors ${entryType === 'manual' ? 'bg-white shadow text-indigo-700' : 'text-gray-600 hover:text-gray-800'}`}
                  >
                      Manual Entry
                  </button>
                  <button 
                    type="button"
                    onClick={() => setEntryType('existing')}
                    className={`flex-1 py-2.5 text-sm font-semibold rounded-md transition-colors ${entryType === 'existing' ? 'bg-white shadow text-indigo-700' : 'text-gray-600 hover:text-gray-800'}`}
                  >
                      Select Existing Lead
                  </button>
              </div>
          )}

          {/* Existing Lead Search */}
          {entryType === 'existing' && !lead && (
              <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Search Existing Lead</label>
                  <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type="text" 
                        placeholder="Search by name, phone, or college..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
                      />
                  </div>
                  {searchQuery && (
                      <div className="border border-gray-200 bg-white rounded-lg max-h-60 overflow-y-auto shadow-lg mt-1">
                          {leadsLoading ? (
                              <div className="p-4 text-sm text-gray-500 text-center">Searching...</div>
                          ) : leadsData?.data?.length > 0 ? (
                              leadsData.data.map((l: any) => (
                                  <div 
                                    key={l._id} 
                                    className="p-4 border-b last:border-0 hover:bg-indigo-50 cursor-pointer transition-colors"
                                    onClick={() => {
                                        setSelectedLead(l);
                                        setSearchQuery('');
                                    }}
                                  >
                                      <div className="font-semibold text-gray-900">{l.studentName}</div>
                                      <div className="text-sm text-gray-500 mt-0.5">{l.phone} • {l.college}</div>
                                  </div>
                              ))
                          ) : (
                              <div className="p-4 text-sm text-gray-500 text-center">No leads found.</div>
                          )}
                      </div>
                  )}
              </div>
          )}

          {/* Section A: Student / Lead Details */}
          <section className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Student & Lead Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Student Name <span className="text-red-500">*</span></label>
                      <input type="text" name="studentName" value={formData.studentName} onChange={handleChange} required disabled={entryType === 'existing' && !!selectedLead} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500" />
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number <span className="text-red-500">*</span></label>
                      <input type="text" name="phone" value={formData.phone} onChange={handleChange} required disabled={entryType === 'existing' && !!selectedLead} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500" />
                  </div>
                  <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">College <span className="text-red-500">*</span></label>
                      <input type="text" name="college" value={formData.college} onChange={handleChange} required disabled={entryType === 'existing' && !!selectedLead} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500" />
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Department / Domain <span className="text-red-500">*</span></label>
                      <input type="text" name="department" value={formData.department} onChange={handleChange} required disabled={entryType === 'existing' && !!selectedLead} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500" />
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                      <input type="text" name="year" value={formData.year} onChange={handleChange} disabled={entryType === 'existing' && !!selectedLead} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500" />
                  </div>
                  <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                      <input type="email" name="email" value={formData.email} onChange={handleChange} disabled={entryType === 'existing' && !!selectedLead && !!selectedLead.email} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500" />
                  </div>
              </div>
          </section>

          {/* Section B: Daily Activity Details */}
          <section className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Daily Activity Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Lead Status <span className="text-red-500">*</span></label>
                  <select name="leadStatus" value={formData.leadStatus} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" required>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Call Status</label>
                  <select name="callOutcome" value={formData.callOutcome} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Student Response</label>
                  <select name="studentResponse" value={formData.studentResponse} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
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
          </section>

          {/* Section C: CR Details */}
          <section className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-6">CR Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">CR Status</label>
                  <select name="crStatus" value={formData.crStatus} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                    <option value="Not Asked">Not Asked</option>
                    <option value="Student Is CR">Student Is CR</option>
                    <option value="Student Is Not CR">Student Is Not CR</option>
                    <option value="CR Details Received">CR Details Received</option>
                    <option value="CR Confirmed">CR Confirmed</option>
                    <option value="Not Applicable">Not Applicable</option>
                  </select>
                </div>

                {showCRFields && (
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Paste CR details using commas
                        </label>
                        <p className="text-xs text-gray-500 mb-2">
                            Example: Rahul Kumar, 9876543210, 3rd Year, ABC Engineering College
                        </p>
                        <textarea 
                            name="crBulkText" 
                            value={formData.crBulkText} 
                            onChange={handleCRBulkChange} 
                            placeholder="CR Name, CR Phone Number, CR Year, CR College"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[100px] resize-y"
                        />
                        
                        {(formData.crBulkText.split(',').length > 4) && (
                            <p className="text-sm text-red-500 mt-2 font-medium">
                                Warning: Too many commas detected. Expected format is: CR Name, CR Phone Number, CR Year, CR College
                            </p>
                        )}
                        
                        {(formData.crName || formData.crPhone || formData.crYear || formData.crCollege) ? (
                            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Parsed Preview:</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    <div><span className="font-medium text-gray-700">CR Name:</span> {formData.crName || <span className="text-gray-400 italic">empty</span>}</div>
                                    <div><span className="font-medium text-gray-700">CR Phone Number:</span> {formData.crPhone || <span className="text-gray-400 italic">empty</span>}</div>
                                    <div><span className="font-medium text-gray-700">CR Year:</span> {formData.crYear || <span className="text-gray-400 italic">empty</span>}</div>
                                    <div><span className="font-medium text-gray-700">CR College:</span> {formData.crCollege || <span className="text-gray-400 italic">empty</span>}</div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}
            </div>
          </section>

          {/* Section D: Sales & Follow-up Details */}
          <section className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Sales & Follow-up</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sales Status</label>
                    <select name="salesStatus" value={formData.salesStatus} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Course Interested In</label>
                    <input type="text" name="courseInterested" value={formData.courseInterested} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="e.g. Full Stack" />
                </div>
                
                {showExpectedDate && (
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Expected Conversion Date</label>
                        <input type="date" name="expectedConversionDate" value={formData.expectedConversionDate} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                )}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <label className="flex items-center space-x-3 mb-6 cursor-pointer">
                <input type="checkbox" name="followUpRequired" checked={formData.followUpRequired} onChange={handleChange} className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300" />
                <span className="text-base font-semibold text-gray-900">Schedule a Follow-up</span>
              </label>

              {formData.followUpRequired && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-indigo-50/50 p-6 rounded-xl border border-indigo-100">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Follow-up Date <span className="text-red-500">*</span></label>
                    <input type="date" name="followUpDate" value={formData.followUpDate} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Time <span className="text-red-500">*</span></label>
                    <input type="time" name="followUpTime" value={formData.followUpTime} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Follow-up Type</label>
                    <select name="followUpType" value={formData.followUpType} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                    <select name="followUpPriority" value={formData.followUpPriority} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Follow-up Notes</label>
                    <textarea name="followUpNotes" value={formData.followUpNotes} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none min-h-[80px]" placeholder="Specific instructions for this follow-up..." />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Section E: General Daily Notes */}
          <section className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">General Daily Notes</h3>
            <p className="text-sm text-gray-500 mb-4">Describe your daily activity, student response, call discussion, CR details, follow-up information, and other important updates.</p>
            <div>
              <textarea 
                name="notes" 
                value={formData.notes} 
                onChange={handleChange} 
                className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[180px] resize-y text-gray-700 leading-relaxed" 
                placeholder="Type your complete update here..."
                required
              />
            </div>
          </section>

        </form>

        <div className="p-6 border-t border-gray-200 bg-white sticky bottom-0 z-20 flex justify-end space-x-4 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)]">
          <Button variant="outline" type="button" onClick={onClose} disabled={createUpdate.isPending} className="px-6 py-2.5 text-base rounded-lg">
            Cancel
          </Button>
          <Button type="submit" form="update-lead-form" disabled={createUpdate.isPending} className="px-8 py-2.5 text-base font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
            {createUpdate.isPending ? 'Saving...' : 'Save Daily Update'}
          </Button>
        </div>

      </div>
    </div>
  );
};

export default UpdateLeadDrawer;
