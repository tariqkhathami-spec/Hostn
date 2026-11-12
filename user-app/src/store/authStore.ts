import { create } from 'zustand';
import { secureStorage } from '../utils/storage';
import { notificationsService } from '../services/notifications.service';
import api from '../services/api';
import type { Href } from 'expo-router';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Where to send a guest once they have signed in (e.g. the checkout they were heading to). */
  returnTo: Href | null;

  login: (token: string, refreshToken: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<{ token: string | null }>;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  setLoading: (loading: boolean) => void;
  setReturnTo: (href: Href | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  returnTo: null,

  login: async (token: string, refreshToken: string, user: User) => {
    await secureStorage.setToken(token);
    await secureStorage.setRefreshToken(refreshToken);
    set({ user, token, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    // Remove this phone's push token from the account first: the request
    // needs the session that is about to be cleared.
    await notificationsService.unregisterPushToken();
    // End the session on the server too, so the refresh token kept on this
    // phone stops working the moment the user signs out.
    try {
      const refreshToken = await secureStorage.getRefreshToken();
      if (refreshToken) await api.post('/auth/logout', { refreshToken }, { timeout: 5000 });
    } catch {
      // Offline or already expired: signing out locally must still work.
    }
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
  setReturnTo: (returnTo) => set({ returnTo }),
}));
