import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Button, Space, Tag, Spin, Divider } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  AccountBookOutlined,
  FileTextOutlined,
  TeamOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  UserOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';

import { accountApi } from '@/services/account';
import { journalApi } from '@/services/journal';
import { supplierApi } from '@/services/supplier';
import { customerApi } from '@/services/customer';
import { orderApi } from '@/services/order';
import { companyApi } from '@/services/company';
import { formatDate, formatMoney, getUser, accountTypeMap, checkPermission } from '@/utils';
import type { Account, JournalEntry, Company } from '@/types';

interface DashboardStats {
  accounts: number;
  journals: number;
  suppliers: number;
  customers: number;
  purchaseOrders: number;
  salesOrders: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const user = getUser();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    accounts: 0,
    journals: 0,
    suppliers: 0,
    customers: 0,
    purchaseOrders: 0,
    salesOrders: 0,
  });
  const [company, setCompany] = useState<Company | null>(null);
  const [recentJournals, setRecentJournals] = useState<JournalEntry[]>([]);
  const [recentAccounts, setRecentAccounts] = useState<Account[]>([]);

  const loadData = async () => {
    // 超级管理员不应该访问 Dashboard，如果访问了则重定向
    if (user?.role === 'SuperAdmin') {
      return;
    }

    setLoading(true);
    try {
      // 根据权限并行加载数据
      const promises: Promise<any>[] = [];
      const promiseKeys: string[] = [];

      // 会计科目（需要 account:view 权限）
      if (user?.role && checkPermission(user.role, 'account:view')) {
        promises.push(accountApi.getList());
        promiseKeys.push('accounts');
      }

      // 会计分录（需要 journal:view 权限）
      if (user?.role && checkPermission(user.role, 'journal:view')) {
        promises.push(journalApi.getList(0, 5));
        promiseKeys.push('journals');
      }

      // 供应商（需要 supplier:view 权限）
      if (user?.role && checkPermission(user.role, 'supplier:view')) {
        promises.push(supplierApi.getList(0, 100));
        promiseKeys.push('suppliers');
      }

      // 客户（需要 customer:view 权限）
      if (user?.role && checkPermission(user.role, 'customer:view')) {
        promises.push(customerApi.getList(0, 100));
        promiseKeys.push('customers');
      }

      // 采购订单（需要 purchase:view 权限）
      if (user?.role && checkPermission(user.role, 'purchase:view')) {
        promises.push(orderApi.getPurchaseOrders(0, 100));
        promiseKeys.push('purchaseOrders');
      }

      // 销售订单（需要 sales:view 权限）
      if (user?.role && checkPermission(user.role, 'sales:view')) {
        promises.push(orderApi.getSalesOrders(0, 100));
        promiseKeys.push('salesOrders');
      }

      // 公司信息（需要 company:view 权限）
      if (user?.role && checkPermission(user.role, 'company:view')) {
        promises.push(companyApi.get());
        promiseKeys.push('company');
      }

      // 执行所有有权限的请求
      const results = await Promise.allSettled(promises);

      // 处理结果
      const newStats = { ...stats };
      let accountsData: Account[] = [];
      let journalsData: JournalEntry[] = [];
      let companyData: Company | null = null;

      results.forEach((result, index) => {
        const key = promiseKeys[index];
        if (result.status === 'fulfilled' && result.value?.success) {
          const data = result.value.data;
          if (key === 'accounts') {
            accountsData = data || [];
            newStats.accounts = accountsData.length;
          } else if (key === 'journals') {
            journalsData = data || [];
            newStats.journals = journalsData.length;
          } else if (key === 'suppliers') {
            newStats.suppliers = (data || []).length;
          } else if (key === 'customers') {
            newStats.customers = (data || []).length;
          } else if (key === 'purchaseOrders') {
            newStats.purchaseOrders = (data || []).length;
          } else if (key === 'salesOrders') {
            newStats.salesOrders = (data || []).length;
          } else if (key === 'company') {
            companyData = data;
          }
        }
      });

      setStats(newStats);
      setCompany(companyData);
      setRecentJournals(journalsData);
      setRecentAccounts(accountsData.slice(0, 8));
    } catch (error) {
      console.error('Load dashboard data error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only load data if user is not SuperAdmin
    if (user?.role !== 'SuperAdmin') {
      loadData();
    }
  }, [user?.role]);

  // 根据用户权限过滤快速操作
  const allQuickActions = [
    { icon: <FileTextOutlined />, text: '新建分录', path: '/journals/new', color: '#1890ff', permission: 'journal:create' },
    { icon: <TeamOutlined />, text: '新建供应商', path: '/suppliers/new', color: '#52c41a', permission: 'supplier:create' },
    { icon: <UserOutlined />, text: '新建客户', path: '/customers/new', color: '#722ed1', permission: 'customer:create' },
    { icon: <ShoppingCartOutlined />, text: '新建采购单', path: '/purchase/orders/new', color: '#fa8c16', permission: 'purchase:create' },
    { icon: <ShoppingOutlined />, text: '新建销售单', path: '/sales/orders/new', color: '#eb2f96', permission: 'sales:create' },
  ];

  const quickActions = allQuickActions.filter(action => {
    if (!user?.role) return false;
    return checkPermission(user.role, action.permission);
  });

  return (
    <Spin spinning={loading}>
      <div style={{ padding: '0 0 24px 0' }}>
        {/* 顶部欢迎区域 */}
        <Card 
          style={{ marginBottom: 24 }}
          styles={{ body: { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: 8 } }}
        >
          <Row justify="space-between" align="middle">
            <Col>
              <h1 style={{ color: '#fff', margin: 0, fontSize: 28 }}>
                欢迎回来，{user?.username || '用户'}！
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.85)', marginTop: 8, marginBottom: 0 }}>
                {company?.name || 'NovaFinance 财务系统'} | 今日是 {formatDate(new Date(), 'YYYY年MM月DD日 dddd')}
              </p>
            </Col>
            <Col>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={loadData}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff' }}
              >
                刷新数据
              </Button>
            </Col>
          </Row>
        </Card>

        {/* 统计卡片 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card hoverable onClick={() => navigate('/accounts')}>
              <Statistic
                title="会计科目"
                value={stats.accounts}
                prefix={<AccountBookOutlined style={{ color: '#1890ff' }} />}
                suffix="个"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card hoverable onClick={() => navigate('/journals')}>
              <Statistic
                title="会计分录"
                value={stats.journals}
                prefix={<FileTextOutlined style={{ color: '#52c41a' }} />}
                suffix="条"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card hoverable onClick={() => navigate('/suppliers')}>
              <Statistic
                title="供应商"
                value={stats.suppliers}
                prefix={<TeamOutlined style={{ color: '#722ed1' }} />}
                suffix="家"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card hoverable onClick={() => navigate('/customers')}>
              <Statistic
                title="客户"
                value={stats.customers}
                prefix={<UserOutlined style={{ color: '#13c2c2' }} />}
                suffix="家"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card hoverable onClick={() => navigate('/purchase/orders')}>
              <Statistic
                title="采购订单"
                value={stats.purchaseOrders}
                prefix={<ShoppingCartOutlined style={{ color: '#fa8c16' }} />}
                suffix="单"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card hoverable onClick={() => navigate('/sales/orders')}>
              <Statistic
                title="销售订单"
                value={stats.salesOrders}
                prefix={<ShoppingOutlined style={{ color: '#eb2f96' }} />}
                suffix="单"
              />
            </Card>
          </Col>
        </Row>

        {/* 快速操作 */}
        <Card title="快速操作" style={{ marginBottom: 24 }}>
          {quickActions.length > 0 ? (
            <Space wrap size="middle">
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  type="default"
                  icon={action.icon}
                  size="large"
                  onClick={() => navigate(action.path)}
                  style={{ borderColor: action.color, color: action.color }}
                >
                  {action.text}
                </Button>
              ))}
            </Space>
          ) : (
            <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>
              当前角色暂无可用操作
            </div>
          )}
        </Card>

        {/* 底部两列布局 */}
        <Row gutter={16}>
          <Col xs={24} lg={12}>
            <Card 
              title="最近会计分录" 
              extra={<Button type="link" onClick={() => navigate('/journals')}>查看全部</Button>}
            >
              {recentJournals.length > 0 ? (
                <div>
                  {recentJournals.map((item, index) => (
                    <div key={item.journal_id || index}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
                        <div>
                          <div style={{ marginBottom: 4 }}>
                            <Space>
                              <span>{item.description || '无摘要'}</span>
                              <Tag color="blue">{formatMoney(item.total_debit || 0)}</Tag>
                            </Space>
                          </div>
                          <div style={{ color: '#999', fontSize: 12 }}>{formatDate(item.date)}</div>
                        </div>
                      </div>
                      {index < recentJournals.length - 1 && <Divider style={{ margin: '8px 0' }} />}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>
                  暂无分录记录
                  {user?.role && checkPermission(user.role, 'journal:create') && (
                    <div style={{ marginTop: 16 }}>
                      <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/journals/new')}>
                        创建第一条分录
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card 
              title="核心会计科目" 
              extra={<Button type="link" onClick={() => navigate('/accounts')}>查看全部</Button>}
            >
              {recentAccounts.length > 0 ? (
                <div>
                  {recentAccounts.map((item, index) => (
                    <div key={item.account_id || index}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
                        <div>
                          <div style={{ marginBottom: 4 }}>
                            <Space>
                              <Tag>{item.code}</Tag>
                              <span>{item.name}</span>
                            </Space>
                          </div>
                          <div>
                            <Space>
                              <Tag color={
                                item.type === 'Asset' ? 'blue' :
                                item.type === 'Liability' ? 'red' :
                                item.type === 'Equity' ? 'purple' :
                                item.type === 'Revenue' ? 'green' : 'orange'
                              }>
                                {accountTypeMap[item.type] || item.type}
                              </Tag>
                              {item.is_core && <Tag color="gold">核心科目</Tag>}
                            </Space>
                          </div>
                        </div>
                      </div>
                      {index < recentAccounts.length - 1 && <Divider style={{ margin: '8px 0' }} />}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>
                  暂无科目数据
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </div>
    </Spin>
  );
};

export default Dashboard;
