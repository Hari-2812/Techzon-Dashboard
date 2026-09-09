import React from 'react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableContainer } from '../ui/Table';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Phone, Edit } from 'lucide-react';
import moment from 'moment-timezone';

interface SalesListProps {
    sales: any[];
    onUpdate: (sale: any) => void;
    onCall: (sale: any) => void;
}

export const SalesList = ({ sales, onUpdate, onCall }: SalesListProps) => {
    if (!sales || sales.length === 0) {
        return (
            <div className="p-8 text-center text-gray-500 bg-white rounded-lg border border-gray-200">
                No sales contacts found.
            </div>
        );
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'New':
            case 'Not Contacted': return 'bg-gray-100 text-gray-800';
            case 'Contacted': return 'bg-blue-100 text-blue-800';
            case 'Interested': return 'bg-purple-100 text-purple-800';
            case 'Follow-up': return 'bg-orange-100 text-orange-800';
            case 'Converted': return 'bg-green-100 text-green-800';
            case 'Not Interested':
            case 'Closed': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <TableContainer>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Domain</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Response</TableHead>
                        <TableHead>Follow-up</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sales.map((sale, index) => (
                        <TableRow key={sale._id}>
                            <TableCell className="font-mono text-gray-500 text-xs">
                                {index + 1}
                            </TableCell>
                            <TableCell>
                                <div className="font-medium text-gray-900">{sale.studentName}</div>
                                {sale.college && <div className="text-xs text-gray-500 truncate max-w-[150px]">{sale.college}</div>}
                            </TableCell>
                            <TableCell>
                                <div className="text-sm">{sale.phone}</div>
                                {sale.email && <div className="text-xs text-gray-500">{sale.email}</div>}
                            </TableCell>
                            <TableCell>
                                <div className="text-sm font-medium">{sale.interestedDomain || '-'}</div>
                            </TableCell>
                            <TableCell>
                                <Badge className={getStatusColor(sale.salesStatus)}>
                                    {sale.salesStatus || 'Not Contacted'}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <div className="text-sm text-gray-600 truncate max-w-[150px]" title={sale.studentResponse}>
                                    {sale.studentResponse || '-'}
                                </div>
                            </TableCell>
                            <TableCell>
                                {sale.nextFollowUp ? (
                                    <div className="text-sm text-gray-600">
                                        {moment(sale.nextFollowUp).format('DD MMM YYYY, hh:mm A')}
                                    </div>
                                ) : '-'}
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
    );
};
