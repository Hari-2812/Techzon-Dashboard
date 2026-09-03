import React, { useState } from 'react';
import { Users, User, LayoutDashboard, Trash2, PhoneCall } from 'lucide-react';
import { useEmployees } from '../hooks/useEmployees';
import { useEmployeeLeadStats, useResetEmployeeLeads } from '../hooks/useLeads';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { KpiCard } from '../components/ui/KpiCard';
import { Card } from '../components/ui/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableContainer } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import SalesImport from './SalesImport';

export default function LeadAssignment() {
  const { allEmployees, isLoading: employeesLoading } = useEmployees();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  
  const activeEmployees = allEmployees?.filter((e: any) => e.isActive && e.role !== 'ADMIN') || [];
  const selectedEmployee = activeEmployees.find((e: any) => e._id === selectedEmployeeId);

  const { data: statsData, isLoading: statsLoading } = useEmployeeLeadStats(selectedEmployeeId);
  const resetLeads = useResetEmployeeLeads();
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Fetch leads for the selected employee
  const { data: leadsData, isLoading: leadsLoading, refetch: refetchLeads } = useQuery({
    queryKey: ['leads', { assignedEmployeeId: selectedEmployeeId }],
    queryFn: async () => {
      if (!selectedEmployeeId) return { data: [], total: 0 };
      const res = await api.get('/leads', {
        params: { assignedEmployeeId: selectedEmployeeId, limit: 100 }
      });
      return res.data;
    },
    enabled: !!selectedEmployeeId
  });

  const leads = leadsData?.data || [];

  return (
    <div className="p-6 max-w-7xl mx-auto pb-24">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 flex-wrap">
          <Users className="h-6 w-6 text-indigo-600" />
          Lead Assignment
        </h1>
        <p className="text-gray-500 text-sm mt-1">Upload and assign leads directly to a specific employee.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card className="p-4 sticky top-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Select Employee</h3>
            <div className="space-y-2">
              <select 
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2 border"
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
              >
                <option value="">-- Choose an Employee --</option>
                {activeEmployees.map((emp: any) => (
                  <option key={emp._id} value={emp._id}>{emp.name} ({emp.role})</option>
                ))}
              </select>
            </div>
            
            {selectedEmployee && (
              <div className="mt-6 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <div className="bg-indigo-100 p-2 rounded-full">
                    <User className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{selectedEmployee.name}</p>
                    <p className="text-xs text-gray-500">{selectedEmployee.email}</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2 flex-wrap">
                  <Badge variant={selectedEmployee.isActive ? 'success' : 'error'}>
                    {selectedEmployee.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <Badge variant="warning">{selectedEmployee.role}</Badge>
                </div>
              </div>
            )}
            
            {selectedEmployee && (
              <div className="mt-6 space-y-4">
                <KpiCard 
                  label="Assigned Leads" 
                  value={statsData?.assignedLeads || 0} 
                  icon={<Users className="h-5 w-5 text-indigo-500" />} 
                  color="primary" 
                />
                <KpiCard 
                  label="Calls Made" 
                  value={statsData?.callsMade || 0} 
                  icon={<PhoneCall className="h-5 w-5 text-green-500" />} 
                  color="success" 
                />
                
                {(statsData?.assignedLeads > 0) && (
                  <Button 
                    variant="danger" 
                    fullWidth 
                    className="mt-4 flex items-center justify-center gap-2"
                    onClick={() => setIsResetModalOpen(true)}
                  >
                    <Trash2 className="h-4 w-4" /> Remove All Leads
                  </Button>
                )}
              </div>
            )}
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-6">
          {!selectedEmployeeId ? (
            <Card className="p-12 flex flex-col items-center justify-center text-center bg-gray-50 border-dashed">
              <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                <LayoutDashboard className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">No Employee Selected</h3>
              <p className="text-gray-500 mt-1 max-w-sm">
                Select an employee from the sidebar to upload and assign leads specifically to them.
              </p>
            </Card>
          ) : (
            <>
              {/* Embed SalesImport with an embedded prop if possible, or modify it */}
              <div className="border border-indigo-100 rounded-xl overflow-hidden shadow-sm">
                <SalesImport embedded targetEmployeeId={selectedEmployeeId} targetEmployeeName={selectedEmployee?.name} onSuccess={refetchLeads} />
              </div>
              
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Currently Assigned Leads ({leadsData?.total || 0})
                  </h3>
                </div>
                
                {leadsLoading ? (
                  <div className="py-8 text-center text-gray-500">Loading leads...</div>
                ) : leads.length === 0 ? (
                  <div className="py-8 text-center text-gray-500 bg-gray-50 rounded-lg">
                    No leads assigned to this employee yet.
                  </div>
                ) : (
                  <TableContainer>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>College</TableHead>
                          <TableHead>Domain</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leads.map((lead: any) => (
                          <TableRow key={lead._id}>
                            <TableCell className="font-medium text-gray-900">{lead.studentName}</TableCell>
                            <TableCell>{lead.phone}</TableCell>
                            <TableCell>{lead.college || '-'}</TableCell>
                            <TableCell>{lead.interestedDomain || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={
                                lead.salesStatus === 'Converted' ? 'success' :
                                lead.salesStatus === 'Not Interested' || lead.salesStatus === 'Closed' ? 'error' :
                                lead.salesStatus === 'Interested' ? 'warning' : 'info'
                              }>
                                {lead.salesStatus}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Card>
            </>
          )}
        </div>
      </div>
      
      {selectedEmployee && (
        <Modal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} title="Remove All Leads?">
          <div className="space-y-4">
            <div className="bg-red-50 text-red-800 p-4 rounded-lg border border-red-200">
              <p className="font-semibold mb-2">Employee: {selectedEmployee.name}</p>
              <p className="font-semibold mb-4">Assigned Leads: {statsData?.assignedLeads || 0}</p>
              <p>This will permanently remove all leads currently assigned to {selectedEmployee.name}. This action cannot be undone.</p>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setIsResetModalOpen(false)}>Cancel</Button>
              <Button 
                variant="danger" 
                disabled={resetLeads.isPending}
                onClick={async () => {
                  try {
                    await resetLeads.mutateAsync(selectedEmployeeId);
                    setIsResetModalOpen(false);
                    refetchLeads();
                  } catch(e: any) {
                    alert(e.response?.data?.message || 'Failed to remove leads');
                  }
                }}
              >
                {resetLeads.isPending ? 'Removing...' : 'Remove All Leads'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
