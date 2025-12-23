import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Table, Space, Card, Popconfirm, message, Input, Tag, Tooltip, Descriptions } from 'antd';
import { PlusOutlined, ReloadOutlined, DeleteOutlined, EditOutlined, SearchOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { customerApi } from '@/services/customer';
import { formatDate, formatMoney, getUser, checkPermission } from '@/utils';
import type { Customer } from '@/types';
import type { ColumnsType } from 'antd/es/table';

const CustomerList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchText, setSearchText] = useState('');
  const user = getUser();

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await customerApi.getList(0, 100);
      if (response.success) {
        setCustomers(response.data || []);
        setFilteredCustomers(response.data || []);
      }
    } catch (error) {
      console.error('Fetch customers error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // 搜索筛选
  useEffect(() => {
    if (searchText) {
      const search = searchText.toLowerCase();
      setFilteredCustomers(
        customers.filter(c =>
          c.name.toLowerCase().includes(search) ||
          c.phone?.toLowerCase().includes(search)
        )
      );
    } else {
      setFilteredCustomers(customers);
    }
  }, [searchText, customers]);

  const handleDelete = async (id: string) => {
    try {
      const response = await customerApi.delete(id);
      if (response.success) {
        message.success('删除成功');
        fetchCustomers();
      }
    } catch (error: any) {
      message.error(error.response?.data?.detail || '删除失败');
    }
  };

  const columns: ColumnsType<Customer> = [
    {
      title: '客户名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name: string) => <strong>{name}</strong>,
    },
    {
      title: '联系电话',
      dataIndex: 'phone',
      key: 'phone',
      width: 150,
      render: (phone: string) => phone || '-',
    },
    {
      title: '地址',
      dataIndex: 'address',
      key: 'address',
      ellipsis: true,
      render: (address: string) => address || '-',
    },
    {
      title: '信用额度',
      dataIndex: 'credit_limit',
      key: 'credit_limit',
      width: 120,
      align: 'right',
      sorter: (a, b) => (a.credit_limit || 0) - (b.credit_limit || 0),
      render: (limit: number) => (
        <span style={{ color: '#1890ff', fontWeight: 500 }}>
          {limit > 0 ? `¥${formatMoney(limit)}` : '-'}
        </span>
      ),
    },
    {
      title: '可用额度',
      key: 'available_credit',
      width: 120,
      align: 'right',
      render: (_: unknown, record: Customer) => {
        const stats = record.order_stats;
        const hasCreditLimit = record.credit_limit > 0;
        const availableCredit = stats?.available_credit || 0;
        const currentDebt = stats?.current_debt || 0;
        const isOverLimit = hasCreditLimit && currentDebt > record.credit_limit;
        
        if (!hasCreditLimit) {
          return <span style={{ color: '#999' }}>-</span>;
        }
        
        return (
          <Space>
            <span style={{ color: isOverLimit ? '#ff4d4f' : '#52c41a', fontWeight: 500 }}>
              ¥{formatMoney(availableCredit)}
            </span>
            {isOverLimit && (
              <Tooltip title="当前欠款已超出信用额度">
                <ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: 12 }} />
              </Tooltip>
            )}
          </Space>
        );
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (date: string) => formatDate(date),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: unknown, record: Customer) => (
        <Space>
          {user?.role && checkPermission(user.role, 'customer:update') && (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => navigate(`/customers/${record.customer_id}/edit`)}
            >
              编辑
            </Button>
          )}
          {user?.role && checkPermission(user.role, 'customer:delete') && (
            <Popconfirm
              title="确定要删除此客户吗？"
              description="删除后不可恢复"
              onConfirm={() => handleDelete(record.customer_id)}
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

  return (
    <div>
      {/* 页面标题 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>客户管理</h1>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchCustomers}>
            刷新
          </Button>
          {user?.role && checkPermission(user.role, 'customer:create') && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/customers/new')}
            >
              新增客户
            </Button>
          )}
        </Space>
      </div>

      {/* 搜索框 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Input
          placeholder="搜索客户名称或电话"
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
          size="large"
        />
      </Card>

      {/* 数据表格 */}
      <Table
        columns={columns}
        dataSource={filteredCustomers}
        rowKey="customer_id"
        loading={loading}
        expandable={{
          expandedRowRender: (record: Customer) => {
            const stats = record.order_stats;
            if (!stats) {
              return <div style={{ padding: '16px', color: '#999' }}>暂无订单数据</div>;
            }
            
            return (
              <div style={{ padding: '16px', backgroundColor: '#fafafa' }}>
                <Descriptions title="订单统计信息" bordered column={2} size="small">
                  <Descriptions.Item label="总订单数">
                    <strong>{stats.total_orders}</strong>
                  </Descriptions.Item>
                  <Descriptions.Item label="订单状态分布">
                    <Space>
                      {stats.draft_count > 0 && (
                        <Tag color="default">待过账 {stats.draft_count}</Tag>
                      )}
                      {stats.posted_count > 0 && (
                        <Tag color="processing">已过账 {stats.posted_count}</Tag>
                      )}
                      {stats.collected_count > 0 && (
                        <Tag color="success">已收款 {stats.collected_count}</Tag>
                      )}
                      {stats.total_orders === 0 && <span style={{ color: '#999' }}>无订单</span>}
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="总销售额">
                    <span style={{ color: '#eb2f96', fontWeight: 500, fontSize: 16 }}>
                      ¥{formatMoney(stats.total_sales)}
                    </span>
                  </Descriptions.Item>
                  <Descriptions.Item label="已收款总额">
                    <span style={{ color: '#52c41a', fontWeight: 500, fontSize: 16 }}>
                      ¥{formatMoney(stats.total_received)}
                    </span>
                  </Descriptions.Item>
                  {record.credit_limit > 0 && (
                    <>
                      <Descriptions.Item label="当前欠款">
                        <span style={{ color: '#ff4d4f', fontWeight: 500, fontSize: 16 }}>
                          ¥{formatMoney(stats.current_debt)}
                        </span>
                        {stats.current_debt > record.credit_limit && (
                          <Tooltip title="当前欠款已超出信用额度">
                            <ExclamationCircleOutlined style={{ color: '#ff4d4f', marginLeft: 8 }} />
                          </Tooltip>
                        )}
                      </Descriptions.Item>
                      <Descriptions.Item label="可用信用额度">
                        <span style={{ 
                          color: stats.current_debt > record.credit_limit ? '#ff4d4f' : '#52c41a', 
                          fontWeight: 500, 
                          fontSize: 16 
                        }}>
                          ¥{formatMoney(stats.available_credit)}
                        </span>
                      </Descriptions.Item>
                    </>
                  )}
                </Descriptions>
              </div>
            );
          },
          rowExpandable: () => true,
        }}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
      />
    </div>
  );
};

export default CustomerList;
