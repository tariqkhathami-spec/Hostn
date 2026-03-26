'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '@/types';
import { authApi } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
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

  // Load user from localStorage on mount (only user object, NOT the token)
  useEffect(() => {
    const storedUser = localStorage.getItem('hostn_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('hostn_user');
      }
    }
    setIsLoading(false);
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
