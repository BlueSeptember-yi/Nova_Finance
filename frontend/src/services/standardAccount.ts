/**
 * 标准会计科目 API
 */
import api from './api';
import { ApiResponse } from '@/types';

export interface StandardAccount {
  seq_num: number;
  code: string;
  name: string;
  type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense' | 'Common';
  normal_balance: 'Debit' | 'Credit';
  category: string;
  category_detail: string;
  parent_code?: string;
  level: number;
}

export const standardAccountApi = {
  // 查询标准科目
  getList: async (params?: {
    type?: string;
    level?: number;
    parent_code?: string;
    search?: string;
  }): Promise<ApiResponse<StandardAccount[]>> => {
    return api.get('/standard-accounts', { params });
  },
};

