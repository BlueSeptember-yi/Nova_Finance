import { useEffect, useState } from 'react';
import { Button, Table, Card, Space, Tag, Select, Modal, Form, InputNumber, Input, message, Tooltip } from 'antd';
import { ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import { inventoryApi } from '@/services/inventory';
import { productApi } from '@/services/product';
import { formatDate } from '@/utils';
import type { InventoryTransaction, Product } from '@/types';
import type { ColumnsType } from 'antd/es/table';

const { Option } = Select;

const InventoryTransactionPage = () => {
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string | undefined>();
  const [productSelectOpen, setProductSelectOpen] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedProduct) {
        params.product_id = selectedProduct;
      }
      const response = await inventoryApi.getTransactions(params);
      if (response.success) {
        setTransactions(response.data || []);
      }
    } catch (error) {
      console.error('Fetch transactions error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await productApi.getList();
      if (response.success) {
        setProducts(response.data || []);
      }
    } catch (error) {
      console.error('Fetch products error:', error);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchData();
  }, [selectedProduct]);

  const handleCreate = () => {
    form.resetFields();
    setCreateModalVisible(true);
  };

  const handleCreateSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const response = await inventoryApi.createTransaction({
        product_id: values.product_id,
        type: values.type,
        quantity: values.quantity,
        source_type: values.source_type || 'Manual',
        source_id: values.source_id,
        warehouse_location: values.warehouse_location,
        remark: values.remark || '',
      });
      
      if (response.success) {
        message.success('库存流水创建成功');
        setCreateModalVisible(false);
        form.resetFields();
        fetchData();
      }
    } catch (error: any) {
      message.error(error.response?.data?.detail || '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType<InventoryTransaction> = [
    {
      title: '日期',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      fixed: 'left',
      render: (date: string) => formatDate(date, 'YYYY-MM-DD HH:mm'),
    },
    {
      title: '商品',
      key: 'product_name',
      width: 180,
      ellipsis: {
        showTitle: false,
      },
      render: (_: unknown, record: InventoryTransaction) => {
        if (record.product_name) {
          const content = (
            <div>
              <div style={{ fontWeight: 500 }}>{record.product_name}</div>
              {record.product_sku && (
                <div style={{ fontSize: 12, color: '#999' }}>SKU: {record.product_sku}</div>
              )}
            </div>
          );
          return (
            <Tooltip title={record.product_name}>
              {content}
            </Tooltip>
          );
        }
        return <span style={{ color: '#999' }}>商品ID: {record.product_id?.slice(0, 8)}...</span>;
      },
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      align: 'center',
      render: (type: string) => (
        <Tag color={type === 'IN' ? 'green' : 'red'}>
          {type === 'IN' ? '入库' : '出库'}
        </Tag>
      ),
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      align: 'right',
      render: (quantity: number | string) => {
        if (quantity == null) {
          return '0.00';
        }
        // 处理字符串类型的数量（Decimal序列化后可能是字符串）
        const numValue = typeof quantity === 'string' ? parseFloat(quantity) : quantity;
        if (isNaN(numValue)) {
          return '0.00';
        }
        return numValue.toFixed(2);
      },
    },
    {
      title: '来源',
      dataIndex: 'source_type',
      key: 'source_type',
      width: 90,
      align: 'center',
      render: (sourceType: string) => {
        const sourceMap: Record<string, string> = {
          'PO': '采购单',
          'SO': '销售单',
          'Manual': '手工',
          'Adjustment': '调整',
        };
        return <Tag>{sourceMap[sourceType] || sourceType}</Tag>;
      },
    },
    {
      title: '来源ID',
      dataIndex: 'source_id',
      key: 'source_id',
      width: 120,
      ellipsis: {
        showTitle: false,
      },
      render: (sourceId: string) => {
        if (!sourceId) return <span style={{ color: '#999' }}>-</span>;
        return (
          <Tooltip title={sourceId}>
            <span>{sourceId.slice(0, 8)}...</span>
          </Tooltip>
        );
      },
    },
    {
      title: '仓库位置',
      dataIndex: 'warehouse_location',
      key: 'warehouse_location',
      width: 130,
      ellipsis: {
        showTitle: false,
      },
      render: (location: string) => {
        if (!location) return <span style={{ color: '#999' }}>-</span>;
        return (
          <Tooltip title={location}>
            <span>{location}</span>
          </Tooltip>
        );
      },
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      width: 150,
      ellipsis: {
        showTitle: false,
      },
      render: (remark: string) => {
        if (!remark) return <span style={{ color: '#999' }}>-</span>;
        return (
          <Tooltip title={remark}>
            <span>{remark}</span>
          </Tooltip>
        );
      },
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>库存流水</h1>
        <Space>
          <Select
            style={{ width: 200 }}
            placeholder="筛选商品"
            allowClear
            value={selectedProduct}
            open={productSelectOpen}
            onOpenChange={setProductSelectOpen}
            onChange={(value) => {
              setSelectedProduct(value);
              setProductSelectOpen(false);
            }}
          >
            {products.map(product => (
              <Option key={product.product_id} value={product.product_id}>
                {product.name}
              </Option>
            ))}
          </Select>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新建流水
          </Button>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>
            刷新
          </Button>
        </Space>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={transactions}
          rowKey="transaction_id"
          loading={loading}
          scroll={{ x: 1100 }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      <Modal
        title="新建库存流水"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateSubmit}
          initialValues={{
            type: 'IN',
            source_type: 'Manual',
            quantity: 1,
          }}
        >
          <Form.Item
            label="商品"
            name="product_id"
            rules={[{ required: true, message: '请选择商品' }]}
          >
            <Select
              placeholder="选择商品"
              showSearch
              filterOption={(input, option) => {
                if (!option || !option.value) return false;
                const product = products.find(p => p.product_id === option.value);
                if (!product) return false;
                const searchText = input.toLowerCase();
                return (
                  product.name.toLowerCase().includes(searchText) ||
                  product.sku.toLowerCase().includes(searchText)
                );
              }}
            >
              {products.map(product => (
                <Option key={product.product_id} value={product.product_id}>
                  {`${product.name} [${product.sku}]`}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="类型"
            name="type"
            rules={[{ required: true, message: '请选择类型' }]}
          >
            <Select>
              <Option value="IN">入库</Option>
              <Option value="OUT">出库</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="数量"
            name="quantity"
            rules={[
              { required: true, message: '请输入数量' },
              { type: 'number', min: 0.01, message: '数量必须大于0' },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0.01}
              precision={2}
              placeholder="请输入数量"
            />
          </Form.Item>

          <Form.Item
            label="来源类型"
            name="source_type"
            rules={[{ required: true, message: '请选择来源类型' }]}
          >
            <Select>
              <Option value="Manual">手工录入</Option>
              <Option value="Adjustment">调整</Option>
              <Option value="PO">采购单</Option>
              <Option value="SO">销售单</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="来源ID"
            name="source_id"
          >
            <Input placeholder="来源ID（可选）" />
          </Form.Item>

          <Form.Item
            label="仓库位置"
            name="warehouse_location"
          >
            <Input placeholder="仓库位置（可选）" maxLength={100} />
          </Form.Item>

          <Form.Item
            label="备注"
            name="remark"
          >
            <Input.TextArea placeholder="备注（可选）" rows={3} maxLength={255} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default InventoryTransactionPage;

