import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEmployees } from '../hooks/useEmployees';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { ArrowLeft, Mail, Phone, Calendar as CalIcon, MapPin, Briefcase, Edit, MoreVertical, Upload, AlertTriangle, Trash2, X } from 'lucide-react';
import moment from 'moment-timezone';
import { useAuthStore } from '../store/authStore';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { Button } from '../components/ui/Button';

const EmployeeProfile = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { getEmployeeById, resetPassword, updateStatus } = useEmployees();
    const { data: employee, isLoading, isError } = getEmployeeById(id || '');

    const [activeTab, setActiveTab] = useState('Overview');
    const tabs = ['Overview', 'Personal Information', 'Employment', 'Attendance', 'Performance', 'Leads', 'Sales', 'Activity', 'Access'];
    
    const [showMoreActions, setShowMoreActions] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const queryClient = useQueryClient();

    const { data: employeeLeadsData, refetch: refetchEmployeeLeads } = useQuery({
        queryKey: ['employee-assigned-leads-count', id],
        queryFn: async () => {
            const res = await api.get(`/leads?assignedEmployeeId=${id}&limit=1`);
            return res.data.meta.kpis.totalLeads;
        },
        enabled: !!id && user?.role === 'ADMIN'
    });

    const handleResetLeads = async () => {
        try {
            setActionLoading(true);
            const res = await api.delete(`/leads/admin/employees/${id}/all`);
            alert(res.data.message || 'Employee leads reset successfully');
            setIsResetModalOpen(false);
            refetchEmployeeLeads();
            queryClient.invalidateQueries({ queryKey: ['leads'] });
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        } catch (e: any) {
            alert(e.response?.data?.message || 'Error resetting employee leads');
        } finally {
            setActionLoading(false);
        }
    };

    if (isLoading) return <div className="p-8">Loading profile...</div>;
    if (isError || !employee) return <div className="p-8 text-red-500">Employee not found</div>;

    const renderTabContent = () => {
        switch (activeTab) {
            case 'Personal Information':
                return (
                    <Card className="p-6 space-y-4">
                        <h3 className="font-bold border-b pb-2">Personal Details</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div><span className="text-gray-500 block">Date of Birth</span> <span className="font-medium">{employee.dob ? moment(employee.dob).format('DD MMM YYYY') : '-'}</span></div>
                            <div><span className="text-gray-500 block">Gender</span> <span className="font-medium">{employee.gender || '-'}</span></div>
                            <div><span className="text-gray-500 block">Emergency Contact Name</span> <span className="font-medium">{employee.emergencyContact?.name || '-'}</span></div>
                            <div><span className="text-gray-500 block">Emergency Contact Phone</span> <span className="font-medium">{employee.emergencyContact?.phone || '-'}</span></div>
                        </div>
                    </Card>
                );
            case 'Employment':
                return (
                    <Card className="p-6 space-y-4">
                        <h3 className="font-bold border-b pb-2">Employment Details</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div><span className="text-gray-500 block">Role</span> <Badge variant="neutral">{employee.role}</Badge></div>
                            <div><span className="text-gray-500 block">Department</span> <span className="font-medium">{employee.department || '-'}</span></div>
                            <div><span className="text-gray-500 block">Designation</span> <span className="font-medium">{employee.designation || '-'}</span></div>
                            <div><span className="text-gray-500 block">Employment Type</span> <span className="font-medium">{employee.employmentType || '-'}</span></div>
                            <div><span className="text-gray-500 block">Joining Date</span> <span className="font-medium">{employee.joiningDate ? moment(employee.joiningDate).format('DD MMM YYYY') : '-'}</span></div>
                            <div><span className="text-gray-500 block">Work Location</span> <span className="font-medium">{employee.workLocation || '-'}</span></div>
                        </div>
                    </Card>
                );
            case 'Overview':
            default:
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="p-6">
                            <h3 className="font-bold border-b pb-2 mb-4">Quick Stats</h3>
                            <div className="space-y-4 text-sm">
                                <div className="flex justify-between"><span className="text-gray-500">Account Status</span> <Badge variant={employee.status === 'ACTIVE' ? 'success' : 'neutral'}>{employee.status}</Badge></div>
                                <div className="flex justify-between"><span className="text-gray-500">Employee ID</span> <span className="font-mono">{employee.employeeId}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Joined</span> <span>{employee.joiningDate ? moment(employee.joiningDate).fromNow() : '-'}</span></div>
                            </div>
                        </Card>
                    </div>
                );
        }
    };

    const handleResetPassword = async () => {
        if (!window.confirm('Reset password for this employee? A new temporary password will be generated and sent via email.')) return;
        try {
            setActionLoading(true);
            await resetPassword.mutateAsync(employee._id);
            alert('Password reset successfully. Email sent.');
        } catch (e: any) {
            alert(e.response?.data?.message || 'Error resetting password');
        } finally {
            setActionLoading(false);
            setShowMoreActions(false);
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        let reason = '';
        if (newStatus === 'SUSPENDED') {
            reason = window.prompt('Enter reason for suspension:') || '';
            if (!reason) return;
        } else {
            if (!window.confirm(`Change employee status to ${newStatus}?`)) return;
        }

        try {
            setActionLoading(true);
            await updateStatus.mutateAsync({ id: employee._id, status: newStatus, reason });
            alert(`Employee ${newStatus.toLowerCase()} successfully.`);
        } catch (e: any) {
            alert(e.response?.data?.message || 'Error updating status');
        } finally {
            setActionLoading(false);
            setShowMoreActions(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto pb-12 space-y-6">
            <div className="flex justify-between items-center">
                <button onClick={() => navigate('/employees')} className="flex items-center text-sm text-gray-500 hover:text-[var(--color-primary)]">
                    <ArrowLeft size={16} className="mr-1" /> Back to Employees
                </button>
                
                {user?.role === 'ADMIN' && (
                    <div className="flex gap-3 relative flex-wrap">
                        <button 
                            onClick={() => {
                                if (employeeLeadsData === 0) {
                                    alert(`${employee.name} currently has no assigned leads.`);
                                    return;
                                }
                                setIsResetModalOpen(true);
                            }} 
                            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 shadow-sm"
                        >
                            <Trash2 size={16} className="mr-2" /> Remove All Leads
                        </button>
                        <button 
                            onClick={() => navigate(`/employees/${employee._id}/import-leads`)} 
                            className="flex items-center px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-opacity-90 shadow-sm"
                        >
                            <Upload size={16} className="mr-2" /> Upload Leads
                        </button>
                        <button 
                            onClick={() => navigate(`/employees/${employee._id}/edit`)} 
                            className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
                        >
                            <Edit size={16} className="mr-2" /> Edit Employee
                        </button>
                        
                        <div className="relative">
                            <button 
                                onClick={() => setShowMoreActions(!showMoreActions)}
                                className="flex items-center px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 shadow-sm"
                            >
                                <MoreVertical size={16} />
                            </button>
                            
                            {showMoreActions && (
                                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10">
                                    <button 
                                        disabled={actionLoading}
                                        onClick={handleResetPassword} 
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    >
                                        Reset Password
                                    </button>
                                    
                                    {employee.status === 'ACTIVE' || employee.status === 'INVITED' ? (
                                        <>
                                            <button 
                                                disabled={actionLoading}
                                                onClick={() => handleStatusChange('SUSPENDED')} 
                                                className="w-full text-left px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 border-t border-gray-100"
                                            >
                                                Suspend Employee
                                            </button>
                                            <button 
                                                disabled={actionLoading}
                                                onClick={() => handleStatusChange('INACTIVE')} 
                                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                            >
                                                Deactivate Account
                                            </button>
                                        </>
                                    ) : (
                                        <button 
                                            disabled={actionLoading}
                                            onClick={() => handleStatusChange('ACTIVE')} 
                                            className="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50 border-t border-gray-100"
                                        >
                                            Activate Employee
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Header Profile Card */}
            <Card className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-8 bg-white border border-[var(--color-border-subtle)]">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-100 flex-shrink-0">
                    {employee.profilePhoto ? (
                        <img src={`${import.meta.env.VITE_API_URL?.replace('/api','') || ''}${employee.profilePhoto}`} alt={employee.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-400">
                            {employee.name.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>
                <div className="flex-1 text-center md:text-left space-y-2">
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                        <h1 className="text-3xl font-bold text-gray-900">{employee.name}</h1>
                        <Badge variant={employee.status === 'ACTIVE' ? 'success' : employee.status === 'INVITED' ? 'warning' : employee.status === 'SUSPENDED' ? 'warning' : 'error'}>{employee.status}</Badge>
                    </div>
                    <p className="text-lg text-[var(--color-primary)] font-medium">{employee.designation || employee.role}</p>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-gray-500 mt-4">
                        <span className="flex items-center"><Mail size={16} className="mr-1.5" /> {employee.email}</span>
                        <span className="flex items-center"><Phone size={16} className="mr-1.5" /> {employee.phone || '-'}</span>
                        <span className="flex items-center"><Briefcase size={16} className="mr-1.5" /> {employee.department || '-'}</span>
                    </div>
                </div>
            </Card>

            {/* Tabs */}
            <div className="border-b border-gray-200 overflow-x-auto scrollbar-hide">
                <nav className="-mb-px flex space-x-8">
                    {tabs.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                activeTab === tab
                                    ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="pt-4 animate-in fade-in duration-300">
                {renderTabContent()}
            </div>

            {/* Reset Modal */}
            {isResetModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-start mb-4">
                            <h2 className="text-2xl font-bold text-red-600 flex items-center gap-2">
                                <AlertTriangle size={24} /> Remove All Leads?
                            </h2>
                            <button onClick={() => setIsResetModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="bg-red-50 p-4 rounded-lg mb-6">
                            <p className="text-red-800 font-medium mb-3">
                                You are about to permanently delete all leads currently assigned to <strong>{employee.name}</strong>. This includes old and newly assigned leads.
                            </p>
                            <ul className="list-disc pl-5 text-sm text-red-700 space-y-1">
                                <li>Total leads to be deleted: <strong>{employeeLeadsData || 0}</strong></li>
                                <li>This action <strong>cannot be undone</strong>.</li>
                            </ul>
                        </div>
                        
                        <div className="flex justify-end gap-3 mt-6">
                            <Button variant="outline" onClick={() => setIsResetModalOpen(false)}>Cancel</Button>
                            <Button 
                                className="bg-red-600 hover:bg-red-700 text-white font-medium px-6" 
                                onClick={handleResetLeads}
                                disabled={actionLoading}
                            >
                                {actionLoading ? 'Deleting...' : 'Delete All Leads'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeProfile;
