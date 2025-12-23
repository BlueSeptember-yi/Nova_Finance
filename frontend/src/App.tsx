import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import 'dayjs/locale/zh-cn';

import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CompanyPage from './pages/Company';
import AccountList from './pages/Account/List';
import AccountForm from './pages/Account/Form';
import JournalList from './pages/Journal/List';
import JournalForm from './pages/Journal/Form';
import SupplierList from './pages/Supplier/List';
import SupplierForm from './pages/Supplier/Form';
import CustomerList from './pages/Customer/List';
import CustomerForm from './pages/Customer/Form';
import PurchaseList from './pages/Purchase/List';
import PurchaseForm from './pages/Purchase/Form';
import SalesList from './pages/Sales/List';
import SalesForm from './pages/Sales/Form';
import ProductList from './pages/Product/List';
import ProductForm from './pages/Product/Form';
import InventoryList from './pages/Inventory/List';
import InventoryTransaction from './pages/Inventory/Transaction';
import PaymentList from './pages/Payment/List';
import PaymentForm from './pages/Payment/Form';
import ReceiptList from './pages/Receipt/List';
import ReceiptForm from './pages/Receipt/Form';
import BankAccountList from './pages/Bank/AccountList';
import BankAccountForm from './pages/Bank/AccountForm';
import BankStatementList from './pages/Bank/StatementList';
import BankStatementForm from './pages/Bank/StatementForm';
import Reconciliation from './pages/Bank/Reconciliation';
import UserList from './pages/User/List';
import UserForm from './pages/User/Form';
import BalanceSheet from './pages/Reports/BalanceSheet';
import IncomeStatement from './pages/Reports/IncomeStatement';
import CashFlow from './pages/Reports/CashFlow';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import SuperAdminPage from './pages/SuperAdmin';

import { isAuthenticated, getUser } from './utils';
import ProtectedRoute from './components/ProtectedRoute';

// 路由守卫组件
const PrivateRoute = ({ children }: { children: React.ReactElement }) => {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
};

// 根路由重定向组件（根据用户角色跳转）
const RootRedirect = () => {
  const user = getUser();
  if (user?.role === 'SuperAdmin') {
    return <Navigate to="/super-admin" replace />;
  }
  return <Navigate to="/dashboard" replace />;
};

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <Routes>
          {/* 登录页 */}
          <Route path="/login" element={<Login />} />
          
          {/* 主应用 */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<RootRedirect />} />
            <Route 
              path="dashboard" 
              element={
                <ProtectedRoute roles={['Owner', 'Accountant', 'Sales', 'Purchaser']}>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route path="company" element={<CompanyPage />} />
            
            {/* 会计科目 */}
            <Route path="accounts" element={<ProtectedRoute permission="account:view"><AccountList /></ProtectedRoute>} />
            <Route path="accounts/new" element={<ProtectedRoute permission="account:create"><AccountForm /></ProtectedRoute>} />
            <Route path="accounts/:id/edit" element={<ProtectedRoute permission="account:update"><AccountForm /></ProtectedRoute>} />
            
            {/* 会计分录 */}
            <Route path="journals" element={<ProtectedRoute permission="journal:view"><JournalList /></ProtectedRoute>} />
            <Route path="journals/new" element={<ProtectedRoute permission="journal:create"><JournalForm /></ProtectedRoute>} />
            
            {/* 供应商 */}
            <Route path="suppliers" element={<ProtectedRoute permission="supplier:view"><SupplierList /></ProtectedRoute>} />
            <Route path="suppliers/new" element={<ProtectedRoute permission="supplier:create"><SupplierForm /></ProtectedRoute>} />
            <Route path="suppliers/:id/edit" element={<ProtectedRoute permission="supplier:update"><SupplierForm /></ProtectedRoute>} />
            
            {/* 客户 */}
            <Route path="customers" element={<ProtectedRoute permission="customer:view"><CustomerList /></ProtectedRoute>} />
            <Route path="customers/new" element={<ProtectedRoute permission="customer:create"><CustomerForm /></ProtectedRoute>} />
            <Route path="customers/:id/edit" element={<ProtectedRoute permission="customer:update"><CustomerForm /></ProtectedRoute>} />
            
            {/* 采购 */}
            <Route path="purchase/orders" element={<ProtectedRoute permission="purchase:view"><PurchaseList /></ProtectedRoute>} />
            <Route path="purchase/orders/new" element={<ProtectedRoute permission="purchase:create"><PurchaseForm /></ProtectedRoute>} />
            
            {/* 销售 */}
            <Route path="sales/orders" element={<ProtectedRoute permission="sales:view"><SalesList /></ProtectedRoute>} />
            <Route path="sales/orders/new" element={<ProtectedRoute permission="sales:create"><SalesForm /></ProtectedRoute>} />
            
            {/* 商品管理 */}
            <Route path="products" element={<ProductList />} />
            <Route path="products/new" element={<ProductForm />} />
            <Route path="products/:id/edit" element={<ProductForm />} />
            
            {/* 库存管理 */}
            <Route path="inventory" element={<InventoryList />} />
            <Route path="inventory/transactions" element={<InventoryTransaction />} />
            
            {/* 付款管理 */}
            <Route path="payments" element={<ProtectedRoute permission="payment:view"><PaymentList /></ProtectedRoute>} />
            <Route path="payments/new" element={<ProtectedRoute permission="payment:create"><PaymentForm /></ProtectedRoute>} />
            
            {/* 收款管理 */}
            <Route path="receipts" element={<ProtectedRoute permission="receipt:view"><ReceiptList /></ProtectedRoute>} />
            <Route path="receipts/new" element={<ProtectedRoute permission="receipt:create"><ReceiptForm /></ProtectedRoute>} />
            
            {/* 银行对账 */}
            <Route path="bank/accounts" element={<ProtectedRoute permission="bank:view"><BankAccountList /></ProtectedRoute>} />
            <Route path="bank/accounts/new" element={<ProtectedRoute permission="bank:create"><BankAccountForm /></ProtectedRoute>} />
            <Route path="bank/statements" element={<ProtectedRoute permission="bank:view"><BankStatementList /></ProtectedRoute>} />
            <Route path="bank/statements/new" element={<ProtectedRoute permission="bank:create"><BankStatementForm /></ProtectedRoute>} />
            <Route path="bank/reconciliation" element={<ProtectedRoute permission="reconciliation:view"><Reconciliation /></ProtectedRoute>} />
            
            {/* 用户管理 */}
            <Route path="users" element={<ProtectedRoute permission="user:view"><UserList /></ProtectedRoute>} />
            <Route path="users/new" element={<ProtectedRoute permission="user:create"><UserForm /></ProtectedRoute>} />
            <Route path="users/:id/edit" element={<ProtectedRoute permission="user:update"><UserForm /></ProtectedRoute>} />
            
            {/* 报表中心 */}
            <Route path="reports/balance-sheet" element={<ProtectedRoute permission="report:view"><BalanceSheet /></ProtectedRoute>} />
            <Route path="reports/income" element={<ProtectedRoute permission="report:view"><IncomeStatement /></ProtectedRoute>} />
            <Route path="reports/cash-flow" element={<ProtectedRoute permission="report:view"><CashFlow /></ProtectedRoute>} />
            
            {/* 用户相关 */}
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<Settings />} />
            
            {/* 企业管理 */}
            <Route path="company" element={<ProtectedRoute permission="company:view"><CompanyPage /></ProtectedRoute>} />
            
            {/* 超级管理员 */}
            <Route path="super-admin" element={<ProtectedRoute roles={['SuperAdmin']}><SuperAdminPage /></ProtectedRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
