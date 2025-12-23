import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Table, Space, Card, Tag, Row, Col, Statistic, Select, Modal, Descriptions, Divider, message, Alert, Tooltip } from 'antd';
import { PlusOutlined, ReloadOutlined, EyeOutlined, ShoppingOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { orderApi } from '@/services/order';
import { customerApi } from '@/services/customer';
import { inventoryApi } from '@/services/inventory';
import { formatDate, formatMoney, orderStatusMap, getUser, checkPermission } from '@/utils';
import type { SalesOrder, Customer, OrderItem } from '@/types';
import type { ColumnsType } from 'antd/es/table';

const { Option } = Select;

const paymentMethodMap: Record<string, string> = {
  Cash: '现金',
  BankTransfer: '银行转账',
  Credit: '赊销',
};

const SalesList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [statusSelectOpen, setStatusSelectOpen] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [postModalVisible, setPostModalVisible] = useState(false);
  const [postingOrder, setPostingOrder] = useState<SalesOrder | null>(null);
  const [posting, setPosting] = useState(false);
  const [inventoryData, setInventoryData] = useState<Record<string, number>>({});
  const [loadingInventory, setLoadingInventory] = useState(false);
  const user = getUser();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersRes, customersRes] = await Promise.all([
        orderApi.getSalesOrders(0, 100),
        customerApi.getList(0, 100),
      ]);
      if (ordersRes.success) {
        setOrders(ordersRes.data || []);
      }
      if (customersRes.success) {
        setCustomers(customersRes.data || []);
      }
    } catch (error) {
      console.error('Fetch data error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getCustomerName = (customerId: string) => {
    const customer = customers.find(c => c.customer_id === customerId);
    return customer?.name || customerId;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      Draft: 'default',
      Posted: 'processing',
      Collected: 'success',
    };
    return colors[status] || 'default';
  };

  // 检查订单是否需要显示信用额度警告
  const shouldShowCreditWarning = (order: SalesOrder) => {
    if (order.status !== 'Draft' || order.payment_method !== 'Credit') {
      return false;
    }
    const customer = customers.find(c => c.customer_id === order.customer_id);
    // 如果客户没有信用额度或信用额度为0，显示警告
    if (!customer || customer.credit_limit <= 0) {
      return true;
    }
    // 对于有信用额度的客户，也显示提示（因为可能额度不足）
    return true;
  };

  // 获取信用额度警告提示内容
  const getCreditWarningTooltip = (order: SalesOrder) => {
    const customer = customers.find(c => c.customer_id === order.customer_id);
    if (!customer) {
      return '客户信息不存在';
    }
    if (customer.credit_limit <= 0) {
      return '该客户未设置信用额度，无法对赊销订单进行过账';
    }
    return `该订单为赊销订单，过账时会检查信用额度。如果客户当前欠款加上本次订单金额超出信用额度（¥${formatMoney(customer.credit_limit)}），将无法过账。请确保客户有足够的可用额度。`;
  };

  const showDetail = (order: SalesOrder) => {
    setSelectedOrder(order);
    setDetailVisible(true);
  };

  const handlePost = async (order: SalesOrder) => {
    if (order.status !== 'Draft') {
      message.warning('只有草稿状态的订单才能过账');
      return;
    }

    // 查询每个商品的库存信息（只检查总库存）
    setLoadingInventory(true);
    const inventoryMap: Record<string, number> = {};
    
    try {
      for (const item of order.items) {
        if (item.product_id) {
          try {
            // 通过product_id查询库存
            const response = await inventoryApi.getItems({ product_id: item.product_id });
            if (response.success && response.data && response.data.length > 0) {
              inventoryMap[item.product_id] = response.data[0].quantity || 0;
            } else {
              inventoryMap[item.product_id] = 0;
            }
          } catch (error) {
            console.error(`Failed to load inventory for product ${item.product_id}:`, error);
            inventoryMap[item.product_id] = 0;
          }
        }
      }
      setInventoryData(inventoryMap as any);
      
      // 检查库存是否充足
      const insufficientItems: string[] = [];
      for (const item of order.items) {
        if (item.product_id) {
          const available = inventoryMap[item.product_id] || 0;
          if (available < item.quantity) {
            insufficientItems.push(`${item.product_name} (可用: ${available.toFixed(2)}, 需要: ${item.quantity})`);
          }
        }
      }
      
      if (insufficientItems.length > 0) {
        message.error(`库存不足：\n${insufficientItems.join('\n')}`);
        setLoadingInventory(false);
        return;
      }
      
      // 设置要过账的订单并显示确认对话框
      setPostingOrder(order);
      setPostModalVisible(true);
    } catch (error) {
      message.error('加载库存信息失败');
    } finally {
      setLoadingInventory(false);
    }
  };

  const handlePostSubmit = async () => {
    if (!postingOrder || !postingOrder.so_id) {
      message.error('订单信息不完整');
      return;
    }

    setPosting(true);
    try {
      // 简化版：不需要传递任何参数，后端会自动检查总库存
      const response = await orderApi.postSales(postingOrder.so_id);
      
      if (response.success) {
        message.success(response.message || '过账成功');
        setPostModalVisible(false);
        setDetailVisible(false);
        setInventoryData({});
        fetchData(); // 刷新列表
      } else {
        message.error(response.message || '过账失败');
      }
    } catch (error: any) {
      message.error(error.response?.data?.detail || '过账失败');
    } finally {
      setPosting(false);
    }
  };

  // 筛选
  const filteredOrders = statusFilter === 'all'
    ? orders
    : orders.filter(o => o.status === statusFilter);

  // 统计
  const totalAmount = orders.reduce((sum, o) => sum + (parseFloat(String(o.total_amount)) || 0), 0);
  const draftCount = orders.filter(o => o.status === 'Draft').length;
  const collectedCount = orders.filter(o => o.status === 'Collected').length;

  const columns: ColumnsType<SalesOrder> = [
    {
      title: '订单编号',
      dataIndex: 'so_id',
      key: 'so_id',
      width: 100,
      render: (id: string) => <Tag>{id?.slice(0, 8)}...</Tag>,
    },
    {
      title: '客户',
      dataIndex: 'customer_id',
      key: 'customer_id',
      width: 180,
      render: (customerId: string) => <strong>{getCustomerName(customerId)}</strong>,
    },
    {
      title: '订单日期',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      sorter: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      render: (date: string) => formatDate(date),
    },
    {
      title: '收款方式',
      dataIndex: 'payment_method',
      key: 'payment_method',
      width: 100,
      render: (method: string) => (
        <Tag color={method === 'Credit' ? 'orange' : 'blue'}>
          {paymentMethodMap[method] || method || '-'}
        </Tag>
      ),
    },
    {
      title: '订单金额',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 150,
      align: 'right',
      sorter: (a, b) => (parseFloat(String(a.total_amount)) || 0) - (parseFloat(String(b.total_amount)) || 0),
      render: (amount: number) => (
        <span style={{ color: '#eb2f96', fontWeight: 'bold' }}>
          ¥{formatMoney(amount)}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string, record: SalesOrder) => (
        <Space>
          <Tag color={getStatusColor(status)}>{orderStatusMap[status] || status}</Tag>
          {shouldShowCreditWarning(record) && (
            <Tooltip title={getCreditWarningTooltip(record)}>
              <ExclamationCircleOutlined style={{ color: '#faad14', fontSize: 14 }} />
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: unknown, record: SalesOrder) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => showDetail(record)}
          >
            详情
          </Button>
          {record.status === 'Draft' && user?.role && checkPermission(user.role, 'sales:create') && (
            <Tooltip 
              title={record.payment_method === 'Credit' ? getCreditWarningTooltip(record) : undefined}
              placement="top"
            >
              <Button
                type="link"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handlePost(record)}
                style={{ 
                  color: record.payment_method === 'Credit' && shouldShowCreditWarning(record) ? '#faad14' : '#52c41a' 
                }}
              >
                过账
                {record.payment_method === 'Credit' && shouldShowCreditWarning(record) && (
                  <ExclamationCircleOutlined style={{ marginLeft: 4, fontSize: 12 }} />
                )}
              </Button>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* 页面标题 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>销售订单</h1>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>
            刷新
          </Button>
          {user?.role && checkPermission(user.role, 'sales:create') && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/sales/orders/new')}
            >
              新建销售单
            </Button>
          )}
        </Space>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="订单总数"
              value={orders.length}
              prefix={<ShoppingOutlined />}
              suffix="单"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="销售总额"
              value={totalAmount}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#eb2f96' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待过账"
              value={draftCount}
              suffix="单"
              valueStyle={{ color: '#999' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已收款"
              value={collectedCount}
              suffix="单"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space>
          <span>状态筛选：</span>
          <Select 
            value={statusFilter} 
            open={statusSelectOpen}
            onDropdownVisibleChange={setStatusSelectOpen}
            onChange={(value) => {
              setStatusFilter(value);
              setStatusSelectOpen(false);
            }} 
            style={{ width: 150 }}
          >
            <Option value="all">全部状态</Option>
            <Option value="Draft">待过账</Option>
            <Option value="Posted">已过账</Option>
            <Option value="Collected">已收款</Option>
          </Select>
          <span style={{ color: '#999' }}>共 {filteredOrders.length} 条记录</span>
        </Space>
      </Card>

      {/* 数据表格 */}
      <Table
        columns={columns}
        dataSource={filteredOrders}
        rowKey="so_id"
        loading={loading}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
      />

      {/* 详情弹窗 */}
      <Modal
        title="销售订单详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={selectedOrder && (
          <Space>
            {selectedOrder.status === 'Draft' && user?.role && checkPermission(user.role, 'sales:create') && (
              <Tooltip 
                title={selectedOrder.payment_method === 'Credit' ? getCreditWarningTooltip(selectedOrder) : undefined}
                placement="top"
              >
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handlePost(selectedOrder)}
                  danger={selectedOrder.payment_method === 'Credit' && shouldShowCreditWarning(selectedOrder)}
                >
                  过账
                  {selectedOrder.payment_method === 'Credit' && shouldShowCreditWarning(selectedOrder) && (
                    <ExclamationCircleOutlined style={{ marginLeft: 4 }} />
                  )}
                </Button>
              </Tooltip>
            )}
            <Button onClick={() => setDetailVisible(false)}>关闭</Button>
          </Space>
        )}
        width={700}
      >
        {selectedOrder && (
          <>
            {shouldShowCreditWarning(selectedOrder) && (
              <Alert
                message="信用额度提示"
                description={getCreditWarningTooltip(selectedOrder)}
                type="warning"
                showIcon
                icon={<ExclamationCircleOutlined />}
                style={{ marginBottom: 16 }}
              />
            )}
            <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="订单编号">{selectedOrder.so_id}</Descriptions.Item>
              <Descriptions.Item label="客户">{getCustomerName(selectedOrder.customer_id)}</Descriptions.Item>
              <Descriptions.Item label="订单日期">{formatDate(selectedOrder.date)}</Descriptions.Item>
              <Descriptions.Item label="预计发货">{selectedOrder.expected_delivery_date ? formatDate(selectedOrder.expected_delivery_date) : '-'}</Descriptions.Item>
              <Descriptions.Item label="收款方式">
                <Tag color={selectedOrder.payment_method === 'Credit' ? 'orange' : 'blue'}>
                  {paymentMethodMap[selectedOrder.payment_method || ''] || selectedOrder.payment_method || '-'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="订单金额">
                <span style={{ color: '#eb2f96', fontWeight: 'bold' }}>
                  ¥{formatMoney(selectedOrder.total_amount || 0)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={getStatusColor(selectedOrder.status || 'Draft')}>
                  {orderStatusMap[selectedOrder.status || 'Draft']}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="备注">{selectedOrder.remark || '无'}</Descriptions.Item>
            </Descriptions>

            <h4>订单明细</h4>
            <div style={{ border: '1px solid #d9d9d9', borderRadius: 4 }}>
              {selectedOrder.items.map((item: OrderItem, index: number) => (
                <div key={item.item_id || index}>
                  <div style={{ padding: '12px 16px' }}>
                    <Row style={{ width: '100%' }} align="middle">
                      <Col span={8}><strong>{item.product_name}</strong></Col>
                      <Col span={4} style={{ textAlign: 'center' }}>数量: {item.quantity}</Col>
                      <Col span={4} style={{ textAlign: 'right' }}>单价: ¥{formatMoney(item.unit_price)}</Col>
                      <Col span={4} style={{ textAlign: 'right' }}>
                        {item.discount_rate < 1 && <Tag color="red">{(item.discount_rate * 100).toFixed(0)}%折</Tag>}
                      </Col>
                      <Col span={4} style={{ textAlign: 'right', fontWeight: 'bold' }}>
                        ¥{formatMoney(item.subtotal || item.quantity * item.unit_price * item.discount_rate)}
                      </Col>
                    </Row>
                  </div>
                  {index < selectedOrder.items.length - 1 && <Divider style={{ margin: 0 }} />}
                </div>
              ))}
            </div>
          </>
        )}
      </Modal>

      {/* 过账确认对话框 */}
      <Modal
        title="确认过账"
        open={postModalVisible}
        onCancel={() => {
          setPostModalVisible(false);
          setInventoryData({});
        }}
        onOk={handlePostSubmit}
        confirmLoading={posting || loadingInventory}
        width={700}
        okText="确认过账"
        cancelText="取消"
      >
        {postingOrder && (
          <>
            <Alert
              message="过账前将检查库存是否充足，过账后将自动创建库存出库记录和会计分录。"
              type="info"
              style={{ marginBottom: 16 }}
            />
            
            <div style={{ marginBottom: 16 }}>
              <h4>订单明细及库存情况：</h4>
              {postingOrder.items
                .filter((item: OrderItem) => item.product_id)
                .map((item: OrderItem) => {
                  const available = inventoryData[item.product_id || ''] || 0;
                  const isSufficient = available >= item.quantity;
                  
                  return (
                    <div key={item.product_id} style={{ 
                      marginBottom: 12, 
                      padding: 12, 
                      border: '1px solid #d9d9d9', 
                      borderRadius: 4,
                      backgroundColor: isSufficient ? '#f6ffed' : '#fff2e8'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong>{item.product_name}</strong>
                          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                            订单数量: {item.quantity} | 可用库存: {available.toFixed(2)}
                          </div>
                        </div>
                        {isSufficient ? (
                          <Tag color="green">库存充足</Tag>
                        ) : (
                          <Tag color="red">库存不足</Tag>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default SalesList;
