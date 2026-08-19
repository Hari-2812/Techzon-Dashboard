import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useFollowUps = (filters: Record<string, string> = {}) => {
  return useQuery({
    queryKey: ['followups', filters],
    queryFn: async () => {
      const queryParams = new URLSearchParams(filters).toString();
      const res = await api.get(`/follow-ups?${queryParams}`);
      return res.data.data;
    },
  });
};

export const useCreateFollowUp = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/follow-ups', data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followups'] });
      queryClient.invalidateQueries({ queryKey: ['crs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useUpdateFollowUp = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await api.patch(`/follow-ups/${id}`, data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followups'] });
    },
  });
};

export const useCompleteFollowUp = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const res = await api.post(`/follow-ups/${id}/complete`, { notes });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followups'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useRescheduleFollowUp = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await api.post(`/follow-ups/${id}/reschedule`, data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followups'] });
    },
  });
};
