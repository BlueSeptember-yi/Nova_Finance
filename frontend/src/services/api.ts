/**
 * API 服务基础配置
 */
import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import { message } from 'antd';
import type { ApiResponse } from '@/types';

// 创建 axios 实例
const axiosInstance: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 创建类型安全的 API 包装器
const api = {
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    return axiosInstance.get(url, config).then(res => res.data as ApiResponse<T>);
  },
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    return axiosInstance.post(url, data, config).then(res => res.data as ApiResponse<T>);
  },
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    return axiosInstance.put(url, data, config).then(res => res.data as ApiResponse<T>);
  },
  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    return axiosInstance.delete(url, config).then(res => res.data as ApiResponse<T>);
  },
  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    return axiosInstance.patch(url, data, config).then(res => res.data as ApiResponse<T>);
  },
};

// 请求拦截器
axiosInstance.interceptors.request.use(
  (config) => {
    // 从 localStorage 获取 token
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError<any>) => {
    // 处理错误响应
    if (error.response) {
      const { status, data } = error.response;
      const url = error.config?.url || '';
      
      switch (status) {
        case 401:
          // 登录接口的 401 错误不自动跳转，由登录页面自己处理
          if (url.includes('/auth/login')) {
            // 登录失败，不显示全局错误消息，由登录页面处理
            return Promise.reject(error);
          }
          // 其他接口的 401 错误，需要重新登录
          message.error('未授权，请重新登录');
          localStorage.removeItem('access_token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          break;
        case 403:
          message.error('权限不足');
          break;
        case 404:
          message.error('请求的资源不存在');
          break;
        case 500:
          message.error('服务器错误');
          break;
        case 400:
          // 400 错误由调用方处理，不显示默认消息
          break;
        default:
          message.error(data?.detail || data?.message || '请求失败');
      }
    } else if (error.request) {
      message.error('网络错误，请检查网络连接');
    } else {
      message.error('请求配置错误');
    }
    
    return Promise.reject(error);
  }
);

export default api;

