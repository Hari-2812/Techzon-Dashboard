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
        queryClient.invalidateQueries({ queryKey: ['myLeaveRequests'] });
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
    socket.on('attendance:admin-force-clock-out', handleSocketEvent);
    socket.on('attendance:admin-edit-clock-out', handleSocketEvent);
    socket.on('leaveRequest:updated', handleSocketEvent);

    return () => {
      socket.off('employee:clocked-in', handleSocketEvent);
      socket.off('employee:clocked-out', handleSocketEvent);
      socket.off('employee:on-break', handleSocketEvent);
      socket.off('employee:resumed', handleSocketEvent);
      socket.off('attendance:clock-in-approved', handleSocketEvent);
      socket.off('attendance:clock-in-rejected', handleSocketEvent);
      socket.off('attendance:clock-out-approved', handleSocketEvent);
      socket.off('attendance:clock-out-rejected', handleSocketEvent);
      socket.off('attendance:admin-force-clock-out', handleSocketEvent);
      socket.off('attendance:admin-edit-clock-out', handleSocketEvent);
      socket.off('leaveRequest:updated', handleSocketEvent);
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
  
  const pendingClockInReq = pendingRequestsData?.find((r: any) => r.requestType === 'CHECK_IN');
  const pendingClockOutReq = pendingRequestsData?.find((r: any) => r.requestType === 'CHECK_OUT');
  const pendingBreakReq = pendingRequestsData?.find((r: any) => r.requestType === 'BREAK');

  const isPendingClockIn = !!pendingClockInReq;
  const isPendingClockOut = !!pendingClockOutReq;
  const isPendingBreak = !!pendingBreakReq;

  const isClockedIn = !!session && !session.clockOutAt;
  const isOnBreak = session?.status === 'ON_BREAK';
  const activeBreak = isOnBreak ? session.breaks[session.breaks.length - 1] : null;
  const isCompleted = session?.status === 'COMPLETED';
  const isWorking = session?.status === 'WORKING';
  const isTestSession = session?.isTestSession;

  // 3.5 Leave & Permission Mutations & Queries
  const { data: myLeaveRequests, refetch: refetchLeaveRequests } = useQuery({
    queryKey: ['myLeaveRequests'],
    queryFn: async () => {
      const res = await api.get('/attendance/leave-permission/my');
      return res.data.requests;
    },
    enabled: !!user && !isAdmin,
  });

  const submitLeaveRequest = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/attendance/leave-permission', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myLeaveRequests'] });
    },
  });

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
    
    const rawDiffSeconds = Math.floor((end - start - totalBreakMs) / 1000);
    
    if (rawDiffSeconds < 0 && !session.clockOutAt) {
       console.error(`[Attendance Timer Error] Timestamp mismatch detected. Approved clock-in (${new Date(start).toISOString()}) is in the future compared to current time (${new Date(end).toISOString()}).`);
       return '--';
    }

    const diff = Math.max(0, rawDiffSeconds);
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
    isPendingBreak,
    getLiveTimer,
    clockIn,
    clockOut,
    startBreak,
    endBreak,
    testReset,
    myLeaveRequests,
    submitLeaveRequest
  };
};
