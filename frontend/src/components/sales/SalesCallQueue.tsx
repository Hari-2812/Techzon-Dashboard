import React from 'react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableContainer } from '../ui/Table';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Phone, Clock, FileText } from 'lucide-react';
import moment from 'moment-timezone';

interface SalesCallQueueProps {
    queue: any[];
    onCall: (sale: any) => void;
}

export const SalesCallQueue = ({ queue, onCall }: SalesCallQueueProps) => {
    if (!queue || queue.length === 0) {
        return (
            <div className="p-12 text-center flex flex-col items-center justify-center bg-white rounded-xl border border-gray-200">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
                    <Phone className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Calls Pending</h3>
                <p className="text-gray-500">Your call queue is completely clear!</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Phone className="w-5 h-5 text-indigo-600" />
                    Call Queue
                </h3>
                <Badge className="bg-indigo-100 text-indigo-800">{queue.length} Pending</Badge>
            </div>
            <TableContainer>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Contact Info</TableHead>
                            <TableHead>Domain</TableHead>
                            <TableHead>Last Call / Status</TableHead>
                            <TableHead>Next Action</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {queue.map((sale) => (
                            <TableRow key={sale._id}>
                                <TableCell>
                                    <div className="font-bold text-gray-900">{sale.studentName}</div>
                                    <div className="text-sm font-medium text-indigo-600 font-mono mt-1">{sale.phone}</div>
                                </TableCell>
                                <TableCell>
                                    <div className="text-sm font-medium text-gray-700">{sale.interestedDomain || '-'}</div>
                                    {sale.college && <div className="text-xs text-gray-500 truncate max-w-[150px]">{sale.college}</div>}
                                </TableCell>
                                <TableCell>
                                    <Badge className="bg-gray-100 text-gray-700 mb-1">
                                        {sale.salesStatus || 'Not Contacted'}
                                    </Badge>
                                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                        <Clock className="w-3 h-3" />
                                        {sale.lastContactedAt ? moment(sale.lastContactedAt).fromNow() : 'Never called'}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {sale.nextFollowUp ? (
                                        <div className="flex flex-col">
                                            <span className={`text-sm font-semibold ${moment(sale.nextFollowUp).isBefore(moment()) ? 'text-red-600' : 'text-orange-600'}`}>
                                                {moment(sale.nextFollowUp).isBefore(moment()) ? 'OVERDUE' : 'DUE'}
                                            </span>
                                            <span className="text-xs text-gray-600">{moment(sale.nextFollowUp).format('DD MMM, hh:mm A')}</span>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-gray-500">Initial Call</div>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button onClick={() => onCall(sale)} className="bg-green-600 hover:bg-green-700 text-white font-bold px-6">
                                        <Phone className="w-4 h-4 mr-2" />
                                        Call Now
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </div>
    );
};
