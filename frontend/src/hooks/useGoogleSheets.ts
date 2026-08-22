import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useGoogleSheetsConfig = () => {
  return useQuery({
    queryKey: ['googleSheets', 'status'],
    queryFn: async () => {
      const { data } = await api.get('/google-sheets/status');
      return data;
    },
  });
};

export const useGoogleSheetsAuthUrl = () => {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.get('/google-sheets/auth');
      return data.url;
    }
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

export const useGoogleSheetsList = () => {
  return useQuery({
    queryKey: ['googleSheets', 'list'],
    queryFn: async () => {
      const { data } = await api.get('/google-sheets/sheets');
      return data.sheets;
    },
    // Only fetch if it's likely configured, usually enabled conditionally in the component
  });
};

export const useConnectGoogleSheets = () => {
  return useMutation({
    mutationFn: async (config: { spreadsheetId: string }) => {
      const { data } = await api.post('/google-sheets/connect', config);
      return data.worksheets;
    }
  });
};

export const usePreviewGoogleSheetsSync = () => {
  return useMutation({
    mutationFn: async (config: { spreadsheetId: string, worksheetName: string, mapping: Record<string, string> }) => {
      const { data } = await api.post('/google-sheets/preview', config);
      return data.preview;
    }
  });
};

export const useExecuteGoogleSheetsSync = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (config: { worksheets: string[] }) => {
      const { data } = await api.post('/google-sheets/sync', config);
      return data.data;
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
