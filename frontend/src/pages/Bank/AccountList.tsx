import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Table, Card, Space, Tag } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { bankApi } from '@/services/bank';
import { formatDate } from '@/utils';
import type { BankAccount } from '@/types';
import type { ColumnsType } from 'antd/es/table';

const BankAccountList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await bankApi.getAccounts();
      if (response.success) {
        setAccounts(response.data || []);
      }
    } catch (error) {
      console.error('Fetch bank accounts error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const columns: ColumnsType<BankAccount> = [
    {
      title: '银行名称',
      dataIndex: 'bank_name',
      key: 'bank_name',
    },
    {
      title: '账号',
      dataIndex: 'account_number',
      key: 'account_number',
    },
    {
      title: '币种',
      dataIndex: 'currency',
      key: 'currency',
      width: 100,
      render: (currency: string) => <Tag>{currency}</Tag>,
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      ellipsis: true,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (date: string) => formatDate(date, 'YYYY-MM-DD HH:mm'),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>银行账户</h1>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>
            刷新
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/bank/accounts/new')}
          >
            新增账户
          </Button>
        </Space>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={accounts}
          rowKey="bank_account_id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>
    </div>
  );
};

export default BankAccountList;

