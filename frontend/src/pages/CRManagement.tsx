import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { Search, Filter, Phone, UserCircle2, ArrowRight } from 'lucide-react';
import clsx from 'clsx';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { KpiCard } from '../components/ui/KpiCard';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableContainer } from '../components/ui/Table';
import { AddCRModal } from '../components/cr/AddCRModal';

export default function CRManagement() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    if (debouncedSearch) {
      searchParams.set('search', debouncedSearch);
    } else {
      searchParams.delete('search');
    }
    setSearchParams(searchParams);
  }, [debouncedSearch, searchParams, setSearchParams]);

  const { data: crs, isLoading } = useQuery({
    queryKey: ['crs', debouncedSearch],
    queryFn: async () => {
      // Assuming GET /crs takes a 'search' param for backend filtering
      const res = await api.get('/crs');
      let data = res.data.data;
      if (debouncedSearch) {
          const lower = debouncedSearch.toLowerCase();
          data = data.filter((c: any) => 
            c.crName.toLowerCase().includes(lower) || 
            c.college.toLowerCase().includes(lower) ||
            c.phone.includes(debouncedSearch)
          );
      }
      return data;
    }
  });

  const getKPIs = () => {
    if (!crs) return { total: 0, pending: 0, interested: 0, completed: 0 };
    return {
      total: crs.length,
      pending: crs.filter((c: any) => c.status === 'Pending Contact').length,
      interested: crs.filter((c: any) => c.status === 'Interested').length,
      completed: crs.filter((c: any) => c.status === 'Completed' || c.status === 'Group Created' || c.status === 'Students Joining').length,
    };
  };

  const kpis = getKPIs();

  return (
    <div className="p-6 max-w-7xl mx-auto pb-24">
      <div className="mb-8 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">CR Management</h1>
          <p className="text-[var(--color-text-muted)] mt-1">Manage Class Representatives and their connected WhatsApp groups.</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setIsAddModalOpen(true)}>Add CR</Button>
        )}
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KpiCard label={isAdmin ? "Total CRs" : "My CRs"} value={kpis.total} />
        <KpiCard label="Pending Contact" value={kpis.pending} color="warning" />
        <KpiCard label="Interested" value={kpis.interested} color="info" />
        <KpiCard label="Groups Created" value={kpis.completed} color="success" />
      </div>

      <TableContainer>
        <div className="p-4 border-b border-[var(--color-border-subtle)] flex justify-between items-center bg-white">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input 
              type="text" 
              placeholder="Search CRs by name, phone, college..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter size={16} className="mr-2" />
            <span>Filters</span>
          </Button>
        </div>

        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CR Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>College</TableHead>
                <TableHead className="text-center">Source Students</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Expected/Joined</TableHead>
                {isAdmin && <TableHead>Assigned To</TableHead>}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : crs?.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-12 text-[var(--color-text-muted)]">No CR records found.</TableCell></TableRow>
              ) : (
                crs?.map((cr: any) => (
                  <TableRow key={cr._id}>
                    <TableCell>
                      <div className="font-semibold text-[var(--color-text-primary)]">{cr.crName}</div>
                    </TableCell>
                    <TableCell>
                      <a href={`tel:${cr.phone}`} className="text-[var(--color-primary)] hover:underline flex items-center">
                        <Phone size={14} className="mr-1"/> {cr.phone}
                      </a>
                    </TableCell>
                    <TableCell>
                      <div className="text-[var(--color-text-primary)] truncate max-w-[200px]" title={cr.college}>{cr.college}</div>
                      <div className="text-xs text-[var(--color-text-muted)]">{cr.department} • {cr.year}</div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center bg-[var(--color-primary-100)] text-[var(--color-primary)] px-2.5 py-1 rounded-full font-bold">
                        {cr.sourceStudentCount || 0}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="neutral">{cr.status}</Badge>
                    </TableCell>
                    <TableCell className="text-center font-mono">
                      <span className="text-[var(--color-text-secondary)]">{cr.expectedStudents || 0}</span>
                      <span className="mx-1 text-[var(--color-border-subtle)]">/</span>
                      <span className="text-green-600 font-bold">{cr.joinedStudents || 0}</span>
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        {cr.assignedEmployee?.name || 'Unassigned'}
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/crs/${cr._id}`)} className="text-[var(--color-primary)]">
                        View <ArrowRight size={14} className="ml-1" />
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
            <div className="text-center py-8 text-gray-500">Loading CRs...</div>
          ) : crs?.length === 0 ? (
            <div className="py-12 text-center text-[var(--color-text-muted)] flex flex-col items-center justify-center">
              <UserCircle2 size={40} className="text-[var(--color-border-subtle)] mb-3" />
              <p className="font-semibold">No CR records found.</p>
            </div>
          ) : (
            crs?.map((cr: any) => (
              <div key={cr._id} className="p-4 bg-white">
                <div className="flex justify-between items-start mb-2">
                   <div>
                     <h3 className="font-bold text-[var(--color-text-primary)] text-lg cursor-pointer" onClick={() => navigate(`/crs/${cr._id}`)}>
                       {cr.crName}
                     </h3>
                     <p className="text-xs text-[var(--color-text-muted)] flex items-center">
                       <UserCircle2 size={12} className="mr-1" /> Source Students: {cr.sourceStudentCount || 0}
                     </p>
                   </div>
                   <Badge variant="neutral">{cr.status}</Badge>
                </div>
                <div className="space-y-1 mb-4">
                   <p className="text-sm text-[var(--color-text-secondary)]"><strong>College:</strong> {cr.college}</p>
                   <p className="text-sm text-[var(--color-text-secondary)]"><strong>Department:</strong> {cr.department} • {cr.year}</p>
                   <p className="text-sm text-[var(--color-text-secondary)]"><strong>Phone:</strong> {cr.phone}</p>
                   <div className="flex items-center gap-2 mt-2 bg-gray-50 p-2 rounded-lg flex-wrap">
                      <div className="flex-1 text-center border-r">
                         <p className="text-xs text-gray-500 font-medium">Expected</p>
                         <p className="font-bold text-gray-700">{cr.expectedStudents || 0}</p>
                      </div>
                      <div className="flex-1 text-center">
                         <p className="text-xs text-gray-500 font-medium">Joined</p>
                         <p className="font-bold text-green-600">{cr.joinedStudents || 0}</p>
                      </div>
                   </div>
                   {isAdmin && <p className="text-sm text-[var(--color-text-secondary)] mt-2"><strong>Assigned:</strong> {cr.assignedEmployee?.name || 'Unassigned'}</p>}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                   <Button variant="outline" size="sm" onClick={() => window.location.href = `tel:${cr.phone}`}>
                     Call
                   </Button>
                   <Button variant="primary" size="sm" onClick={() => navigate(`/crs/${cr._id}`)}>
                     View Profile
                   </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </TableContainer>
      <AddCRModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </div>
  );
}
