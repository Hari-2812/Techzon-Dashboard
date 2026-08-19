import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useGroups = (filters: Record<string, string> = {}) => {
  return useQuery({
    queryKey: ['groups', filters],
    queryFn: async () => {
      const queryParams = new URLSearchParams(filters).toString();
      const res = await api.get(`/whatsapp-groups?${queryParams}`);
      return res.data.data;
    },
  });
};

export const useGroup = (id: string | undefined) => {
  return useQuery({
    queryKey: ['groups', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await api.get(`/whatsapp-groups/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });
};

export const useCreateGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/whatsapp-groups', data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['crs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useUpdateGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await api.patch(`/whatsapp-groups/${id}`, data);
      return res.data.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['crs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};
