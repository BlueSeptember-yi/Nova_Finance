import { useEffect, useState } from 'react';
import { Button, Table, Space, Card, Popconfirm, message, Tag, Input, Row, Col } from 'antd';
import { PlusOutlined, ReloadOutlined, DeleteOutlined, EditOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons';
import { userApi } from '@/services/user';
import { formatDate } from '@/utils';
import type { User } from '@/services/user';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';

const roleColors: Record<string, string> = {
  Owner: 'red',
  Accountant: 'blue',
  Sales: 'green',
  Purchaser: 'orange',
};

const roleNames: Record<string, string> = {
  Owner: '店主',
  Accountant: '会计',
  Sales: '销售员',
  Purchaser: '采购员',
};

const UserList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchText, setSearchText] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await userApi.getList(0, 100);
      if (response.success) {
        setUsers(response.data || []);
        setFilteredUsers(response.data || []);
      }
    } catch (error: any) {
      console.error('Fetch users error:', error);
      message.error(error.response?.data?.detail || '获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // 搜索筛选
  useEffect(() => {
    if (searchText) {
      const search = searchText.toLowerCase();
      setFilteredUsers(
        users.filter(u =>
          u.username.toLowerCase().includes(search) ||
          roleNames[u.role]?.includes(search)
        )
      );
    } else {
      setFilteredUsers(users);
    }
  }, [searchText, users]);

  const handleDelete = async (userId: string) => {
    try {
      const response = await userApi.delete(userId);
      if (response.success) {
        message.success('删除成功');
        fetchUsers();
      }
    } catch (error: any) {
      message.error(error.response?.data?.detail || '删除失败');
    }
  };

  const columns: ColumnsType<User> = [
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
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => formatDate(date),
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
            onClick={() => navigate(`/users/${record.user_id}/edit`)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个用户吗？"
            onConfirm={() => handleDelete(record.user_id)}
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

  return (
    <Card>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Input
            placeholder="搜索用户名或角色"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
        </Col>
        <Col span={12} style={{ textAlign: 'right' }}>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchUsers}
              loading={loading}
            >
              刷新
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/users/new')}
            >
              新增用户
            </Button>
          </Space>
        </Col>
      </Row>

      <Table
        columns={columns}
        dataSource={filteredUsers}
        rowKey="user_id"
        loading={loading}
        pagination={{
          total: filteredUsers.length,
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条记录`,
        }}
      />
    </Card>
  );
};

export default UserList;

