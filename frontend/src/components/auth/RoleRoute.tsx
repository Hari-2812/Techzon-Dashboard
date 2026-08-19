import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

interface RoleRouteProps {
  roles: Array<'ADMIN' | 'RGS' | 'BDE'>;
}

const RoleRoute: React.FC<RoleRouteProps> = ({ roles }) => {
  const { user } = useAuthStore();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!roles.includes(user.role)) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50">
        <h1 className="text-4xl font-bold text-[var(--color-error)] mb-4">403 Forbidden</h1>
        <p className="text-gray-600 mb-6">You do not have permission to view this page.</p>
        <button 
          onClick={() => window.history.back()}
          className="bg-[var(--color-primary)] text-white px-6 py-2 rounded font-semibold"
        >
          Go Back
        </button>
      </div>
    );
  }

  return <Outlet />;
};

export default RoleRoute;
