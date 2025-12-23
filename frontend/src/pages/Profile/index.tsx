import { useEffect, useState } from 'react';
import { Card, Descriptions, Tag, Button, Space, Modal, Form, Input, message } from 'antd';
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/services/auth';
import { getUser, userRoleMap } from '@/utils';
import type { User } from '@/types';

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    setLoading(true);
    try {
      const response = await authApi.getCurrentUser();
      if (response.success) {
        setUser(response.data);
        // 更新本地存储的用户信息
        localStorage.setItem('user', JSON.stringify(response.data));
      }
    } catch (error) {
      console.error('Load user info error:', error);
      // 如果获取失败，使用本地存储的用户信息
      setUser(getUser());
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    form.setFieldsValue({
      username: user?.username || '',
    });
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    form.resetFields();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const response = await authApi.updateProfile({ username: values.username });
      if (response.success) {
        message.success('个人资料更新成功');
        setUser(response.data);
        // 更新本地存储的用户信息
        localStorage.setItem('user', JSON.stringify(response.data));
        setEditing(false);
        form.resetFields();
      }
    } catch (error: any) {
      if (error.response?.data?.detail) {
        message.error(error.response.data.detail);
      } else {
        message.error('更新失败，请重试');
      }
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const localUser = getUser();
  const displayUser = user || localUser;

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          返回
        </Button>
        <h1 style={{ margin: 0 }}>个人资料</h1>
      </div>

      <Card loading={loading}>
        <Descriptions title="用户信息" bordered column={2}>
          <Descriptions.Item label="用户名">
            {displayUser?.username || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="角色">
            <Tag color={
              displayUser?.role === 'Owner' ? 'gold' :
              displayUser?.role === 'Accountant' ? 'blue' :
              displayUser?.role === 'Sales' ? 'green' :
              displayUser?.role === 'Purchaser' ? 'purple' : 'default'
            }>
              {userRoleMap[displayUser?.role || ''] || displayUser?.role || '-'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {formatDate(displayUser?.created_at)}
          </Descriptions.Item>
          <Descriptions.Item label="所属企业">
            {displayUser?.company_name || displayUser?.company_id || '-'}
          </Descriptions.Item>
        </Descriptions>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Space>
            <Button type="primary" icon={<EditOutlined />} onClick={handleEdit}>
              编辑资料
            </Button>
            <Button onClick={() => navigate('/settings')}>
              前往设置
            </Button>
          </Space>
        </div>
      </Card>

      <Modal
        title="编辑个人资料"
        open={editing}
        onOk={handleSubmit}
        onCancel={handleCancel}
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
        >
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
            <Input placeholder="请输入用户名" />
          </Form.Item>
          <p style={{ color: '#999', fontSize: '12px', marginTop: '-8px' }}>
            企业信息修改请前往系统设置
          </p>
        </Form>
      </Modal>
    </div>
  );
};

export default Profile;

