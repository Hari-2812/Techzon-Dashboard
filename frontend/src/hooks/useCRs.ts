import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useCR = (id: string) => {
  return useQuery({
    queryKey: ['cr', id],
    queryFn: async () => {
      const { data } = await api.get(`/crs/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
};

export const useCRActivities = (id: string) => {
  return useQuery({
    queryKey: ['crActivities', id],
    queryFn: async () => {
      const { data } = await api.get(`/crs/${id}/activities`);
      return data.data;
    },
    enabled: !!id,
  });
};

export const useCRSourceStudents = (id: string) => {
  return useQuery({
    queryKey: ['crSourceStudents', id],
    queryFn: async () => {
      const { data } = await api.get(`/crs/${id}/source-students`);
      return data.data;
    },
    enabled: !!id,
  });
};

export const useUpdateCRStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const { data } = await api.patch(`/crs/${id}/status`, { status });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cr', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['crActivities', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['crs'] });
    },
  });
};

export const useCreateWhatsAppGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, groupName, expectedStudents }: { id: string, groupName: string, expectedStudents: number }) => {
      const { data } = await api.post(`/crs/${id}/whatsapp-groups`, { groupName, expectedStudents });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cr', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['crActivities', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['crs'] });
    },
  });
};

export const useUpdateWhatsAppGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, joinedStudents }: { id: string, joinedStudents: number }) => {
      const { data } = await api.patch(`/crs/${id}/whatsapp-groups`, { joinedStudents });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cr', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['crActivities', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['crs'] });
    },
  });
};

export const useCreateCRFollowUp = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string, payload: any }) => {
      const { data } = await api.post(`/crs/${id}/follow-ups`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crActivities', variables.id] });
    },
  });
};
