import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, InputNumber, Button, Card, message, Space, Divider, Select } from 'antd';
import { UserOutlined, LockOutlined, BankOutlined } from '@ant-design/icons';

import { authApi } from '@/services/auth';
import { companyApi } from '@/services/company';
import { saveToken, saveUser } from '@/utils';

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [companyLoading, setCompanyLoading] = useState(false);

  const onLogin = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const response = await authApi.login(values.username, values.password);
      if (response.success) {
        const { access_token, user } = response.data;
        saveToken(access_token);
        saveUser(user);
        message.success('登录成功');
        // 根据用户角色跳转到不同页面
        if (user.role === 'SuperAdmin') {
          navigate('/super-admin');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      // 显示后端返回的具体错误信息
      const errorMsg = error.response?.data?.detail || error.response?.data?.message || '用户名或密码错误，请重新输入';
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const onCreateCompany = async (values: any) => {
    setCompanyLoading(true);
    try {
      const response = await companyApi.create({
        name: values.name,
        size: values.size || 'Small',
        registered_capital: Number(values.registered_capital) || 0,
      });
      
      if (response.success) {
        const { admin_username, admin_password } = response.data;
        message.success(`企业创建成功！管理员账号：${admin_username}，密码：${admin_password}`, 10);
        setShowCompanyForm(false);
      }
    } catch (error: any) {
      console.error('Create company error:', error);
      // 显示后端返回的具体错误信息
      const errorMsg = error.response?.data?.detail || error.response?.data?.message || '创建企业失败，请重试';
      message.error(errorMsg);
    } finally {
      setCompanyLoading(false);
    }
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
      overflow: 'hidden',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
    }}>
      {/* 装饰性背景元素 */}
      <div style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        zIndex: 0,
      }}>
        {/* 大型装饰圆形 */}
        <div style={{
          position: 'absolute',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.1)',
          top: '-200px',
          right: '-200px',
          filter: 'blur(60px)',
          animation: 'float 20s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'rgba(118, 75, 162, 0.2)',
          bottom: '-150px',
          left: '-150px',
          filter: 'blur(50px)',
          animation: 'float 15s ease-in-out infinite reverse',
        }} />
        <div style={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'rgba(240, 147, 251, 0.15)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          filter: 'blur(40px)',
          animation: 'pulse 10s ease-in-out infinite',
        }} />
      </div>
      
      {/* 添加CSS动画样式 */}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(30px, -30px) scale(1.1);
          }
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 0.3;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 0.5;
            transform: translate(-50%, -50%) scale(1.2);
          }
        }
      `}</style>

      <Card
        style={{ 
          width: 400,
          position: 'relative',
          zIndex: 1,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          borderRadius: '16px',
          backdropFilter: 'blur(10px)',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
        }}
        title={
          <div style={{ textAlign: 'center', fontSize: 24, fontWeight: 'bold' }}>
            <BankOutlined style={{ marginRight: 8 }} />
            NovaFinance 财务系统
          </div>
        }
      >
        {!showCompanyForm ? (
          <>
            <Form
              name="login"
              onFinish={onLogin}
              autoComplete="off"
            >
              <Form.Item
                name="username"
                rules={[{ required: true, message: '请输入用户名' }]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="用户名"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[{ required: true, message: '请输入密码' }]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="密码"
                  size="large"
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                  size="large"
                >
                  登录
                </Button>
              </Form.Item>
            </Form>

            <Divider>或</Divider>

            <Button
              block
              size="large"
              onClick={() => setShowCompanyForm(true)}
            >
              初始化企业
            </Button>
          </>
        ) : (
          <>
            <Form
              name="company"
              onFinish={onCreateCompany}
              layout="vertical"
              initialValues={{
                size: 'Small',
                registered_capital: 0,
              }}
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
                <Select placeholder="请选择企业规模">
                  <Select.Option value="Small">小型</Select.Option>
                  <Select.Option value="Medium">中型</Select.Option>
                  <Select.Option value="Large">大型</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                label="注册资金（元）"
                name="registered_capital"
              >
                <InputNumber 
                  style={{ width: '100%' }}
                  min={0}
                  precision={2}
                  placeholder="请输入注册资金" 
                />
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={companyLoading}
                  >
                    创建企业
                  </Button>
                  <Button onClick={() => setShowCompanyForm(false)}>
                    返回登录
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </>
        )}
      </Card>
    </div>
  );
};

export default Login;

