import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Table, Card, Space, message, Popconfirm } from 'antd';
import { PlusOutlined, ReloadOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { productApi } from '@/services/product';
import { formatMoney } from '@/utils';
import type { Product } from '@/types';
import type { ColumnsType } from 'antd/es/table';

const ProductList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await productApi.getList();
      if (response.success) {
        setProducts(response.data || []);
      }
    } catch (error) {
      console.error('Fetch products error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const response = await productApi.delete(id);
      if (response.success) {
        message.success('删除成功');
        fetchData();
      }
    } catch (error) {
      console.error('Delete product error:', error);
    }
  };

  const columns: ColumnsType<Product> = [
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      width: 120,
    },
    {
      title: '商品名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '定价',
      dataIndex: 'price',
      key: 'price',
      width: 120,
      align: 'right',
      render: (price: number) => price ? `¥${formatMoney(price)}` : '-',
    },
    {
      title: '预估成本',
      dataIndex: 'cost',
      key: 'cost',
      width: 120,
      align: 'right',
      render: (cost: number) => cost ? `¥${formatMoney(cost)}` : '-',
    },
    {
      title: '加权平均成本',
      dataIndex: 'average_cost',
      key: 'average_cost',
      width: 140,
      align: 'right',
      render: (average_cost: number) => average_cost ? `¥${formatMoney(average_cost)}` : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: unknown, record: Product) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/products/${record.product_id}/edit`)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除吗？"
            onConfirm={() => handleDelete(record.product_id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
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
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>商品管理</h1>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>
            刷新
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/products/new')}
          >
            新增商品
          </Button>
        </Space>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={products}
          rowKey="product_id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>
    </div>
  );
};

export default ProductList;

