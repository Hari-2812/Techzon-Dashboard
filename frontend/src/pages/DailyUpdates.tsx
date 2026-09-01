import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDailyUpdates } from '../hooks/useDailyUpdates';
import { useAuthStore } from '../store/authStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Plus, Users, ClipboardList, PhoneCall, Heart, UserCheck, CalendarClock, TrendingUp } from 'lucide-react';
import UpdateLeadDrawer from '../components/ui/UpdateLeadDrawer';
import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const getLocalToday = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const DailyUpdates = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const queryClient = useQueryClient();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);

  // Filters
  const [dateFilter, setDateFilter] = useState(getLocalToday());
  const [employeeFilter, setEmployeeFilter] = useState('');
  // Advanced filters (mock for now if backend doesn't support them all, but UI is ready)
  
  const { getUpdates, getAnalytics } = useDailyUpdates();
  
  const updatesQuery = getUpdates({ date: dateFilter, employeeId: employeeFilter });
  const analyticsQuery = getAnalytics(dateFilter);

  const updates = updatesQuery.data?.data || [];
  const summary = analyticsQuery.data?.data?.summary || {};
  const employeeActivity = analyticsQuery.data?.data?.employeeActivity || [];

  useEffect(() => {
    // Setup Socket.io
    const socket = io(API_URL, {
        withCredentials: true,
    });

    socket.on('dailyUpdateCreated', (data) => {
        // Invalidate queries so the page refetches
        queryClient.invalidateQueries({ queryKey: ['dailyUpdates'] });
        queryClient.invalidateQueries({ queryKey: ['dailyUpdatesAnalytics'] });
    });

    return () => {
        socket.disconnect();
    };
  }, [queryClient]);

  const handleUpdateClick = (update: any) => {
    setSelectedLead(update.leadId); // Pre-fill with lead if it exists
    setIsDrawerOpen(true);
  };

  const handleAddNew = () => {
      setSelectedLead(null);
      setIsDrawerOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Daily Lead Updates</h1>
          <p className="text-[var(--color-text-muted)] text-sm">
            {isAdmin ? "Monitor daily organizational lead activity" : "Manually enter student details or update existing leads."}
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto flex-wrap">
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
          <Button onClick={handleAddNew} variant="primary" className="whitespace-nowrap shadow-md hover:shadow-lg">
              <Plus size={18} className="mr-2" /> Add Daily Update
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 min-[400px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {!isAdmin && (
           <Card className="p-4 flex flex-col justify-center items-center text-center border-l-4 border-l-gray-400">
             <div className="text-[var(--color-text-muted)] text-xs font-semibold mb-1 uppercase flex flex-col items-center"><Users size={16} className="mb-1 text-gray-400" /> Assigned</div>
             <div className="text-2xl font-bold text-[var(--color-text-primary)]">{summary.assignedLeads || 0}</div>
           </Card>
        )}
        <Card className="p-4 flex flex-col justify-center items-center text-center border-l-4 border-l-[var(--color-primary)]">
          <div className="text-[var(--color-text-muted)] text-xs font-semibold mb-1 uppercase flex flex-col items-center"><ClipboardList size={16} className="mb-1 text-[var(--color-primary)]" /> Updates Today</div>
          <div className="text-2xl font-bold text-[var(--color-primary)]">{summary.totalUpdates || 0}</div>
        </Card>
        <Card className="p-4 flex flex-col justify-center items-center text-center border-l-4 border-l-[var(--color-accent)]">
          <div className="text-[var(--color-text-muted)] text-xs font-semibold mb-1 uppercase flex flex-col items-center"><PhoneCall size={16} className="mb-1 text-[var(--color-accent)]" /> Calls Done</div>
          <div className="text-2xl font-bold text-[var(--color-accent)]">{summary.callsCompleted || 0}</div>
        </Card>
        <Card className="p-4 flex flex-col justify-center items-center text-center border-l-4 border-l-pink-500">
          <div className="text-[var(--color-text-muted)] text-xs font-semibold mb-1 uppercase flex flex-col items-center"><Heart size={16} className="mb-1 text-pink-500" /> Interested</div>
          <div className="text-2xl font-bold text-pink-600">{summary.interestedLeads || 0}</div>
        </Card>
        <Card className="p-4 flex flex-col justify-center items-center text-center border-l-4 border-l-purple-500">
          <div className="text-[var(--color-text-muted)] text-xs font-semibold mb-1 uppercase flex flex-col items-center"><UserCheck size={16} className="mb-1 text-purple-500" /> CRs Found</div>
          <div className="text-2xl font-bold text-purple-600">{summary.crsIdentified || 0}</div>
        </Card>
        <Card className="p-4 flex flex-col justify-center items-center text-center border-l-4 border-l-orange-400">
          <div className="text-[var(--color-text-muted)] text-xs font-semibold mb-1 uppercase flex flex-col items-center"><CalendarClock size={16} className="mb-1 text-orange-400" /> Follow-ups</div>
          <div className="text-2xl font-bold text-orange-500">{summary.followUpsCreated || 0}</div>
        </Card>
        {isAdmin && (
            <Card className="p-4 flex flex-col justify-center items-center text-center border-l-4 border-l-green-500">
              <div className="text-[var(--color-text-muted)] text-xs font-semibold mb-1 uppercase flex flex-col items-center"><TrendingUp size={16} className="mb-1 text-green-500" /> Sales</div>
              <div className="text-2xl font-bold text-green-600">{summary.salesConverted || 0}</div>
            </Card>
        )}
      </div>

      {isAdmin && (
        <Card className="p-0 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[var(--color-border-subtle)] flex justify-between items-center bg-gray-50/50">
             <h2 className="font-semibold text-[var(--color-text-primary)] flex items-center gap-2 flex-wrap">
               <Users size={18} className="text-[var(--color-primary)]" /> Today's Employee Activity
             </h2>
          </div>
          <div className="overflow-x-auto">
            <div className="overflow-x-auto w-full"><table className="w-full text-left text-sm">
              <thead className="bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]">
                <tr>
                  <th className="p-3 font-medium border-b border-[var(--color-border-subtle)]">Employee</th>
                  <th className="p-3 font-medium border-b border-[var(--color-border-subtle)]">Assigned</th>
                  <th className="p-3 font-medium border-b border-[var(--color-border-subtle)] text-center">Total Updates</th>
                  <th className="p-3 font-medium border-b border-[var(--color-border-subtle)] text-center">Calls</th>
                  <th className="p-3 font-medium border-b border-[var(--color-border-subtle)] text-center">Interested</th>
                  <th className="p-3 font-medium border-b border-[var(--color-border-subtle)] text-center">CRs</th>
                  <th className="p-3 font-medium border-b border-[var(--color-border-subtle)] text-center">Follow-ups</th>
                  <th className="p-3 font-medium border-b border-[var(--color-border-subtle)] text-center">Sales</th>
                  <th className="p-3 font-medium border-b border-[var(--color-border-subtle)]">Activity Score</th>
                </tr>
              </thead>
              <tbody>
                {employeeActivity.map((emp: any) => (
                  <tr key={emp.employeeId} className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-hover)]">
                    <td className="p-3">
                      <div className="font-medium text-[var(--color-text-primary)]">{emp.name}</div>
                      <div className="text-[10px] text-[var(--color-text-muted)] uppercase">{emp.role}</div>
                    </td>
                    <td className="p-3">{emp.assignedLeads}</td>
                    <td className="p-3 text-center font-bold text-[var(--color-primary)]">{emp.totalUpdates}</td>
                    <td className="p-3 text-center">{emp.callsCompleted}</td>
                    <td className="p-3 text-center text-pink-600 font-semibold">{emp.interestedLeads}</td>
                    <td className="p-3 text-center text-purple-600">{emp.crsIdentified}</td>
                    <td className="p-3 text-center text-orange-500">{emp.followUpsCreated}</td>
                    <td className="p-3 text-center text-green-600 font-bold">{emp.salesConverted}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="w-24 bg-gray-200 rounded-full h-2 overflow-hidden shadow-inner">
                          <div 
                            className={`h-2 rounded-full transition-all duration-500 ${emp.activityPercent >= 80 ? 'bg-green-500' : emp.activityPercent >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                            style={{ width: `${Math.min(emp.activityPercent, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold whitespace-nowrap">{emp.activityPercent}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {employeeActivity.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-[var(--color-text-muted)]">
                      No employee activity found for this date.
                    </td>
                  </tr>
                )}
              </tbody>
            </table></div>
          </div>
        </Card>
      )}

      {/* Updates Table */}
      <Card className="p-0 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[var(--color-border-subtle)] bg-white flex justify-between items-center">
           <h2 className="font-semibold text-[var(--color-text-primary)]">Update History</h2>
        </div>
        
        <div className="overflow-x-auto">
          <div className="overflow-x-auto w-full"><table className="w-full text-left text-sm">
            <thead className="bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]">
              <tr>
                <th className="p-4 font-medium border-b border-[var(--color-border-subtle)]">Student Info</th>
                {isAdmin && <th className="p-4 font-medium border-b border-[var(--color-border-subtle)]">Employee</th>}
                <th className="p-4 font-medium border-b border-[var(--color-border-subtle)]">Lead Status</th>
                <th className="p-4 font-medium border-b border-[var(--color-border-subtle)]">CR Status</th>
                <th className="p-4 font-medium border-b border-[var(--color-border-subtle)]">Sales Status</th>
                <th className="p-4 font-medium border-b border-[var(--color-border-subtle)]">Call Info</th>
                <th className="p-4 font-medium border-b border-[var(--color-border-subtle)]">Follow-up</th>
                <th className="p-4 font-medium border-b border-[var(--color-border-subtle)]">Time</th>
                <th className="p-4 font-medium border-b border-[var(--color-border-subtle)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-subtle)]">
              {updates.map((update: any) => (
                <tr key={update._id} className="hover:bg-[var(--color-surface-hover)] transition-colors">
                  <td className="p-4 align-top">
                    <div className="font-bold text-[var(--color-text-primary)]">{update.studentName}</div>
                    <div className="text-xs text-[var(--color-text-muted)] mt-1">{update.phone}</div>
                    <div className="text-xs text-[var(--color-text-muted)]">{update.college}</div>
                    <div className="text-xs text-[var(--color-text-muted)]">{update.department}</div>
                  </td>
                  {isAdmin && (
                    <td className="p-4 align-top">
                      <div className="text-[var(--color-text-primary)] font-medium">{update.employeeId?.name}</div>
                    </td>
                  )}
                  <td className="p-4 align-top">
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-[10px] uppercase font-bold rounded-full whitespace-nowrap shadow-sm">
                      {update.leadStatus || 'New'}
                    </span>
                  </td>
                  <td className="p-4 align-top">
                      <div className="text-xs font-semibold text-purple-700">{update.crStatus || 'Not Asked'}</div>
                  </td>
                  <td className="p-4 align-top">
                      <div className="text-xs font-semibold text-green-700">{update.salesStatus || 'Not Contacted'}</div>
                  </td>
                  <td className="p-4 align-top">
                    <div className="text-xs text-[var(--color-text-primary)] font-medium">{update.callStatus || 'Not Called'}</div>
                    {update.studentResponse && <div className="text-[10px] text-[var(--color-text-muted)] mt-1">Resp: {update.studentResponse}</div>}
                  </td>
                  <td className="p-4 align-top">
                      {update.followUpRequired ? (
                          <>
                             <div className="text-xs font-semibold text-orange-600">{new Date(update.followUpDate).toLocaleDateString()}</div>
                             <div className="text-[10px] text-gray-500">{update.followUpTime}</div>
                          </>
                      ) : (
                          <span className="text-xs text-gray-400">No</span>
                      )}
                  </td>
                  <td className="p-4 text-xs text-[var(--color-text-muted)] whitespace-nowrap align-top">
                     {new Date(update.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </td>
                  <td className="p-4 align-top">
                      <Button size="sm" variant="outline" onClick={() => handleUpdateClick(update)} className="text-xs py-1 h-auto">
                        Edit
                      </Button>
                  </td>
                </tr>
              ))}
              {updates.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="p-8 text-center text-[var(--color-text-muted)] bg-gray-50">
                    <div className="flex flex-col items-center justify-center">
                        <ClipboardList size={32} className="mb-2 text-gray-300" />
                        <p>No updates recorded today.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table></div>
        </div>
      </Card>

      {isDrawerOpen && (
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
