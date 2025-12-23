/**
 * 供应商管理 API
 */
import api from './api';
import { ApiResponse, Supplier } from '@/types';

export const supplierApi = {
  // 创建供应商
  create: async (data: {
    name: string;
    contact?: string;
    phone: string;
    email?: string;
    address: string;
    tax_no?: string;
    bank_account?: string;
    remark?: string;
  }): Promise<ApiResponse<Supplier>> => {
    return api.post('/suppliers', data);
  },

  // 获取供应商列表
  getList: async (skip = 0, limit = 50): Promise<ApiResponse<Supplier[]>> => {
    return api.get('/suppliers', { params: { skip, limit } });
  },

  // 获取供应商详情
  get: async (id: string): Promise<ApiResponse<Supplier>> => {
    return api.get(`/suppliers/${id}`);
  },

  // 更新供应商
  update: async (id: string, data: Partial<Supplier>): Promise<ApiResponse<Supplier>> => {
    return api.put(`/suppliers/${id}`, data);
  },

  // 删除供应商
  delete: async (id: string): Promise<ApiResponse<void>> => {
    return api.delete(`/suppliers/${id}`);
  },
};

