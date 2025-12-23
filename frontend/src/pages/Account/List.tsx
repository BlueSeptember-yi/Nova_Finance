import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Table, Space, Tag, Select, Input, Card, Row, Col, Popconfirm, message } from 'antd';
import { PlusOutlined, SearchOutlined, ReloadOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { accountApi } from '@/services/account';
import { accountTypeMap, getUser, checkPermission } from '@/utils';
import type { Account } from '@/types';
import type { ColumnsType } from 'antd/es/table';

const { Option } = Select;

const AccountList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<Account[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [typeSelectOpen, setTypeSelectOpen] = useState(false);
  const user = getUser();

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const response = await accountApi.getList();
      if (response.success) {
        setAccounts(response.data || []);
        setFilteredAccounts(response.data || []);
      }
    } catch (error) {
      console.error('Fetch accounts error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  // 筛选逻辑
  useEffect(() => {
    let result = [...accounts];
    
    // 按类型筛选
    if (typeFilter !== 'all') {
      result = result.filter(acc => acc.type === typeFilter);
    }
    
    // 按搜索词筛选
    if (searchText) {
      const search = searchText.toLowerCase();
      result = result.filter(acc => 
        acc.code.toLowerCase().includes(search) ||
        acc.name.toLowerCase().includes(search)
      );
    }
    
    setFilteredAccounts(result);
  }, [accounts, typeFilter, searchText]);

  const handleDelete = async (id: string) => {
    try {
      const response = await accountApi.delete(id);
      if (response.success) {
        message.success('删除成功');
        fetchAccounts();
      }
    } catch (error: any) {
      message.error(error.response?.data?.detail || '删除失败');
    }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      Asset: 'blue',
      Liability: 'red',
      Equity: 'purple',
      Revenue: 'green',
      Expense: 'orange',
      Common: 'cyan',
    };
    return colors[type] || 'default';
  };

  const columns: ColumnsType<Account> = [
    {
      title: '科目编码',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      sorter: (a, b) => a.code.localeCompare(b.code),
      render: (code: string) => <Tag>{code}</Tag>,
    },
    {
      title: '科目名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '科目类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => (
        <Tag color={getTypeColor(type)}>{accountTypeMap[type] || type}</Tag>
      ),
    },
    {
      title: '核心科目',
      dataIndex: 'is_core',
      key: 'is_core',
      width: 100,
      render: (isCore: boolean) => isCore ? <Tag color="gold">是</Tag> : <Tag>否</Tag>,
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: unknown, record: Account) => (
        <Space>
          {user?.role && checkPermission(user.role, 'account:update') && (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => navigate(`/accounts/${record.account_id}/edit`)}
              disabled={record.is_core}
            >
              编辑
            </Button>
          )}
          {!record.is_core && user?.role && checkPermission(user.role, 'account:delete') && (
            <Popconfirm
              title="确定要删除此科目吗？"
              description="删除后不可恢复"
              onConfirm={() => handleDelete(record.account_id)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // 统计信息
  const stats = {
    total: accounts.length,
    asset: accounts.filter(a => a.type === 'Asset').length,
    liability: accounts.filter(a => a.type === 'Liability').length,
    equity: accounts.filter(a => a.type === 'Equity').length,
    revenue: accounts.filter(a => a.type === 'Revenue').length,
    expense: accounts.filter(a => a.type === 'Expense').length,
    common: accounts.filter(a => a.type === 'Common').length,
  };

  return (
    <div>
      {/* 页面标题 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>会计科目管理</h1>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchAccounts}>
            刷新
          </Button>
          {user?.role && checkPermission(user.role, 'account:create') && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/accounts/new')}
            >
              新增科目
            </Button>
          )}
        </Space>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={3}>
          <Card size="small">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 'bold' }}>{stats.total}</div>
              <div style={{ color: '#999' }}>全部科目</div>
            </div>
          </Card>
        </Col>
        <Col span={3}>
          <Card size="small" style={{ borderLeft: '3px solid #1890ff' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>{stats.asset}</div>
              <div style={{ color: '#999' }}>资产类</div>
            </div>
          </Card>
        </Col>
        <Col span={3}>
          <Card size="small" style={{ borderLeft: '3px solid #f5222d' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#f5222d' }}>{stats.liability}</div>
              <div style={{ color: '#999' }}>负债类</div>
            </div>
          </Card>
        </Col>
        <Col span={3}>
          <Card size="small" style={{ borderLeft: '3px solid #722ed1' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#722ed1' }}>{stats.equity}</div>
              <div style={{ color: '#999' }}>权益类</div>
            </div>
          </Card>
        </Col>
        <Col span={3}>
          <Card size="small" style={{ borderLeft: '3px solid #52c41a' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>{stats.revenue}</div>
              <div style={{ color: '#999' }}>收入类</div>
            </div>
          </Card>
        </Col>
        <Col span={3}>
          <Card size="small" style={{ borderLeft: '3px solid #fa8c16' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#fa8c16' }}>{stats.expense}</div>
              <div style={{ color: '#999' }}>费用类</div>
            </div>
          </Card>
        </Col>
        <Col span={3}>
          <Card size="small" style={{ borderLeft: '3px solid #13c2c2' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#13c2c2' }}>{stats.common}</div>
              <div style={{ color: '#999' }}>共同类</div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 筛选区域 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="搜索科目编码或名称"
            prefix={<SearchOutlined />}
            style={{ width: 200 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
          <Select
            style={{ width: 150 }}
            value={typeFilter}
            open={typeSelectOpen}
            onDropdownVisibleChange={setTypeSelectOpen}
            onChange={(value) => {
              setTypeFilter(value);
              setTypeSelectOpen(false);
            }}
          >
            <Option value="all">全部类型</Option>
            <Option value="Asset">资产类</Option>
            <Option value="Liability">负债类</Option>
            <Option value="Equity">权益类</Option>
            <Option value="Revenue">收入类</Option>
            <Option value="Expense">费用类</Option>
            <Option value="Common">共同类</Option>
          </Select>
          <span style={{ color: '#999' }}>
            共 {filteredAccounts.length} 条记录
          </span>
        </Space>
      </Card>
      
      {/* 数据表格 */}
      <Table
        columns={columns}
        dataSource={filteredAccounts}
        rowKey="account_id"
        loading={loading}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
      />
    </div>
  );
};

export default AccountList;
