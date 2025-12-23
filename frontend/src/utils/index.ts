/**
 * 工具函数
 */
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';

// 设置 dayjs 使用中文 locale
dayjs.locale('zh-cn');

/**
 * 格式化日期
 */
export const formatDate = (date: string | Date, format = 'YYYY-MM-DD'): string => {
  return dayjs(date).format(format);
};

/**
 * 格式化金额
 */
export const formatMoney = (amount: number | string): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

/**
 * 获取用户信息
 */
export const getUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

/**
 * 保存用户信息
 */
export const saveUser = (user: any) => {
  localStorage.setItem('user', JSON.stringify(user));
};

/**
 * 获取 Token
 */
export const getToken = (): string | null => {
  return localStorage.getItem('access_token');
};

/**
 * 保存 Token
 */
export const saveToken = (token: string) => {
  localStorage.setItem('access_token', token);
};

/**
 * 清除认证信息
 */
export const clearAuth = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
};

/**
 * 检查是否已登录
 */
export const isAuthenticated = (): boolean => {
  return !!getToken();
};

/**
 * 科目类型中文映射
 */
export const accountTypeMap: Record<string, string> = {
  Asset: '资产',
  Liability: '负债',
  Equity: '所有者权益',
  Revenue: '收入',
  Expense: '费用',
  Common: '共同',
};

/**
 * 用户角色中文映射
 */
export const userRoleMap: Record<string, string> = {
  Owner: '店主',
  Accountant: '会计',
  Sales: '销售员',
  Purchaser: '采购员',
  SuperAdmin: '超级管理员',
};

/**
 * 订单状态中文映射
 */
export const orderStatusMap: Record<string, string> = {
  Draft: '待过账',
  Posted: '已过账',
  Paid: '已支付',
  Collected: '已收款',
};

/**
 * 角色权限映射（与后端保持一致）
 */
const ROLE_PERMISSIONS: Record<string, string[]> = {
  SuperAdmin: [
    '*',  // 超级管理员拥有所有权限
    'super_admin:*',
    'company:*',
    'user:*',
  ],
  Owner: [
    'company:*',
    'user:*',
    'account:*',
    'journal:*',
    'supplier:*',
    'customer:*',
    'purchase:*',
    'sales:*',
    'payment:*',
    'receipt:*',
    'bank:*',
    'reconciliation:*',
    'report:*',
    'tax:*',
  ],
  Accountant: [
    'account:*',
    'journal:*',
    'purchase:post',
    'sales:post',
    'payment:*',
    'receipt:*',
    'bank:*',
    'reconciliation:*',
    'report:*',
    'tax:*',
  ],
  Purchaser: [
    'supplier:*',
    'purchase:create',
    'purchase:view',
  ],
  Sales: [
    'customer:*',
    'sales:create',
    'sales:view',
  ],
};

/**
 * 检查用户是否有指定权限
 * @param role 用户角色
 * @param permission 权限字符串，如 "journal:create"
 * @returns 是否有权限
 */
export const checkPermission = (role: string, permission: string): boolean => {
  const userPermissions = ROLE_PERMISSIONS[role] || [];
  
  // 超级管理员拥有所有权限
  if (userPermissions.includes('*')) {
    return true;
  }
  
  // 支持通配符权限，如 "purchase:*" 匹配 "purchase:create"
  for (const perm of userPermissions) {
    if (perm === permission) {
      return true;
    }
    // 如果权限是通配符（如 "purchase:*"），匹配所有以该前缀开头的权限
    if (perm.endsWith(':*')) {
      const prefix = perm.slice(0, -2); // 去掉 ":*"
      if (permission.startsWith(prefix + ':')) {
        return true;
      }
    }
  }
  
  return false;
};

