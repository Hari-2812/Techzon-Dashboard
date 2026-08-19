import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import logo from '../assets/logo.jpeg';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await api.post('/auth/forgot-password', { email });
      if (res.data.success) {
        setMessage(res.data.message);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send reset link');
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

          <h2 className="text-2xl font-bold text-gray-900 mb-2 mt-2">Forgot Password</h2>
          <p className="text-sm text-gray-500 mb-6">
            Enter your email address and we'll send you a link to reset your password.
          </p>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm font-medium border border-red-100">
              {error}
            </div>
          )}

          {message ? (
            <div>
              <div className="bg-green-50 text-green-700 p-4 rounded-lg text-center font-medium border border-green-100 mb-6">
                {message}
              </div>
              <div className="text-center">
                <Link to="/login" className="text-[#3525CD] hover:text-[#4F46E5] font-semibold">
                  Return to Login
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] transition-all"
                  placeholder="name@techzon.com"
                />
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-[#3525CD] text-white py-3 rounded-lg font-semibold shadow hover:bg-[#4F46E5] transition-all mt-2 disabled:opacity-70"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
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

export default ForgotPassword;
