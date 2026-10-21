import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('laksh_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('laksh_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyUser = async () => {
      const storedToken = localStorage.getItem('laksh_token');
      if (storedToken) {
        try {
          const res = await authAPI.getProfile();
          setUser(res.data);
          localStorage.setItem('laksh_user', JSON.stringify(res.data));
        } catch (err) {
          console.warn('Session expired or invalid token:', err);
          logout();
        }
      }
      setLoading(false);
    };
    verifyUser();
  }, []);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { access_token, user: loggedUser } = res.data;
    localStorage.setItem('laksh_token', access_token);
    localStorage.setItem('laksh_user', JSON.stringify(loggedUser));
    setToken(access_token);
    setUser(loggedUser);
    return loggedUser;
  };

  const register = async (name, email, password) => {
    const res = await authAPI.register({ name, email, password });
    const { access_token, user: registeredUser } = res.data;
    localStorage.setItem('laksh_token', access_token);
    localStorage.setItem('laksh_user', JSON.stringify(registeredUser));
    setToken(access_token);
    setUser(registeredUser);
    return registeredUser;
  };

  const logout = () => {
    localStorage.removeItem('laksh_token');
    localStorage.removeItem('laksh_user');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedData) => {
    setUser((prev) => {
      const merged = { ...prev, ...updatedData };
      localStorage.setItem('laksh_user', JSON.stringify(merged));
      return merged;
    });
  };

  const value = {
    user,
    token,
    isAuthenticated: !!token,
    loading,
    login,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
