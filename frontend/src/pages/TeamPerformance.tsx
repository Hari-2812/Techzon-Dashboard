import React, { useState, useEffect, useMemo } from 'react';
import { usePerformance } from '../hooks/usePerformance';
import { useAuthStore } from '../store/authStore';
import { Card } from '../components/ui/Card';
import api from '../services/api';
import moment from 'moment-timezone';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Search, ChevronDown, ArrowUpDown } from 'lucide-react';

const EmployeePerformance = () => {
  const user = useAuthStore(state => state.user);
  
  const [dateFilter, setDateFilter] = useState('Today');
  const [employeeId, setEmployeeId] = useState('all');
  const [specificDate, setSpecificDate] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [roleFilter, setRoleFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [sortConfig, setSortConfig] = useState({ key: 'salesConverted', direction: 'desc' });

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      api.get('/employees?status=ACTIVE').then(res => setEmployees(res.data.data)).catch(console.error);
    }
  }, [user]);

  const { data: rawData, isLoading } = usePerformance(
    specificDate ? '' : dateFilter, 
    user?.role === 'ADMIN' ? employeeId : user?.id,
    specificDate
  );

  const isSpecificView = user?.role !== 'ADMIN' || employeeId !== 'all';
  const agg = isSpecificView ? rawData?.aggregate : null;
  const history = isSpecificView ? rawData?.history : [];
  let list = !isSpecificView ? rawData?.list || [] : [];

  // Filter List
  if (roleFilter !== 'All') {
    list = list.filter((row: any) => row.employee.role === roleFilter);
  }
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter((row: any) => 
      row.employee.name.toLowerCase().includes(q) || 
      row.employee.email?.toLowerCase().includes(q)
    );
  }

  // Sort List
  const sortedList = useMemo(() => {
    let sortableItems = [...list];
    sortableItems.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      
      if (sortConfig.key === 'employeeName') {
        aVal = a.employee.name.toLowerCase();
        bVal = b.employee.name.toLowerCase();
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sortableItems;
  }, [list, sortConfig]);

  const requestSort = (key: string) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  // Aggregated Team Metrics
  const teamTotals = useMemo(() => {
    if (!list.length) return null;
    return list.reduce((acc: any, row: any) => ({
      employees: acc.employees + 1,
      leadsAssigned: acc.leadsAssigned + row.leadsAssigned,
      leadsCompleted: acc.leadsCompleted + row.leadsCompleted,
      salesAssigned: acc.salesAssigned + row.salesAssigned,
      salesConverted: acc.salesConverted + row.salesConverted,
      revenue: acc.revenue + row.revenue,
    }), { employees: 0, leadsAssigned: 0, leadsCompleted: 0, salesAssigned: 0, salesConverted: 0, revenue: 0 });
  }, [list]);

  const teamConversionRate = teamTotals && teamTotals.salesAssigned > 0 
    ? ((teamTotals.salesConverted / teamTotals.salesAssigned) * 100).toFixed(2) 
    : 0;

  if (isLoading) return <div className="p-6">Loading Performance Data...</div>;

  return (
    <div className="space-y-6">
      {/* 1. TEAM PERFORMANCE HEADER */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            {user?.role === 'ADMIN' ? 'Team Performance' : 'My Performance'}
          </h1>
          <p className="text-[var(--color-text-muted)] text-sm mt-1">Track individual employee lead and sales performance.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {user?.role === 'ADMIN' && !isSpecificView && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search Employee..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 border border-[var(--color-border-subtle)] rounded-lg outline-none focus:border-[var(--color-primary)] text-sm w-48"
              />
            </div>
          )}

          {user?.role === 'ADMIN' && !isSpecificView && (
            <select 
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="border border-[var(--color-border-subtle)] rounded-lg px-3 py-2 outline-none focus:border-[var(--color-primary)] text-sm"
            >
              <option value="All">All Roles</option>
              <option value="RGS">RGS</option>
              <option value="BDE">BDE</option>
            </select>
          )}

          {user?.role === 'ADMIN' && (
            <select 
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="border border-[var(--color-border-subtle)] rounded-lg px-3 py-2 outline-none focus:border-[var(--color-primary)] text-sm"
            >
              <option value="all">All Employees</option>
              {employees.map((emp: any) => (
                <option key={emp._id} value={emp._id}>{emp.name}</option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-600">Date:</span>
            <select 
              value={specificDate ? 'Custom' : dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setSpecificDate('');
              }}
              className="border border-[var(--color-border-subtle)] rounded-lg px-3 py-2 outline-none focus:border-[var(--color-primary)] text-sm"
            >
              <option value="Today">Today</option>
              <option value="Yesterday">Yesterday</option>
              <option value="This Week">This Week</option>
              <option value="This Month">This Month</option>
              <option value="Custom">Custom Date Range</option>
            </select>
          </div>

          {dateFilter === 'Custom' && (
            <input 
              type="date" 
              value={specificDate}
              onChange={(e) => {
                setSpecificDate(e.target.value);
                setDateFilter('Custom');
              }}
              className="border border-[var(--color-border-subtle)] rounded-lg px-3 py-2 outline-none focus:border-[var(--color-primary)] text-sm"
            />
          )}
        </div>
      </div>

      {/* 11. TEAM SUMMARY KPI CARDS */}
      {!isSpecificView && teamTotals && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card className="p-4 bg-white border border-gray-100 flex flex-col justify-center text-center shadow-sm">
            <div className="text-2xl font-mono font-bold text-gray-900">{teamTotals.employees}</div>
            <div className="text-xs text-[var(--color-text-muted)] mt-1 uppercase tracking-wider font-medium">Total Employees</div>
          </Card>
          <Card className="p-4 bg-white border border-gray-100 flex flex-col justify-center text-center shadow-sm">
            <div className="text-2xl font-mono font-bold text-[var(--color-primary)]">{teamTotals.leadsAssigned}</div>
            <div className="text-xs text-[var(--color-text-muted)] mt-1 uppercase tracking-wider font-medium">Leads Assigned</div>
          </Card>
          <Card className="p-4 bg-white border border-gray-100 flex flex-col justify-center text-center shadow-sm">
            <div className="text-2xl font-mono font-bold text-green-600">{teamTotals.leadsCompleted}</div>
            <div className="text-xs text-[var(--color-text-muted)] mt-1 uppercase tracking-wider font-medium">Leads Completed</div>
          </Card>
          <Card className="p-4 bg-white border border-gray-100 flex flex-col justify-center text-center shadow-sm">
            <div className="text-2xl font-mono font-bold text-[var(--color-accent)]">{teamTotals.salesAssigned}</div>
            <div className="text-xs text-[var(--color-text-muted)] mt-1 uppercase tracking-wider font-medium">Sales Assigned</div>
          </Card>
          <Card className="p-4 bg-white border border-gray-100 flex flex-col justify-center text-center shadow-sm">
            <div className="text-2xl font-mono font-bold text-blue-600">{teamTotals.salesConverted}</div>
            <div className="text-xs text-[var(--color-text-muted)] mt-1 uppercase tracking-wider font-medium">Sales Converted</div>
          </Card>
          <Card className="p-4 bg-white border border-gray-100 flex flex-col justify-center text-center shadow-sm">
            <div className="text-2xl font-mono font-bold text-purple-600">₹{teamTotals.revenue.toLocaleString()}</div>
            <div className="text-xs text-[var(--color-text-muted)] mt-1 uppercase tracking-wider font-medium">Total Revenue</div>
          </Card>
          <Card className="p-4 bg-white border border-gray-100 flex flex-col justify-center text-center shadow-sm">
            <div className="text-2xl font-mono font-bold text-teal-600">{teamConversionRate}%</div>
            <div className="text-xs text-[var(--color-text-muted)] mt-1 uppercase tracking-wider font-medium">Overall Conv. %</div>
          </Card>
        </div>
      )}

      {/* 2. MAIN EMPLOYEE PERFORMANCE TABLE */}
      {!isSpecificView && (
        <Card className="overflow-hidden bg-white shadow-sm border border-[var(--color-border-subtle)]">
          <div className="hidden md:block overflow-x-auto">
            <div className="overflow-x-auto w-full"><table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#F8F9FA] text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)]">
                <tr>
                  {[
                    { label: 'Employee', key: 'employeeName' },
                    { label: 'Role', key: 'role', sortable: false },
                    { label: 'Leads Assigned', key: 'leadsAssigned' },
                    { label: 'Contacted', key: 'leadsContacted' },
                    { label: 'Completed', key: 'leadsCompleted' },
                    { label: 'Pending', key: 'pendingLeads' },
                    { label: 'Sales Assigned', key: 'salesAssigned' },
                    { label: 'Sales Contacted', key: 'salesContacted' },
                    { label: 'Converted', key: 'salesConverted' },
                    { label: 'Pending', key: 'pendingSales' },
                    { label: 'Conversion %', key: 'conversionRate' },
                    { label: 'Revenue', key: 'revenue' },
                    { label: 'Performance', key: 'performanceScore', sortable: false }
                  ].map((col, idx) => (
                    <th 
                      key={idx} 
                      className={`px-4 py-3 font-medium ${col.sortable !== false ? 'cursor-pointer hover:text-gray-900 select-none' : ''}`}
                      onClick={() => col.sortable !== false && requestSort(col.key)}
                    >
                      <div className="flex items-center gap-1 flex-wrap">
                        {col.label}
                        {col.sortable !== false && sortConfig.key === col.key && (
                          <ArrowUpDown className="h-3 w-3 text-[var(--color-primary)]" />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-subtle)]">
                {sortedList.map((row: any) => {
                  const pScore = row.performanceScore;
                  const scoreColor = pScore === 'Excellent' ? 'bg-green-100 text-green-700' 
                                   : pScore === 'Good' ? 'bg-blue-100 text-blue-700' 
                                   : 'bg-red-100 text-red-700';

                  return (
                    <tr 
                      key={row.employee._id} 
                      className="hover:bg-[#F8F9FA] transition-colors cursor-pointer"
                      onClick={() => setEmployeeId(row.employee._id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="h-8 w-8 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                            {row.employee.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{row.employee.name}</div>
                            <div className="text-xs text-gray-500">{row.employee.email || 'employee@techzon.com'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><span className="bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full text-xs font-medium text-gray-700">{row.employee.role}</span></td>
                      <td className="px-4 py-3 font-mono font-medium text-gray-900">{row.leadsAssigned}</td>
                      <td className="px-4 py-3 font-mono text-gray-600">{row.leadsContacted}</td>
                      <td className="px-4 py-3 font-mono text-green-600 font-bold">{row.leadsCompleted}</td>
                      <td className="px-4 py-3 font-mono text-red-500">{row.pendingLeads}</td>
                      <td className="px-4 py-3 font-mono text-[var(--color-accent)] font-medium">{row.salesAssigned}</td>
                      <td className="px-4 py-3 font-mono text-gray-600">{row.salesContacted}</td>
                      <td className="px-4 py-3 font-mono text-[var(--color-primary)] font-bold">{row.salesConverted}</td>
                      <td className="px-4 py-3 font-mono text-red-500">{row.pendingSales}</td>
                      <td className="px-4 py-3 font-mono">
                        <span className="font-medium text-gray-800">{row.conversionRate}%</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-green-700 font-medium">₹{row.revenue.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${scoreColor}`}>
                          {pScore}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {sortedList.length === 0 && (
                  <tr>
                    <td colSpan={13} className="px-4 py-12 text-center text-gray-400">
                      No employees found matching the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table></div>
          </div>

          <div className="md:hidden divide-y divide-gray-100">
            {sortedList.map((row: any) => {
              const pScore = row.performanceScore;
              const scoreColor = pScore === 'Excellent' ? 'bg-green-100 text-green-700' 
                               : pScore === 'Good' ? 'bg-blue-100 text-blue-700' 
                               : 'bg-red-100 text-red-700';
              return (
                <div 
                  key={row.employee._id} 
                  className="p-4 bg-white cursor-pointer hover:bg-gray-50"
                  onClick={() => setEmployeeId(row.employee._id)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="h-10 w-10 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center font-bold shadow-sm">
                        {row.employee.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{row.employee.name}</div>
                        <div className="text-xs text-gray-500">{row.employee.role}</div>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${scoreColor}`}>
                      {pScore}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Leads</p>
                      <div className="flex gap-2 font-mono text-sm flex-wrap">
                        <span className="text-gray-900" title="Assigned">{row.leadsAssigned}</span>
                        <span className="text-gray-400">/</span>
                        <span className="text-green-600 font-bold" title="Completed">{row.leadsCompleted}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Sales</p>
                      <div className="flex gap-2 font-mono text-sm flex-wrap">
                        <span className="text-[var(--color-accent)]" title="Assigned">{row.salesAssigned}</span>
                        <span className="text-gray-400">/</span>
                        <span className="text-[var(--color-primary)] font-bold" title="Converted">{row.salesConverted}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Conversion</p>
                      <div className="font-mono text-sm font-bold">{row.conversionRate}%</div>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Revenue</p>
                      <div className="font-mono text-sm font-bold text-green-700">₹{row.revenue.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              );
            })}
            {sortedList.length === 0 && (
              <div className="p-8 text-center text-gray-400">
                No employees found matching the current filters.
              </div>
            )}
          </div>
        </Card>
      )}

      {/* 23. TEAM PERFORMANCE BAR CHART */}
      {!isSpecificView && sortedList.length > 0 && (
        <Card className="p-6 bg-white shadow-sm border border-[var(--color-border-subtle)]">
          <h3 className="font-bold text-[var(--color-text-primary)] mb-6 text-lg">Employee Performance Comparison</h3>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sortedList} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="employee.name" axisLine={false} tickLine={false} tick={{fill: '#777587', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#777587', fontSize: 12}} />
                <RechartsTooltip cursor={{fill: '#F8F9FA'}} contentStyle={{borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} />
                <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
                <Bar dataKey="leadsAssigned" name="Leads Assigned" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="leadsCompleted" name="Leads Completed" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="salesAssigned" name="Sales Assigned" fill="#FBBF24" radius={[4, 4, 0, 0]} />
                <Bar dataKey="salesConverted" name="Sales Converted" fill="#3525CD" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* 9. EMPLOYEE DETAIL VIEW */}
      {isSpecificView && agg && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="h-14 w-14 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center font-bold text-2xl shadow-md">
                {rawData.employee.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{rawData.employee.name}</h2>
                <div className="text-[var(--color-text-muted)] font-medium">{rawData.employee.role} • Performance Overview</div>
              </div>
            </div>
            {user?.role === 'ADMIN' && (
              <button 
                onClick={() => setEmployeeId('all')}
                className="px-4 py-2 bg-white border border-[var(--color-border-subtle)] text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors shadow-sm text-sm"
              >
                Back to Team
              </button>
            )}
          </div>

          <h3 className="font-bold text-lg text-gray-800 pt-2 border-b border-[var(--color-border-subtle)] pb-2">Today's Activity / Selected Period</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="p-5 bg-white border border-gray-100 shadow-sm flex flex-col justify-center">
              <div className="text-sm font-medium text-[var(--color-text-muted)] mb-1 uppercase tracking-wider">Leads Assigned</div>
              <div className="text-3xl font-mono font-bold text-gray-900">{agg.leadsAssigned}</div>
            </Card>
            <Card className="p-5 bg-white border border-gray-100 shadow-sm flex flex-col justify-center">
              <div className="text-sm font-medium text-[var(--color-text-muted)] mb-1 uppercase tracking-wider">Leads Contacted</div>
              <div className="text-3xl font-mono font-bold text-gray-600">{agg.leadsContacted}</div>
            </Card>
            <Card className="p-5 bg-white border border-gray-100 shadow-sm flex flex-col justify-center">
              <div className="text-sm font-medium text-[var(--color-text-muted)] mb-1 uppercase tracking-wider">Leads Completed</div>
              <div className="text-3xl font-mono font-bold text-green-600">{agg.leadsCompleted}</div>
            </Card>
            <Card className="p-5 bg-white border border-gray-100 shadow-sm flex flex-col justify-center">
              <div className="text-sm font-medium text-[var(--color-text-muted)] mb-1 uppercase tracking-wider">Pending Leads</div>
              <div className="text-3xl font-mono font-bold text-red-500">{agg.pendingLeads}</div>
            </Card>
            <Card className="p-5 bg-white border border-gray-100 shadow-sm flex flex-col justify-center">
              <div className="text-sm font-medium text-[var(--color-text-muted)] mb-1 uppercase tracking-wider">Lead Completion %</div>
              <div className="text-3xl font-mono font-bold text-teal-600">{agg.completionRate}%</div>
            </Card>

            <Card className="p-5 bg-white border border-gray-100 shadow-sm flex flex-col justify-center">
              <div className="text-sm font-medium text-[var(--color-text-muted)] mb-1 uppercase tracking-wider">Sales Assigned</div>
              <div className="text-3xl font-mono font-bold text-[var(--color-accent)]">{agg.salesAssigned}</div>
            </Card>
            <Card className="p-5 bg-white border border-gray-100 shadow-sm flex flex-col justify-center">
              <div className="text-sm font-medium text-[var(--color-text-muted)] mb-1 uppercase tracking-wider">Sales Contacted</div>
              <div className="text-3xl font-mono font-bold text-gray-600">{agg.salesContacted}</div>
            </Card>
            <Card className="p-5 bg-white border border-gray-100 shadow-sm flex flex-col justify-center">
              <div className="text-sm font-medium text-[var(--color-text-muted)] mb-1 uppercase tracking-wider">Sales Converted</div>
              <div className="text-3xl font-mono font-bold text-[var(--color-primary)]">{agg.salesConverted}</div>
            </Card>
            <Card className="p-5 bg-white border border-gray-100 shadow-sm flex flex-col justify-center">
              <div className="text-sm font-medium text-[var(--color-text-muted)] mb-1 uppercase tracking-wider">Pending Sales</div>
              <div className="text-3xl font-mono font-bold text-red-500">{agg.pendingSales}</div>
            </Card>
            <Card className="p-5 bg-white border border-gray-100 shadow-sm flex flex-col justify-center">
              <div className="text-sm font-medium text-[var(--color-text-muted)] mb-1 uppercase tracking-wider">Conversion %</div>
              <div className="text-3xl font-mono font-bold text-purple-600">{agg.conversionRate}%</div>
            </Card>
            
            <Card className="col-span-2 md:col-span-5 p-5 bg-[var(--color-primary-container)] border border-[var(--color-primary)] shadow-sm flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-white mb-1 uppercase tracking-wider opacity-90">Total Revenue Generated</div>
                <div className="text-4xl font-mono font-bold text-white">₹{agg.revenue.toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-white mb-1 uppercase tracking-wider opacity-90">Performance</div>
                <div className="text-2xl font-bold text-white tracking-wide">{agg.performanceScore}</div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
            {/* 10. DAILY ACTIVITY HISTORY */}
            <Card className="overflow-hidden bg-white shadow-sm border border-[var(--color-border-subtle)]">
              <div className="p-4 border-b border-[var(--color-border-subtle)] bg-[#F8F9FA]">
                <h3 className="font-bold text-gray-800">Daily Performance</h3>
              </div>
              <div className="hidden md:block overflow-x-auto max-h-[400px]">
                <div className="overflow-x-auto w-full"><table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-white text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)] sticky top-0">
                    <tr>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Leads Assigned</th>
                      <th className="px-4 py-3 font-medium">Leads Completed</th>
                      <th className="px-4 py-3 font-medium">Sales Assigned</th>
                      <th className="px-4 py-3 font-medium">Sales Converted</th>
                      <th className="px-4 py-3 font-medium">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border-subtle)]">
                    {history.map((row: any) => (
                      <tr key={row.date} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{moment(row.date).format('MMM DD')}</td>
                        <td className="px-4 py-3 font-mono text-gray-700">{row.leadsAssigned}</td>
                        <td className="px-4 py-3 font-mono text-green-600 font-medium">{row.leadsCompleted}</td>
                        <td className="px-4 py-3 font-mono text-gray-700">{row.salesAssigned}</td>
                        <td className="px-4 py-3 font-mono text-[var(--color-primary)] font-bold">{row.salesConverted}</td>
                        <td className="px-4 py-3 font-mono text-green-700 font-medium">₹{row.revenue.toLocaleString()}</td>
                      </tr>
                    ))}
                    {history.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                          No daily historical data available for this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table></div>
              </div>

              <div className="md:hidden divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                {history.map((row: any) => (
                  <div key={row.date} className="p-4 bg-white">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-bold text-gray-900 text-base">{moment(row.date).format('MMM DD, YYYY')}</span>
                      <span className="font-mono font-bold text-green-700 bg-green-50 px-2 py-1 rounded">₹{row.revenue.toLocaleString()}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Leads (Done/Asg)</p>
                        <p className="font-mono"><span className="text-green-600 font-bold">{row.leadsCompleted}</span> / {row.leadsAssigned}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Sales (Conv/Asg)</p>
                        <p className="font-mono"><span className="text-[var(--color-primary)] font-bold">{row.salesConverted}</span> / {row.salesAssigned}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {history.length === 0 && (
                  <div className="p-8 text-center text-gray-400 text-sm">
                    No daily historical data available.
                  </div>
                )}
              </div>
            </Card>

            {/* 24. DAILY TREND CHART */}
            <Card className="p-5 bg-white shadow-sm border border-[var(--color-border-subtle)]">
              <h3 className="font-bold text-gray-800 mb-6">Daily Trend</h3>
              <div className="h-[320px]">
                {history.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[...history].reverse()} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="date" tickFormatter={(tick) => moment(tick).format('MMM D')} axisLine={false} tickLine={false} tick={{fill: '#777587', fontSize: 12}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#777587', fontSize: 12}} />
                      <RechartsTooltip cursor={{stroke: '#E2E8F0', strokeWidth: 1}} contentStyle={{borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} />
                      <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
                      <Line type="monotone" dataKey="leadsAssigned" name="Leads Assigned" stroke="#94A3B8" strokeWidth={2} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                      <Line type="monotone" dataKey="leadsCompleted" name="Leads Completed" stroke="#10B981" strokeWidth={2} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                      <Line type="monotone" dataKey="salesConverted" name="Sales Converted" stroke="#3525CD" strokeWidth={3} dot={{r: 5, strokeWidth: 2}} activeDot={{r: 7}} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">Not enough data to display trend.</div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeePerformance;
