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
