import { useEffect, useState } from 'react';
import { Button, Table, Card, Space, Tag } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { inventoryApi } from '@/services/inventory';
import { formatDate } from '@/utils';
import type { InventoryItem } from '@/types';
import type { ColumnsType } from 'antd/es/table';

const InventoryList = () => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<InventoryItem[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await inventoryApi.getItems();
      if (response.success) {
        setItems(response.data || []);
      }
    } catch (error) {
      console.error('Fetch inventory items error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const columns: ColumnsType<InventoryItem> = [
    {
      title: '商品名称',
      key: 'product_name',
      width: 200,
      render: (_: unknown, record: InventoryItem) => {
        if (record.product_name) {
          return (
            <div>
              <div style={{ fontWeight: 500 }}>{record.product_name}</div>
              {record.product_sku && (
                <div style={{ fontSize: 12, color: '#999' }}>SKU: {record.product_sku}</div>
              )}
            </div>
          );
        }
        return <span style={{ color: '#999' }}>商品ID: {record.product_id}</span>;
      },
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 120,
      align: 'right',
      render: (quantity: number | string) => {
        if (quantity == null) {
          return '0.00';
        }
        // 处理字符串类型的数量（Decimal序列化后可能是字符串）
        const numValue = typeof quantity === 'string' ? parseFloat(quantity) : quantity;
        if (isNaN(numValue)) {
          return '0.00';
        }
        return numValue.toFixed(2);
      },
    },
    {
      title: '仓库位置',
      key: 'warehouse_location',
      width: 200,
      render: (_: unknown, record: InventoryItem) => {
        // 优先显示汇总的位置列表
        if (record.warehouse_locations && record.warehouse_locations.length > 0) {
          return (
            <div>
              {record.warehouse_locations.map((loc, index) => (
                <div key={index} style={{ marginBottom: index < record.warehouse_locations!.length - 1 ? 4 : 0 }}>
                  <Tag color="blue">{loc}</Tag>
                </div>
              ))}
            </div>
          );
        }
        // 如果没有汇总位置，显示单个位置
        return record.warehouse_location ? <Tag>{record.warehouse_location}</Tag> : <span style={{ color: '#999' }}>-</span>;
      },
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 160,
      render: (date: string) => formatDate(date, 'YYYY-MM-DD HH:mm'),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>库存管理</h1>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>
            刷新
          </Button>
        </Space>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={items}
          rowKey="inventory_id"
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

export default InventoryList;

