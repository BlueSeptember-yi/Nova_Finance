/**
 * 通用类型定义
 */

// API 响应格式
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
  code: number;
}

// 企业信息
export interface Company {
  company_id: string;
  name: string;
  size?: 'Small' | 'Medium' | 'Large';
  registered_capital?: number;
  created_at: string;
}

// 用户信息
export interface User {
  user_id: string;
  username: string;
  role: 'Owner' | 'Accountant' | 'Sales' | 'Purchaser' | 'SuperAdmin';
  company_id: string | null;
  created_at: string;
  company_name?: string;
}

// 登录响应
export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// 会计科目
export interface Account {
  account_id: string;
  company_id: string;
  parent_id?: string;
  code: string;
  name: string;
  type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense' | 'Common';
  normal_balance: 'Debit' | 'Credit';
  balance_debit?: number;
  balance_credit?: number;
  is_core: boolean;
  path?: string;
  remark?: string;
  created_at: string;
}

// 科目树节点
export interface AccountTreeNode {
  account_id: string;
  code: string;
  name: string;
  type: string;
  is_core: boolean;
  children: AccountTreeNode[];
}

// 分录明细
export interface LedgerLine {
  line_id?: string;
  account_id: string;
  debit: number;
  credit: number;
  memo?: string;
}

// 会计分录
export interface JournalEntry {
  journal_id?: string;
  company_id?: string;
  date: string;
  description?: string;
  source_type?: 'PO' | 'SO' | 'PAYMENT' | 'RECEIPT' | 'MANUAL';
  source_id?: string;
  total_debit?: number;
  total_credit?: number;
  posted: boolean;
  posted_by?: string;
  created_at?: string;
  lines: LedgerLine[];
}

// 供应商
export interface Supplier {
  supplier_id: string;
  company_id: string;
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
  address?: string;
  tax_no?: string;
  bank_account?: string;
  remark?: string;
  created_at: string;
}

// 客户订单统计
export interface CustomerOrderStats {
  total_orders: number;
  draft_count: number;
  posted_count: number;
  collected_count: number;
  current_debt: number;
  total_sales: number;
  total_received: number;
  available_credit: number;
}

// 客户
export interface Customer {
  customer_id: string;
  company_id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  tax_no?: string;
  credit_limit: number;
  remark?: string;
  created_at: string;
  order_stats?: CustomerOrderStats;
}

// 采购订单明细
export interface PurchaseOrderItem {
  item_id?: string;
  purchase_order_id?: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount_rate: number;
  subtotal?: number;
  created_at?: string;
}

// 销售订单明细
export interface SalesOrderItem {
  item_id?: string;
  sales_order_id?: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount_rate: number;
  subtotal?: number;
  created_at?: string;
}

// 订单明细（兼容旧代码）
export interface OrderItem {
  item_id?: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount_rate: number;
  subtotal?: number;
}

// 采购订单
export interface PurchaseOrder {
  po_id?: string;
  supplier_id: string;
  company_id?: string;
  date: string;
  expected_delivery_date?: string;
  total_amount?: number;
  status?: 'Draft' | 'Posted' | 'Paid' | 'Completed' | 'Cancelled';
  remark?: string;
  created_at?: string;
  items: PurchaseOrderItem[];
}

// 销售订单
export interface SalesOrder {
  so_id?: string;
  customer_id: string;
  company_id?: string;
  date: string;
  expected_delivery_date?: string;
  total_amount?: number;
  payment_method?: 'Cash' | 'BankTransfer' | 'Credit';
  status?: 'Draft' | 'Posted' | 'Collected' | 'Completed' | 'Cancelled';
  remark?: string;
  created_at?: string;
  items: SalesOrderItem[];
}

// 分页参数
export interface PaginationParams {
  skip?: number;
  limit?: number;
}

// 付款记录
export interface Payment {
  payment_id: string;
  company_id: string;
  purchase_order_id?: string;
  date: string;
  amount: number;
  payment_method: 'Cash' | 'BankTransfer' | 'Credit';
  remark?: string;
  created_at: string;
}

// 收款记录
export interface Receipt {
  receipt_id: string;
  company_id: string;
  sales_order_id?: string;
  date: string;
  amount: number;
  method: 'Cash' | 'BankTransfer' | 'Credit';
  remark?: string;
  created_at: string;
}

// 商品
export interface Product {
  product_id: string;
  company_id: string;
  sku: string;
  name: string;
  price?: number;
  cost?: number;  // 预估成本
  average_cost?: number;  // 加权平均成本（从库存获取）
  created_at?: string;
}

// 库存记录
export interface InventoryItem {
  inventory_id: string;
  product_id: string;
  company_id: string;
  quantity: number;
  average_cost?: number;  // 加权平均成本
  warehouse_locations?: string[];  // 所有不同的仓库位置列表（从流水记录汇总）
  warehouse_location?: string;  // 兼容字段，显示所有位置的汇总字符串
  updated_at: string;
  product_name?: string;
  product_sku?: string;
}

// 库存流水
export interface InventoryTransaction {
  transaction_id: string;
  company_id: string;
  product_id: string;
  inventory_id?: string;
  type: 'IN' | 'OUT';
  quantity: number;
  unit_cost?: number;  // 单位成本（入库时记录采购成本，出库时记录加权平均成本）
  source_type: 'PO' | 'SO' | 'Manual' | 'Adjustment';
  source_id?: string;
  warehouse_location?: string;
  remark?: string;
  created_at: string;
  product_name?: string;
  product_sku?: string;
}

// 银行账户
export interface BankAccount {
  bank_account_id: string;
  company_id: string;
  account_number: string;
  bank_name: string;
  currency: string;
  initial_balance?: number;
  remark?: string;
  created_at: string;
}

// 银行流水
export interface BankStatement {
  statement_id: string;
  company_id: string;
  bank_account_id: string;
  date: string;
  amount: number;
  type: 'Credit' | 'Debit';
  balance?: number;
  description?: string;
  is_reconciled?: boolean; // 对账状态（是否已对账）
  created_at: string;
}

// 对账记录
export interface Reconciliation {
  recon_id: string;
  company_id: string;
  bank_statement_id: string;
  journal_id: string;
  matched_amount: number;
  match_date: string;
  remark?: string;
  created_at: string;
}

