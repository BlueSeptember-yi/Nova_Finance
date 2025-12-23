/**
 * 库存管理 API
 */
import api from './api';
import { ApiResponse, InventoryItem, InventoryTransaction } from '@/types';

export const inventoryApi = {
  // 获取库存列表
  getItems: async (params?: {
    product_id?: string;
    skip?: number;
    limit?: number;
  }): Promise<ApiResponse<InventoryItem[]>> => {
    return api.get('/inventory/items', { params });
  },

  // 获取库存详情
  getItem: async (id: string): Promise<ApiResponse<InventoryItem>> => {
    return api.get(`/inventory/items/${id}`);
  },

  // 获取库存流水列表
  getTransactions: async (params?: {
    product_id?: string;
    source_type?: string;
    skip?: number;
    limit?: number;
  }): Promise<ApiResponse<InventoryTransaction[]>> => {
    return api.get('/inventory/transactions', { params });
  },

  // 创建库存流水
  createTransaction: async (data: {
    product_id: string;
    type: 'IN' | 'OUT';
    quantity: number;
    source_type: 'PO' | 'SO' | 'Manual' | 'Adjustment';
    source_id?: string;
    warehouse_location?: string;
    remark?: string;
  }): Promise<ApiResponse<InventoryTransaction>> => {
    return api.post('/inventory/transactions', data);
  },

};

