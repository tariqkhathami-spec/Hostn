import { create } from 'zustand';
import { secureStorage, appStorage } from '../utils/storage';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasCompletedOnboarding: boolean;

  setUser: (user: User) => void;
  setToken: (token: string) => void;
  setAuth: (token: string, user: User) => void;
  logout: () => Promise<void>;
  setOnboardingComplete: () => void;
  initialize: () => Promise<void>;
  updateWishlist: (wishlist: string[]) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
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

  setAuth: (token, user) => {
    set({ token, user, isAuthenticated: true, isLoading: false });
    secureStorage.setToken(token);
    appStorage.setUserJson(JSON.stringify(user));
  },

  logout: async () => {
    await secureStorage.removeToken();
    appStorage.removeUserJson();
    set({ user: null, token: null, isAuthenticated: false });
  },

  setOnboardingComplete: () => {
    appStorage.setOnboardingComplete(true);
    set({ hasCompletedOnboarding: true });
  },

  initialize: async () => {
    try {
      const token = await secureStorage.getToken();
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
}));
