import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export const useDashboard = (role: string | undefined) => {
  return useQuery({
    queryKey: ['dashboard', role],
    queryFn: async () => {
      const endpoint = role === 'ADMIN' ? '/dashboard/admin' : '/dashboard/employee';
      const { data } = await api.get(endpoint);
      return data.data;
    },
    enabled: !!role,
  });
};
