import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useHolidays = () => {
  const queryClient = useQueryClient();

  const { data: upcomingHolidays, isLoading: upcomingLoading } = useQuery({
    queryKey: ['upcomingHolidays'],
    queryFn: async () => {
      const res = await api.get('/holidays/upcoming');
      return res.data.data;
    }
  });

  const { data: tomorrowHoliday, refetch: refetchTomorrow } = useQuery({
    queryKey: ['tomorrowHoliday'],
    queryFn: async () => {
      const res = await api.get('/holidays/tomorrow');
      return res.data;
    }
  });

  const { data: allHolidays, isLoading: allLoading } = useQuery({
    queryKey: ['allHolidays'],
    queryFn: async () => {
      const res = await api.get('/holidays');
      return res.data.data;
    }
  });

  const { data: myResponses, refetch: refetchMyResponses } = useQuery({
    queryKey: ['myHolidayResponses'],
    queryFn: async () => {
      const res = await api.get('/holiday-responses/my');
      return res.data.data;
    }
  });

  const createHoliday = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/holidays', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allHolidays'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingHolidays'] });
      queryClient.invalidateQueries({ queryKey: ['tomorrowHoliday'] });
    }
  });

  const updateHoliday = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await api.put(`/holidays/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allHolidays'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingHolidays'] });
      queryClient.invalidateQueries({ queryKey: ['tomorrowHoliday'] });
    }
  });

  const deleteHoliday = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/holidays/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allHolidays'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingHolidays'] });
      queryClient.invalidateQueries({ queryKey: ['tomorrowHoliday'] });
    }
  });

  const submitResponse = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/holiday-responses', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myHolidayResponses'] });
    }
  });

  const reviewResponse = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'APPROVED' | 'REJECTED' }) => {
      const res = await api.put(`/holiday-responses/${id}/review`, { status });
      return res.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate specific responses if needed, or global
      queryClient.invalidateQueries({ queryKey: ['holidayResponses'] });
    }
  });

  const sendReminder = useMutation({
    mutationFn: async (holidayId: string) => {
      const res = await api.post(`/holiday-responses/remind`, { holidayId });
      return res.data;
    }
  });

  return {
    upcomingHolidays,
    upcomingLoading,
    tomorrowHoliday,
    refetchTomorrow,
    allHolidays,
    allLoading,
    myResponses,
    refetchMyResponses,
    createHoliday,
    updateHoliday,
    deleteHoliday,
    submitResponse,
    reviewResponse,
    sendReminder
  };
};
