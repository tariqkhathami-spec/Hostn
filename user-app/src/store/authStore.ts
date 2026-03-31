import { create } from 'zustand';
import { secureStorage } from '../utils/storage';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (token: string, refreshToken: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<{ token: string | null }>;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (token: string, refreshToken: string, user: User) => {
    await secureStorage.setToken(token);
    await secureStorage.setRefreshToken(refreshToken);
    set({ user, token, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    await secureStorage.clearTokens();
    set({ user: null, token: null, isAuthenticated: false });
  },

  loadStoredAuth: async () => {
    try {
      const token = await secureStorage.getToken();
      if (token) {
        set({ token });
        return { token };
      }
      return { token: null };
    } catch {
      return { token: null };
    } finally {
      set({ isLoading: false });
    }
  },

  setUser: (user) => set({ user, isAuthenticated: true }),
  setToken: (token) => set({ token }),
  setLoading: (isLoading) => set({ isLoading }),
}));
