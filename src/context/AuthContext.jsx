import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('fetchUser - Token from localStorage:', token ? token.substring(0, 20) + '...' : 'none');

      if (!token) {
        console.log('No token found, skipping fetch');
        setUser(null);
        setLoading(false);
        return;
      }

      console.log('Fetching user data...');
      const res = await api.get('/auth/me');
      console.log('User data received:', res.data);
      setUser(res.data);
      localStorage.setItem('userRole', res.data.role);
    } catch (err) {
      console.error('Error fetching user:', err.response?.data || err.message);
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = (userData) => {
    console.log('Login called with:', userData);
    setUser(userData);

    if (userData.token) {
      localStorage.setItem('token', userData.token);
      console.log('Token saved to localStorage:', userData.token.substring(0, 20) + '...');
    } else {
      console.warn('No token in userData:', userData);
    }

    localStorage.setItem('userRole', userData.role);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
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
