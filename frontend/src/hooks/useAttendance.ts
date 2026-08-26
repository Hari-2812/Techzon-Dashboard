import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import api from '../services/api';
import socket from '../services/socket';
import { useAuthStore } from '../store/authStore';
import moment from 'moment-timezone';

export const useAttendance = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'ADMIN';

  // 1. Fetch Today's Attendance
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['attendanceToday'],
    queryFn: async () => {
      const res = await api.get('/attendance/today');
      return res.data.data;
    },
    enabled: !!user && !isAdmin,
  });

  // 1.5 Fetch Pending Requests for this user
  const { data: pendingRequestsData, refetch: refetchPending } = useQuery({
    queryKey: ['myPendingRequests'],
    queryFn: async () => {
      const res = await api.get('/attendance/requests/my-pending');
      return res.data.data;
    },
    enabled: !!user && !isAdmin,
  });

  // 2. Socket.IO Listener for real-time invalidation
  useEffect(() => {
    if (!user || isAdmin) return;

    const handleSocketEvent = (eventData: any) => {
      if (eventData.employeeId === user.id) {
        queryClient.invalidateQueries({ queryKey: ['attendanceToday'] });
        queryClient.invalidateQueries({ queryKey: ['attendanceMonthly'] });
        queryClient.invalidateQueries({ queryKey: ['myPendingRequests'] });
      }
    };

    socket.on('employee:clocked-in', handleSocketEvent);
    socket.on('employee:clocked-out', handleSocketEvent);
    socket.on('employee:on-break', handleSocketEvent);
    socket.on('employee:resumed', handleSocketEvent);
    socket.on('attendance:clock-in-approved', handleSocketEvent);
    socket.on('attendance:clock-in-rejected', handleSocketEvent);
    socket.on('attendance:clock-out-approved', handleSocketEvent);
    socket.on('attendance:clock-out-rejected', handleSocketEvent);

    return () => {
      socket.off('employee:clocked-in', handleSocketEvent);
      socket.off('employee:clocked-out', handleSocketEvent);
      socket.off('employee:on-break', handleSocketEvent);
      socket.off('employee:resumed', handleSocketEvent);
      socket.off('attendance:clock-in-approved', handleSocketEvent);
      socket.off('attendance:clock-in-rejected', handleSocketEvent);
      socket.off('attendance:clock-out-approved', handleSocketEvent);
      socket.off('attendance:clock-out-rejected', handleSocketEvent);
    };
  }, [user, isAdmin, queryClient]);

  // 3. Mutations
  const clockIn = useMutation({
    mutationFn: async () => {
      const res = await api.post('/attendance/clock-in', {});
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendanceToday'] });
      queryClient.invalidateQueries({ queryKey: ['myPendingRequests'] });
    },
  });

  const clockOut = useMutation({
    mutationFn: async () => {
      const res = await api.post('/attendance/clock-out', {});
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendanceToday'] });
      queryClient.invalidateQueries({ queryKey: ['myPendingRequests'] });
    },
  });

  const startBreak = useMutation({
    mutationFn: async (payload: { reason: string; comment: string }) => {
      const res = await api.post('/attendance/break/start', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendanceToday'] });
    },
  });

  const endBreak = useMutation({
    mutationFn: async (payload: { resumeComment: string }) => {
      const res = await api.post('/attendance/break/end', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendanceToday'] });
    },
  });

  const testReset = useMutation({
    mutationFn: async () => {
      const res = await api.post('/attendance/test-reset');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendanceToday'] });
      queryClient.invalidateQueries({ queryKey: ['myPendingRequests'] });
    },
  });

  // 4. Derived State
  const session = data?.session;
  
  // Calculate server time offset to fix timezone/clock drift issues
  // We only want to calculate this once when the data arrives, not on every render.
  const timeOffset = useMemo(() => {
      if (!data?.serverTime) return 0;
      return new Date(data.serverTime).getTime() - new Date().getTime();
  }, [data?.serverTime]);
  
  const pendingClockInReq = pendingRequestsData?.find((r: any) => r.requestType === 'CLOCK_IN');
  const pendingClockOutReq = pendingRequestsData?.find((r: any) => r.requestType === 'CLOCK_OUT');

  const isPendingClockIn = !!pendingClockInReq;
  const isPendingClockOut = !!pendingClockOutReq;

  const isClockedIn = !!session && !session.clockOutAt;
  const isOnBreak = session?.breaks?.length > 0 && !session.breaks[session.breaks.length - 1].endAt;
  const activeBreak = isOnBreak ? session.breaks[session.breaks.length - 1] : null;
  const isCompleted = session?.clockOutAt != null;
  const isWorking = isClockedIn && !isOnBreak;
  const isTestSession = session?.isTestSession;

  // Calculate live working timer logic wrapper
  const getLiveTimer = (currentTimeMs: number) => {
    if (!session || !session.clockInAt) return '00h 00m 00s';
    
    // Adjust current local time to server time to prevent '00h 00m' if local clock is behind
    const serverAdjustedTimeMs = currentTimeMs + timeOffset;
    
    const start = new Date(session.clockInAt).getTime();
    const end = session.clockOutAt ? new Date(session.clockOutAt).getTime() : serverAdjustedTimeMs;
    
    let totalBreakMs = 0;
    if (session.breaks) {
      session.breaks.forEach((b: any) => {
        if (b.endAt) {
          totalBreakMs += new Date(b.endAt).getTime() - new Date(b.startAt).getTime();
        } else {
          totalBreakMs += end - new Date(b.startAt).getTime();
        }
      });
    }
    
    const diff = Math.max(0, Math.floor((end - start - totalBreakMs) / 1000));
    const hours = Math.floor(diff / 3600);
    const mins = Math.floor((diff % 3600) / 60);
    const secs = diff % 60;
    return `${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  };

  return {
    data,
    session,
    isLoading,
    isError,
    error,
    refetch,
    isClockedIn,
    isOnBreak,
    activeBreak,
    isCompleted,
    isWorking,
    isTestSession,
    isPendingClockIn,
    isPendingClockOut,
    getLiveTimer,
    clockIn,
    clockOut,
    startBreak,
    endBreak,
    testReset
  };
};
