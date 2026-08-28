import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useLeads } from '../hooks/useLeads';
import { Users, Phone, UserSquare2, CalendarClock, MessageCircle, MoreVertical, Search, Filter } from 'lucide-react';
import clsx from 'clsx';
import AddLeadModal from '../components/AddLeadModal';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { KpiCard } from '../components/ui/KpiCard';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableContainer } from '../components/ui/Table';

const Leads = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  const { data, isLoading, error } = useLeads({
    page,
    limit: 20,
    search: debouncedSearch,
  });

  if (error) return <div className="p-6 text-red-500">Failed to load leads.</div>;

  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="p-6 max-w-7xl mx-auto pb-24">
      {showAddModal && <AddLeadModal onClose={() => setShowAddModal(false)} />}
      
      {/* HEADER & KPIs */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row gap-4 md:flex-row justify-between items-start md:items-start sm:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
              {isAdmin ? 'Student Leads' : 'My Student Leads'}
            </h1>
            <p className="text-[var(--color-text-muted)] mt-1 max-w-2xl">
              {isAdmin 
                ? 'Manage, assign and track every student lead through CR identification and group completion.' 
                : 'Manage your assigned student leads and convert them into CR opportunities.'}
            </p>
          </div>
          <div className="flex items-center space-x-3 mt-4 md:mt-0">
            {isAdmin && (
              <Button variant="outline" onClick={() => navigate('/import-leads')}>
                Import Leads
              </Button>
            )}
            <Button variant="primary" onClick={() => setShowAddModal(true)}>
              + Add Lead
            </Button>
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <KpiCard
            label={isAdmin ? 'Total Leads' : 'My Leads'}
            value={data?.meta?.kpis?.totalLeads || 0}
          />
          <KpiCard
            label="New"
            value={data?.meta?.kpis?.newLeads || 0}
            color="info"
          />
          <KpiCard
            label="CRs Identified"
            value={data?.meta?.kpis?.crsIdentified || 0}
            color="accent"
          />
          <KpiCard
            label="Completed"
            value={data?.meta?.kpis?.completed || 0}
            color="success"
          />
        </div>
      </div>

      {/* PRIORITY WORK (EMPLOYEE ONLY) */}
      {!isAdmin && data?.data && data.data.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-4 flex items-center">
            <span className="bg-orange-100 text-orange-600 p-1 rounded-md mr-2"><CalendarClock size={18}/></span>
            Priority Work
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.data.slice(0, 3).map((lead: any, i: number) => (
              <Card key={'priority-'+lead._id} className="p-5 hover:border-[var(--color-primary)] transition-colors cursor-pointer" onClick={() => navigate(`/leads/${lead._id}`)}>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-gray-400">#{i+1}</span>
                  <Badge variant={lead.priority === 'HIGH' ? 'error' : lead.priority === 'MEDIUM' ? 'warning' : 'neutral'}>
                    {lead.priority}
                  </Badge>
                </div>
                <h3 className="font-bold text-lg">{lead.studentName}</h3>
                <p className="text-sm text-[var(--color-text-muted)] mb-4">{lead.college}</p>
                <Button fullWidth variant="secondary">
                  Call Now
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* FILTER & TABLE SECTION */}
      <TableContainer>
        {/* Toolbar */}
        <div className="p-4 border-b border-[var(--color-border-subtle)] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input 
              type="text" 
              placeholder="Search leads..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Filter size={16} className="mr-2"/>
              <span>Filters</span>
            </Button>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>College</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>CR Status</TableHead>
                <TableHead>Priority</TableHead>
                {isAdmin && <TableHead>Assigned To</TableHead>}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8">Loading leads...</TableCell></TableRow>
              ) : data?.data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-[var(--color-text-muted)]">
                    <div className="flex flex-col items-center justify-center">
                      <Users size={48} className="text-[var(--color-border-subtle)] mb-4" />
                      <p className="text-lg font-semibold">{isAdmin ? 'No student leads found.' : 'You have no assigned leads right now.'}</p>
                      <p className="text-sm mt-1">Try changing your filters or add a new lead.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data?.data?.map((lead: any) => (
                  <TableRow key={lead._id}>
                    <TableCell>
                      <div className="font-semibold text-[var(--color-text-primary)] cursor-pointer hover:text-[var(--color-primary)]" onClick={() => navigate(`/leads/${lead._id}`)}>
                        {lead.studentName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <a href={`tel:${lead.phone}`} className="text-[var(--color-primary)] hover:underline flex items-center">
                        <Phone size={14} className="mr-1"/> {lead.phone}
                      </a>
                    </TableCell>
                    <TableCell>
                      <div className="text-[var(--color-text-primary)] truncate max-w-[200px]" title={lead.college}>{lead.college}</div>
                      <div className="text-xs text-[var(--color-text-muted)]">{lead.department} • {lead.year}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="neutral">{lead.leadStatus}</Badge>
                    </TableCell>
                    <TableCell className="font-medium text-xs">
                      {lead.crStatus}
                    </TableCell>
                    <TableCell>
                      <Badge variant={lead.priority === 'HIGH' ? 'error' : lead.priority === 'MEDIUM' ? 'warning' : 'neutral'}>
                        {lead.priority}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        {lead.assignedEmployeeId?.name || 'Unassigned'}
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/leads/${lead._id}`)}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-gray-100 bg-gray-50/50">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading leads...</div>
          ) : data?.data?.length === 0 ? (
            <div className="py-12 text-center text-[var(--color-text-muted)] flex flex-col items-center justify-center">
              <Users size={40} className="text-[var(--color-border-subtle)] mb-3" />
              <p className="font-semibold">{isAdmin ? 'No student leads found.' : 'You have no assigned leads right now.'}</p>
            </div>
          ) : (
            data?.data?.map((lead: any) => (
              <div key={lead._id} className="p-4 bg-white">
                <div className="flex justify-between items-start mb-2">
                   <div>
                     <h3 className="font-bold text-[var(--color-text-primary)] text-lg cursor-pointer" onClick={() => navigate(`/leads/${lead._id}`)}>
                       {lead.studentName}
                     </h3>
                     <p className="text-xs text-gray-400">Lead #{lead.leadId || lead._id.toString().slice(-6).toUpperCase()}</p>
                   </div>
                   <Badge variant={lead.priority === 'HIGH' ? 'error' : lead.priority === 'MEDIUM' ? 'warning' : 'neutral'}>
                      {lead.priority}
                   </Badge>
                </div>
                <div className="space-y-1 mb-4">
                   <p className="text-sm text-[var(--color-text-secondary)]"><strong>College:</strong> {lead.college}</p>
                   <p className="text-sm text-[var(--color-text-secondary)]"><strong>Department:</strong> {lead.department} • {lead.year}</p>
                   <p className="text-sm text-[var(--color-text-secondary)]"><strong>Phone:</strong> {lead.phone}</p>
                   <p className="text-sm text-[var(--color-text-secondary)] flex items-center gap-1 flex-wrap">
                      <strong>Status:</strong> <Badge variant="neutral">{lead.leadStatus}</Badge>
                   </p>
                   {isAdmin && <p className="text-sm text-[var(--color-text-secondary)]"><strong>Assigned:</strong> {lead.assignedEmployeeId?.name || 'Unassigned'}</p>}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                   <Button variant="outline" size="sm" onClick={() => window.location.href = `tel:${lead.phone}`}>
                     Call
                   </Button>
                   <Button variant="primary" size="sm" onClick={() => navigate(`/leads/${lead._id}`)}>
                     View Lead
                   </Button>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Pagination */}
        {data?.meta && data.meta.pages > 1 && (
          <div className="p-4 border-t border-[var(--color-border-subtle)] flex items-center justify-between text-sm bg-white rounded-b-[var(--radius-2xl)]">
            <span className="text-[var(--color-text-secondary)]">Showing {((data.meta.page - 1) * 20) + 1}–{Math.min(data.meta.page * 20, data.meta.total)} of {data.meta.total} leads</span>
            <div className="flex space-x-1">
              <Button 
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button 
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(data.meta.pages, p + 1))}
                disabled={page === data.meta.pages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </TableContainer>
    </div>
  );
};

export default Leads;
