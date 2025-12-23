/**
 * 认证相关 API
 */
import api from './api';
import { ApiResponse, LoginResponse, User } from '@/types';

export const authApi = {
  // 登录
  login: async (username: string, password: string): Promise<ApiResponse<LoginResponse>> => {
    // 使用 application/x-www-form-urlencoded 格式
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    
    return api.post('/auth/login', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  },

  // 用户注册
  register: async (data: {
    username: string;
    password: string;
    role: 'Owner' | 'Accountant' | 'Sales' | 'Purchaser';
    company_id: string;
  }): Promise<ApiResponse<User>> => {
    return api.post('/auth/register', data);
  },

  // 获取当前用户信息
  getCurrentUser: async (): Promise<ApiResponse<User>> => {
    return api.get('/auth/current');
  },

  // 更新个人资料
  updateProfile: async (data: { username: string }): Promise<ApiResponse<User>> => {
    return api.put('/auth/profile', data);
  },

  // 登出
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },
};

/**
 * 获取当前用户信息的 Hook
 */
import { useState, useEffect } from 'react';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) {
        setUser(null);
      }
    }
  }, []);
  
  return {
    user,
  };
};

