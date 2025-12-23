import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Form, Input, Button, Card, message, Space } from 'antd';
import { SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { supplierApi } from '@/services/supplier';

const { TextArea } = Input;

const SupplierForm = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const isEdit = !!id;

  useEffect(() => {
    if (isEdit) {
      fetchSupplier();
    }
  }, [id]);

  const fetchSupplier = async () => {
    try {
      const response = await supplierApi.get(id!);
      if (response.success) {
        form.setFieldsValue(response.data);
      }
    } catch (error) {
      console.error('Fetch supplier error:', error);
      message.error('获取供应商信息失败');
    }
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      let response;
      if (isEdit) {
        response = await supplierApi.update(id!, values);
      } else {
        response = await supplierApi.create(values);
      }
      
      if (response.success) {
        message.success(isEdit ? '更新成功' : '创建成功');
        navigate('/suppliers');
      }
    } catch (error: any) {
      message.error(error.response?.data?.detail || (isEdit ? '更新失败' : '创建失败'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/suppliers')}>
          返回
        </Button>
        <h1 style={{ margin: 0 }}>{isEdit ? '编辑供应商' : '新增供应商'}</h1>
      </div>
      
      <Card style={{ maxWidth: 800 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
        >
          <Form.Item
            label="供应商名称"
            name="name"
            rules={[{ required: true, message: '请输入供应商名称' }]}
          >
            <Input placeholder="请输入供应商名称" maxLength={100} />
          </Form.Item>

          <Form.Item
            label="联系人"
            name="contact"
          >
            <Input placeholder="请输入联系人姓名" maxLength={100} />
          </Form.Item>

          <Form.Item
            label="联系电话"
            name="phone"
            rules={[{ required: true, message: '请输入联系电话' }]}
          >
            <Input placeholder="请输入联系电话" maxLength={20} />
          </Form.Item>

          <Form.Item
            label="邮箱"
            name="email"
          >
            <Input type="email" placeholder="请输入邮箱（可选）" maxLength={100} />
          </Form.Item>

          <Form.Item
            label="地址"
            name="address"
            rules={[{ required: true, message: '请输入地址' }]}
          >
            <Input placeholder="请输入详细地址" maxLength={255} />
          </Form.Item>

          <Form.Item
            label="税号"
            name="tax_no"
          >
            <Input placeholder="请输入税号（可选）" maxLength={50} />
          </Form.Item>

          <Form.Item
            label="银行账户"
            name="bank_account"
          >
            <Input placeholder="请输入银行账户（可选）" maxLength={50} />
          </Form.Item>

          <Form.Item
            label="备注"
            name="remark"
          >
            <TextArea rows={4} placeholder="请输入备注信息（可选）" maxLength={500} />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
                {isEdit ? '保存修改' : '创建供应商'}
              </Button>
              <Button onClick={() => navigate('/suppliers')}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default SupplierForm;
