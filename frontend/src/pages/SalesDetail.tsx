import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSalesDetail, useLogCall, useAddResponse, useUpdateSalesStatus, useUpdateSalesPriority, useConvertSale } from '../hooks/useSales';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Phone, MessageCircle, ArrowLeft, Clock, CheckCircle } from 'lucide-react';
import { openWhatsApp } from '../utils/whatsapp';
import moment from 'moment';

const SalesDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data, isLoading } = useSalesDetail(id || '');
    
    const [actionModal, setActionModal] = useState<string | null>(null);
    const [formData, setFormData] = useState<any>({});
    
    const logCall = useLogCall();
    const addResponse = useAddResponse();
    const updateStatus = useUpdateSalesStatus();
    const updatePriority = useUpdateSalesPriority();
    const convertSale = useConvertSale();

    if (isLoading) return <div className="p-6">Loading...</div>;
    if (!data?.lead) return <div className="p-6">Sales lead not found.</div>;

    const { lead, activities } = data;

    const handleLogCall = async () => {
        await logCall.mutateAsync({ id: lead._id, callData: formData });
        setActionModal(null);
        setFormData({});
    };

    const handleAddResponse = async () => {
        await addResponse.mutateAsync({ id: lead._id, responseData: formData });
        setActionModal(null);
        setFormData({});
    };

    const handleConvert = async () => {
        await convertSale.mutateAsync({ id: lead._id, convertData: formData });
        setActionModal(null);
        setFormData({});
    };

    const handlePriorityChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        await updatePriority.mutateAsync({ id: lead._id, priority: e.target.value });
    };
    
    const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        await updateStatus.mutateAsync({ id: lead._id, salesStatus: e.target.value });
    };

    return (
        <div className="p-6 max-w-7xl mx-auto pb-24">
            <button onClick={() => navigate('/sales')} className="flex items-center text-gray-500 hover:text-[var(--color-primary)] mb-4">
                <ArrowLeft size={16} className="mr-1" /> Back to Sales
            </button>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <Card className="p-6">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">{lead.studentName}</h1>
                                <p className="text-gray-500">{lead.phone} • {lead.college}</p>
                                <p className="text-gray-500 text-sm mt-1">{lead.department} • {lead.year}</p>
                            </div>
                            <div className="flex gap-2">
                                <a href={`tel:${lead.phone}`} className="flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-semibold hover:bg-blue-200">
                                    <Phone size={18} className="mr-2" /> Call
                                </a>
                                <button onClick={() => openWhatsApp(lead.phone)} className="flex items-center px-4 py-2 bg-[#25D366] text-white rounded-lg font-semibold hover:bg-[#20b858]">
                                    <MessageCircle size={18} className="mr-2" /> WA
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs text-gray-500 font-bold uppercase">Status</p>
                                <select 
                                    className="mt-1 w-full bg-transparent border-b border-gray-300 py-1 outline-none font-semibold text-[var(--color-primary)]"
                                    value={lead.salesStatus}
                                    onChange={handleStatusChange}
                                >
                                    {['Not Contacted', 'Contacted', 'Interested', 'Follow-up', 'Not Interested', 'Converted', 'Closed'].map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs text-gray-500 font-bold uppercase">Priority</p>
                                <select 
                                    className="mt-1 w-full bg-transparent border-b border-gray-300 py-1 outline-none font-semibold text-[var(--color-text-primary)]"
                                    value={lead.priority}
                                    onChange={handlePriorityChange}
                                >
                                    {['HIGH', 'MEDIUM', 'LOW'].map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button onClick={() => setActionModal('RESPONSE')} variant="outline">Add Response</Button>
                            <Button onClick={() => setActionModal('LOG_CALL')} variant="outline">Log Call</Button>
                            <Button onClick={() => setActionModal('CONVERT')} variant="primary" className="bg-green-600 hover:bg-green-700">Convert Sale</Button>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h2 className="text-xl font-bold mb-4">Activity Timeline</h2>
                        <div className="space-y-4">
                            {activities?.map((act: any) => (
                                <div key={act._id} className="flex gap-4 p-4 border rounded-lg bg-gray-50">
                                    <div className="mt-1">
                                        <Clock size={20} className="text-gray-400" />
                                    </div>
                                    <div>
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
                                    </div>
                                </div>
                            ))}
                            {(!activities || activities.length === 0) && (
                                <p className="text-gray-500">No activities recorded yet.</p>
                            )}
                        </div>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="p-6">
                        <h3 className="font-bold mb-4 text-gray-700">Sales Details</h3>
                        <div className="space-y-3 text-sm">
                            <div>
                                <p className="text-gray-500">Interested Domain</p>
                                <p className="font-semibold">{lead.interestedDomain || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Interested Course</p>
                                <p className="font-semibold">{lead.interestedCourse || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Interest Level</p>
                                <p className="font-semibold">{lead.interestLevel || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Student Response</p>
                                <p className="font-semibold italic">"{lead.studentResponse || 'N/A'}"</p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            <Modal isOpen={actionModal === 'LOG_CALL'} onClose={() => setActionModal(null)} title="Log Call Result">
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
                    <div className="flex justify-end gap-3 mt-6">
                        <Button variant="outline" onClick={() => setActionModal(null)}>Cancel</Button>
                        <Button variant="primary" onClick={handleLogCall} disabled={!formData.callResult}>Save Call Log</Button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={actionModal === 'RESPONSE'} onClose={() => setActionModal(null)} title="Add Student Response">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Interest Level</label>
                        <select 
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[var(--color-primary)] outline-none"
                            value={formData.interestLevel || ''}
                            onChange={e => setFormData({ ...formData, interestLevel: e.target.value })}
                        >
                            <option value="">Select Level...</option>
                            {['High', 'Medium', 'Low', 'None'].map(r => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Interested Course</label>
                        <input 
                            type="text" 
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[var(--color-primary)] outline-none"
                            value={formData.interestedCourse || ''}
                            onChange={e => setFormData({ ...formData, interestedCourse: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Response / Notes</label>
                        <textarea 
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[var(--color-primary)] outline-none"
                            rows={3}
                            value={formData.studentResponse || ''}
                            onChange={e => setFormData({ ...formData, studentResponse: e.target.value })}
                        ></textarea>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <Button variant="outline" onClick={() => setActionModal(null)}>Cancel</Button>
                        <Button variant="primary" onClick={handleAddResponse}>Save Response</Button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={actionModal === 'CONVERT'} onClose={() => setActionModal(null)} title="Convert Sale">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Final Course Enrolled *</label>
                        <input 
                            type="text" 
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[var(--color-primary)] outline-none"
                            value={formData.course || ''}
                            onChange={e => setFormData({ ...formData, course: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Agreed Amount (₹) *</label>
                        <input 
                            type="number" 
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[var(--color-primary)] outline-none"
                            value={formData.amount || ''}
                            onChange={e => setFormData({ ...formData, amount: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                        <select 
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[var(--color-primary)] outline-none"
                            value={formData.paymentStatus || ''}
                            onChange={e => setFormData({ ...formData, paymentStatus: e.target.value })}
                        >
                            <option value="Pending">Pending</option>
                            <option value="Partially Paid">Partially Paid</option>
                            <option value="Paid">Paid</option>
                        </select>
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
                    <div className="flex justify-end gap-3 mt-6">
                        <Button variant="outline" onClick={() => setActionModal(null)}>Cancel</Button>
                        <Button variant="primary" className="bg-green-600 hover:bg-green-700" onClick={handleConvert} disabled={!formData.course || !formData.amount}>Confirm Conversion</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default SalesDetail;
