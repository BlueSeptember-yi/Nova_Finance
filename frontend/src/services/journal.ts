/**
 * 会计分录 API
 */
import api from './api';
import { ApiResponse, JournalEntry } from '@/types';

export const journalApi = {
  // 创建分录
  create: async (data: JournalEntry): Promise<ApiResponse<JournalEntry>> => {
    return api.post('/journals', data);
  },

  // 获取分录列表
  getList: async (skip = 0, limit = 20): Promise<ApiResponse<JournalEntry[]>> => {
    return api.get('/journals', { params: { skip, limit } });
  },

  // 获取分录详情
  get: async (id: string): Promise<ApiResponse<JournalEntry>> => {
    return api.get(`/journals/${id}`);
  },

  // 分录过账
  post: async (journalId: string, postedBy: string): Promise<ApiResponse<JournalEntry>> => {
    return api.post(`/journals/${journalId}/post`, { posted_by: postedBy });
  },

  // 获取科目明细账
  getAccountLedger: async (accountId: string, skip = 0, limit = 50): Promise<ApiResponse<any>> => {
    return api.get(`/journals/account/${accountId}/ledger`, { params: { skip, limit } });
  },
};

