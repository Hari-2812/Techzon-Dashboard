import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../services/api';
import logo from '../assets/logo.jpeg';

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/auth/reset-password', {
        token,
        newPassword
      });

      if (res.data.success) {
        setSuccess('Password has been successfully reset.');
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#F8F9FA] items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <div className="bg-white p-4 rounded-xl shadow-md w-32 h-auto flex items-center justify-center border border-gray-100">
             <img src={logo} alt="Techzon Logo" className="w-full h-auto object-contain max-h-16" />
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 relative overflow-hidden">
          {/* Accent header bar */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#3525CD] via-[#4F46E5] to-[#FD761A]"></div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2 mt-2">Create New Password</h2>
          <p className="text-sm text-gray-500 mb-6">
            Enter your new password below to regain access to your account.
          </p>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm font-medium border border-red-100">
              {error}
            </div>
          )}

          {success ? (
            <div className="text-center">
              <div className="bg-green-50 text-green-700 p-4 rounded-lg font-medium border border-green-100 mb-6">
                {success}
              </div>
              <p className="text-sm text-gray-500">Redirecting to login...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input 
                  type="password" 
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] transition-all"
                  placeholder="Minimum 8 characters"
                  minLength={8}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input 
                  type="password" 
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] transition-all"
                  placeholder="Re-enter new password"
                  minLength={8}
                />
              </div>

              <button 
                type="submit"
                disabled={loading || !token}
                className="w-full bg-[#3525CD] text-white py-3 rounded-lg font-semibold shadow hover:bg-[#4F46E5] transition-all mt-4 disabled:opacity-70"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>

              <div className="text-center mt-6">
                <Link to="/login" className="text-sm text-gray-500 hover:text-gray-800 font-medium transition-colors">
                  &larr; Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
