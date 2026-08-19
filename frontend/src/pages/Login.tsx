import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';

import logo from '../assets/logo.jpeg';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleLogin = async (e?: React.FormEvent, presetEmail?: string, presetPassword?: string) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);

    const loginEmail = presetEmail || email;
    const loginPassword = presetPassword || password;

    try {
      const res = await api.post('/auth/login', { email: loginEmail, password: loginPassword });
      if (res.data.success) {
        setAuth(res.data.token, res.data.user);
        // Navigate based on role
        if (res.data.user.role === 'ADMIN') {
          navigate('/dashboard');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid login credentials');
    } finally {
      setLoading(false);
    }
  };

  const isTestMode = import.meta.env.MODE === 'development' || import.meta.env.VITE_APP_ENV !== 'production';

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left Side: Branding */}
      <div className="hidden lg:flex w-1/2 bg-[var(--color-primary)] text-white p-12 flex-col justify-center items-start">
        <div className="mb-12 bg-white p-4 rounded-xl shadow-lg w-48 h-auto flex items-center justify-center">
           <img src={logo} alt="Techzon Logo" className="w-full h-auto object-contain max-h-24" />
        </div>
        <h1 className="text-5xl font-bold mb-6">Techzon CRM Dashboard</h1>
        <h2 className="text-2xl font-light mb-8 text-orange-200">Internal CRM, Attendance & Performance Platform</h2>
        <p className="text-lg text-indigo-100 max-w-xl leading-relaxed">
          Manage student leads, CR relationships, follow-ups, WhatsApp groups, employee attendance and individual performance from one centralized platform.
        </p>
      </div>

      {/* Right Side: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 flex-col">
        {/* Mobile Logo */}
        <div className="lg:hidden mb-8 bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-center w-32 h-32">
           <img src={logo} alt="Techzon Logo" className="w-full h-full object-contain" />
        </div>

        <div className="w-full max-w-md">
          <div className="bg-white p-8 radius-card shadow-flat border border-[var(--color-border-subtle)]">
            <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">Welcome back</h2>
            <p className="text-[var(--color-text-muted)] mb-6">Sign in to your account</p>
            
            {error && (
              <div className="bg-red-50 text-[var(--color-error)] p-3 rounded mb-4 text-sm font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Email</label>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-[var(--color-border-subtle)] rounded p-2 focus:outline-none focus:border-[var(--color-primary)]"
                  placeholder="name@techzon.com"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Password</label>
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-[var(--color-border-subtle)] rounded p-2 focus:outline-none focus:border-[var(--color-primary)]"
                  placeholder="••••••••"
                />
              </div>
              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-[var(--color-primary)] text-white py-3 rounded font-semibold transition-colors hover:bg-indigo-700 disabled:bg-indigo-300"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          </div>

          {/* Test Mode Section */}
          {isTestMode && (
            <div className="mt-8 border-t border-[var(--color-border-subtle)] pt-6">
              <div className="flex items-center justify-center mb-4">
                <span className="bg-orange-100 text-[var(--color-accent)] px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase">
                  Test Mode
                </span>
              </div>
              <p className="text-xs text-center text-gray-500 mb-6 px-4">
                Demo accounts are enabled for development. Do not use these credentials in production.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 radius-card shadow-flat border border-indigo-100 text-center">
                  <p className="font-semibold text-sm mb-1">Admin Demo</p>
                  <p className="text-xs text-gray-500 mb-4">admin@techzon.com<br/>password123</p>
                  <button 
                    onClick={() => { setEmail('admin@techzon.com'); setPassword('password123'); handleLogin(undefined, 'admin@techzon.com', 'password123'); }}
                    disabled={loading}
                    className="w-full border border-[var(--color-primary)] text-[var(--color-primary)] text-sm py-2 rounded font-semibold hover:bg-indigo-50"
                  >
                    Login as Admin
                  </button>
                </div>
                
                <div className="bg-white p-4 radius-card shadow-flat border border-orange-100 text-center">
                  <p className="font-semibold text-sm mb-1">Employee Demo</p>
                  <p className="text-xs text-gray-500 mb-4">arun@techzon.com<br/>password123</p>
                  <button 
                    onClick={() => { setEmail('arun@techzon.com'); setPassword('password123'); handleLogin(undefined, 'arun@techzon.com', 'password123'); }}
                    disabled={loading}
                    className="w-full border border-[var(--color-accent)] text-[var(--color-accent)] text-sm py-2 rounded font-semibold hover:bg-orange-50"
                  >
                    Login as Employee
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
