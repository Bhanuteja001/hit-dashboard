import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async (force = false) => {
    const hasSession = sessionStorage.getItem('isLoggedInSession') === 'true';
    if (!hasSession && !force) {
      console.log('No active tab session flag found. Skipping auto-login.');
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching user data (cookie-based auth)...');
      const res = await api.get('/auth/me');
      console.log('User data received:', res.data);
      setUser(res.data);
      sessionStorage.setItem('userRole', res.data.role);
    } catch (err) {
      console.error('Error fetching user:', err.response?.data || err.message);
      setUser(null);
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('userRole');
      sessionStorage.removeItem('isLoggedInSession');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = async (userData) => {
    console.log('Login called with:', userData);
    sessionStorage.setItem('isLoggedInSession', 'true');
    // If server returned a token (development fallback), persist it so axios can send it in headers
    if (userData?.token) {
      sessionStorage.setItem('token', userData.token);
      console.log('Dev token saved to sessionStorage:', userData.token.substring(0, 20) + '...');
    }

    // Refresh user from server (will use cookie if present, or header if token saved)
    await fetchUser(true);
    if (userData?.role) sessionStorage.setItem('userRole', userData.role);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      sessionStorage.clear();
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
