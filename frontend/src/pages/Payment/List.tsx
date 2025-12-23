import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Table, Card, Space, Tag } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { paymentApi } from '@/services/payment';
import { formatDate, formatMoney } from '@/utils';
import type { Payment } from '@/types';
import type { ColumnsType } from 'antd/es/table';

const PaymentList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await paymentApi.getList();
      if (response.success) {
        setPayments(response.data || []);
      }
    } catch (error) {
      console.error('Fetch payments error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const columns: ColumnsType<Payment> = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (date: string) => formatDate(date),
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 150,
      align: 'right',
      render: (amount: number) => (
        <span style={{ color: '#f5222d', fontWeight: 500 }}>¥{formatMoney(amount)}</span>
      ),
    },
    {
      title: '付款方式',
      dataIndex: 'payment_method',
      key: 'payment_method',
      width: 100,
      render: (method: string) => {
        const methodMap: Record<string, string> = {
          'Cash': '现金',
          'BankTransfer': '银行转账',
          'Credit': '赊购',
        };
        return <Tag>{methodMap[method] || method}</Tag>;
      },
    },
    {
      title: '采购单ID',
      dataIndex: 'purchase_order_id',
      key: 'purchase_order_id',
      ellipsis: true,
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
        <h1 style={{ margin: 0 }}>付款管理</h1>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>
            刷新
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/payments/new')}
          >
            新增付款
          </Button>
        </Space>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={payments}
          rowKey="payment_id"
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

export default PaymentList;

