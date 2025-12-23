/**
 * 付款和收款管理 API
 */
import api from './api';
import { ApiResponse, Payment, Receipt } from '@/types';

export const paymentApi = {
  // ===== 付款 =====
  // 创建付款记录
  create: async (data: {
    purchase_order_id?: string;
    date: string;
    amount: number;
    payment_method: 'Cash' | 'BankTransfer' | 'Credit';
    remark?: string;
  }): Promise<ApiResponse<Payment>> => {
    return api.post('/payments', data);
  },

  // 获取付款记录列表
  getList: async (params?: {
    purchase_order_id?: string;
    skip?: number;
    limit?: number;
  }): Promise<ApiResponse<Payment[]>> => {
    return api.get('/payments', { params });
  },

  // 获取付款记录详情
  get: async (id: string): Promise<ApiResponse<Payment>> => {
    return api.get(`/payments/${id}`);
  },

  // 获取可付款的采购单列表（已过账且未完全支付）
  getAvailableOrders: async (): Promise<ApiResponse<Array<{
    po_id: string;
    supplier_id: string;
    date: string;
    total_amount: number;
    paid_amount: number;
    unpaid_amount: number;
    status: string;
  }>>> => {
    return api.get('/payments/available-orders');
  },

  // ===== 收款 =====
  // 创建收款记录
  createReceipt: async (data: {
    sales_order_id?: string;
    date: string;
    amount: number;
    method: 'Cash' | 'BankTransfer' | 'Credit';
    remark?: string;
  }): Promise<ApiResponse<Receipt>> => {
    return api.post('/receipts', data);
  },

  // 获取收款记录列表
  getReceiptList: async (params?: {
    sales_order_id?: string;
    skip?: number;
    limit?: number;
  }): Promise<ApiResponse<Receipt[]>> => {
    return api.get('/receipts', { params });
  },

  // 获取收款记录详情
  getReceipt: async (id: string): Promise<ApiResponse<Receipt>> => {
    return api.get(`/receipts/${id}`);
  },

  // 获取可收款的销售单列表（已过账且未完全收款）
  getAvailableSalesOrders: async (): Promise<ApiResponse<Array<{
    so_id: string;
    customer_id: string;
    date: string;
    total_amount: number;
    received_amount: number;
    unreceived_amount: number;
    status: string;
    payment_method?: 'Cash' | 'BankTransfer' | 'Credit';
  }>>> => {
    return api.get('/receipts/available-orders');
  },
};

