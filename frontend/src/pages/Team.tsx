import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { UserPlus, MoreVertical, Search, Shield, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';

const Team = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmp, setNewEmp] = useState({ name: '', email: '', phone: '', role: 'RGS', password: '' });

  const fetchEmployees = async () => {
    try {
      const { data } = await api.get('/auth/users');
      setEmployees(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchEmployees();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  const handleAddEmployee = async (e: any) => {
    e.preventDefault();
    try {
      await api.post('/auth/users', newEmp);
      setShowAddModal(false);
      setNewEmp({ name: '', email: '', phone: '', role: 'RGS', password: '' });
      fetchEmployees();
    } catch (err) {
      console.error(err);
      alert('Error creating employee');
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">My Team</h1>
        <p className="mt-4 text-gray-600">You don't have permission to view the full team directory.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto pb-24">
      <div className="flex flex-col sm:flex-row gap-4 md:flex-row justify-between items-start md:items-start sm:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Team Directory</h1>
          <p className="text-[var(--color-text-muted)] mt-1">Manage employee access and roles.</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="mt-4 md:mt-0 flex items-center bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700">
          <UserPlus size={18} className="mr-2" /> Add Employee
        </button>
      </div>

      <div className="bg-white radius-card shadow-flat border border-[var(--color-border-subtle)] overflow-hidden">
        {loading ? (
          <p className="p-6 text-gray-500">Loading employees...</p>
        ) : (
          <div className="overflow-x-auto w-full"><table className="w-full text-left">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-b">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email / Phone</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-subtle)] text-sm">
              {employees.map(emp => (
                <tr key={emp._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-bold text-[var(--color-text-primary)]">{emp.name}</td>
                  <td className="px-6 py-4">
                    <p>{emp.email}</p>
                    <p className="text-gray-500 text-xs">{emp.phone}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={clsx("px-2 py-1 rounded-full text-xs font-bold flex items-center w-max", emp.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700')}>
                      {emp.role === 'ADMIN' ? <ShieldCheck size={14} className="mr-1" /> : <Shield size={14} className="mr-1" />}
                      {emp.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={clsx("px-2 py-1 rounded-full text-xs font-bold", emp.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                      {emp.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{new Date(emp.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Add Employee</h2>
            <form onSubmit={handleAddEmployee} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input required value={newEmp.name} onChange={e => setNewEmp({...newEmp, name: e.target.value})} className="w-full border p-2 rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input required type="email" value={newEmp.email} onChange={e => setNewEmp({...newEmp, email: e.target.value})} className="w-full border p-2 rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input required value={newEmp.phone} onChange={e => setNewEmp({...newEmp, phone: e.target.value})} className="w-full border p-2 rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select value={newEmp.role} onChange={e => setNewEmp({...newEmp, role: e.target.value})} className="w-full border p-2 rounded">
                  <option value="RGS">RGS</option>
                  <option value="BDE">BDE</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Temporary Password</label>
                <input required type="password" value={newEmp.password} onChange={e => setNewEmp({...newEmp, password: e.target.value})} className="w-full border p-2 rounded" />
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="submit" className="bg-[var(--color-primary)] text-white px-4 py-2 rounded font-semibold w-full">Create Employee</button>
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-gray-500 font-semibold border rounded hover:bg-gray-50 w-full">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Team;
