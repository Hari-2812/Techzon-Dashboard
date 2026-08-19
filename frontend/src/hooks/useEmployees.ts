import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useEmployees = () => {
  const queryClient = useQueryClient();

  const { data: allEmployees, isLoading, refetch } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await api.get('/employees');
      return res.data.data;
    }
  });

  const getEmployeeById = (id: string) => {
    return useQuery({
      queryKey: ['employee', id],
      queryFn: async () => {
        const res = await api.get(`/employees/${id}`);
        return res.data.data;
      },
      enabled: !!id
    });
  };

  const createEmployee = useMutation({
    mutationFn: async (formData: FormData) => {
      // Must post as multipart/form-data
      const res = await api.post('/employees', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    }
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: string; reason?: string }) => {
      const res = await api.patch(`/employees/${id}/status`, { status, reason });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    }
  });

  const resendInvitation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/employees/${id}/resend-invitation`);
      return res.data;
    }
  });

  const updateEmployee = useMutation({
    mutationFn: async ({ id, formData }: { id: string, formData: FormData }) => {
      const res = await api.put(`/employees/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee', variables.id] });
    }
  });

  const resetPassword = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/employees/${id}/reset-password`);
      return res.data;
    }
  });

  return {
    allEmployees,
    isLoading,
    refetch,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    updateStatus,
    resendInvitation,
    resetPassword
  };
};
