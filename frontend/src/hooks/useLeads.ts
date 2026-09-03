import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useLeads = (params: any) => {
  return useQuery({
    queryKey: ['leads', params],
    queryFn: async () => {
      const { data } = await api.get('/leads', { params });
      return data;
    },
  });
};

export const useLead = (id: string) => {
  return useQuery({
    queryKey: ['lead', id],
    queryFn: async () => {
      const { data } = await api.get(`/leads/${id}`);
      return data;
    },
    enabled: !!id,
  });
};

export const useLeadActivities = (id: string) => {
  return useQuery({
    queryKey: ['leadActivities', id],
    queryFn: async () => {
      const { data } = await api.get(`/leads/${id}/activities`);
      return data.data;
    },
    enabled: !!id,
  });
};

export const useCreateLead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (leadData: any) => {
      const { data } = await api.post('/leads', leadData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
};

export const useBulkAssignLeads = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ leadIds, employeeId }: { leadIds: string[], employeeId: string }) => {
      const { data } = await api.post('/leads/bulk-assign', { leadIds, employeeId });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
};

export const useRecordCall = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ leadId, outcome, notes }: { leadId: string, outcome: string, notes: string }) => {
      const { data } = await api.post(`/leads/${leadId}/call`, { outcome, notes });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lead', variables.leadId] });
      queryClient.invalidateQueries({ queryKey: ['leadActivities', variables.leadId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['employeeLeadStats'] });
    },
  });
};

export const useVerifyCRYes = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ leadId, details }: { leadId: string, details?: any }) => {
      const { data } = await api.post(`/leads/${leadId}/cr/yes`, { details });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lead', variables.leadId] });
      queryClient.invalidateQueries({ queryKey: ['leadActivities', variables.leadId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
};

export const useVerifyCRNo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ leadId, details }: { leadId: string, details: any }) => {
      const { data } = await api.post(`/leads/${leadId}/cr/no`, { details });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lead', variables.leadId] });
      queryClient.invalidateQueries({ queryKey: ['leadActivities', variables.leadId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
};

export const useScheduleFollowUp = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ leadId, type, dueDate, priority, notes }: any) => {
      const { data } = await api.post(`/leads/${leadId}/followups`, { type, dueDate, priority, notes });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lead', variables.leadId] });
      queryClient.invalidateQueries({ queryKey: ['leadActivities', variables.leadId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
};

export const useEmployeeLeadStats = (employeeId?: string) => {
  return useQuery({
    queryKey: ['employeeLeadStats', employeeId],
    queryFn: async () => {
      const url = employeeId ? `/api/leads/admin/employees/${employeeId}/stats` : `/api/leads/my-stats`;
      const { data } = await api.get(url);
      return data;
    },
    refetchInterval: 30000,
  });
};

export const useResetEmployeeLeads = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (employeeId: string) => {
      const { data } = await api.delete(`/api/leads/admin/employees/${employeeId}/all`);
      return data;
    },
    onSuccess: (_, employeeId) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['employeeLeadStats', employeeId] });
      queryClient.invalidateQueries({ queryKey: ['leadAssignmentStats'] });
    },
  });
};
