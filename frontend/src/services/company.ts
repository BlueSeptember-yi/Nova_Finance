/**
 * 企业管理 API
 */
import api from './api';
import { ApiResponse, Company } from '@/types';

export const companyApi = {
  // 创建企业
  create: async (data: {
    name: string;
    size?: 'Small' | 'Medium' | 'Large';
    registered_capital?: number;
  }): Promise<ApiResponse<any>> => {
    return api.post('/company', data);
  },

  // 获取企业信息
  get: async (): Promise<ApiResponse<Company>> => {
    return api.get('/company');
  },

  // 更新企业信息
  update: async (id: string, data: Partial<Company>): Promise<ApiResponse<Company>> => {
    return api.put(`/company/${id}`, data);
  },
};

