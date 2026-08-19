import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useSales = (filters: Record<string, string> = {}) => {
  return useQuery({
    queryKey: ['sales', filters],
    queryFn: async () => {
      const queryParams = new URLSearchParams(filters).toString();
      const res = await api.get(`/sales?${queryParams}`);
      return res.data.data;
    },
  });
};

export const useCreateSale = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/sales', data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['performance'] });
    },
  });
};

export const useUpdateSale = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await api.patch(`/sales/${id}`, data);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['performance'] });
    },
  });
};
