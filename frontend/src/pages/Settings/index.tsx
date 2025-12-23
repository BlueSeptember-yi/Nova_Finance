import { Card, Tabs, Form, Input, Button, InputNumber, message } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, UserOutlined, BellOutlined, SecurityScanOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { companyApi } from '@/services/company';
import { useState, useEffect } from 'react';
import type { Company } from '@/types';

const Settings = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);

  useEffect(() => {
    loadCompanyInfo();
  }, []);

  const loadCompanyInfo = async () => {
    try {
      const response = await companyApi.get();
      if (response.success && response.data) {
        setCompany(response.data);
        form.setFieldsValue({
          name: response.data.name || '',
          size: response.data.size,
          registered_capital: response.data.registered_capital,
        });
      }
    } catch (error) {
      console.error('Load company info error:', error);
    }
  };

  const onSave = async (values: any) => {
    setLoading(true);
    try {
      const response = await companyApi.update(company!.company_id, values);
      if (response.success) {
        message.success('设置保存成功');
        loadCompanyInfo();
      }
    } catch (error: any) {
      message.error(error.response?.data?.detail || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  const tabItems = [
    {
      key: 'company',
      label: (
        <span>
          <UserOutlined />
          企业信息
        </span>
      ),
      children: (
        <Form
          form={form}
          layout="vertical"
          onFinish={onSave}
          style={{ maxWidth: 600 }}
        >
          <Form.Item
            label="企业名称"
            name="name"
            rules={[{ required: true, message: '请输入企业名称' }]}
          >
            <Input placeholder="请输入企业名称" />
          </Form.Item>

          <Form.Item
            label="企业规模"
            name="size"
          >
            <Input placeholder="Small / Medium / Large" disabled />
          </Form.Item>

          <Form.Item
            label="注册资金（元）"
            name="registered_capital"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              placeholder="注册资金"
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
              保存修改
            </Button>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: 'notification',
      label: (
        <span>
          <BellOutlined />
          通知设置
        </span>
      ),
      children: (
        <div>
          <p>通知设置功能开发中...</p>
        </div>
      ),
    },
    {
      key: 'security',
      label: (
        <span>
          <SecurityScanOutlined />
          安全设置
        </span>
      ),
      children: (
        <div>
          <p>安全设置功能开发中...</p>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          返回
        </Button>
        <h1 style={{ margin: 0 }}>系统设置</h1>
      </div>

      <Card>
        <Tabs items={tabItems} />
      </Card>
    </div>
  );
};

export default Settings;

