/**
 * 超级管理员 API
 */
import api from './api';
import { ApiResponse, Company, User } from '@/types';

export interface SuperAdminUser extends User {
  company_name?: string;
}

export interface SuperAdminCompany extends Company {
  user_count?: number;
}

export interface SystemStats {
  total_companies: number;
  total_users: number;
  users_by_role: Record<string, number>;
}

export interface ResetPasswordResponse {
  user_id: string;
  username: string;
  new_password: string;
}

export const superAdminApi = {
  // ==================== 公司管理 ====================
  
  // 获取所有公司
  getAllCompanies: async (skip: number = 0, limit: number = 100): Promise<ApiResponse<{
    items: SuperAdminCompany[];
    total: number;
    skip: number;
    limit: number;
  }>> => {
    return api.get(`/super-admin/companies?skip=${skip}&limit=${limit}`);
  },

  // 获取公司详情
  getCompany: async (companyId: string): Promise<ApiResponse<SuperAdminCompany>> => {
    return api.get(`/super-admin/companies/${companyId}`);
  },

  // 创建公司
  createCompany: async (data: {
    name: string;
    size?: 'Small' | 'Medium' | 'Large';
    registered_capital?: number;
  }): Promise<ApiResponse<SuperAdminCompany>> => {
    return api.post('/super-admin/companies', data);
  },

  // 更新公司
  updateCompany: async (companyId: string, data: Partial<SuperAdminCompany>): Promise<ApiResponse<SuperAdminCompany>> => {
    return api.put(`/super-admin/companies/${companyId}`, data);
  },

  // 删除公司
  deleteCompany: async (companyId: string): Promise<ApiResponse<void>> => {
    return api.delete(`/super-admin/companies/${companyId}`);
  },

  // ==================== 用户管理 ====================
  
  // 获取所有用户
  getAllUsers: async (params?: {
    skip?: number;
    limit?: number;
    company_id?: string;
    role?: string;
    username?: string;
  }): Promise<ApiResponse<{
    items: SuperAdminUser[];
    total: number;
    skip: number;
    limit: number;
  }>> => {
    const queryParams = new URLSearchParams();
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
    if (params?.company_id) queryParams.append('company_id', params.company_id);
    if (params?.role) queryParams.append('role', params.role);
    if (params?.username) queryParams.append('username', params.username);
    
    return api.get(`/super-admin/users?${queryParams.toString()}`);
  },

  // 获取用户详情
  getUser: async (userId: string): Promise<ApiResponse<SuperAdminUser>> => {
    return api.get(`/super-admin/users/${userId}`);
  },

  // 创建用户
  createUser: async (data: {
    username: string;
    password: string;
    role: 'Owner' | 'Accountant' | 'Sales' | 'Purchaser' | 'SuperAdmin';
    company_id?: string | null;
  }): Promise<ApiResponse<SuperAdminUser>> => {
    return api.post('/super-admin/users', data);
  },

  // 更新用户
  updateUser: async (userId: string, data: {
    role?: 'Owner' | 'Accountant' | 'Sales' | 'Purchaser' | 'SuperAdmin';
    password?: string;
  }): Promise<ApiResponse<SuperAdminUser>> => {
    return api.put(`/super-admin/users/${userId}`, data);
  },

  // 重置用户密码
  resetUserPassword: async (userId: string, newPassword?: string): Promise<ApiResponse<ResetPasswordResponse>> => {
    return api.post(`/super-admin/users/${userId}/reset-password`, { 
      new_password: newPassword || null 
    });
  },

  // 删除用户
  deleteUser: async (userId: string): Promise<ApiResponse<void>> => {
    return api.delete(`/super-admin/users/${userId}`);
  },

  // ==================== 统计信息 ====================
  
  // 获取系统统计
  getSystemStats: async (): Promise<ApiResponse<SystemStats>> => {
    return api.get('/super-admin/stats');
  },
};
