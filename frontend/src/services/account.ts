/**
 * 会计科目 API
 */
import api from './api';
import { ApiResponse, Account, AccountTreeNode } from '@/types';

export const accountApi = {
  // 创建科目
  create: async (data: {
    code: string;
    name: string;
    type: string;
    normal_balance: 'Debit' | 'Credit';
    parent_id?: string;
    is_core?: boolean;
    remark?: string;
  }): Promise<ApiResponse<Account>> => {
    return api.post('/accounts', data);
  },

  // 获取科目列表
  getList: async (parent_id?: string): Promise<ApiResponse<Account[]>> => {
    const params = parent_id ? { parent_id } : {};
    return api.get('/accounts', { params });
  },

  // 获取科目树
  getTree: async (): Promise<ApiResponse<AccountTreeNode[]>> => {
    return api.get('/accounts/tree');
  },

  // 获取科目详情
  get: async (id: string): Promise<ApiResponse<Account>> => {
    return api.get(`/accounts/${id}`);
  },

  // 更新科目
  update: async (id: string, data: { name?: string; remark?: string }): Promise<ApiResponse<Account>> => {
    return api.put(`/accounts/${id}`, data);
  },

  // 删除科目
  delete: async (id: string): Promise<ApiResponse<void>> => {
    return api.delete(`/accounts/${id}`);
  },

  // 获取科目明细账
  getLedger: async (id: string, skip = 0, limit = 50): Promise<ApiResponse<any>> => {
    return api.get(`/journals/account/${id}/ledger`, { params: { skip, limit } });
  },
};

