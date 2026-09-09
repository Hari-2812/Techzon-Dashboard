import sys

with open('frontend/src/pages/LeadDetail.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add states for the modal
state_import_old = '''  const [activeTab, setActiveTab] = useState('timeline');
  const [showCallModal, setShowCallModal] = useState(false);
  const [showCRForm, setShowCRForm] = useState(false);'''

state_import_new = '''  const [activeTab, setActiveTab] = useState('timeline');
  const [showCallModal, setShowCallModal] = useState(false);
  const [showCRForm, setShowCRForm] = useState(false);
  const [callFormData, setCallFormData] = useState({ callResult: '', customerResponse: '', nextAction: 'No Follow-up', followUpDate: '', notes: '' });'''

if state_import_old in content:
    content = content.replace(state_import_old, state_import_new)

# Update handleCallOutcome
handle_call_old = '''  const handleCallOutcome = async (outcome: string) => {
    await recordCall.mutateAsync({ leadId: id!, outcome, notes: '' });
    setShowCallModal(false);
  };'''

handle_call_new = '''  const handleCallOutcome = async () => {
    await recordCall.mutateAsync({ 
      leadId: id!, 
      callResult: callFormData.callResult, 
      customerResponse: callFormData.customerResponse, 
      nextAction: callFormData.nextAction, 
      followUpDate: callFormData.followUpDate, 
      notes: callFormData.notes 
    });
    setShowCallModal(false);
    setCallFormData({ callResult: '', customerResponse: '', nextAction: 'No Follow-up', followUpDate: '', notes: '' });
  };'''

if handle_call_old in content:
    content = content.replace(handle_call_old, handle_call_new)

# Update the timeline render
timeline_old = '''                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-[var(--color-surface-light)] p-3 rounded-lg border border-[var(--color-border-subtle)]">
                        <div className="flex justify-between mb-1">
                          <span className="font-bold text-sm text-[var(--color-text-primary)]">{act.activityType.replace(/_/g, ' ')}</span>
                          <span className="text-xs text-[var(--color-text-muted)]">{new Date(act.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        <p className="text-xs text-[var(--color-text-secondary)]">{act.description}</p>
                        <p className="text-[10px] text-[var(--color-text-muted)] mt-2 font-semibold">By: {act.employeeId?.name}</p>
                      </div>'''

timeline_new = '''                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-[var(--color-surface-light)] p-3 rounded-lg border border-[var(--color-border-subtle)]">
                        <div className="flex justify-between mb-1">
                          <span className="font-bold text-sm text-[var(--color-text-primary)]">
                            {act.activityType === 'Sales Call' ? 'CALL' : act.activityType.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs text-[var(--color-text-muted)]">{new Date(act.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        
                        {act.activityType === 'Sales Call' ? (
                           <div className="space-y-1 mt-2 text-sm">
                             <div><span className="font-semibold text-gray-500 text-xs">Result:</span> <span className={clsx("font-bold", act.metadata?.callResult === 'Connected' ? 'text-green-600' : act.metadata?.callResult === 'No Answer' ? 'text-orange-500' : act.metadata?.callResult === 'Busy' ? 'text-yellow-600' : act.metadata?.callResult === 'Wrong Number' ? 'text-red-500' : 'text-gray-700')}>{act.metadata?.callResult || 'Unknown'}</span></div>
                             {act.metadata?.response && <div><span className="font-semibold text-gray-500 text-xs">Response:</span> {act.metadata.response}</div>}
                             {act.metadata?.remarks && <div><span className="font-semibold text-gray-500 text-xs">Notes:</span> {act.metadata.remarks}</div>}
                           </div>
                        ) : act.activityType === 'CALL_COMPLETED' ? (
                           <div className="space-y-1 mt-2 text-sm">
                             <div><span className="font-semibold text-gray-500 text-xs">Result:</span> <span className="font-bold text-gray-500">Completed / Unknown</span></div>
                           </div>
                        ) : (
                           <p className="text-xs text-[var(--color-text-secondary)]">{act.description}</p>
                        )}
                        
                        <p className="text-[10px] text-[var(--color-text-muted)] mt-2 font-semibold">By: {act.employeeId?.name}</p>
                      </div>'''

if timeline_old in content:
    content = content.replace(timeline_old, timeline_new)

# Update the modal
modal_old = '''      {/* CALL OUTCOME MODAL */}
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
      </Modal>'''

modal_new = '''      {/* CALL OUTCOME MODAL */}
      <Modal isOpen={showCallModal} onClose={() => setShowCallModal(false)} title="Record Call Outcome">
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Call Result *</label>
                <select 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[var(--color-primary)] outline-none"
                    value={callFormData.callResult}
                    onChange={e => setCallFormData({ ...callFormData, callResult: e.target.value })}
                >
                    <option value="">Select Result...</option>
                    {['Connected', 'No Answer', 'Busy', 'Wrong Number', 'Call Back', 'Failed'].map(r => (
                        <option key={r} value={r}>{r}</option>
                    ))}
                </select>
            </div>
            
            {callFormData.callResult === 'Connected' && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Customer Response</label>
                    <select 
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[var(--color-primary)] outline-none"
                        value={callFormData.customerResponse}
                        onChange={e => setCallFormData({ ...callFormData, customerResponse: e.target.value })}
                    >
                        <option value="">Select Response...</option>
                        {['Interested', 'Not Interested', 'Need More Information', 'Call Back', 'Converted', 'Not Converted'].map(r => (
                            <option key={r} value={r}>{r}</option>
                        ))}
                    </select>
                </div>
            )}
            
            {(callFormData.callResult === 'Connected' || callFormData.callResult === 'Call Back') && (
                <>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Next Action</label>
                        <select 
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[var(--color-primary)] outline-none"
                            value={callFormData.nextAction}
                            onChange={e => setCallFormData({ ...callFormData, nextAction: e.target.value })}
                        >
                            <option value="No Follow-up">No Follow-up</option>
                            <option value="Follow-up">Follow-up</option>
                        </select>
                    </div>
                    
                    {callFormData.nextAction === 'Follow-up' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Date & Time</label>
                            <input 
                                type="datetime-local" 
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[var(--color-primary)] outline-none"
                                value={callFormData.followUpDate}
                                onChange={e => setCallFormData({ ...callFormData, followUpDate: e.target.value })}
                            />
                        </div>
                    )}
                </>
            )}

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[var(--color-primary)] outline-none"
                    rows={3}
                    value={callFormData.notes}
                    onChange={e => setCallFormData({ ...callFormData, notes: e.target.value })}
                    placeholder="Enter any additional details..."
                ></textarea>
            </div>
            
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <Button variant="ghost" onClick={() => setShowCallModal(false)}>Cancel</Button>
                <Button variant="primary" onClick={handleCallOutcome} disabled={!callFormData.callResult || recordCall.isPending}>Save Call</Button>
            </div>
        </div>
      </Modal>'''

if modal_old in content:
    content = content.replace(modal_old, modal_new)

with open('frontend/src/pages/LeadDetail.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("LeadDetail.tsx patched.")
