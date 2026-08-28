import React, { useState } from 'react';
import { useEmployees } from '../hooks/useEmployees';
import { Card } from '../components/ui/Card';
import { Table, TableContainer, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Users, Search, Plus, Mail, Ban, CheckCircle, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import moment from 'moment-timezone';

const EmployeeManagement = () => {
    const { allEmployees, updateStatus, resendInvitation } = useEmployees();
    const navigate = useNavigate();

    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');

    const filteredEmployees = allEmployees?.filter((emp: any) => {
        const matchesSearch = emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              emp.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              emp.email?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === 'All' || emp.role === roleFilter;
        const matchesStatus = statusFilter === 'All' || emp.status === statusFilter;
        return matchesSearch && matchesRole && matchesStatus;
    });

    const handleStatusToggle = async (emp: any) => {
        const newStatus = emp.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
        if (window.confirm(`Are you sure you want to mark this employee as ${newStatus}?`)) {
            try {
                await updateStatus.mutateAsync({ id: emp._id, status: newStatus });
            } catch (e: any) {
                alert(e.response?.data?.message || 'Error updating status');
            }
        }
    };

    const handleResend = async (id: string) => {
        if (window.confirm('This will generate a new temporary password and send a welcome email. Proceed?')) {
            try {
                await resendInvitation.mutateAsync(id);
                alert('Invitation resent successfully');
            } catch (e: any) {
                alert(e.response?.data?.message || 'Error resending invitation');
            }
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--color-primary)] flex items-center">
                        <Users className="mr-2" /> Employee Management
                    </h1>
                    <p className="text-[var(--color-text-muted)] text-sm mt-1">Manage employees, access, roles, attendance and account status.</p>
                </div>
                <div className="flex gap-3 flex-wrap">
                    <Button variant="outline"><Download size={16} className="mr-2"/> Export</Button>
                    <Button onClick={() => navigate('/employees/create')}><Plus size={16} className="mr-2"/> Create Employee</Button>
                </div>
            </div>

            <Card className="p-4 flex flex-col md:flex-row gap-4 items-center bg-[var(--color-surface-light)] border border-[var(--color-border-subtle)]">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search by ID, Name, Email..." 
                        className="pl-10 pr-4 py-2 w-full border border-[var(--color-border-subtle)] rounded-lg outline-none focus:border-[var(--color-primary)]"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <select className="border border-[var(--color-border-subtle)] rounded-lg py-2 px-4 outline-none w-full md:w-auto" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                    <option value="All">All Roles</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="RGS">RGS</option>
                    <option value="BDE">BDE</option>
                </select>
                <select className="border border-[var(--color-border-subtle)] rounded-lg py-2 px-4 outline-none w-full md:w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="All">All Statuses</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INVITED">INVITED</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                </select>
            </Card>

            <Card>
                <div className="hidden md:block">
                    <TableContainer>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>ID & Role</TableHead>
                                    <TableHead>Department</TableHead>
                                    <TableHead>Joining Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredEmployees?.map((emp: any) => (
                                    <TableRow key={emp._id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3 flex-wrap">
                                                {emp.profilePhoto ? (
                                                    <img src={`${import.meta.env.VITE_API_URL?.replace('/api','') || ''}${emp.profilePhoto}`} className="w-10 h-10 rounded-full object-cover border" alt={emp.name} />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                                                        {emp.name.charAt(0)}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-semibold text-[var(--color-text-primary)] hover:underline cursor-pointer" onClick={() => navigate(`/employees/${emp._id}`)}>{emp.name}</p>
                                                    <p className="text-xs text-gray-500">{emp.email}</p>
                                                    <p className="text-xs text-gray-400">{emp.phone}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <p className="font-mono text-sm">{emp.employeeId || 'Pending'}</p>
                                            <Badge variant="neutral" className="mt-1">{emp.role}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <p className="text-sm">{emp.department || '-'}</p>
                                            <p className="text-xs text-gray-500">{emp.designation || '-'}</p>
                                        </TableCell>
                                        <TableCell>
                                            {emp.joiningDate ? moment(emp.joiningDate).format('DD MMM YYYY') : '-'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={emp.status === 'ACTIVE' ? 'success' : emp.status === 'INVITED' ? 'warning' : 'error'}>
                                                {emp.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2 flex-wrap">
                                                {emp.status === 'INVITED' && (
                                                    <button title="Resend Invitation" onClick={() => handleResend(emp._id)} className="text-orange-500 hover:text-orange-700"><Mail size={18}/></button>
                                                )}
                                                <button 
                                                    title={emp.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                                                    onClick={() => handleStatusToggle(emp)} 
                                                    className={emp.status === 'ACTIVE' ? 'text-red-500 hover:text-red-700' : 'text-green-500 hover:text-green-700'}
                                                >
                                                    {emp.status === 'ACTIVE' ? <Ban size={18} /> : <CheckCircle size={18} />}
                                                </button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {filteredEmployees?.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">No employees found.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </div>

                <div className="md:hidden divide-y divide-gray-100">
                    {filteredEmployees?.map((emp: any) => (
                        <div key={emp._id} className="p-4 bg-white hover:bg-gray-50">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3 cursor-pointer flex-wrap" onClick={() => navigate(`/employees/${emp._id}`)}>
                                    {emp.profilePhoto ? (
                                        <img src={`${import.meta.env.VITE_API_URL?.replace('/api','') || ''}${emp.profilePhoto}`} className="w-12 h-12 rounded-full object-cover border" alt={emp.name} />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg">
                                            {emp.name.charAt(0)}
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-semibold text-gray-900">{emp.name}</p>
                                        <p className="text-xs text-gray-500">{emp.employeeId || 'Pending'}</p>
                                    </div>
                                </div>
                                <Badge variant={emp.status === 'ACTIVE' ? 'success' : emp.status === 'INVITED' ? 'warning' : 'error'}>
                                    {emp.status}
                                </Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Role & Dept</p>
                                    <p className="font-medium text-gray-800">{emp.role} • {emp.department || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Joining Date</p>
                                    <p className="font-medium text-gray-800">{emp.joiningDate ? moment(emp.joiningDate).format('DD MMM YYYY') : '-'}</p>
                                </div>
                            </div>
                            <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                                <p className="text-xs text-gray-500 truncate max-w-[200px]">{emp.email}</p>
                                <div className="flex justify-end gap-3 flex-wrap">
                                    {emp.status === 'INVITED' && (
                                        <button title="Resend Invitation" onClick={() => handleResend(emp._id)} className="text-orange-500 bg-orange-50 p-1.5 rounded"><Mail size={16}/></button>
                                    )}
                                    <button 
                                        title={emp.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                                        onClick={() => handleStatusToggle(emp)} 
                                        className={emp.status === 'ACTIVE' ? 'text-red-500 bg-red-50 p-1.5 rounded' : 'text-green-500 bg-green-50 p-1.5 rounded'}
                                    >
                                        {emp.status === 'ACTIVE' ? <Ban size={16} /> : <CheckCircle size={16} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {filteredEmployees?.length === 0 && (
                        <div className="p-8 text-center text-gray-500">No employees found.</div>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default EmployeeManagement;
