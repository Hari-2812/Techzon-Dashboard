import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useGoogleSheetsAuthStatus = () => {
  return useQuery({
    queryKey: ['googleSheetsAuthStatus'],
    queryFn: async () => {
      const res = await api.get('/google-sheets/auth-status');
      return res.data.isConnected;
    }
  });
};

export const useGoogleSheetsAuthUrl = () => {
  return useQuery({
    queryKey: ['googleSheetsAuthUrl'],
    queryFn: async () => {
      const res = await api.get('/google-sheets/auth');
      return res.data.url;
    },
    enabled: false // Only fetch when clicked
  });
};

export const useGoogleSheetsSettings = () => {
  return useQuery({
    queryKey: ['googleSheetsSettings'],
    queryFn: async () => {
      const res = await api.get('/google-sheets/settings');
      return res.data.data;
    }
  });
};

export const useUpdateGoogleSheetsSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settings: any) => {
      const res = await api.put('/google-sheets/settings', settings);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['googleSheetsSettings'] });
    }
  });
};

export const useConnectGoogleSheets = () => {
  return useMutation({
    mutationFn: async ({ spreadsheetId }: { spreadsheetId: string }) => {
      const res = await api.post('/google-sheets/connect', { spreadsheetId });
      return res.data.data; // returns array of worksheets
    }
  });
};

export const usePreviewGoogleSheetsSync = () => {
  return useMutation({
    mutationFn: async (payload: { spreadsheetId: string, worksheetName: string, mapping: any }) => {
      const res = await api.post('/google-sheets/preview', payload);
      return res.data.data;
    }
  });
};

export const useExecuteGoogleSheetsSync = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { spreadsheetId: string, worksheetName: string, mapping: any }) => {
      const res = await api.post('/google-sheets/sync', payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['googleSheetsHistory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });
};

export const useGoogleSheetsHistory = () => {
  return useQuery({
    queryKey: ['googleSheetsHistory'],
    queryFn: async () => {
      const res = await api.get('/google-sheets/sync-history');
      return res.data.data;
    }
  });
};
