import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // { _id, name, email, role, vendorProfile, wishlist... }
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('MERNEcommerceToken');
    if (!token) {
      setUser(null);
      setLoading(false);
      return null;
    }
    try {
      const { data } = await apiClient.get('auth/me');
      setUser(data);
      setLoading(false);
      return data;
    } catch (err) {
      // Token invalid/expired
      localStorage.removeItem('MERNEcommerceToken');
      setUser(null);
      setLoading(false);
      return null;
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const logout = useCallback(() => {
    localStorage.removeItem('MERNEcommerceToken');
    setUser(null);
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    role: user?.role || null,
    isAdmin: user?.role === 'admin',
    isVendor: user?.role === 'vendor',
    vendorApproved: !!user?.vendorProfile?.approved,
    refreshUser,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
