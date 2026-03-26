import { create } from 'zustand';
import { secureStorage, appStorage } from '../utils/storage';
import { hostService } from '../services/host.service';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasCompletedOnboarding: boolean;

  setUser: (user: User) => void;
  setToken: (token: string) => void;
  setAuth: (token: string, user: User, refreshToken?: string) => void;
  setTokens: (token: string, refreshToken: string) => void;
  logout: () => Promise<void>;
  setOnboardingComplete: () => void;
  initialize: () => Promise<void>;
  updateWishlist: (wishlist: string[]) => void;
  upgradeToHost: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
  hasCompletedOnboarding: false,

  setUser: (user) => {
    set({ user });
    appStorage.setUserJson(JSON.stringify(user));
  },

  setToken: (token) => {
    set({ token, isAuthenticated: true });
    secureStorage.setToken(token);
  },

  setAuth: (token, user, refreshToken?) => {
    set({ token, user, refreshToken: refreshToken || null, isAuthenticated: true, isLoading: false });
    secureStorage.setToken(token);
    if (refreshToken) secureStorage.setRefreshToken(refreshToken);
    appStorage.setUserJson(JSON.stringify(user));
  },

  setTokens: (token, refreshToken) => {
    set({ token, refreshToken });
    secureStorage.setToken(token);
    secureStorage.setRefreshToken(refreshToken);
  },

  logout: async () => {
    await secureStorage.removeToken();
    await secureStorage.removeRefreshToken();
    appStorage.removeUserJson();
    set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
  },

  setOnboardingComplete: () => {
    appStorage.setOnboardingComplete(true);
    set({ hasCompletedOnboarding: true });
  },

  initialize: async () => {
    try {
      const token = await secureStorage.getToken();
      const refreshToken = await secureStorage.getRefreshToken();
      const onboardingComplete = appStorage.getOnboardingComplete();
      const userJson = appStorage.getUserJson();

      let user: User | null = null;
      if (userJson) {
        try {
          user = JSON.parse(userJson);
        } catch {}
      }

      set({
        token,
        refreshToken,
        user,
        isAuthenticated: !!token,
        hasCompletedOnboarding: onboardingComplete,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  updateWishlist: (wishlist) => {
    const { user } = get();
    if (user) {
      const updatedUser = { ...user, wishlist };
      set({ user: updatedUser });
      appStorage.setUserJson(JSON.stringify(updatedUser));
    }
  },

  upgradeToHost: async () => {
    const result = await hostService.upgradeToHost();
    const { setAuth } = get();
    if (result.token && result.user) {
      setAuth(result.token, result.user, result.refreshToken);
    }
  },
}));
