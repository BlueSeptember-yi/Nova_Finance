import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Form, Input, InputNumber, Button, Card, message, Space } from 'antd';
import { SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { productApi } from '@/services/product';

const ProductForm = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const isEdit = !!id;

  useEffect(() => {
    if (isEdit) {
      fetchProduct();
    }
  }, [id]);

  const fetchProduct = async () => {
    try {
      const response = await productApi.get(id!);
      if (response.success && response.data) {
        form.setFieldsValue({
          ...response.data,
          average_cost: response.data.average_cost || 0,
        });
      }
    } catch (error) {
      console.error('Fetch product error:', error);
      message.error('获取商品信息失败');
    }
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      let response;
      if (isEdit) {
        response = await productApi.update(id!, values);
      } else {
        response = await productApi.create(values);
      }
      
      if (response.success) {
        message.success(isEdit ? '更新成功' : '创建成功');
        navigate('/products');
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
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/products')}>
          返回
        </Button>
        <h1 style={{ margin: 0 }}>{isEdit ? '编辑商品' : '新增商品'}</h1>
      </div>
      
      <Card style={{ maxWidth: 800 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
        >
          <Form.Item
            label="SKU"
            name="sku"
            rules={[
              { required: true, message: '请输入SKU' },
              {
                pattern: /^[A-Z]{2}\d{3}$/,
                message: 'SKU格式错误：必须是2位字母+3位数字，例如：AB123',
              },
            ]}
            help="格式：2位字母+3位数字，例如：AB123"
          >
            <Input
              placeholder="例如：AB123（必填）"
              maxLength={5}
              style={{ textTransform: 'uppercase' }}
              onChange={(e) => {
                // 自动转换为大写，只允许字母和数字
                let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                // 限制长度为5
                if (value.length > 5) {
                  value = value.slice(0, 5);
                }
                // 实时更新表单值
                form.setFieldsValue({ sku: value });
              }}
            />
          </Form.Item>

          <Form.Item
            label="商品名称"
            name="name"
            rules={[{ required: true, message: '请输入商品名称' }]}
          >
            <Input placeholder="请输入商品名称" maxLength={100} />
          </Form.Item>

          <Form.Item
            label="售价"
            name="price"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              prefix="¥"
              placeholder="请输入售价"
            />
          </Form.Item>

          <Form.Item
            label="预估成本"
            name="cost"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              prefix="¥"
              placeholder="请输入成本"
            />
          </Form.Item>

          {id && (
            <Form.Item
              label="加权平均成本"
            >
              <InputNumber
                style={{ width: '100%' }}
                value={form.getFieldValue('average_cost')}
                disabled
                precision={2}
                prefix="¥"
                placeholder="暂无库存"
              />
            </Form.Item>
          )}

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
                {isEdit ? '保存修改' : '创建商品'}
              </Button>
              <Button onClick={() => navigate('/products')}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default ProductForm;

