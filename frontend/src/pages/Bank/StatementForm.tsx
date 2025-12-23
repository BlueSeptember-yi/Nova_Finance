import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, DatePicker, Input, InputNumber, Select, Button, Card, message, Space } from 'antd';
import { SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { bankApi } from '@/services/bank';
import type { BankAccount } from '@/types';

const { Option } = Select;
const { TextArea } = Input;

const BankStatementForm = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  useEffect(() => {
    fetchBankAccounts();
  }, []);

  const fetchBankAccounts = async () => {
    try {
      const response = await bankApi.getAccounts();
      if (response.success) {
        setBankAccounts(response.data || []);
      }
    } catch (error) {
      console.error('Fetch bank accounts error:', error);
    }
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const response = await bankApi.createStatement({
        bank_account_id: values.bank_account_id,
        date: values.date.format('YYYY-MM-DD'),
        amount: values.amount,
        type: values.type,
        balance: values.balance,
        description: values.description || '',
      });
      
      if (response.success) {
        message.success('银行流水创建成功');
        navigate('/bank/statements');
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
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/bank/statements')}>
          返回
        </Button>
        <h1 style={{ margin: 0 }}>新增银行流水</h1>
      </div>
      
      <Card style={{ maxWidth: 800 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            date: dayjs(),
            type: 'Credit',
          }}
        >
          <Form.Item
            label="银行账户"
            name="bank_account_id"
            rules={[{ required: true, message: '请选择银行账户' }]}
          >
            <Select placeholder="选择银行账户" showSearch>
              {bankAccounts.map(account => (
                <Option key={account.bank_account_id} value={account.bank_account_id}>
                  {account.bank_name} - {account.account_number}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="交易日期"
            name="date"
            rules={[{ required: true, message: '请选择交易日期' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="类型"
            name="type"
            rules={[{ required: true, message: '请选择类型' }]}
          >
            <Select>
              <Option value="Credit">收入</Option>
              <Option value="Debit">支出</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="金额"
            name="amount"
            rules={[{ required: true, message: '请输入金额' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              prefix="¥"
              placeholder="请输入金额"
            />
          </Form.Item>

          <Form.Item
            label="余额"
            name="balance"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              prefix="¥"
              placeholder="当前余额（可选）"
            />
          </Form.Item>

          <Form.Item
            label="摘要"
            name="description"
          >
            <TextArea rows={4} placeholder="请输入摘要（可选）" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
                创建流水
              </Button>
              <Button onClick={() => navigate('/bank/statements')}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default BankStatementForm;

