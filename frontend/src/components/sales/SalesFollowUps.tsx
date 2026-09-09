import React from 'react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableContainer } from '../ui/Table';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Phone, Edit, CalendarClock, AlertTriangle } from 'lucide-react';
import moment from 'moment-timezone';

interface SalesFollowUpsProps {
    followUps: any[];
    onUpdate: (sale: any) => void;
    onCall: (sale: any) => void;
}

export const SalesFollowUps = ({ followUps, onUpdate, onCall }: SalesFollowUpsProps) => {
    if (!followUps || followUps.length === 0) {
        return (
            <div className="p-12 text-center flex flex-col items-center justify-center bg-white rounded-xl border border-gray-200">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                    <CalendarClock className="w-8 h-8 text-blue-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Follow-ups Scheduled</h3>
                <p className="text-gray-500">You don't have any pending follow-ups at the moment.</p>
            </div>
        );
    }

    const today = moment().tz('Asia/Kolkata').startOf('day');
    const now = moment().tz('Asia/Kolkata');

    const categorized = followUps.reduce((acc, sale) => {
        if (!sale.nextFollowUp) {
            acc.pending.push(sale);
            return acc;
        }
        
        const fuDate = moment(sale.nextFollowUp).tz('Asia/Kolkata');
        
        if (fuDate.isBefore(now)) {
            acc.overdue.push(sale);
        } else if (fuDate.isSame(today, 'day')) {
            acc.today.push(sale);
        } else {
            acc.upcoming.push(sale);
        }
        
        return acc;
    }, { overdue: [], today: [], upcoming: [], pending: [] } as Record<string, any[]>);

    const renderTable = (title: string, data: any[], colorClass: string, icon: React.ReactNode) => {
        if (data.length === 0) return null;
        
        return (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm mb-6">
                <div className={`p-4 border-b border-gray-200 flex items-center justify-between ${colorClass.split(' ')[0]}`}>
                    <h3 className={`font-bold flex items-center gap-2 ${colorClass.split(' ')[1]}`}>
                        {icon}
                        {title}
                    </h3>
                    <Badge className={colorClass.split(' ')[2]}>{data.length} Contacts</Badge>
                </div>
                <TableContainer>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Customer</TableHead>
                                <TableHead>Domain & Response</TableHead>
                                <TableHead>Follow-up Scheduled</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((sale) => (
                                <TableRow key={sale._id}>
                                    <TableCell>
                                        <div className="font-bold text-gray-900">{sale.studentName}</div>
                                        <div className="text-sm text-gray-500">{sale.phone}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm font-medium">{sale.interestedDomain || '-'}</div>
                                        <div className="text-xs text-gray-500 truncate max-w-[200px]" title={sale.studentResponse}>
                                            {sale.studentResponse ? `"${sale.studentResponse}"` : '-'}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm font-semibold text-gray-900">
                                            {sale.nextFollowUp ? moment(sale.nextFollowUp).format('DD MMM, hh:mm A') : 'Pending'}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {sale.nextFollowUp ? moment(sale.nextFollowUp).fromNow() : ''}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" onClick={() => onCall(sale)}>
                                                <Phone className="w-4 h-4 mr-1" />
                                                Call
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => onUpdate(sale)}>
                                                <Edit className="w-4 h-4 mr-1" />
                                                Update
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {renderTable('Overdue Follow-ups', categorized.overdue, 'bg-red-50 text-red-700 bg-red-100 text-red-800', <AlertTriangle className="w-5 h-5" />)}
            {renderTable('Today\'s Follow-ups', categorized.today, 'bg-blue-50 text-blue-700 bg-blue-100 text-blue-800', <CalendarClock className="w-5 h-5" />)}
            {renderTable('Upcoming Follow-ups', categorized.upcoming, 'bg-gray-50 text-gray-700 bg-gray-200 text-gray-800', <CalendarClock className="w-5 h-5" />)}
            {renderTable('Pending Follow-ups (No Date)', categorized.pending, 'bg-gray-50 text-gray-500 bg-gray-200 text-gray-700', <CalendarClock className="w-5 h-5" />)}
        </div>
    );
};
