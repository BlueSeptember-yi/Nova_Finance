import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Form, Input, Button, Card, Select, message, Space } from 'antd';
import { SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { userApi } from '@/services/user';
import { useAuth } from '@/services/auth';

const { Option } = Select;

const roleOptions = [
  { value: 'Owner', label: '店主' },
  { value: 'Accountant', label: '会计' },
  { value: 'Sales', label: '销售员' },
  { value: 'Purchaser', label: '采购员' },
];

const UserForm = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [isEdit, setIsEdit] = useState(false);

  useEffect(() => {
    if (id && id !== 'new') {
      setIsEdit(true);
      fetchUser(id);
    } else {
      // 新建用户时，默认设置公司ID
      if (user?.company_id) {
        form.setFieldsValue({ company_id: user.company_id });
      }
    }
  }, [id, user]);

  const fetchUser = async (userId: string) => {
    setLoading(true);
    try {
      const response = await userApi.getById(userId);
      if (response.success) {
        const userData = response.data;
        form.setFieldsValue({
          username: userData.username,
          role: userData.role,
        });
      }
    } catch (error: any) {
      message.error(error.response?.data?.detail || '获取用户信息失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      if (isEdit && id) {
        // 更新用户
        const updateData: any = {};
        if (values.role) updateData.role = values.role;
        if (values.password) updateData.password = values.password;
        
        const response = await userApi.update(id, updateData);
        if (response.success) {
          message.success('用户更新成功');
          navigate('/users');
        }
      } else {
        // 创建用户
        const response = await userApi.create({
          username: values.username,
          password: values.password,
          role: values.role,
          company_id: user?.company_id || '',
        });
        if (response.success) {
          message.success('用户创建成功');
          navigate('/users');
        }
      }
    } catch (error: any) {
      message.error(error.response?.data?.detail || (isEdit ? '更新失败' : '创建失败'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      title={isEdit ? '编辑用户' : '新增用户'}
      extra={
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/users')}
        >
          返回
        </Button>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          role: 'Accountant',
        }}
      >
        {!isEdit && (
          <Form.Item
            label="用户名"
            name="username"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, message: '用户名至少3个字符' },
              { max: 50, message: '用户名最多50个字符' },
              {
                pattern: /^[a-zA-Z0-9][a-zA-Z0-9_]*$/,
                message: '用户名必须以英文或数字开头，只能包含字母、数字和下划线',
              },
            ]}
          >
            <Input placeholder="请输入用户名（英文或数字开头，可包含下划线）" />
          </Form.Item>
        )}

        <Form.Item
          label="角色"
          name="role"
          rules={[{ required: true, message: '请选择角色' }]}
        >
          <Select placeholder="请选择角色">
            {roleOptions.map(option => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          label={isEdit ? '新密码（留空则不修改）' : '密码'}
          name="password"
          rules={
            isEdit
              ? [
                  () => ({
                    validator(_, value) {
                      if (!value) {
                        return Promise.resolve();
                      }
                      if (value.length < 8) {
                        return Promise.reject(new Error('密码至少8个字符'));
                      }
                      const hasDigit = /\d/.test(value);
                      const hasLetter = /[a-zA-Z]/.test(value);
                      const hasSymbol = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(value);
                      if (!hasDigit || !hasLetter || !hasSymbol) {
                        return Promise.reject(
                          new Error('密码必须包含数字、字母和常见符号（!@#$%^&*()_+-=[]{}|;:,.<>?）')
                        );
                      }
                      return Promise.resolve();
                    },
                  }),
                ]
              : [
                  { required: true, message: '请输入密码' },
                  { min: 8, message: '密码至少8个字符' },
                  {
                    validator(_, value) {
                      if (!value) {
                        return Promise.reject(new Error('请输入密码'));
                      }
                      const hasDigit = /\d/.test(value);
                      const hasLetter = /[a-zA-Z]/.test(value);
                      const hasSymbol = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(value);
                      if (!hasDigit || !hasLetter || !hasSymbol) {
                        return Promise.reject(
                          new Error('密码必须包含数字、字母和常见符号（!@#$%^&*()_+-=[]{}|;:,.<>?）')
                        );
                      }
                      return Promise.resolve();
                    },
                  },
                ]
          }
        >
          <Input.Password 
            placeholder={isEdit ? '留空则不修改密码（至少8位，包含数字、字母和符号）' : '请输入密码（至少8位，包含数字、字母和符号）'} 
          />
        </Form.Item>

        {isEdit && (
          <Form.Item
            label="确认新密码"
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const password = getFieldValue('password');
                  if (!password || !value || password === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="请再次输入密码" />
          </Form.Item>
        )}

        <Form.Item>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={loading}
            >
              {isEdit ? '更新' : '创建'}
            </Button>
            <Button onClick={() => navigate('/users')}>取消</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default UserForm;

