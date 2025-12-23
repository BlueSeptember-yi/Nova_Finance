import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, DatePicker, Input, InputNumber, Select, Button, Card, message, Space } from 'antd';
import { SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { paymentApi } from '@/services/payment';

const { Option } = Select;
const { TextArea } = Input;

interface AvailableSalesOrder {
  so_id: string;
  customer_id: string;
  date: string;
  total_amount: number;
  received_amount: number;
  unreceived_amount: number;
  status: string;
  payment_method?: 'Cash' | 'BankTransfer' | 'Credit';
}

const ReceiptForm = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [salesOrders, setSalesOrders] = useState<AvailableSalesOrder[]>([]);
  const [selectedSalesOrderId, setSelectedSalesOrderId] = useState<string | undefined>();

  useEffect(() => {
    fetchAvailableSalesOrders();
  }, []);

  const fetchAvailableSalesOrders = async () => {
    try {
      const response = await paymentApi.getAvailableSalesOrders();
      if (response.success) {
        setSalesOrders(response.data || []);
      }
    } catch (error) {
      console.error('Fetch available sales orders error:', error);
    }
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const response = await paymentApi.createReceipt({
        sales_order_id: values.sales_order_id,
        date: values.date.format('YYYY-MM-DD'),
        amount: values.amount,
        method: values.method,
        remark: values.remark || '',
      });
      
      if (response.success) {
        message.success('收款记录创建成功');
        // 如果关联了销售单，刷新可收款销售单列表
        if (values.sales_order_id) {
          fetchAvailableSalesOrders();
        }
        navigate('/receipts');
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
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/receipts')}>
          返回
        </Button>
        <h1 style={{ margin: 0 }}>新增收款记录</h1>
      </div>
      
      <Card style={{ maxWidth: 800 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            date: dayjs(),
            method: 'Cash',
          }}
        >
          <Form.Item
            label="销售单"
            name="sales_order_id"
          >
            <Select 
              placeholder="选择销售单（可选）" 
              allowClear 
              showSearch
              onChange={(value) => {
                setSelectedSalesOrderId(value);
                if (value) {
                  const selectedOrder = salesOrders.find(so => so.so_id === value);
                  if (selectedOrder) {
                    // 自动填充未收金额
                    // 如果销售单是赊销，收款方式不自动填充，让用户选择实际收款方式
                    // 如果销售单是现金或银行转账，自动填充对应的收款方式
                    const autoFillMethod = selectedOrder.payment_method === 'Credit' 
                      ? undefined  // 赊销时不自动填充，让用户选择实际收款方式
                      : (selectedOrder.payment_method || 'Cash');
                    
                    form.setFieldsValue({
                      method: autoFillMethod,
                      amount: selectedOrder.unreceived_amount || 0,
                    });
                  }
                } else {
                  // 清空选择时，清空自动填充的字段
                  setSelectedSalesOrderId(undefined);
                  form.setFieldsValue({
                    method: 'Cash',
                    amount: undefined,
                  });
                }
              }}
            >
              {salesOrders.map(so => (
                <Option key={so.so_id} value={so.so_id}>
                  {so.so_id} - ¥{so.total_amount} (未收: ¥{so.unreceived_amount})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="收款日期"
            name="date"
            rules={[{ required: true, message: '请选择收款日期' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="收款金额"
            name="amount"
            rules={[{ required: true, message: '请输入收款金额' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              prefix="¥"
              placeholder="请输入收款金额"
            />
          </Form.Item>

          <Form.Item
            label="收款方式"
            name="method"
            rules={[{ required: true, message: '请选择收款方式' }]}
            extra={selectedSalesOrderId && salesOrders.find(so => so.so_id === selectedSalesOrderId)?.payment_method === 'Credit' 
              ? '该销售单为赊销，请选择实际收款方式（现金或银行转账）'
              : undefined}
          >
            <Select>
              <Option value="Cash">现金</Option>
              <Option value="BankTransfer">银行转账</Option>
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
                创建收款记录
              </Button>
              <Button onClick={() => navigate('/receipts')}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default ReceiptForm;

