import api from './api';
import type { ApiResponse } from '@/types';

export interface User {
  user_id: string;
  username: string;
  role: 'Owner' | 'Accountant' | 'Sales' | 'Purchaser';
  company_id: string;
  created_at: string;
}

export interface UserCreate {
  username: string;
  password: string;
  role: 'Owner' | 'Accountant' | 'Sales' | 'Purchaser';
  company_id: string;
}

export interface UserUpdate {
  role?: 'Owner' | 'Accountant' | 'Sales' | 'Purchaser';
  password?: string;
}

export const userApi = {
  getList: async (skip: number = 0, limit: number = 50): Promise<ApiResponse<User[]>> => {
    return api.get(`/users?skip=${skip}&limit=${limit}`);
  },

  getById: async (userId: string): Promise<ApiResponse<User>> => {
    return api.get(`/users/${userId}`);
  },

  create: async (data: UserCreate): Promise<ApiResponse<User>> => {
    return api.post('/users', data);
  },

  update: async (userId: string, data: UserUpdate): Promise<ApiResponse<User>> => {
    return api.put(`/users/${userId}`, data);
  },

  delete: async (userId: string): Promise<ApiResponse<void>> => {
    return api.delete(`/users/${userId}`);
  },
};

