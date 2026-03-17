import React, { createContext, useState, useContext, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');
      const savedUser = localStorage.getItem('user');
      
      if (token && savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          // Verify session exists and token is valid
          // This will trigger the API interceptor (refresh logic) if the access token is expired
          await api.get('accounts/profile/');
        } catch (e) {
          console.warn('Session invalid or expired');
          // If the interceptor didn't already redirect, clean up
          if (!localStorage.getItem('access_token')) {
            setUser(null);
          }
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (phone_number, password) => {
    const response = await api.post('accounts/login/', { phone_number, password });
    const { access, refresh, user: userData } = response.data;
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return response.data;
  };

  const signup = async (userData) => {
    const response = await api.post('accounts/signup/', userData);
    const { access, refresh, user: createdUser } = response.data;
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    localStorage.setItem('user', JSON.stringify(createdUser));
    setUser(createdUser);
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
