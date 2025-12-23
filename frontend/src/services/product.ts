/**
 * 商品管理 API
 */
import api from './api';
import { ApiResponse, Product } from '@/types';

export const productApi = {
  // 创建商品
  create: async (data: {
    sku?: string;
    name: string;
    price?: number;
    cost?: number;
  }): Promise<ApiResponse<Product>> => {
    return api.post('/products', data);
  },

  // 获取商品列表
  getList: async (params?: {
    skip?: number;
    limit?: number;
  }): Promise<ApiResponse<Product[]>> => {
    return api.get('/products', { params });
  },

  // 获取商品详情
  get: async (id: string): Promise<ApiResponse<Product>> => {
    return api.get(`/products/${id}`);
  },

  // 更新商品
  update: async (id: string, data: {
    sku?: string;
    name?: string;
    price?: number;
    cost?: number;
  }): Promise<ApiResponse<Product>> => {
    return api.put(`/products/${id}`, data);
  },

  // 删除商品
  delete: async (id: string): Promise<ApiResponse<void>> => {
    return api.delete(`/products/${id}`);
  },
};

