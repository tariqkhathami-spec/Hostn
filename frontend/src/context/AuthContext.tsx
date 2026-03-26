'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '@/types';
import { authApi } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
  toggleWishlist: (propertyId: string) => Promise<void>;
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
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on mount and sync cookie
  useEffect(() => {
    const storedToken = localStorage.getItem('hostn_token');
    const storedUser = localStorage.getItem('hostn_user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      // Ensure cookie stays in sync for server-side middleware
      setCookie('hostn_token', storedToken, 7);
    }
    setIsLoading(false);
  }, []);

  const setCookie = (name: string, value: string, days: number) => {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    const secure = window.location.protocol === 'https:' ? ';Secure' : '';
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};path=/;SameSite=Lax${secure}`;
  };

  const deleteCookie = (name: string) => {
    const secure = window.location.protocol === 'https:' ? ';Secure' : '';
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Lax${secure}`;
  };

  const saveAuth = (token: string, user: User) => {
    localStorage.setItem('hostn_token', token);
    localStorage.setItem('hostn_user', JSON.stringify(user));
    // Also set as cookie so Next.js middleware can read it for server-side route protection
    setCookie('hostn_token', token, 7);
    setToken(token);
    setUser(user);
  };

  const login = async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    saveAuth(res.data.token, res.data.user);
  };

  const register = async (data: RegisterData) => {
    const res = await authApi.register(data);
    saveAuth(res.data.token, res.data.user);
  };

  const logout = useCallback(() => {
    localStorage.removeItem('hostn_token');
    localStorage.removeItem('hostn_user');
    deleteCookie('hostn_token');
    setToken(null);
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

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateUser,
        toggleWishlist,
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
