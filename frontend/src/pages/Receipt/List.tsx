import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Table, Card, Space, Tag } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { paymentApi } from '@/services/payment';
import { formatDate, formatMoney } from '@/utils';
import type { Receipt } from '@/types';
import type { ColumnsType } from 'antd/es/table';

const ReceiptList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [receipts, setReceipts] = useState<Receipt[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await paymentApi.getReceiptList();
      if (response.success) {
        setReceipts(response.data || []);
      }
    } catch (error) {
      console.error('Fetch receipts error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const columns: ColumnsType<Receipt> = [
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
        <span style={{ color: '#52c41a', fontWeight: 500 }}>¥{formatMoney(amount)}</span>
      ),
    },
    {
      title: '收款方式',
      dataIndex: 'method',
      key: 'method',
      width: 100,
      render: (method: string) => {
        const methodMap: Record<string, string> = {
          'Cash': '现金',
          'BankTransfer': '银行转账',
          'Credit': '赊销',
        };
        return <Tag>{methodMap[method] || method}</Tag>;
      },
    },
    {
      title: '销售单ID',
      dataIndex: 'sales_order_id',
      key: 'sales_order_id',
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
        <h1 style={{ margin: 0 }}>收款管理</h1>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>
            刷新
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/receipts/new')}
          >
            新增收款
          </Button>
        </Space>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={receipts}
          rowKey="receipt_id"
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

export default ReceiptList;

