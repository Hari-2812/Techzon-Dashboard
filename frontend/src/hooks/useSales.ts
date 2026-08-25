import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useSalesDashboard = () => {
  return useQuery({
    queryKey: ['sales', 'dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/sales/dashboard');
      return data;
    },
  });
};

export const useSales = (filters: any) => {
  return useQuery({
    queryKey: ['sales', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.status) params.append('status', filters.status);
      if (filters.employeeId) params.append('employeeId', filters.employeeId);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      const { data } = await api.get(`/sales?${params.toString()}`);
      return data;
    },
  });
};

export const useCallQueue = () => {
  return useQuery({
    queryKey: ['sales', 'queue'],
    queryFn: async () => {
      const { data } = await api.get('/sales/queue');
      return data.queue;
    },
  });
};

export const useSalesDetail = (id: string) => {
  return useQuery({
    queryKey: ['sales', 'detail', id],
    queryFn: async () => {
      const { data } = await api.get(`/sales/${id}`);
      return data;
    },
    enabled: !!id,
  });
};

export const useAddResponse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, responseData }: { id: string; responseData: any }) => {
      const { data } = await api.post(`/sales/${id}/response`, responseData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });
};

export const useLogCall = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, callData }: { id: string; callData: any }) => {
      const { data } = await api.post(`/sales/${id}/call`, callData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });
};

export const useConvertSale = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, convertData }: { id: string; convertData: any }) => {
      const { data } = await api.post(`/sales/${id}/convert`, convertData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });
};

export const useUpdateSalesStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, salesStatus }: { id: string; salesStatus: string }) => {
      const { data } = await api.patch(`/sales/${id}/status`, { salesStatus });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });
};

export const useUpdateSalesPriority = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, priority }: { id: string; priority: string }) => {
      const { data } = await api.patch(`/sales/${id}/priority`, { priority });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });
};

export const useBulkUpdateSales = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bulkData: any) => {
      const { data } = await api.post(`/sales/bulk`, bulkData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });
};
