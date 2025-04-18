// @ts-nocheck
import { create } from 'zustand';
import { User, UserRole } from '../types';
import { AuthUser } from '../services/auth';

// مخزن حالة المصادقة
interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  session: any | null;
  setUser: (user: AuthUser | null) => void;
  setToken: (token: string | null) => void;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  logout: () => void;
  setSession: (session: any | null) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  session: null,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setToken: (token) => set({ token }),
  setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  logout: () => set({ user: null, token: null, isAuthenticated: false, session: null }),
  setSession: (session) => set({ session }),
  reset: () => set({ user: null, token: null, isAuthenticated: false, session: null })
}));

// تصدير افتراضي لدعم NOBRIDGE
export default { useAuthStore }; 