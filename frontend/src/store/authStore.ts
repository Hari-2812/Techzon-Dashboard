import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'RGS' | 'BDE';
  mustChangePassword?: boolean;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
}

import { connectSocket, disconnectSocket } from '../services/socket';

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('token'),
  user: null,
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: true, // starts loading while we fetch /api/auth/me
  setAuth: (token, user) => {
    localStorage.setItem('token', token);
    connectSocket(token);
    set({ token, user, isAuthenticated: true, isLoading: false });
  },
  logout: () => {
    localStorage.removeItem('token');
    disconnectSocket();
    set({ token: null, user: null, isAuthenticated: false, isLoading: false });
  },
  setUser: (user) => {
    const token = localStorage.getItem('token');
    if (token) connectSocket(token);
    set({ user, isAuthenticated: true, isLoading: false });
  },
  setLoading: (isLoading) => set({ isLoading }),
}));
