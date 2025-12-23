import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Select, Button, Card, message, Space, InputNumber } from 'antd';
import { SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { bankApi } from '@/services/bank';

const { Option } = Select;
const { TextArea } = Input;

const BankAccountForm = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const response = await bankApi.createAccount({
        account_number: values.account_number,
        bank_name: values.bank_name,
        currency: values.currency || 'CNY',
        initial_balance: values.initial_balance || 0,
        remark: values.remark || '',
      });
      
      if (response.success) {
        message.success('银行账户创建成功');
        navigate('/bank/accounts');
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
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/bank/accounts')}>
          返回
        </Button>
        <h1 style={{ margin: 0 }}>新增银行账户</h1>
      </div>
      
      <Card style={{ maxWidth: 800 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            currency: 'CNY',
            initial_balance: 0,
          }}
        >
          <Form.Item
            label="银行名称"
            name="bank_name"
            rules={[{ required: true, message: '请输入银行名称' }]}
          >
            <Input placeholder="如：中国工商银行" maxLength={100} />
          </Form.Item>

          <Form.Item
            label="账号"
            name="account_number"
            rules={[{ required: true, message: '请输入账号' }]}
          >
            <Input placeholder="请输入银行账号" maxLength={50} />
          </Form.Item>

          <Form.Item
            label="币种"
            name="currency"
            rules={[{ required: true, message: '请选择币种' }]}
          >
            <Select>
              <Option value="CNY">人民币 (CNY)</Option>
              <Option value="USD">美元 (USD)</Option>
              <Option value="EUR">欧元 (EUR)</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="初始余额"
            name="initial_balance"
            rules={[{ type: 'number', message: '请输入有效的数字' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="请输入初始余额（可选，默认为0）"
              precision={2}
              min={0}
            />
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
                创建账户
              </Button>
              <Button onClick={() => navigate('/bank/accounts')}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default BankAccountForm;

