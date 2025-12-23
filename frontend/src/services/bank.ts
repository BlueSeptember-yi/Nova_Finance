/**
 * 银行和对账管理 API
 */
import api from './api';
import axios from 'axios';
import { ApiResponse, BankAccount, BankStatement, Reconciliation, JournalEntry } from '@/types';

export const bankApi = {
  // ===== 银行账户 =====
  // 创建银行账户
  createAccount: async (data: {
    account_number: string;
    bank_name: string;
    currency?: string;
    initial_balance?: number;
    remark?: string;
  }): Promise<ApiResponse<BankAccount>> => {
    return api.post('/bank/accounts', data);
  },

  // 获取银行账户列表
  getAccounts: async (): Promise<ApiResponse<BankAccount[]>> => {
    return api.get('/bank/accounts');
  },

  // 获取银行账户详情
  getAccount: async (id: string): Promise<ApiResponse<BankAccount>> => {
    return api.get(`/bank/accounts/${id}`);
  },

  // ===== 银行流水 =====
  // 创建银行流水
  createStatement: async (data: {
    bank_account_id: string;
    date: string;
    amount: number;
    type: 'Credit' | 'Debit';
    description: string;
    balance?: number;
    remark?: string;
  }): Promise<ApiResponse<BankStatement>> => {
    return api.post('/bank/statements', data);
  },

  // 获取银行流水列表
  getStatements: async (params?: {
    bank_account_id?: string;
    skip?: number;
    limit?: number;
  }): Promise<ApiResponse<BankStatement[]>> => {
    return api.get('/bank/statements', { params });
  },

  // 获取银行流水详情
  getStatement: async (id: string): Promise<ApiResponse<BankStatement>> => {
    return api.get(`/bank/statements/${id}`);
  },

  // 导入银行流水（Excel）
  importStatements: async (
    bank_account_id: string,
    file: File
  ): Promise<ApiResponse<{
    imported_count: number;
    error_count: number;
    errors: string[];
  }>> => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/bank/statements/import?bank_account_id=${bank_account_id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // 下载导入模板
  downloadTemplate: async (): Promise<void> => {
    const token = localStorage.getItem('access_token');
    const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';
    const response = await axios.get(`${baseURL}/bank/statements/template`, {
      responseType: 'blob',
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    });
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '银行流水导入模板.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  // ===== 对账 =====
  // 获取对账数据
  getReconciliationData: async (data: {
    bank_account_id: string;
    start_date: string;
    end_date: string;
  }): Promise<ApiResponse<{
    matched_pairs: Array<{
      statement: {
        statement_id: string;
        date: string;
        amount: number;
        type: string;
        description: string;
      };
      journal: {
        journal_id: string;
        date: string;
        description: string;
        amount: number;
      };
      reconciliation_id: string;
      match_date: string;
    }>;
    unmatched_statements: Array<{
      statement_id: string;
      date: string;
      amount: number;
      type: string;
      description: string;
    }>;
    unmatched_journals: Array<{
      journal_id: string;
      date: string;
      description: string;
      amount: number;
    }>;
  }>> => {
    return api.get('/bank/reconciliations/data', {
      params: {
        bank_account_id: data.bank_account_id,
        start_date: data.start_date,
        end_date: data.end_date,
      },
    });
  },

  // 自动匹配银行流水和系统记录
  autoMatch: async (data: {
    bank_account_id: string;
    start_date: string;
    end_date: string;
  }): Promise<ApiResponse<{ matched_count: number }>> => {
    return api.post('/bank/reconciliations/auto-match', null, {
      params: {
        bank_account_id: data.bank_account_id,
        start_date: data.start_date,
        end_date: data.end_date,
      },
    });
  },

  // 创建对账记录
  createReconciliation: async (data: {
    bank_statement_id: string;
    journal_id: string;
    matched_amount: number;
    match_date: string;
    remark?: string;
  }): Promise<ApiResponse<Reconciliation>> => {
    return api.post('/bank/reconciliations', data);
  },

  // 删除对账记录
  deleteReconciliation: async (reconciliation_id: string): Promise<ApiResponse<void>> => {
    return api.delete(`/bank/reconciliations/${reconciliation_id}`);
  },

  // 生成银行存款余额调节表
  getBalanceSheet: async (data: {
    bank_account_id: string;
    statement_date: string;
  }): Promise<ApiResponse<{
    bank_balance: number;
    system_balance: number;
    system_received_not_in_bank: number;
    system_paid_not_in_bank: number;
    bank_received_not_in_system: number;
    bank_paid_not_in_system: number;
    adjusted_bank_balance: number;
    adjusted_system_balance: number;
  }>> => {
    return api.get('/bank/reconciliations/balance-sheet', {
      params: {
        bank_account_id: data.bank_account_id,
        statement_date: data.statement_date,
      },
    });
  },
};
