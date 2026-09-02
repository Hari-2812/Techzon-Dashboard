import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const usePerformance = (dateFilter: string = 'Today', employeeId: string = 'all', specificDate?: string) => {
  return useQuery({
    queryKey: ['performance', dateFilter, employeeId, specificDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFilter) params.append('dateFilter', dateFilter);
      if (employeeId) params.append('employeeId', employeeId);
      if (specificDate) params.append('specificDate', specificDate);
      
      const res = await api.get(`/performance?${params.toString()}`);
      return res.data.data;
    },
  });
};

export const useMyAttendancePerformance = (month: string, year: string) => {
  return useQuery({
    queryKey: ['myAttendancePerformance', month, year],
    queryFn: async () => {
      const res = await api.get(`/performance/attendance/my?month=${month}&year=${year}`);
      return res.data.data;
    },
    enabled: !!month && !!year,
  });
};

export const useAdminAttendancePerformance = (employeeId: string | undefined, month: string, year: string) => {
  return useQuery({
    queryKey: ['adminAttendancePerformance', employeeId, month, year],
    queryFn: async () => {
      if (!employeeId) return null;
      const res = await api.get(`/performance/attendance/admin/${employeeId}?month=${month}&year=${year}`);
      return res.data.data;
    },
    enabled: !!employeeId && !!month && !!year,
  });
};
