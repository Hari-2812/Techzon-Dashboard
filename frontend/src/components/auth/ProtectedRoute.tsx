import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';

const ProtectedRoute = () => {
  const { isAuthenticated, isLoading, user, setUser, logout, setLoading } = useAuthStore();

  useEffect(() => {
    const fetchMe = async () => {
      if (isAuthenticated && !user) {
        try {
          const res = await api.get('/auth/me');
          if (res.data.success) {
            setUser(res.data.data);
          }
        } catch (err) {
          logout();
        }
      } else if (!isAuthenticated) {
        setLoading(false);
      }
    };
    fetchMe();
  }, [isAuthenticated, user, setUser, logout, setLoading]);

  if (isLoading || (isAuthenticated && !user)) {
    return <div className="h-screen flex items-center justify-center text-[var(--color-primary)]">Loading session...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If user must change password and they are not currently on the change-password page
  if (user?.mustChangePassword && window.location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
