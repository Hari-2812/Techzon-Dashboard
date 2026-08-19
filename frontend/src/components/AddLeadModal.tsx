import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../services/api';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { X, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const leadSchema = z.object({
  studentName: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().regex(/^[0-9]{10}$/, 'Must be a valid 10-digit Indian phone number'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  college: z.string().min(1, 'College is required'),
  department: z.string().optional(),
  year: z.string().optional(),
  section: z.string().optional(),
  leadSource: z.string().optional(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  assignedEmployeeId: z.string().optional(),
  notes: z.string().optional()
});

type LeadForm = z.infer<typeof leadSchema>;

export default function AddLeadModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [employees, setEmployees] = useState<any[]>([]);
  const [serverError, setServerError] = useState('');
  const [duplicateId, setDuplicateId] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LeadForm>({
    resolver: zodResolver(leadSchema),
    defaultValues: { priority: 'MEDIUM' }
  });

  useEffect(() => {
    if (isAdmin) {
      api.get('/employees?status=ACTIVE').then(res => {
        // Only active RGS/BDE
        setEmployees(res.data.data.filter((u: any) => u.isActive && (u.role === 'RGS' || u.role === 'BDE')));
      }).catch(console.error);
    }
  }, [isAdmin]);

  const onSubmit = async (data: LeadForm) => {
    setServerError('');
    setDuplicateId('');
    try {
      if (isAdmin && !data.assignedEmployeeId) {
          delete data.assignedEmployeeId;
      }
      
      await api.post('/leads', data);
      
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      
      onClose();
      // Assume global toast handles success message
    } catch (err: any) {
      if (err.response?.status === 409) {
        setServerError(err.response.data.message || 'Possible duplicate lead.');
        setDuplicateId(err.response.data.existingId);
      } else {
        setServerError(err.response?.data?.message || 'Unable to create lead. Please try again.');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white p-6 rounded-xl w-full max-w-2xl shadow-2xl my-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">Add New Lead</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
            <X size={20} />
          </button>
        </div>

        {serverError && (
          <div className="mb-6 bg-red-50 border border-red-200 p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between">
            <div className="flex items-center text-red-700">
              <AlertTriangle className="mr-2" size={20} />
              <span>{serverError}</span>
            </div>
            {duplicateId && (
              <button 
                onClick={() => navigate(`/leads/${duplicateId}`)}
                className="mt-2 sm:mt-0 text-sm bg-white border border-red-300 text-red-700 px-3 py-1 rounded shadow-sm hover:bg-red-50 font-bold"
              >
                View Existing Lead
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Student Name *</label>
              <input {...register('studentName')} className={`w-full border p-2 rounded focus:ring-2 focus:ring-[var(--color-primary)] outline-none ${errors.studentName ? 'border-red-500' : 'border-[var(--color-border-subtle)]'}`} />
              {errors.studentName && <p className="text-red-500 text-xs mt-1">{errors.studentName.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone *</label>
              <input {...register('phone')} className={`w-full border p-2 rounded focus:ring-2 focus:ring-[var(--color-primary)] outline-none ${errors.phone ? 'border-red-500' : 'border-[var(--color-border-subtle)]'}`} />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input type="email" {...register('email')} className={`w-full border p-2 rounded focus:ring-2 focus:ring-[var(--color-primary)] outline-none ${errors.email ? 'border-red-500' : 'border-[var(--color-border-subtle)]'}`} />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">College *</label>
              <input {...register('college')} className={`w-full border p-2 rounded focus:ring-2 focus:ring-[var(--color-primary)] outline-none ${errors.college ? 'border-red-500' : 'border-[var(--color-border-subtle)]'}`} />
              {errors.college && <p className="text-red-500 text-xs mt-1">{errors.college.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Department</label>
              <input {...register('department')} className="w-full border border-[var(--color-border-subtle)] p-2 rounded focus:ring-2 focus:ring-[var(--color-primary)] outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium mb-1">Year</label>
                <select {...register('year')} className="w-full border border-[var(--color-border-subtle)] p-2 rounded outline-none">
                  <option value="">Select</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                  <option value="Passed Out">Passed Out</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Section</label>
                <input {...register('section')} className="w-full border border-[var(--color-border-subtle)] p-2 rounded outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Lead Source</label>
              <input {...register('leadSource')} className="w-full border border-[var(--color-border-subtle)] p-2 rounded outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Priority</label>
              <select {...register('priority')} className="w-full border border-[var(--color-border-subtle)] p-2 rounded outline-none">
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
            
            {isAdmin && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Assign To Employee</label>
                <select {...register('assignedEmployeeId')} className="w-full border border-[var(--color-border-subtle)] p-2 rounded outline-none">
                  <option value="">-- Leave Unassigned --</option>
                  {employees.map(e => (
                    <option key={e._id} value={e._id}>{e.name} ({e.role})</option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea {...register('notes')} rows={3} className="w-full border border-[var(--color-border-subtle)] p-2 rounded outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
            </div>
          </div>
          
          <div className="pt-4 border-t flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-6 py-2 border rounded font-semibold hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-[var(--color-primary)] text-white rounded font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center shadow-flat">
              {isSubmitting ? 'Saving...' : duplicateId ? 'Create Anyway (Update)' : '+ Create Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
