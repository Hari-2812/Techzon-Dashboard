import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { useGroups, useUpdateGroup } from '../hooks/useGroups';
import { useAuthStore } from '../store/authStore';
import { Users, Phone, MessageCircle } from 'lucide-react';
import moment from 'moment-timezone';

const WhatsAppGroups = () => {
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [joinedStudents, setJoinedStudents] = useState<number>(0);
  const [groupLink, setGroupLink] = useState('');

  const { data: allGroups, isLoading } = useGroups();
  const updateMutation = useUpdateGroup();
  const user = useAuthStore(state => state.user);

  if (isLoading) return <div className="p-6">Loading...</div>;

  const groups = allGroups || [];

  const totalGroups = groups.length;
  const groupsCreated = groups.filter((g: any) => g.status !== 'Not Created' && g.status !== 'Creation Pending').length;
  const expectedTotal = groups.reduce((acc: number, g: any) => acc + (g.expectedStudents || 0), 0);
  const joinedTotal = groups.reduce((acc: number, g: any) => acc + (g.joinedStudents || 0), 0);
  const pendingTotal = expectedTotal - joinedTotal;
  const joiningPercentage = expectedTotal > 0 ? ((joinedTotal / expectedTotal) * 100).toFixed(1) : 0;
  const completedGroups = groups.filter((g: any) => g.status === 'Completed').length;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) return;
    await updateMutation.mutateAsync({
      id: selectedGroup._id,
      data: { joinedStudents: Number(joinedStudents), groupLink }
    });
    setIsUpdateModalOpen(false);
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 70) return 'bg-blue-500';
    if (percentage >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">WhatsApp Groups</h1>
          <p className="text-[var(--color-text-muted)] text-sm">Manage CR groups and track student joining progress</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="p-4 bg-white border border-gray-100">
          <div className="text-xs text-[var(--color-text-muted)] mb-1 uppercase tracking-wider">Total Groups</div>
          <div className="text-2xl font-bold text-gray-900">{totalGroups}</div>
        </Card>
        <Card className="p-4 bg-white border border-gray-100">
          <div className="text-xs text-[var(--color-text-muted)] mb-1 uppercase tracking-wider">Created</div>
          <div className="text-2xl font-bold text-indigo-600">{groupsCreated}</div>
        </Card>
        <Card className="p-4 bg-white border border-gray-100">
          <div className="text-xs text-[var(--color-text-muted)] mb-1 uppercase tracking-wider">Expected</div>
          <div className="text-2xl font-bold text-gray-900">{expectedTotal}</div>
        </Card>
        <Card className="p-4 bg-white border border-gray-100">
          <div className="text-xs text-[var(--color-text-muted)] mb-1 uppercase tracking-wider">Joined</div>
          <div className="text-2xl font-bold text-green-600">{joinedTotal}</div>
        </Card>
        <Card className="p-4 bg-white border border-gray-100">
          <div className="text-xs text-[var(--color-text-muted)] mb-1 uppercase tracking-wider">Pending</div>
          <div className="text-2xl font-bold text-red-600">{pendingTotal}</div>
        </Card>
        <Card className="p-4 bg-indigo-50 border border-indigo-100">
          <div className="text-xs text-[var(--color-primary)] mb-1 uppercase tracking-wider">Overall Joining</div>
          <div className="text-2xl font-bold text-[var(--color-primary)]">{joiningPercentage}%</div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <div className="overflow-x-auto w-full"><table className="w-full text-left text-sm text-[var(--color-text-primary)]">
            <thead className="bg-gray-50 text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)]">
              <tr>
                <th className="px-4 py-3 font-medium">Group Name & CR</th>
                <th className="px-4 py-3 font-medium">College info</th>
                <th className="px-4 py-3 font-medium">Progress</th>
                <th className="px-4 py-3 font-medium">Status</th>
                {user?.role === 'ADMIN' && <th className="px-4 py-3 font-medium">Employee</th>}
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-subtle)]">
              {groups.map((g: any) => {
                const p = g.joiningPercentage || 0;
                return (
                  <tr key={g._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="font-bold text-[var(--color-primary)]">{g.groupName}</div>
                      <div className="text-xs text-[var(--color-text-muted)] mt-0.5">CR: {g.cr?.crName}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium">{g.college}</div>
                      <div className="text-xs text-[var(--color-text-muted)]">{g.department} • {g.year} Year {g.section ? `• Sec ${g.section}` : ''}</div>
                    </td>
                    <td className="px-4 py-4 w-48">
                      <div className="flex justify-between text-xs mb-1">
                        <span>{g.joinedStudents || 0} Joined</span>
                        <span className="text-[var(--color-text-muted)]">{g.expectedStudents || 0} Expected</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className={`h-2 rounded-full ${getProgressBarColor(p)}`} style={{ width: `${Math.min(p, 100)}%` }}></div>
                      </div>
                      <div className="text-right text-[10px] text-gray-500 mt-1">{p.toFixed(0)}% • {g.pendingStudents} Pending</div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        g.status === 'Completed' ? 'bg-green-100 text-green-700' :
                        g.status === 'Students Joining' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {g.status}
                      </span>
                    </td>
                    {user?.role === 'ADMIN' && (
                      <td className="px-4 py-4">{g.assignedEmployee?.name}</td>
                    )}
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        {g.cr?.phone && (
                          <a href={`tel:${g.cr.phone}`} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Call CR">
                            <Phone size={16} />
                          </a>
                        )}
                        {g.groupLink ? (
                          <a href={g.groupLink} target="_blank" rel="noreferrer" className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Open Group">
                            <MessageCircle size={16} />
                          </a>
                        ) : (
                          <span className="p-1.5 text-gray-300" title="No link added"><MessageCircle size={16} /></span>
                        )}
                        <button 
                          onClick={() => {
                            setSelectedGroup(g);
                            setJoinedStudents(g.joinedStudents || 0);
                            setGroupLink(g.groupLink || '');
                            setIsUpdateModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded ml-2"
                        >
                          Update
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {groups.length === 0 && (
                <tr>
                  <td colSpan={user?.role === 'ADMIN' ? 6 : 5} className="px-4 py-8 text-center text-[var(--color-text-muted)]">
                    No WhatsApp groups found.
                  </td>
                </tr>
              )}
            </tbody>
          </table></div>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-gray-100 bg-gray-50/50">
          {groups.length === 0 ? (
            <div className="py-12 text-center text-[var(--color-text-muted)] flex flex-col items-center justify-center">
              <Users size={40} className="text-[var(--color-border-subtle)] mb-3" />
              <p className="font-semibold">No WhatsApp groups found.</p>
            </div>
          ) : (
            groups.map((g: any) => {
              const p = g.joiningPercentage || 0;
              return (
                <div key={g._id} className="p-4 bg-white">
                  <div className="flex justify-between items-start mb-2">
                     <div>
                       <h3 className="font-bold text-[var(--color-text-primary)] text-lg">
                         {g.groupName}
                       </h3>
                       <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                         CR: {g.cr?.crName}
                       </p>
                     </div>
                     <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                        g.status === 'Completed' ? 'bg-green-100 text-green-700' :
                        g.status === 'Students Joining' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {g.status}
                      </span>
                  </div>
                  <div className="space-y-1 mb-4">
                     <p className="text-sm text-[var(--color-text-secondary)]"><strong>College:</strong> {g.college}</p>
                     <p className="text-sm text-[var(--color-text-secondary)]"><strong>Dept:</strong> {g.department} • {g.year} {g.section ? `• Sec ${g.section}` : ''}</p>
                     {user?.role === 'ADMIN' && <p className="text-sm text-[var(--color-text-secondary)]"><strong>Assigned:</strong> {g.assignedEmployee?.name}</p>}
                  </div>
                  <div className="mb-4">
                     <div className="flex justify-between text-xs mb-1 font-medium">
                       <span>{g.joinedStudents || 0} Joined</span>
                       <span className="text-[var(--color-text-muted)]">{g.expectedStudents || 0} Expected</span>
                     </div>
                     <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                       <div className={`h-2 rounded-full ${getProgressBarColor(p)}`} style={{ width: `${Math.min(p, 100)}%` }}></div>
                     </div>
                     <div className="text-right text-[10px] text-gray-500">{p.toFixed(0)}% • {g.pendingStudents} Pending</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-[var(--color-border-subtle)]">
                     {g.cr?.phone ? (
                       <a href={`tel:${g.cr.phone}`} className="flex flex-col items-center justify-center p-2 rounded-lg bg-blue-50 text-blue-600">
                         <Phone size={18} className="mb-1" />
                         <span className="text-[10px] font-bold">CALL CR</span>
                       </a>
                     ) : (
                       <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-gray-50 text-gray-400">
                         <Phone size={18} className="mb-1" />
                         <span className="text-[10px] font-bold">CALL CR</span>
                       </div>
                     )}
                     {g.groupLink ? (
                       <a href={g.groupLink} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center p-2 rounded-lg bg-green-50 text-green-600">
                         <MessageCircle size={18} className="mb-1" />
                         <span className="text-[10px] font-bold">GROUP</span>
                       </a>
                     ) : (
                       <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-gray-50 text-gray-400">
                         <MessageCircle size={18} className="mb-1" />
                         <span className="text-[10px] font-bold">GROUP</span>
                       </div>
                     )}
                     <button 
                       onClick={() => {
                         setSelectedGroup(g);
                         setJoinedStudents(g.joinedStudents || 0);
                         setGroupLink(g.groupLink || '');
                         setIsUpdateModalOpen(true);
                       }} 
                       className="flex flex-col items-center justify-center p-2 rounded-lg bg-gray-100 text-gray-700"
                     >
                        <Users size={18} className="mb-1" />
                        <span className="text-[10px] font-bold">UPDATE</span>
                     </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Update Modal */}
      {isUpdateModalOpen && selectedGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Update Group: {selectedGroup.groupName}</h2>
            <form onSubmit={handleUpdate}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Group Link (Optional)</label>
                <input 
                  type="url" value={groupLink} onChange={(e) => setGroupLink(e.target.value)}
                  className="w-full border rounded p-2 text-sm focus:border-[var(--color-primary)] outline-none" 
                  placeholder="https://chat.whatsapp.com/..."
                />
              </div>
              <div className="mb-4">
                <div className="flex justify-between mb-1">
                  <label className="block text-sm font-medium">Joined Students</label>
                  <span className="text-xs text-gray-500">Expected: {selectedGroup.expectedStudents || 0}</span>
                </div>
                <input 
                  type="number" min="0" required value={joinedStudents} onChange={(e) => setJoinedStudents(parseInt(e.target.value) || 0)}
                  className="w-full border rounded p-2 text-sm focus:border-[var(--color-primary)] outline-none" 
                />
                {joinedStudents > selectedGroup.expectedStudents && (
                  <p className="text-xs text-red-500 mt-1">Joined cannot exceed expected students ({selectedGroup.expectedStudents})</p>
                )}
              </div>
              <div className="flex justify-end gap-2 mt-6 flex-wrap">
                <button type="button" onClick={() => setIsUpdateModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-medium">Cancel</button>
                <button type="submit" disabled={updateMutation.isPending || joinedStudents > selectedGroup.expectedStudents} className="px-4 py-2 bg-[var(--color-primary)] hover:bg-indigo-700 text-white rounded font-medium">
                  {updateMutation.isPending ? 'Saving...' : 'Save Updates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppGroups;
