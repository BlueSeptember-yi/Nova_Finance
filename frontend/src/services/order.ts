/**
 * 订单管理 API
 */
import api from './api';
import { ApiResponse, PurchaseOrder, SalesOrder } from '@/types';

export const orderApi = {
  // ===== 采购订单 =====
  // 创建采购订单
  createPurchase: async (data: PurchaseOrder): Promise<ApiResponse<PurchaseOrder>> => {
    return api.post('/purchase/orders', data);
  },

  // 获取采购订单列表
  getPurchaseList: async (status?: string, skip = 0, limit = 20): Promise<ApiResponse<PurchaseOrder[]>> => {
    const params: any = { skip, limit };
    if (status) params.status = status;
    return api.get('/purchase/orders', { params });
  },

  // 获取所有采购订单（别名）
  getPurchaseOrders: async (skip = 0, limit = 100): Promise<ApiResponse<PurchaseOrder[]>> => {
    return api.get('/purchase/orders', { params: { skip, limit } });
  },

  // 获取采购订单详情
  getPurchase: async (id: string): Promise<ApiResponse<PurchaseOrder>> => {
    return api.get(`/purchase/orders/${id}`);
  },

  // ===== 销售订单 =====
  // 创建销售订单
  createSales: async (data: SalesOrder): Promise<ApiResponse<SalesOrder>> => {
    return api.post('/sales/orders', data);
  },

  // 获取销售订单列表
  getSalesList: async (status?: string, skip = 0, limit = 20): Promise<ApiResponse<SalesOrder[]>> => {
    const params: any = { skip, limit };
    if (status) params.status = status;
    return api.get('/sales/orders', { params });
  },

  // 获取所有销售订单（别名）
  getSalesOrders: async (skip = 0, limit = 100): Promise<ApiResponse<SalesOrder[]>> => {
    return api.get('/sales/orders', { params: { skip, limit } });
  },

  // 获取销售订单详情
  getSales: async (id: string): Promise<ApiResponse<SalesOrder>> => {
    return api.get(`/sales/orders/${id}`);
  },

  // ===== 订单过账 =====
  // 采购订单过账
  postPurchase: async (id: string, data?: { warehouse_locations?: Record<string, string> }): Promise<ApiResponse<PurchaseOrder>> => {
    return api.post(`/purchase/orders/${id}/post`, data || {});
  },

  // 销售订单过账
  postSales: async (id: string, data?: { outbound_items?: Record<string, Array<{ location: string | null; quantity: number }>> }): Promise<ApiResponse<SalesOrder>> => {
    return api.post(`/sales/orders/${id}/post`, data || {});
  },
};

