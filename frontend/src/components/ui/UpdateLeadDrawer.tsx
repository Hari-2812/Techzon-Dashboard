import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
import { useDailyUpdates } from '../../hooks/useDailyUpdates';

interface UpdateLeadDrawerProps {
  lead: any;
  isOpen: boolean;
  onClose: () => void;
}

const UpdateLeadDrawer: React.FC<UpdateLeadDrawerProps> = ({ lead, isOpen, onClose }) => {
  const { createUpdate } = useDailyUpdates();
  
  const [formData, setFormData] = useState({
    callOutcome: '',
    studentResponse: '',
    crStatus: lead?.crStatus || 'Not Verified',
    salesStatus: lead?.salesStatus || 'Not Contacted',
    courseInterested: lead?.course || '',
    followUpRequired: false,
    nextFollowUpDate: '',
    nextFollowUpTime: '',
    followUpType: 'Final Follow-up',
    priority: 'MEDIUM',
    notes: ''
  });

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
    try {
      await createUpdate.mutateAsync({
        leadId: lead._id || lead, // fallback if lead is just ID
        ...formData
      });
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to save update');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
      <div className="bg-white w-full max-w-md h-full overflow-y-auto flex flex-col animate-slide-in-right shadow-2xl">
        
        <div className="flex justify-between items-center p-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-hover)] sticky top-0 z-10">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Update Lead Activity</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-1">
          {/* Read Only Info */}
          <div className="bg-gray-50 p-4 rounded-md border border-[var(--color-border-subtle)] space-y-1">
            <div className="text-sm font-semibold text-[var(--color-text-primary)]">{lead?.studentName || 'Student Name'}</div>
            <div className="text-xs text-[var(--color-text-muted)]">{lead?.phone} • {lead?.college}</div>
            <div className="text-xs text-[var(--color-text-muted)]">{lead?.department} • {lead?.year}</div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Call Outcome</label>
              <select name="callOutcome" value={formData.callOutcome} onChange={handleChange} className="input w-full" required>
                <option value="">Select Outcome...</option>
                <option value="Connected">Connected</option>
                <option value="Not Connected">Not Connected</option>
                <option value="Busy">Busy</option>
                <option value="Switched Off">Switched Off</option>
                <option value="Wrong Number">Wrong Number</option>
                <option value="Call Back Requested">Call Back Requested</option>
                <option value="Interested">Interested</option>
                <option value="Not Interested">Not Interested</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Student Response</label>
              <select name="studentResponse" value={formData.studentResponse} onChange={handleChange} className="input w-full">
                <option value="">Select Response...</option>
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CR Status</label>
                <select name="crStatus" value={formData.crStatus} onChange={handleChange} className="input w-full">
                  <option value="Not Verified">Not Verified</option>
                  <option value="Asked Student">Asked Student</option>
                  <option value="Student Is CR">Student Is CR</option>
                  <option value="Student Is Not CR">Student Is Not CR</option>
                  <option value="CR Details Received">CR Details Received</option>
                  <option value="CR Confirmed">CR Confirmed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sales Status</label>
                <select name="salesStatus" value={formData.salesStatus} onChange={handleChange} className="input w-full">
                  <option value="Not Contacted">Not Contacted</option>
                  <option value="Interested">Interested</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="Negotiation">Negotiation</option>
                  <option value="Converted">Converted</option>
                  <option value="Not Interested">Not Interested</option>
                  <option value="Lost">Lost</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Course Interested In</label>
              <input type="text" name="courseInterested" value={formData.courseInterested} onChange={handleChange} className="input w-full" placeholder="e.g. Full Stack Development" />
            </div>

            <div className="pt-4 border-t border-[var(--color-border-subtle)]">
              <label className="flex items-center space-x-2 mb-4">
                <input type="checkbox" name="followUpRequired" checked={formData.followUpRequired} onChange={handleChange} className="w-4 h-4 text-[var(--color-primary)]" />
                <span className="text-sm font-medium text-[var(--color-text-primary)]">Follow-up Required?</span>
              </label>

              {formData.followUpRequired && (
                <div className="space-y-4 pl-6 border-l-2 border-[var(--color-primary)]">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Follow-up Date</label>
                      <input type="date" name="nextFollowUpDate" value={formData.nextFollowUpDate} onChange={handleChange} className="input w-full" required />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Time</label>
                      <input type="time" name="nextFollowUpTime" value={formData.nextFollowUpTime} onChange={handleChange} className="input w-full" required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Follow-up Type</label>
                    <select name="followUpType" value={formData.followUpType} onChange={handleChange} className="input w-full">
                      <option value="Student Verification">Student Verification</option>
                      <option value="CR Identification">CR Identification</option>
                      <option value="Group Link Collection">Group Link Collection</option>
                      <option value="Final Follow-up">Final Follow-up</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
                    <select name="priority" value={formData.priority} onChange={handleChange} className="input w-full">
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Daily Update / Call Notes <span className="text-red-500">*</span></label>
              <textarea 
                name="notes" 
                value={formData.notes} 
                onChange={handleChange} 
                className="input w-full h-24 resize-none" 
                placeholder="Student is interested in Full Stack Development. Asked to call tomorrow after 5 PM."
                required
              />
            </div>
          </div>
        </form>

        <div className="p-4 border-t border-[var(--color-border-subtle)] bg-white sticky bottom-0 z-10 flex justify-end space-x-3">
          <Button variant="outline" onClick={onClose} disabled={createUpdate.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createUpdate.isPending}>
            {createUpdate.isPending ? 'Saving...' : 'Save Update'}
          </Button>
        </div>

      </div>
    </div>
  );
};

export default UpdateLeadDrawer;
