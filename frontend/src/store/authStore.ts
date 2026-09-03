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
  setAuth: (token: string, user: User, rememberMe?: boolean) => void;
  logout: () => void;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
}

import { connectSocket, disconnectSocket } from '../services/socket';

const getToken = () => sessionStorage.getItem('token') || localStorage.getItem('token');

export const useAuthStore = create<AuthState>((set) => ({
  token: getToken(),
  user: null,
  isAuthenticated: !!getToken(),
  isLoading: true, // starts loading while we fetch /api/auth/me
  setAuth: (token, user, rememberMe = false) => {
    if (rememberMe) {
      localStorage.setItem('token', token);
      sessionStorage.removeItem('token');
    } else {
      sessionStorage.setItem('token', token);
      localStorage.removeItem('token');
    }
    connectSocket(token);
    set({ token, user, isAuthenticated: true, isLoading: false });
  },
  logout: () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    disconnectSocket();
    set({ token: null, user: null, isAuthenticated: false, isLoading: false });
  },
  setUser: (user) => {
    const token = getToken();
    if (token) connectSocket(token);
    set({ user, isAuthenticated: true, isLoading: false });
  },
  setLoading: (isLoading) => set({ isLoading }),
}));
