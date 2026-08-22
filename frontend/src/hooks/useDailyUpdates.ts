import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useDailyUpdates = () => {
  const queryClient = useQueryClient();

  const getUpdates = (filters: any) => {
    return useQuery({
      queryKey: ['dailyUpdates', filters],
      queryFn: async () => {
        const res = await api.get('/daily-updates', { params: filters });
        return res.data;
      },
    });
  };

  const getAnalytics = (date?: string) => {
    return useQuery({
      queryKey: ['dailyUpdatesAnalytics', date],
      queryFn: async () => {
        const res = await api.get('/daily-updates/analytics', { params: { date } });
        return res.data.data;
      },
    });
  };
  
  const getLeadUpdates = (leadId: string) => {
    return useQuery({
      queryKey: ['dailyUpdatesLead', leadId],
      queryFn: async () => {
        const res = await api.get(`/daily-updates/lead/${leadId}`);
        return res.data.data;
      },
      enabled: !!leadId
    });
  };

  const createUpdate = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/daily-updates', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyUpdates'] });
      queryClient.invalidateQueries({ queryKey: ['dailyUpdatesAnalytics'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['dailyUpdatesLead'] });
    },
  });

  return {
    getUpdates,
    getAnalytics,
    getLeadUpdates,
    createUpdate
  };
};
