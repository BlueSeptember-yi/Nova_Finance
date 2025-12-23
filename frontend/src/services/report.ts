/**
 * 报表管理 API
 */
import api from './api';
import axios from 'axios';
import { ApiResponse } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export interface IncomeStatement {
  start_date: string;
  end_date: string;
  revenue: number;  // 营业收入
  cost: number;     // 营业成本
  expenses: number; // 期间费用
  operating_profit: number; // 营业利润
  tax: number;     // 税金及附加
  net_profit: number; // 净利润
}

export interface BalanceSheet {
  as_of_date: string;
  assets: {
    current_assets: number;
    non_current_assets: number;
    total: number;
    details: Array<{
      code: string;
      name: string;
      balance: number;
    }>;
  };
  liabilities: {
    current_liabilities: number;
    non_current_liabilities: number;
    total: number;
    details: Array<{
      code: string;
      name: string;
      balance: number;
    }>;
  };
  equity: {
    total: number;
    current_year_profit: number;
    details: Array<{
      code: string;
      name: string;
      balance: number;
    }>;
  };
  total_liabilities_and_equity: number;
  balance_check: number;
  is_balanced: boolean;
}

export interface CashFlow {
  start_date: string;
  end_date: string;
  operating_activities: {
    cash_in: number;
    cash_out: number;
    net: number;
  };
  investing_activities: {
    cash_in: number;
    cash_out: number;
    net: number;
  };
  financing_activities: {
    cash_in: number;
    cash_out: number;
    net: number;
  };
  net_cash_flow: number;
  beginning_cash: number;
  ending_cash: number;
}

export const reportApi = {
  // 生成利润表
  getIncomeStatement: async (startDate: string, endDate: string): Promise<ApiResponse<IncomeStatement>> => {
    return api.get('/reports/income-statement', {
      params: {
        start_date: startDate,
        end_date: endDate,
      },
    });
  },

  // 生成资产负债表
  getBalanceSheet: async (asOfDate: string): Promise<ApiResponse<BalanceSheet>> => {
    return api.get('/reports/balance-sheet', {
      params: {
        as_of_date: asOfDate,
      },
    });
  },

  // 生成现金流量表
  getCashFlow: async (startDate: string, endDate: string): Promise<ApiResponse<CashFlow>> => {
    return api.get('/reports/cash-flow', {
      params: {
        start_date: startDate,
        end_date: endDate,
      },
    });
  },

  // 导出利润表
  exportIncomeStatement: async (startDate: string, endDate: string): Promise<void> => {
    const token = localStorage.getItem('access_token');
    const response = await axios.get(`${API_BASE_URL}/reports/export/income-statement`, {
      params: {
        start_date: startDate,
        end_date: endDate,
      },
      responseType: 'blob',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `利润表_${startDate}_${endDate}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  // 导出资产负债表
  exportBalanceSheet: async (asOfDate: string): Promise<void> => {
    const token = localStorage.getItem('access_token');
    const response = await axios.get(`${API_BASE_URL}/reports/export/balance-sheet`, {
      params: {
        as_of_date: asOfDate,
      },
      responseType: 'blob',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `资产负债表_${asOfDate}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  // 导出现金流量表
  exportCashFlow: async (startDate: string, endDate: string): Promise<void> => {
    const token = localStorage.getItem('access_token');
    const response = await axios.get(`${API_BASE_URL}/reports/export/cash-flow`, {
      params: {
        start_date: startDate,
        end_date: endDate,
      },
      responseType: 'blob',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `现金流量表_${startDate}_${endDate}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
