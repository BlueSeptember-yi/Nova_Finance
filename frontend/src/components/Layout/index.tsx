import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Layout as AntLayout,
  Menu,
  Dropdown,
  Avatar,
  theme,
} from 'antd';
import {
  DashboardOutlined,
  BankOutlined,
  AccountBookOutlined,
  FileTextOutlined,
  TeamOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  BarChartOutlined,
  LogoutOutlined,
  SettingOutlined,
  DatabaseOutlined,
  DollarOutlined,
  ShopOutlined,
  SafetyOutlined,
} from '@ant-design/icons';

import { authApi } from '@/services/auth';
import { getUser } from '@/utils';
import type { MenuProps } from 'antd';

const { Header, Content, Sider } = AntLayout;

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const user = getUser();
  const userRole = user?.role || '';

  // 根据角色过滤菜单项
  const getMenuItemsByRole = (role: string): MenuProps['items'] => {
    const allMenuItems: MenuProps['items'] = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '工作台',
    },
    {
      key: '/company',
      icon: <BankOutlined />,
      label: '企业信息',
    },
    {
      key: '/accounts',
      icon: <AccountBookOutlined />,
      label: '会计科目',
    },
    {
      key: '/journals',
      icon: <FileTextOutlined />,
      label: '会计分录',
    },
    {
      key: 'contacts',
      icon: <TeamOutlined />,
      label: '联系人管理',
      children: [
        {
          key: '/suppliers',
          label: '供应商',
        },
        {
          key: '/customers',
          label: '客户',
        },
      ],
    },
    {
      key: '/purchase/orders',
      icon: <ShoppingCartOutlined />,
      label: '采购管理',
    },
    {
      key: '/sales/orders',
      icon: <ShoppingOutlined />,
      label: '销售管理',
    },
    {
      key: 'products',
      icon: <ShopOutlined />,
      label: '商品管理',
      children: [
        {
          key: '/products',
          label: '商品列表',
        },
      ],
    },
    {
      key: 'inventory',
      icon: <DatabaseOutlined />,
      label: '库存管理',
      children: [
        {
          key: '/inventory',
          label: '库存列表',
        },
        {
          key: '/inventory/transactions',
          label: '库存流水',
        },
      ],
    },
    {
      key: 'finance',
      icon: <DollarOutlined />,
      label: '资金管理',
      children: [
        {
          key: '/payments',
          label: '付款管理',
        },
        {
          key: '/receipts',
          label: '收款管理',
        },
      ],
    },
    {
      key: 'bank',
      icon: <BankOutlined />,
      label: '银行对账',
      children: [
        {
          key: '/bank/accounts',
          label: '银行账户',
        },
        {
          key: '/bank/statements',
          label: '银行流水',
        },
        {
          key: '/bank/reconciliation',
          label: '对账记录',
        },
      ],
    },
    {
      key: 'reports',
      icon: <BarChartOutlined />,
      label: '报表中心',
      children: [
        {
          key: '/reports/balance-sheet',
          label: '资产负债表',
        },
        {
          key: '/reports/income',
          label: '利润表',
        },
        {
          key: '/reports/cash-flow',
          label: '现金流量表',
        },
      ],
    },
    ];

    // 根据角色过滤菜单
    if (role === 'SuperAdmin') {
      // 超级管理员：只显示超级管理员菜单
      return [
        {
          key: '/super-admin',
          icon: <SafetyOutlined />,
          label: '超级管理员',
        },
      ];
    } else if (role === 'Owner') {
      // 店主：所有权限
      return [
        ...allMenuItems,
        {
          key: '/users',
          icon: <UserOutlined />,
          label: '用户管理',
        },
      ];
    } else if (role === 'Accountant') {
      // 会计：会计科目、分录、付款、收款、银行对账、报表
      return allMenuItems.filter(item => {
        if (!item || typeof item === 'string') return false;
        const key = item.key as string;
        const allowedKeys = [
          '/dashboard',
          '/accounts',
          '/journals',
          'finance',
          'bank',
          'reports',
        ];
        return allowedKeys.some(allowed => key === allowed || key?.startsWith(allowed));
      });
    } else if (role === 'Purchaser') {
      // 采购员：供应商、采购管理
      return allMenuItems.map(item => {
        if (!item || typeof item === 'string') return item;
        const key = item.key as string;
        // 保留联系人菜单，但只显示供应商
        if (key === 'contacts' && 'children' in item) {
          return {
            ...item,
            children: item.children?.filter((child: any) => child.key === '/suppliers'),
          };
        }
        // 保留其他允许的菜单
        const allowedKeys = ['/dashboard', 'contacts', '/suppliers', '/purchase/orders'];
        if (allowedKeys.some(allowed => key === allowed || key?.startsWith(allowed))) {
          return item;
        }
        return null;
      }).filter(Boolean) as MenuProps['items'];
    } else if (role === 'Sales') {
      // 销售员：客户、销售管理
      return allMenuItems.map(item => {
        if (!item || typeof item === 'string') return item;
        const key = item.key as string;
        // 保留联系人菜单，但只显示客户
        if (key === 'contacts' && 'children' in item) {
          return {
            ...item,
            children: item.children?.filter((child: any) => child.key === '/customers'),
          };
        }
        // 保留其他允许的菜单
        const allowedKeys = ['/dashboard', 'contacts', '/customers', '/sales/orders'];
        if (allowedKeys.some(allowed => key === allowed || key?.startsWith(allowed))) {
          return item;
        }
        return null;
      }).filter(Boolean) as MenuProps['items'];
    }
    
    // 默认返回所有菜单（向后兼容）
    return allMenuItems;
  };

  const menuItems = getMenuItemsByRole(userRole);

  // 用户下拉菜单
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '设置',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  const handleUserMenuClick = ({ key }: { key: string }) => {
    if (key === 'logout') {
      authApi.logout();
    } else if (key === 'profile') {
      // TODO: 跳转到个人资料页面
      navigate('/profile');
    } else if (key === 'settings') {
      // TODO: 跳转到设置页面
      navigate('/settings');
    }
  };

  // 获取当前选中的菜单项
  const selectedKeys = [location.pathname];

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div style={{
          height: 32,
          margin: 16,
          color: '#fff',
          fontSize: 18,
          fontWeight: 'bold',
          textAlign: 'center',
        }}>
          {collapsed ? 'Nova' : 'NovaFinance'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={selectedKeys}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <AntLayout>
        <Header
          style={{
            padding: '0 24px',
            background: colorBgContainer,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 'bold' }}>
            财务管理系统
          </div>
          <Dropdown
            menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
            placement="bottomRight"
          >
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar icon={<UserOutlined />} />
              <span>{user?.username}</span>
            </div>
          </Dropdown>
        </Header>
        <Content style={{ margin: '24px 16px 0' }}>
          <div
            style={{
              padding: 24,
              minHeight: 360,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            <Outlet />
          </div>
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout;

