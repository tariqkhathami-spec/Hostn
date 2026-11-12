import { create } from 'zustand';
import { secureStorage } from '../utils/storage';
import { connectSocket, disconnectSocket } from '../services/socket';
import { unregisterPushToken } from '../services/push';
import api from '../services/api';

// The API returns the account with `_id`; the app compares `host.id`
// (e.g. the ownership check on the edit-property screen).
const withId = (host: Host): Host => ({
  ...host,
  id: String(host.id || (host as { _id?: unknown })._id || ''),
});

export interface Host {
  id: string;
  name: string;
  email: string;
  phone: string;
  nationalId?: string;
  avatar?: string;
  onboardingCompleted: boolean;
}

interface AuthState {
  host: Host | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (token: string, host: Host) => Promise<void>;
  logout: () => Promise<void>;
  setOnboardingCompleted: () => void;
  loadStoredAuth: () => Promise<{ token: string | null; host: Host | null }>;
  setHost: (host: Host) => void;
  setToken: (token: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  host: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (token: string, host: Host) => {
    await secureStorage.setToken(token);
    set({ host: withId(host), token, isAuthenticated: true, isLoading: false });
    // At app start there was no token yet, so the socket was not connected.
    connectSocket().catch(() => {});
  },

  logout: async () => {
    disconnectSocket();
    // Needs the auth token, so it runs before the stored session is cleared.
    await unregisterPushToken();
    // End the session on the server too, so the refresh token kept on this
    // phone stops working the moment the host signs out.
    try {
      const refreshToken = await secureStorage.getRefreshToken();
      if (refreshToken) await api.post('/auth/logout', { refreshToken }, { timeout: 5000 });
    } catch {
      // Offline or already expired: signing out locally must still work.
    }
    await secureStorage.clearAll();
    set({ host: null, token: null, isAuthenticated: false });
  },

  setOnboardingCompleted: () => {
    const { host } = get();
    if (host) {
      set({ host: { ...host, onboardingCompleted: true } });
    }
  },

  loadStoredAuth: async () => {
    try {
      const token = await secureStorage.getToken();
      if (token) {
        set({ token });
        return { token, host: null };
      }
      return { token: null, host: null };
    } catch {
      return { token: null, host: null };
    } finally {
      set({ isLoading: false });
    }
  },

  setHost: (host) => set({ host: withId(host) }),
  setToken: (token) => set({ token }),
  setLoading: (isLoading) => set({ isLoading }),
}));
