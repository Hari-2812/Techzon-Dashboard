import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Phone, CalendarClock, MessageCircle, FileText, CheckCircle2, XCircle } from 'lucide-react';
import moment from 'moment-timezone';
import { useLogCall, useAddResponse, useConvertSale, useUpdateSalesStatus } from '../../hooks/useSales';

const CANONICAL_SALES_STATUSES = [
    'Not Contacted', 
    'Contacted', 
    'Interested', 
    'Follow-up', 
    'Not Interested', 
    'Converted', 
    'Closed'
];

const CALL_RESULTS = [
    'Connected',
    'No Response',
    'Busy',
    'Wrong Number',
    'Switched Off'
];

interface SalesActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    sale: any | null;
    mode: 'CALL' | 'UPDATE' | null;
}

export const SalesActionModal = ({ isOpen, onClose, sale, mode }: SalesActionModalProps) => {
    const [callResult, setCallResult] = useState('');
    const [response, setResponse] = useState('');
    const [status, setStatus] = useState('');
    const [notes, setNotes] = useState('');
    const [followUpDate, setFollowUpDate] = useState('');
    const [followUpTime, setFollowUpTime] = useState('');
    const [isConverting, setIsConverting] = useState(false);

    const logCallMutation = useLogCall();
    const addResponseMutation = useAddResponse();
    const convertSaleMutation = useConvertSale();
    const updateStatusMutation = useUpdateSalesStatus();

    useEffect(() => {
        if (sale && isOpen) {
            setCallResult('');
            setResponse(sale.studentResponse || '');
            setStatus(sale.salesStatus || 'Not Contacted');
            setNotes('');
            setIsConverting(false);
            
            if (sale.nextFollowUp) {
                const fu = moment(sale.nextFollowUp).tz('Asia/Kolkata');
                setFollowUpDate(fu.format('YYYY-MM-DD'));
                setFollowUpTime(fu.format('HH:mm'));
            } else {
                setFollowUpDate('');
                setFollowUpTime('');
            }
        }
    }, [sale, isOpen]);

    if (!isOpen || !sale) return null;

    const handleSave = async () => {
        try {
            let fuDateTime = null;
            if (followUpDate && followUpTime) {
                fuDateTime = moment.tz(`${followUpDate} ${followUpTime}`, 'YYYY-MM-DD HH:mm', 'Asia/Kolkata').toDate();
            }

            if (isConverting) {
                // Handle conversion
                await convertSaleMutation.mutateAsync({
                    id: sale._id,
                    convertData: {
                        amount: 0, // Admin can edit this later in actual CRM
                        remarks: notes,
                        conversionDate: moment().toDate()
                    }
                });
            } else if (mode === 'CALL') {
                // Log Call
                await logCallMutation.mutateAsync({
                    id: sale._id,
                    callData: {
                        callResult,
                        remarks: notes,
                        nextFollowUp: fuDateTime
                    }
                });
                
                // If they also updated response/status directly in call modal
                if (response || status !== sale.salesStatus) {
                    await addResponseMutation.mutateAsync({
                        id: sale._id,
                        responseData: {
                            studentResponse: response,
                            salesStatus: status,
                            nextFollowUp: fuDateTime,
                            remarks: notes
                        }
                    });
                }
            } else {
                // Just Update Response/Status
                await addResponseMutation.mutateAsync({
                    id: sale._id,
                    responseData: {
                        studentResponse: response,
                        salesStatus: status,
                        nextFollowUp: fuDateTime,
                        remarks: notes
                    }
                });
            }
            onClose();
        } catch (error) {
            console.error('Failed to update sales record', error);
            alert('Failed to update. Please try again.');
        }
    };

    const isPending = logCallMutation.isPending || addResponseMutation.isPending || convertSaleMutation.isPending;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={mode === 'CALL' ? 'Record Call Result' : 'Update Sales Record'}>
            <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* Customer Snapshot */}
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex justify-between items-center">
                    <div>
                        <div className="font-bold text-gray-900">{sale.studentName}</div>
                        <div className="text-sm font-mono text-indigo-600">{sale.phone}</div>
                    </div>
                    <Badge className="bg-gray-200 text-gray-800">{sale.salesStatus}</Badge>
                </div>

                {/* Call Result Section */}
                {mode === 'CALL' && (
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Call Result *</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {CALL_RESULTS.map(res => (
                                <button
                                    key={res}
                                    onClick={() => {
                                        setCallResult(res);
                                        if (res === 'Connected') setStatus('Contacted');
                                        if (res === 'No Response' || res === 'Busy' || res === 'Switched Off') setStatus('Follow-up');
                                    }}
                                    className={`p-2 text-sm border rounded-md transition-colors ${callResult === res ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-semibold' : 'bg-white border-gray-300 hover:bg-gray-50 text-gray-700'}`}
                                >
                                    {res}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Conversion Toggle */}
                {(!isConverting && status !== 'Converted') ? (
                    <Button variant="outline" className="w-full border-green-200 text-green-700 bg-green-50 hover:bg-green-100" onClick={() => {
                        setIsConverting(true);
                        setStatus('Converted');
                    }}>
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Mark as Converted
                    </Button>
                ) : (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                        <div className="font-bold text-green-800 mb-1 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 mr-1" /> Customer Converted!
                        </div>
                        <p className="text-xs text-green-600 mb-2">Saving will move this to the Sales records.</p>
                        <Button size="sm" variant="outline" className="border-green-300 text-green-700" onClick={() => {
                            setIsConverting(false);
                            setStatus(sale.salesStatus);
                        }}>Cancel Conversion</Button>
                    </div>
                )}

                {!isConverting && (
                    <>
                        {/* Status & Response */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-semibold text-gray-700 mb-1 block">Sales Status</label>
                                <select 
                                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                >
                                    {CANONICAL_SALES_STATUSES.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-gray-700 mb-1 block">Customer Response</label>
                                <Input 
                                    placeholder="e.g. Interested in Node.js"
                                    value={response}
                                    onChange={(e) => setResponse(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Follow-up Section */}
                        <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 space-y-3">
                            <div className="flex items-center gap-2 font-semibold text-blue-800">
                                <CalendarClock className="w-4 h-4" /> Next Follow-up
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-blue-700 mb-1 block">Date</label>
                                    <Input 
                                        type="date"
                                        value={followUpDate}
                                        onChange={(e) => setFollowUpDate(e.target.value)}
                                        className="border-blue-200"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-blue-700 mb-1 block">Time</label>
                                    <Input 
                                        type="time"
                                        value={followUpTime}
                                        onChange={(e) => setFollowUpTime(e.target.value)}
                                        className="border-blue-200"
                                    />
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Notes */}
                <div>
                    <label className="text-sm font-semibold text-gray-700 mb-1 block">Notes / Remarks</label>
                    <textarea 
                        className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 h-24 resize-none"
                        placeholder="Add any internal notes about this interaction..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    ></textarea>
                </div>
            </div>
            
            <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
                <Button 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white" 
                    onClick={handleSave}
                    disabled={isPending || (mode === 'CALL' && !callResult && !isConverting)}
                >
                    {isPending ? 'Saving...' : 'Save Update'}
                </Button>
            </div>
        </Modal>
    );
};
