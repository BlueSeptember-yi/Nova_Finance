import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Table, Space, Card, Popconfirm, message, Tag, Input, Row, Col, Statistic } from 'antd';
import { PlusOutlined, ReloadOutlined, DeleteOutlined, EditOutlined, SearchOutlined, TeamOutlined } from '@ant-design/icons';
import { supplierApi } from '@/services/supplier';
import { formatDate, getUser, checkPermission } from '@/utils';
import type { Supplier } from '@/types';
import type { ColumnsType } from 'antd/es/table';

const SupplierList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [searchText, setSearchText] = useState('');
  const user = getUser();

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const response = await supplierApi.getList(0, 100);
      if (response.success) {
        setSuppliers(response.data || []);
        setFilteredSuppliers(response.data || []);
      }
    } catch (error) {
      console.error('Fetch suppliers error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  // 搜索筛选
  useEffect(() => {
    if (searchText) {
      const search = searchText.toLowerCase();
      setFilteredSuppliers(
        suppliers.filter(s =>
          s.name.toLowerCase().includes(search) ||
          s.phone?.toLowerCase().includes(search) ||
          s.contact?.toLowerCase().includes(search)
        )
      );
    } else {
      setFilteredSuppliers(suppliers);
    }
  }, [searchText, suppliers]);

  const handleDelete = async (id: string) => {
    try {
      const response = await supplierApi.delete(id);
      if (response.success) {
        message.success('删除成功');
        fetchSuppliers();
      }
    } catch (error: any) {
      message.error(error.response?.data?.detail || '删除失败');
    }
  };

  const columns: ColumnsType<Supplier> = [
    {
      title: '供应商名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name: string) => <strong>{name}</strong>,
    },
    {
      title: '联系人',
      dataIndex: 'contact',
      key: 'contact',
      width: 120,
      render: (contact: string) => contact || '-',
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
      title: '银行账户',
      dataIndex: 'bank_account',
      key: 'bank_account',
      width: 180,
      render: (account: string) => account ? <Tag>{account}</Tag> : '-',
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
      render: (_: unknown, record: Supplier) => (
        <Space>
          {user?.role && checkPermission(user.role, 'supplier:update') && (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => navigate(`/suppliers/${record.supplier_id}/edit`)}
            >
              编辑
            </Button>
          )}
          {user?.role && checkPermission(user.role, 'supplier:delete') && (
            <Popconfirm
              title="确定要删除此供应商吗？"
              description="删除后不可恢复"
              onConfirm={() => handleDelete(record.supplier_id)}
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
        <h1 style={{ margin: 0 }}>供应商管理</h1>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchSuppliers}>
            刷新
          </Button>
          {user?.role && checkPermission(user.role, 'supplier:create') && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/suppliers/new')}
            >
              新增供应商
            </Button>
          )}
        </Space>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="供应商总数"
              value={suppliers.length}
              prefix={<TeamOutlined />}
              suffix="家"
            />
          </Card>
        </Col>
        <Col span={16}>
          <Card>
            <Input
              placeholder="搜索供应商名称、联系人或电话"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              size="large"
            />
          </Card>
        </Col>
      </Row>

      {/* 数据表格 */}
      <Table
        columns={columns}
        dataSource={filteredSuppliers}
        rowKey="supplier_id"
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

export default SupplierList;
