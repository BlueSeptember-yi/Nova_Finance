import { useState, useEffect } from 'react';
import { Tabs, Card, Statistic, Row, Col, Table, Button, Space, Modal, Form, Input, Select, message, Popconfirm, Tag, Tooltip } from 'antd';
import { 
  UserOutlined, 
  ShopOutlined, 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  ReloadOutlined,
  KeyOutlined,
  SearchOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { superAdminApi, SuperAdminUser, SuperAdminCompany, SystemStats } from '@/services/superAdmin';
import { formatDate } from '@/utils';
import type { ColumnsType } from 'antd/es/table';

const { Option } = Select;

const roleColors: Record<string, string> = {
  Owner: 'red',
  Accountant: 'blue',
  Sales: 'green',
  Purchaser: 'orange',
  SuperAdmin: 'purple',
};

const roleNames: Record<string, string> = {
  Owner: '店主',
  Accountant: '会计',
  Sales: '销售员',
  Purchaser: '采购员',
  SuperAdmin: '超级管理员',
};

const SuperAdminPage = () => {
  const [activeTab, setActiveTab] = useState('users'); // Default to users tab (most used)
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [companies, setCompanies] = useState<SuperAdminCompany[]>([]);
  const [users, setUsers] = useState<SuperAdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 公司相关状态
  const [companyModalVisible, setCompanyModalVisible] = useState(false);
  const [companyForm] = Form.useForm();
  const [editingCompany, setEditingCompany] = useState<SuperAdminCompany | null>(null);
  
  // 用户相关状态
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [userForm] = Form.useForm();
  const [editingUser, setEditingUser] = useState<SuperAdminUser | null>(null);
  const [resetPasswordModalVisible, setResetPasswordModalVisible] = useState(false);
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState<string>('');
  
  // 搜索和过滤
  const [userSearchText, setUserSearchText] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('');
  const [userCompanyFilter, setUserCompanyFilter] = useState<string>('');

  // 加载统计数据
  const loadStats = async () => {
    try {
      const response = await superAdminApi.getSystemStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error: any) {
      message.error(error.response?.data?.detail || '获取统计数据失败');
    }
  };

  // 加载公司列表
  const loadCompanies = async () => {
    setLoading(true);
    try {
      const response = await superAdminApi.getAllCompanies(0, 1000);
      if (response.success && response.data?.items) {
        setCompanies(response.data.items);
      }
    } catch (error: any) {
      message.error(error.response?.data?.detail || '获取公司列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载用户列表
  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await superAdminApi.getAllUsers({
        skip: 0,
        limit: 1000,
        role: userRoleFilter || undefined,
        username: userSearchText || undefined,
        company_id: userCompanyFilter || undefined,
      });
      if (response.success) {
        if (response.data?.items) {
          setUsers(response.data.items);
        }
      }
    } catch (error: any) {
      message.error(error.response?.data?.detail || '获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  // Load data when tab changes
  useEffect(() => {
    if (activeTab === 'stats') {
      loadStats();
    } else if (activeTab === 'companies') {
      loadCompanies();
    } else if (activeTab === 'users') {
      loadUsers();
    }
  }, [activeTab]);

  // Reload users when filters change (only if users tab is active)
  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    }
  }, [userRoleFilter, userCompanyFilter, userSearchText, activeTab]);

  // 公司管理
  const handleCreateCompany = () => {
    setEditingCompany(null);
    companyForm.resetFields();
    setCompanyModalVisible(true);
  };

  const handleEditCompany = (company: SuperAdminCompany) => {
    setEditingCompany(company);
    companyForm.setFieldsValue({
      name: company.name,
      size: company.size,
      registered_capital: company.registered_capital,
    });
    setCompanyModalVisible(true);
  };

  const handleCompanySubmit = async (values: any) => {
    try {
      if (editingCompany) {
        await superAdminApi.updateCompany(editingCompany.company_id, values);
        message.success('公司更新成功');
      } else {
        await superAdminApi.createCompany(values);
        message.success('公司创建成功');
      }
      setCompanyModalVisible(false);
      loadCompanies();
    } catch (error: any) {
      message.error(error.response?.data?.detail || (editingCompany ? '更新失败' : '创建失败'));
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    try {
      await superAdminApi.deleteCompany(companyId);
      message.success('公司删除成功');
      loadCompanies();
    } catch (error: any) {
      message.error(error.response?.data?.detail || '删除失败');
    }
  };

  // 用户管理
  const handleCreateUser = () => {
    setEditingUser(null);
    userForm.resetFields();
    setUserModalVisible(true);
  };

  const handleEditUser = (user: SuperAdminUser) => {
    setEditingUser(user);
    userForm.setFieldsValue({
      username: user.username,
      role: user.role,
      company_id: user.company_id,
    });
    setUserModalVisible(true);
  };

  const handleUserSubmit = async (values: any) => {
    try {
      if (editingUser) {
        const updateData: any = {};
        if (values.role) updateData.role = values.role;
        if (values.password) updateData.password = values.password;
        await superAdminApi.updateUser(editingUser.user_id, updateData);
        message.success('用户更新成功');
      } else {
        await superAdminApi.createUser({
          username: values.username,
          password: values.password,
          role: values.role,
          company_id: values.company_id || null,
        });
        message.success('用户创建成功');
      }
      setUserModalVisible(false);
      loadUsers();
    } catch (error: any) {
      message.error(error.response?.data?.detail || (editingUser ? '更新失败' : '创建失败'));
    }
  };

  const handleResetPassword = async (userId: string) => {
    setResetPasswordUserId(userId);
    setNewPassword('');
    setResetPasswordModalVisible(true);
  };

  const handleResetPasswordSubmit = async () => {
    if (!resetPasswordUserId) return;
    try {
      const response = await superAdminApi.resetUserPassword(
        resetPasswordUserId,
        newPassword || undefined
      );
      if (response.success && response.data?.new_password) {
        message.success(`密码重置成功！新密码：${response.data.new_password}`, 10);
        setResetPasswordModalVisible(false);
        setNewPassword('');
      }
    } catch (error: any) {
      message.error(error.response?.data?.detail || '密码重置失败');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await superAdminApi.deleteUser(userId);
      message.success('用户删除成功');
      loadUsers();
    } catch (error: any) {
      message.error(error.response?.data?.detail || '删除失败');
    }
  };

  // 公司表格列
  const companyColumns: ColumnsType<SuperAdminCompany> = [
    {
      title: '公司ID',
      dataIndex: 'company_id',
      key: 'company_id',
      width: 200,
      render: (text) => <code style={{ fontSize: '12px' }}>{text}</code>,
    },
    {
      title: '公司名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '规模',
      dataIndex: 'size',
      key: 'size',
      render: (size) => {
        const sizeMap: Record<string, string> = {
          Small: '小型',
          Medium: '中型',
          Large: '大型',
        };
        return size ? sizeMap[size] || size : '-';
      },
    },
    {
      title: '注册资本',
      dataIndex: 'registered_capital',
      key: 'registered_capital',
      render: (amount) => amount ? `¥${amount.toLocaleString()}` : '-',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => formatDate(date),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditCompany(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个公司吗？删除前请确保该公司没有用户。"
            onConfirm={() => handleDeleteCompany(record.company_id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              danger
              size="small"
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 用户表格列
  const userColumns: ColumnsType<SuperAdminUser> = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      render: (text) => (
        <Space>
          <UserOutlined />
          {text}
        </Space>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color={roleColors[role]}>{roleNames[role] || role}</Tag>
      ),
    },
    {
      title: '所属公司',
      dataIndex: 'company_name',
      key: 'company_name',
      render: (name) => name || <Tag color="default">无（超级管理员）</Tag>,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => formatDate(date),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditUser(record)}
          >
            编辑
          </Button>
          <Tooltip title="重置密码">
            <Button
              type="link"
              size="small"
              icon={<KeyOutlined />}
              onClick={() => handleResetPassword(record.user_id)}
            >
              重置密码
            </Button>
          </Tooltip>
          <Popconfirm
            title="确定要删除这个用户吗？"
            onConfirm={() => handleDeleteUser(record.user_id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              danger
              size="small"
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Tabs items configuration
  const tabItems = [
    {
      key: 'stats',
      label: (
        <span>
          <BarChartOutlined />
          系统统计
        </span>
      ),
      children: stats && (
        <Row gutter={16}>
          <Col span={8}>
            <Statistic
              title="公司总数"
              value={stats.total_companies}
              prefix={<ShopOutlined />}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="用户总数"
              value={stats.total_users}
              prefix={<UserOutlined />}
            />
          </Col>
          <Col span={8}>
            <Card size="small">
              <div style={{ marginBottom: 8 }}>用户角色分布</div>
              {Object.entries(stats.users_by_role).map(([role, count]) => (
                <div key={role} style={{ marginBottom: 4 }}>
                  <Tag color={roleColors[role]}>{roleNames[role] || role}</Tag>
                  <span style={{ marginLeft: 8 }}>{count} 人</span>
                </div>
              ))}
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'companies',
      label: (
        <span>
          <ShopOutlined />
          公司管理
        </span>
      ),
      children: (
        <>
          <div style={{ marginBottom: 16, textAlign: 'right' }}>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={loadCompanies}
                loading={loading}
              >
                刷新
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleCreateCompany}
              >
                新增公司
              </Button>
            </Space>
          </div>
          <Table
            columns={companyColumns}
            dataSource={companies}
            rowKey="company_id"
            loading={loading}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条记录`,
            }}
          />
        </>
      ),
    },
    {
      key: 'users',
      label: (
        <span>
          <UserOutlined />
          用户管理
        </span>
      ),
      children: (
        <>
          <div style={{ marginBottom: 16 }}>
            <Space style={{ marginBottom: 16, width: '100%' }}>
              <Input
                placeholder="搜索用户名"
                prefix={<SearchOutlined />}
                value={userSearchText}
                onChange={(e) => setUserSearchText(e.target.value)}
                style={{ width: 200 }}
                allowClear
              />
              <Select
                placeholder="筛选角色"
                value={userRoleFilter}
                onChange={setUserRoleFilter}
                style={{ width: 150 }}
                allowClear
              >
                {Object.entries(roleNames).map(([value, label]) => (
                  <Option key={value} value={value}>{label}</Option>
                ))}
              </Select>
              <Select
                placeholder="筛选公司"
                value={userCompanyFilter}
                onChange={setUserCompanyFilter}
                style={{ width: 200 }}
                allowClear
              >
                {companies.map((company) => (
                  <Option key={company.company_id} value={company.company_id}>
                    {company.name}
                  </Option>
                ))}
              </Select>
              <Button
                icon={<ReloadOutlined />}
                onClick={loadUsers}
                loading={loading}
              >
                刷新
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleCreateUser}
              >
                新增用户
              </Button>
            </Space>
          </div>
          <Table
            columns={userColumns}
            dataSource={users}
            rowKey="user_id"
            loading={loading}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条记录`,
            }}
          />
        </>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>

      {/* 公司编辑/创建模态框 */}
      <Modal
        title={editingCompany ? '编辑公司' : '新增公司'}
        open={companyModalVisible}
        onCancel={() => setCompanyModalVisible(false)}
        onOk={() => companyForm.submit()}
        okText="确定"
        cancelText="取消"
      >
        <Form
          form={companyForm}
          layout="vertical"
          onFinish={handleCompanySubmit}
        >
          <Form.Item
            label="公司名称"
            name="name"
            rules={[{ required: true, message: '请输入公司名称' }]}
          >
            <Input placeholder="请输入公司名称" />
          </Form.Item>
          <Form.Item
            label="企业规模"
            name="size"
          >
            <Select placeholder="请选择企业规模">
              <Option value="Small">小型</Option>
              <Option value="Medium">中型</Option>
              <Option value="Large">大型</Option>
            </Select>
          </Form.Item>
          <Form.Item
            label="注册资本"
            name="registered_capital"
          >
            <Input type="number" placeholder="请输入注册资本" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 用户编辑/创建模态框 */}
      <Modal
        title={editingUser ? '编辑用户' : '新增用户'}
        open={userModalVisible}
        onCancel={() => setUserModalVisible(false)}
        onOk={() => userForm.submit()}
        okText="确定"
        cancelText="取消"
        width={600}
      >
        <Form
          form={userForm}
          layout="vertical"
          onFinish={handleUserSubmit}
        >
          {!editingUser && (
            <Form.Item
              label="用户名"
              name="username"
              rules={[
                { required: true, message: '请输入用户名' },
                { min: 3, message: '用户名至少3个字符' },
                {
                  pattern: /^[a-zA-Z0-9][a-zA-Z0-9_]*$/,
                  message: '用户名必须以英文或数字开头，只能包含字母、数字和下划线',
                },
              ]}
            >
              <Input placeholder="请输入用户名" />
            </Form.Item>
          )}
          <Form.Item
            label="角色"
            name="role"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select placeholder="请选择角色">
              {Object.entries(roleNames).map(([value, label]) => (
                <Option key={value} value={value}>{label}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            label="所属公司"
            name="company_id"
            tooltip="超级管理员可以不选择公司"
          >
            <Select
              placeholder="请选择公司（超级管理员可为空）"
              allowClear
            >
              {companies.map((company) => (
                <Option key={company.company_id} value={company.company_id}>
                  {company.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            label={editingUser ? '新密码（留空则不修改）' : '密码'}
            name="password"
            rules={
              editingUser
                ? [
                    () => ({
                      validator(_, value) {
                        if (!value) {
                          return Promise.resolve();
                        }
                        if (value.length < 8) {
                          return Promise.reject(new Error('密码至少8个字符'));
                        }
                        const hasDigit = /\d/.test(value);
                        const hasLetter = /[a-zA-Z]/.test(value);
                        const hasSymbol = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(value);
                        if (!hasDigit || !hasLetter || !hasSymbol) {
                          return Promise.reject(
                            new Error('密码必须包含数字、字母和常见符号')
                          );
                        }
                        return Promise.resolve();
                      },
                    }),
                  ]
                : [
                    { required: true, message: '请输入密码' },
                    { min: 8, message: '密码至少8个字符' },
                    {
                      validator(_, value) {
                        if (!value) {
                          return Promise.reject(new Error('请输入密码'));
                        }
                        const hasDigit = /\d/.test(value);
                        const hasLetter = /[a-zA-Z]/.test(value);
                        const hasSymbol = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(value);
                        if (!hasDigit || !hasLetter || !hasSymbol) {
                          return Promise.reject(
                            new Error('密码必须包含数字、字母和常见符号')
                          );
                        }
                        return Promise.resolve();
                      },
                    },
                  ]
            }
          >
            <Input.Password
              placeholder={
                editingUser
                  ? '留空则不修改密码（至少8位，包含数字、字母和符号）'
                  : '请输入密码（至少8位，包含数字、字母和符号）'
              }
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 重置密码模态框 */}
      <Modal
        title="重置用户密码"
        open={resetPasswordModalVisible}
        onCancel={() => setResetPasswordModalVisible(false)}
        onOk={handleResetPasswordSubmit}
        okText="重置"
        cancelText="取消"
      >
        <div style={{ marginBottom: 16 }}>
          <p>留空将自动生成随机密码，或输入自定义密码：</p>
          <Input.Password
            placeholder="留空则自动生成随机密码"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
};

export default SuperAdminPage;
