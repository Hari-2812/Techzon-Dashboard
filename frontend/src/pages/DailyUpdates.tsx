import React, { useState } from 'react';
import { useDailyUpdates } from '../hooks/useDailyUpdates';
import { useAuthStore } from '../store/authStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ClipboardList, Filter, Search, PhoneCall, CalendarClock, Users, CheckCircle, TrendingUp } from 'lucide-react';
import UpdateLeadDrawer from '../components/ui/UpdateLeadDrawer';

const DailyUpdates = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [dateFilter, setDateFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);

  const { getUpdates, getAnalytics } = useDailyUpdates();
  
  const updatesQuery = getUpdates({ date: dateFilter, employeeId: employeeFilter });
  const analyticsQuery = getAnalytics(dateFilter);

  const updates = updatesQuery.data?.data || [];
  const summary = analyticsQuery.data?.summary || {};
  const employeeActivity = analyticsQuery.data?.employeeActivity || [];

  const handleUpdateClick = (lead: any) => {
    setSelectedLead(lead);
    setIsDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Daily Lead Updates</h1>
          <p className="text-[var(--color-text-muted)] text-sm">
            {isAdmin ? "Monitor daily organizational lead activity" : "Update today's student interactions and keep your follow-ups organized."}
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="input w-full sm:w-auto"
          />
          {isAdmin && (
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="input w-full sm:w-auto"
            >
              <option value="">All Employees</option>
              {employeeActivity.map((emp: any) => (
                <option key={emp.employeeId} value={emp.employeeId}>{emp.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {!isAdmin && (
           <Card className="p-4 flex flex-col justify-center items-center text-center">
             <div className="text-[var(--color-text-muted)] text-xs font-semibold mb-1 uppercase">Assigned Today</div>
             <div className="text-2xl font-bold text-[var(--color-text-primary)]">{summary.assignedLeads || 0}</div>
           </Card>
        )}
        <Card className="p-4 flex flex-col justify-center items-center text-center">
          <div className="text-[var(--color-text-muted)] text-xs font-semibold mb-1 uppercase">Updates Today</div>
          <div className="text-2xl font-bold text-[var(--color-primary)]">{summary.updatedLeads || summary.totalUpdates || 0}</div>
        </Card>
        <Card className="p-4 flex flex-col justify-center items-center text-center">
          <div className="text-[var(--color-text-muted)] text-xs font-semibold mb-1 uppercase">Calls</div>
          <div className="text-2xl font-bold text-[var(--color-accent)]">{summary.callsCompleted || 0}</div>
        </Card>
        <Card className="p-4 flex flex-col justify-center items-center text-center">
          <div className="text-[var(--color-text-muted)] text-xs font-semibold mb-1 uppercase">Follow-ups</div>
          <div className="text-2xl font-bold text-orange-500">{summary.followUpsCreated || 0}</div>
        </Card>
        <Card className="p-4 flex flex-col justify-center items-center text-center">
          <div className="text-[var(--color-text-muted)] text-xs font-semibold mb-1 uppercase">CRs</div>
          <div className="text-2xl font-bold text-purple-600">{summary.crsIdentified || 0}</div>
        </Card>
        <Card className="p-4 flex flex-col justify-center items-center text-center">
          <div className="text-[var(--color-text-muted)] text-xs font-semibold mb-1 uppercase">Sales</div>
          <div className="text-2xl font-bold text-green-600">{summary.salesConverted || 0}</div>
        </Card>
      </div>

      {isAdmin && (
        <Card className="p-0 overflow-hidden">
          <div className="p-4 border-b border-[var(--color-border-subtle)] flex justify-between items-center bg-gray-50/50">
             <h2 className="font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
               <Users size={18} /> Today's Employee Activity
             </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]">
                <tr>
                  <th className="p-3 font-medium border-b border-[var(--color-border-subtle)]">Employee</th>
                  <th className="p-3 font-medium border-b border-[var(--color-border-subtle)]">Assigned</th>
                  <th className="p-3 font-medium border-b border-[var(--color-border-subtle)]">Updated</th>
                  <th className="p-3 font-medium border-b border-[var(--color-border-subtle)]">Calls</th>
                  <th className="p-3 font-medium border-b border-[var(--color-border-subtle)]">Follow-ups</th>
                  <th className="p-3 font-medium border-b border-[var(--color-border-subtle)]">Activity Score</th>
                </tr>
              </thead>
              <tbody>
                {employeeActivity.map((emp: any) => (
                  <tr key={emp.employeeId} className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-hover)]">
                    <td className="p-3">
                      <div className="font-medium text-[var(--color-text-primary)]">{emp.name}</div>
                      <div className="text-xs text-[var(--color-text-muted)]">{emp.role}</div>
                    </td>
                    <td className="p-3">{emp.assignedLeads}</td>
                    <td className="p-3">{emp.updatedLeads}</td>
                    <td className="p-3">{emp.callsCompleted}</td>
                    <td className="p-3">{emp.followUpsCreated}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${emp.activityPercent >= 80 ? 'bg-green-500' : emp.activityPercent >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                            style={{ width: `${Math.min(emp.activityPercent, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold">{emp.activityPercent}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {employeeActivity.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-[var(--color-text-muted)]">
                      No employee activity found for this date.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Updates Table */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-[var(--color-border-subtle)]">
           <h2 className="font-semibold text-[var(--color-text-primary)]">Update History</h2>
        </div>
        
        {/* Mobile View */}
        <div className="md:hidden divide-y divide-[var(--color-border-subtle)]">
          {updates.map((update: any) => (
            <div key={update._id} className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-[var(--color-text-primary)]">{update.studentSnapshot?.studentName}</h3>
                  <p className="text-xs text-[var(--color-text-muted)]">{update.studentSnapshot?.college}</p>
                </div>
                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full whitespace-nowrap">
                  {update.leadStatus || 'New'}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[var(--color-text-muted)] block">Call Outcome</span>
                  <span className="font-medium">{update.callOutcome || '-'}</span>
                </div>
                <div>
                  <span className="text-[var(--color-text-muted)] block">Time</span>
                  <span className="font-medium">{new Date(update.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
              </div>
              
              {!isAdmin && update.leadId && (
                <Button size="sm" variant="outline" className="w-full" onClick={() => handleUpdateClick(update.leadId)}>
                  Update Again
                </Button>
              )}
            </div>
          ))}
          {updates.length === 0 && (
             <div className="p-6 text-center text-[var(--color-text-muted)]">No updates found.</div>
          )}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]">
              <tr>
                <th className="p-4 font-medium border-b border-[var(--color-border-subtle)]">Student</th>
                {isAdmin && <th className="p-4 font-medium border-b border-[var(--color-border-subtle)]">Employee</th>}
                <th className="p-4 font-medium border-b border-[var(--color-border-subtle)]">Call Outcome</th>
                <th className="p-4 font-medium border-b border-[var(--color-border-subtle)]">Lead Status</th>
                <th className="p-4 font-medium border-b border-[var(--color-border-subtle)]">Sales Status</th>
                <th className="p-4 font-medium border-b border-[var(--color-border-subtle)]">Time</th>
                {!isAdmin && <th className="p-4 font-medium border-b border-[var(--color-border-subtle)]">Action</th>}
              </tr>
            </thead>
            <tbody>
              {updates.map((update: any) => (
                <tr key={update._id} className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-hover)]">
                  <td className="p-4">
                    <div className="font-medium text-[var(--color-text-primary)]">{update.studentSnapshot?.studentName}</div>
                    <div className="text-xs text-[var(--color-text-muted)]">{update.studentSnapshot?.college}</div>
                  </td>
                  {isAdmin && (
                    <td className="p-4">
                      <div className="text-[var(--color-text-primary)]">{update.employeeId?.name}</div>
                    </td>
                  )}
                  <td className="p-4">
                    <div className="text-[var(--color-text-primary)]">{update.callOutcome || '-'}</div>
                    {update.studentResponse && <div className="text-xs text-[var(--color-text-muted)]">Resp: {update.studentResponse}</div>}
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full whitespace-nowrap">
                      {update.leadStatus || 'New'}
                    </span>
                  </td>
                  <td className="p-4">
                     <span className="text-xs">{update.salesStatus || '-'}</span>
                  </td>
                  <td className="p-4 text-[var(--color-text-muted)] whitespace-nowrap">
                     {new Date(update.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </td>
                  {!isAdmin && (
                    <td className="p-4">
                      <Button size="sm" variant="outline" onClick={() => handleUpdateClick(update.leadId)}>
                        Update
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
              {updates.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 6 : 6} className="p-8 text-center text-[var(--color-text-muted)]">
                    No updates recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {isDrawerOpen && selectedLead && (
        <UpdateLeadDrawer
          lead={selectedLead}
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
        />
      )}
    </div>
  );
};

export default DailyUpdates;
