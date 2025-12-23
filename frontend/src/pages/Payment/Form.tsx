import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, DatePicker, Input, InputNumber, Select, Button, Card, message, Space, Alert } from 'antd';
import { SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { paymentApi } from '@/services/payment';

const { Option } = Select;
const { TextArea } = Input;

interface AvailableOrder {
  po_id: string;
  supplier_id: string;
  date: string;
  total_amount: number;
  paid_amount: number;
  unpaid_amount: number;
  status: string;
}

const PaymentForm = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [availableOrders, setAvailableOrders] = useState<AvailableOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<AvailableOrder | null>(null);

  useEffect(() => {
    fetchAvailableOrders();
  }, []);

  const fetchAvailableOrders = async () => {
    try {
      const response = await paymentApi.getAvailableOrders();
      if (response.success) {
        setAvailableOrders(response.data || []);
      }
    } catch (error) {
      console.error('Fetch available orders error:', error);
      message.error('获取可付款采购单失败');
    }
  };

  const handleOrderChange = (poId: string | undefined) => {
    if (poId) {
      const order = availableOrders.find(o => o.po_id === poId);
      setSelectedOrder(order || null);
      // 自动设置最大金额为未付金额
      if (order) {
        form.setFieldsValue({ amount: order.unpaid_amount });
      }
    } else {
      setSelectedOrder(null);
      form.setFieldsValue({ amount: undefined });
    }
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const response = await paymentApi.create({
        purchase_order_id: values.purchase_order_id,
        date: values.date.format('YYYY-MM-DD'),
        amount: values.amount,
        payment_method: values.payment_method,
        remark: values.remark || '',
      });
      
      if (response.success) {
        message.success('付款记录创建成功');
        navigate('/payments');
      }
    } catch (error: any) {
      message.error(error.response?.data?.detail || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/payments')}>
          返回
        </Button>
        <h1 style={{ margin: 0 }}>新增付款记录</h1>
      </div>
      
      <Card style={{ maxWidth: 800 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            date: dayjs(),
            payment_method: 'BankTransfer',
          }}
        >
          <Form.Item
            label="采购单"
            name="purchase_order_id"
            tooltip="选择采购单后，必须一次付清，不允许部分支付"
          >
            <Select 
              placeholder="选择采购单" 
              allowClear 
              showSearch
              onChange={handleOrderChange}
              filterOption={(input, option) => {
                const label = option?.label as string | undefined;
                return label ? label.toLowerCase().includes(input.toLowerCase()) : false;
              }}
              optionLabelProp="label"
            >
              {availableOrders.map(order => {
                const label = `${order.po_id} - 总金额: ¥${order.total_amount.toFixed(2)} - 未付: ¥${order.unpaid_amount.toFixed(2)}`;
                return (
                  <Option key={order.po_id} value={order.po_id} label={label}>
                    {label}
                  </Option>
                );
              })}
            </Select>
          </Form.Item>

          {selectedOrder && (
            <Alert
              message={`采购单信息：总金额 ¥${selectedOrder.total_amount.toFixed(2)}，已付 ¥${selectedOrder.paid_amount.toFixed(2)}，未付 ¥${selectedOrder.unpaid_amount.toFixed(2)}。付款金额已自动设置为未付金额。`}
              type="info"
              style={{ marginBottom: 16 }}
            />
          )}

          <Form.Item
            label="付款日期"
            name="date"
            rules={[{ required: true, message: '请选择付款日期' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="付款金额"
            name="amount"
            rules={[
              { required: true, message: '请输入付款金额' },
              {
                validator: (_, value) => {
                  if (!value || value <= 0) {
                    return Promise.reject(new Error('付款金额必须大于0'));
                  }
                  // 如果选择了采购单，付款金额必须等于未付金额（必须一次付清）
                  if (selectedOrder) {
                    if (Math.abs(value - selectedOrder.unpaid_amount) > 0.01) {
                      return Promise.reject(new Error(`必须一次付清，付款金额必须等于未付金额 ¥${selectedOrder.unpaid_amount.toFixed(2)}`));
                    }
                  }
                  return Promise.resolve();
                }
              }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              max={selectedOrder ? selectedOrder.unpaid_amount : undefined}
              precision={2}
              prefix="¥"
              readOnly={!!selectedOrder}
              placeholder={selectedOrder ? `必须一次付清：¥${selectedOrder.unpaid_amount.toFixed(2)}` : '请输入付款金额'}
            />
          </Form.Item>

          <Form.Item
            label="付款方式"
            name="payment_method"
            rules={[{ required: true, message: '请选择付款方式' }]}
          >
            <Select>
              <Option value="Cash">现金</Option>
              <Option value="BankTransfer">银行转账</Option>
              <Option value="Credit">赊购</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="备注"
            name="remark"
          >
            <TextArea rows={4} placeholder="请输入备注（可选）" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
                创建付款记录
              </Button>
              <Button onClick={() => navigate('/payments')}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default PaymentForm;

