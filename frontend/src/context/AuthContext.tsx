'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '@/types';
import { authApi } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithOtp: (phone: string, otp: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
  toggleWishlist: (propertyId: string) => Promise<void>;
  upgradeToHost: () => Promise<void>;
}

export function getRoleRedirect(role?: string): string {
  switch (role) {
    case 'host': return '/host';
    case 'admin': return '/admin';
    default: return '/dashboard';
  }
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on mount, then validate session is still alive
  useEffect(() => {
    const storedUser = localStorage.getItem('hostn_user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        // Silently verify the HttpOnly cookie is still valid
        authApi.getMe()
          .then((res) => {
            const freshUser = res.data.user || res.data.data;
            if (freshUser) {
              saveAuth(freshUser);
            }
          })
          .catch(async () => {
            // Cookie expired or invalid — clear HttpOnly cookie + stale localStorage
            try { await authApi.logout(); } catch { /* ignore */ }
            localStorage.removeItem('hostn_user');
            setUser(null);
          })
          .finally(() => setIsLoading(false));
      } catch {
        localStorage.removeItem('hostn_user');
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const saveAuth = (user: User) => {
    // Only store user profile in localStorage (never the token)
    localStorage.setItem('hostn_user', JSON.stringify(user));
    setUser(user);
  };

  const login = async (email: string, password: string) => {
    // The server sets an HttpOnly cookie in the response — no token in JS
    const res = await authApi.login({ email, password });
    saveAuth(res.data.user);
  };

  const loginWithOtp = async (phone: string, otp: string) => {
    const res = await authApi.verifyOtp({ phone, otp });
    saveAuth(res.data.user);
  };

  const register = async (data: RegisterData) => {
    const res = await authApi.register(data);
    saveAuth(res.data.user);
  };

  const logout = useCallback(async () => {
    try {
      // Call server to clear HttpOnly cookie
      await authApi.logout();
    } catch {
      // Continue logout even if API call fails
    }
    localStorage.removeItem('hostn_user');
    setUser(null);
    // Redirect to homepage after logout
    window.location.href = '/';
  }, []);

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('hostn_user', JSON.stringify(updatedUser));
  };

  const toggleWishlist = async (propertyId: string) => {
    if (!user) return;
    const res = await authApi.toggleWishlist(propertyId);
    const updatedUser = { ...user, wishlist: res.data.wishlist };
    updateUser(updatedUser);
  };

  const upgradeToHost = async () => {
    const res = await authApi.upgradeToHost();
    saveAuth(res.data.user);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        loginWithOtp,
        register,
        logout,
        updateUser,
        toggleWishlist,
        upgradeToHost,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
