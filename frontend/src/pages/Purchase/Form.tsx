import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, DatePicker, Input, Button, Card, message, Table, Select, InputNumber, Space, Divider } from 'antd';
import { MinusCircleOutlined, PlusOutlined, SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { orderApi } from '@/services/order';
import { supplierApi } from '@/services/supplier';
import { productApi } from '@/services/product';
import { formatMoney } from '@/utils';
import type { Supplier, Product } from '@/types';

interface OrderLine {
  product_name: string;
  quantity: number;
  unit_price: number;
  discount_rate: number;
}

const PurchaseForm = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [lines, setLines] = useState<(OrderLine & { key: string; product_id?: string })[]>([
    { key: `item-${Date.now()}-0`, product_name: '', quantity: 1, unit_price: 0, discount_rate: 1 },
  ]);

  useEffect(() => {
    fetchSuppliers();
    fetchProducts();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await supplierApi.getList(0, 100);
      if (response.success) {
        setSuppliers(response.data || []);
      }
    } catch (error) {
      console.error('Fetch suppliers error:', error);
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

  const addLine = () => {
    setLines([...lines, { key: `item-${Date.now()}-${lines.length}`, product_name: '', quantity: 1, unit_price: 0, discount_rate: 1 }]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const updateLine = (index: number, field: keyof OrderLine | 'product_id', value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const calculateSubtotal = (line: OrderLine) => {
    return line.quantity * line.unit_price * line.discount_rate;
  };

  const calculateTotal = () => {
    return lines.reduce((sum, line) => sum + calculateSubtotal(line), 0);
  };

  const onFinish = async (values: any) => {
    // 验证订单明细
    const validLines = lines.filter(line => line.product_id && line.product_name && line.quantity > 0 && line.unit_price > 0);
    if (validLines.length === 0) {
      message.error('请至少添加一个有效的订单明细');
      return;
    }
    
    // 验证所有商品都已选择且单价已填写
    for (const line of validLines) {
      if (!line.product_id) {
        message.error(`商品"${line.product_name}"未选择，请从商品列表中选择`);
        return;
      }
      if (!line.unit_price || line.unit_price <= 0) {
        message.error(`商品"${line.product_name}"的单价必须大于0`);
        return;
      }
    }

    setLoading(true);
    try {
      // 排除 key 字段，只发送需要的字段
      const items = validLines.map(({ key, ...item }) => ({
        product_id: item.product_id || undefined,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_rate: item.discount_rate,
      }));
      const response = await orderApi.createPurchase({
        supplier_id: values.supplier_id,
        date: values.date.format('YYYY-MM-DD'),
        expected_delivery_date: values.expected_delivery_date?.format('YYYY-MM-DD'),
        items,
        remark: values.remark || '',
      });
      
      if (response.success) {
        message.success('采购订单创建成功');
        navigate('/purchase/orders');
      }
    } catch (error: any) {
      message.error(error.response?.data?.detail || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: '商品',
      dataIndex: 'product_id',
      width: 300,
      render: (_: unknown, record: OrderLine & { product_id?: string }, index: number) => {
        return (
          <Select
            style={{ width: '100%' }}
            value={record.product_id}
            onChange={(value) => {
              if (!value) {
                // 清空选择时，重置所有字段
                const newLines = [...lines];
                newLines[index] = {
                  ...newLines[index],
                  product_id: undefined,
                  product_name: '',
                  unit_price: 0,
                };
                setLines(newLines);
                return;
              }
              
              const product = products.find(p => p.product_id === value);
              if (product) {
                // 一次性更新所有字段
                // 默认使用商品的预估成本（cost），如果没有则使用加权平均成本（average_cost），都没有则为0
                const defaultPrice = product.cost ?? product.average_cost ?? 0;
                const newLines = [...lines];
                newLines[index] = {
                  ...newLines[index],
                  product_id: value,
                  product_name: product.name,
                  unit_price: Number(defaultPrice),
                };
                setLines(newLines);
              }
            }}
            placeholder="搜索并选择商品"
            showSearch
            allowClear
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
            optionFilterProp="children"
          >
            {products.map(product => (
              <Select.Option key={product.product_id} value={product.product_id}>
                {`${product.name} [${product.sku}]`}
              </Select.Option>
            ))}
          </Select>
        );
      },
    },
    {
      title: '商品名称',
      dataIndex: 'product_name',
      width: 200,
      render: (_: unknown, record: OrderLine) => (
        <Input
          value={record.product_name}
          disabled
          placeholder="请选择商品"
          style={{ backgroundColor: '#f5f5f5' }}
        />
      ),
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      width: 120,
      render: (_: unknown, record: OrderLine, index: number) => (
        <InputNumber
          style={{ width: '100%' }}
          value={record.quantity}
          onChange={(value) => updateLine(index, 'quantity', value || 1)}
          min={1}
          precision={2}
        />
      ),
    },
    {
      title: '单价（成本价）',
      dataIndex: 'unit_price',
      width: 150,
      render: (_: unknown, record: OrderLine, index: number) => (
        <InputNumber
          style={{ width: '100%' }}
          value={record.unit_price}
          onChange={(value) => updateLine(index, 'unit_price', value || 0)}
          min={0}
          precision={2}
          prefix="¥"
          placeholder="请输入单价"
        />
      ),
    },
    {
      title: '折扣',
      dataIndex: 'discount_rate',
      width: 120,
      render: (_: unknown, record: OrderLine, index: number) => (
        <InputNumber
          style={{ width: '100%' }}
          value={record.discount_rate}
          onChange={(value) => updateLine(index, 'discount_rate', value || 1)}
          min={0}
          max={1}
          step={0.05}
          formatter={(value) => `${((value || 0) * 100).toFixed(0)}%`}
          parser={(value) => Number(value?.replace('%', '')) / 100}
        />
      ),
    },
    {
      title: '小计',
      width: 120,
      render: (_: unknown, record: OrderLine) => (
        <span style={{ fontWeight: 'bold', color: '#fa8c16' }}>
          ¥{formatMoney(calculateSubtotal(record))}
        </span>
      ),
    },
    {
      title: '操作',
      width: 80,
      render: (_: unknown, __: OrderLine, index: number) => (
        <Button
          type="link"
          danger
          icon={<MinusCircleOutlined />}
          onClick={() => removeLine(index)}
          disabled={lines.length === 1}
        />
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/purchase/orders')}>
          返回
        </Button>
        <h1 style={{ margin: 0 }}>新建采购订单</h1>
      </div>
      
      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            date: dayjs(),
            discount_rate: 1,
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item
              label="供应商"
              name="supplier_id"
              rules={[{ required: true, message: '请选择供应商' }]}
            >
              <Select
                placeholder="选择供应商"
                showSearch
                optionFilterProp="children"
              >
                {suppliers.map(s => (
                  <Select.Option key={s.supplier_id} value={s.supplier_id}>
                    {s.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="订单日期"
              name="date"
              rules={[{ required: true, message: '请选择订单日期' }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              label="预计交货日期"
              name="expected_delivery_date"
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              label="备注"
              name="remark"
            >
              <Input placeholder="可选" />
            </Form.Item>
          </div>

          <Divider>订单明细</Divider>

          <Table
            columns={columns}
            dataSource={lines}
            pagination={false}
            rowKey="key"
            summary={() => (
              <Table.Summary fixed>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={4} align="right">
                    <strong>订单总额：</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4}>
                    <span style={{ fontSize: 18, fontWeight: 'bold', color: '#fa8c16' }}>
                      ¥{formatMoney(calculateTotal())}
                    </span>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5} />
                  <Table.Summary.Cell index={6} />
                </Table.Summary.Row>
              </Table.Summary>
            )}
          />

          <div style={{ marginTop: 16 }}>
            <Button type="dashed" icon={<PlusOutlined />} onClick={addLine}>
              添加商品
            </Button>
          </div>

          <Divider />

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
                提交订单
              </Button>
              <Button onClick={() => navigate('/purchase/orders')}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default PurchaseForm;
