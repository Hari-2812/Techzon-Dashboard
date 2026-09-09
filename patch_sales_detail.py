import sys

with open('frontend/src/pages/SalesDetail.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Update formData state
form_old = '''    const [formData, setFormData] = useState<any>({});'''
form_new = '''    const [formData, setFormData] = useState<any>({});
    const [callFormData, setCallFormData] = useState({ callResult: '', customerResponse: '', nextAction: 'No Follow-up', followUpDate: '', notes: '' });'''

if form_old in content:
    content = content.replace(form_old, form_new)

# Update handleLogCall
handle_old = '''    const handleLogCall = () => {
        logCall.mutate({ leadId: id!, data: formData }, {
            onSuccess: () => {
                setActionModal(null);
                setFormData({});
            }
        });
    };'''

handle_new = '''    const handleLogCall = () => {
        logCall.mutate({ leadId: id!, data: {
            callResult: callFormData.callResult,
            customerResponse: callFormData.customerResponse,
            nextFollowUp: callFormData.nextAction === 'Follow-up' ? callFormData.followUpDate : null,
            remarks: callFormData.notes
        } }, {
            onSuccess: () => {
                setActionModal(null);
                setCallFormData({ callResult: '', customerResponse: '', nextAction: 'No Follow-up', followUpDate: '', notes: '' });
            }
        });
    };'''

if handle_old in content:
    content = content.replace(handle_old, handle_new)

# Update the modal
modal_old = '''            <Modal isOpen={actionModal === 'LOG_CALL'} onClose={() => setActionModal(null)} title="Log Call Result">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Call Result *</label>
                        <select 
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[var(--color-primary)] outline-none"
                            value={formData.callResult || ''}
                            onChange={e => setFormData({ ...formData, callResult: e.target.value })}
                        >
                            <option value="">Select Result...</option>
                            {['Connected', 'Not Connected', 'Busy', 'Switched Off', 'Wrong Number', 'Interested', 'Not Interested', 'Call Back Later'].map(r => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Next Follow-up Date (Optional)</label>
                        <input 
                            type="datetime-local" 
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[var(--color-primary)] outline-none"
                            value={formData.nextFollowUp || ''}
                            onChange={e => setFormData({ ...formData, nextFollowUp: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                        <textarea 
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[var(--color-primary)] outline-none"
                            rows={3}
                            value={formData.remarks || ''}
                            onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                        ></textarea>
                    </div>
                    <div className="flex justify-end gap-3 mt-6 flex-wrap">
                        <Button variant="outline" onClick={() => setActionModal(null)}>Cancel</Button>
                        <Button variant="primary" onClick={handleLogCall} disabled={!formData.callResult}>Save Call Log</Button>
                    </div>
                </div>
            </Modal>'''

modal_new = '''            <Modal isOpen={actionModal === 'LOG_CALL'} onClose={() => setActionModal(null)} title="Log Call Result">
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
                        <Button variant="ghost" onClick={() => setActionModal(null)}>Cancel</Button>
                        <Button variant="primary" onClick={handleLogCall} disabled={!callFormData.callResult || logCall.isPending}>Save Call Log</Button>
                    </div>
                </div>
            </Modal>'''

if modal_old in content:
    content = content.replace(modal_old, modal_new)

# Update timeline
timeline_old = '''                                    <div>
                                        <p className="font-bold text-[var(--color-text-primary)]">{act.activityType}</p>
                                        <p className="text-sm text-gray-600 mt-1">{act.description}</p>
                                        {act.metadata && (
                                            <div className="mt-2 text-xs bg-white p-2 rounded border font-mono text-gray-500">
                                                {JSON.stringify(act.metadata)}
                                            </div>
                                        )}
                                        <p className="text-xs text-gray-400 mt-2">
                                            {moment(act.timestamp).format('DD MMM YYYY, hh:mm A')} by {act.employeeId?.name || 'Unknown'}
                                        </p>
                                    </div>'''

timeline_new = '''                                    <div className="w-full">
                                        <div className="flex justify-between items-center mb-1">
                                            <p className="font-bold text-[var(--color-text-primary)]">
                                                {act.activityType === 'Sales Call' ? 'CALL' : act.activityType}
                                            </p>
                                        </div>
                                        
                                        {act.activityType === 'Sales Call' ? (
                                            <div className="space-y-1 text-sm mt-2 bg-white p-3 rounded-lg border border-gray-200">
                                                <div><span className="font-semibold text-gray-500 text-xs">Result:</span> <span className={act.metadata?.callResult === 'Connected' ? 'text-green-600 font-bold' : act.metadata?.callResult === 'No Answer' ? 'text-orange-500 font-bold' : act.metadata?.callResult === 'Busy' ? 'text-yellow-600 font-bold' : act.metadata?.callResult === 'Wrong Number' ? 'text-red-500 font-bold' : 'text-gray-700 font-bold'}>{act.metadata?.callResult || 'Unknown'}</span></div>
                                                {act.metadata?.response && <div><span className="font-semibold text-gray-500 text-xs">Response:</span> {act.metadata.response}</div>}
                                                {act.metadata?.remarks && <div><span className="font-semibold text-gray-500 text-xs">Notes:</span> {act.metadata.remarks}</div>}
                                            </div>
                                        ) : act.activityType === 'CALL_COMPLETED' ? (
                                            <div className="space-y-1 text-sm mt-2 bg-white p-3 rounded-lg border border-gray-200">
                                                <div><span className="font-semibold text-gray-500 text-xs">Result:</span> <span className="font-bold text-gray-500">Completed / Unknown</span></div>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-600 mt-1">{act.description}</p>
                                        )}
                                        
                                        <p className="text-xs text-gray-400 mt-2">
                                            {moment(act.timestamp).format('DD MMM YYYY, hh:mm A')} by {act.employeeId?.name || 'Unknown'}
                                        </p>
                                    </div>'''

if timeline_old in content:
    content = content.replace(timeline_old, timeline_new)

with open('frontend/src/pages/SalesDetail.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("SalesDetail.tsx patched.")
