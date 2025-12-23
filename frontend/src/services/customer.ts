/**
 * 客户管理 API
 */
import api from './api';
import { ApiResponse, Customer } from '@/types';

export const customerApi = {
  // 创建客户
  create: async (data: {
    name: string;
    phone: string;
    email?: string;
    address: string;
    tax_no?: string;
    credit_limit?: number;
    remark?: string;
  }): Promise<ApiResponse<Customer>> => {
    return api.post('/customers', data);
  },

  // 获取客户列表
  getList: async (skip = 0, limit = 50): Promise<ApiResponse<Customer[]>> => {
    return api.get('/customers', { params: { skip, limit } });
  },

  // 获取客户详情
  get: async (id: string): Promise<ApiResponse<Customer>> => {
    return api.get(`/customers/${id}`);
  },

  // 更新客户
  update: async (id: string, data: Partial<Customer>): Promise<ApiResponse<Customer>> => {
    return api.put(`/customers/${id}`, data);
  },

  // 删除客户
  delete: async (id: string): Promise<ApiResponse<void>> => {
    return api.delete(`/customers/${id}`);
  },
};

