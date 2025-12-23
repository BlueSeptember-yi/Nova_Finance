import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Table, Space, Card, Tag, Row, Col, Statistic, Select, Modal, Descriptions, Divider, message, Form, Input } from 'antd';
import { PlusOutlined, ReloadOutlined, EyeOutlined, ShoppingCartOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { orderApi } from '@/services/order';
import { supplierApi } from '@/services/supplier';
import { formatDate, formatMoney, orderStatusMap, getUser, checkPermission } from '@/utils';
import type { PurchaseOrder, Supplier, OrderItem } from '@/types';
import type { ColumnsType } from 'antd/es/table';

const { Option } = Select;

const PurchaseList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [statusSelectOpen, setStatusSelectOpen] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [postModalVisible, setPostModalVisible] = useState(false);
  const [postingOrder, setPostingOrder] = useState<PurchaseOrder | null>(null);
  const [postForm] = Form.useForm();
  const [posting, setPosting] = useState(false);
  const user = getUser();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersRes, suppliersRes] = await Promise.all([
        orderApi.getPurchaseOrders(0, 100),
        supplierApi.getList(0, 100),
      ]);
      if (ordersRes.success) {
        setOrders(ordersRes.data || []);
      }
      if (suppliersRes.success) {
        setSuppliers(suppliersRes.data || []);
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

  const getSupplierName = (supplierId: string) => {
    const supplier = suppliers.find(s => s.supplier_id === supplierId);
    return supplier?.name || supplierId;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      Draft: 'default',
      Posted: 'processing',
      Paid: 'success',
    };
    return colors[status] || 'default';
  };

  const showDetail = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setDetailVisible(true);
  };

  const handlePost = async (order: PurchaseOrder) => {
    if (order.status !== 'Draft') {
      message.warning('只有草稿状态的订单才能过账');
      return;
    }

    // 设置要过账的订单并显示仓库位置填写对话框
    setPostingOrder(order);
    postForm.resetFields();
    
    // 初始化表单值：为每个有product_id的商品创建字段
    const initialValues: Record<string, string> = {};
    order.items.forEach((item: OrderItem) => {
      if (item.product_id) {
        initialValues[`warehouse_${item.product_id}`] = '';
      }
    });
    postForm.setFieldsValue(initialValues);
    
    setPostModalVisible(true);
  };

  const handlePostSubmit = async () => {
    if (!postingOrder) return;

    try {
      const values = await postForm.validateFields();
      
      // 构建仓库位置字典：key是product_id，value是warehouse_location
      const warehouse_locations: Record<string, string> = {};
      postingOrder.items.forEach((item: OrderItem) => {
        if (item.product_id) {
          const location = values[`warehouse_${item.product_id}`];
          if (location && location.trim()) {
            warehouse_locations[item.product_id] = location.trim();
          }
        }
      });

      if (!postingOrder.po_id) {
        message.error('订单ID不存在');
        return;
      }
      
      setPosting(true);
      const response = await orderApi.postPurchase(postingOrder.po_id, { warehouse_locations });
      
      if (response.success) {
        message.success(response.message || '过账成功');
        setPostModalVisible(false);
        setDetailVisible(false);
        postForm.resetFields();
        fetchData(); // 刷新列表
      } else {
        message.error(response.message || '过账失败');
      }
    } catch (error: any) {
      if (error.errorFields) {
        // 表单验证错误
        return;
      }
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
  const paidCount = orders.filter(o => o.status === 'Paid').length;

  const columns: ColumnsType<PurchaseOrder> = [
    {
      title: '订单编号',
      dataIndex: 'po_id',
      key: 'po_id',
      width: 100,
      render: (id: string) => <Tag>{id?.slice(0, 8)}...</Tag>,
    },
    {
      title: '供应商',
      dataIndex: 'supplier_id',
      key: 'supplier_id',
      width: 180,
      render: (supplierId: string) => <strong>{getSupplierName(supplierId)}</strong>,
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
      title: '预计交货',
      dataIndex: 'expected_delivery_date',
      key: 'expected_delivery_date',
      width: 120,
      render: (date: string) => date ? formatDate(date) : '-',
    },
    {
      title: '订单金额',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 150,
      align: 'right',
      sorter: (a, b) => (parseFloat(String(a.total_amount)) || 0) - (parseFloat(String(b.total_amount)) || 0),
      render: (amount: number) => (
        <span style={{ color: '#fa8c16', fontWeight: 'bold' }}>
          ¥{formatMoney(amount)}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{orderStatusMap[status] || status}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: unknown, record: PurchaseOrder) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => showDetail(record)}
          >
            详情
          </Button>
          {record.status === 'Draft' && user?.role && checkPermission(user.role, 'purchase:create') && (
            <Button
              type="link"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => handlePost(record)}
              style={{ color: '#52c41a' }}
            >
              过账
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* 页面标题 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>采购订单</h1>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>
            刷新
          </Button>
          {user?.role && checkPermission(user.role, 'purchase:create') && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/purchase/orders/new')}
            >
              新建采购单
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
              prefix={<ShoppingCartOutlined />}
              suffix="单"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="采购总额"
              value={totalAmount}
              precision={2}
              prefix="¥"
              styles={{ content: { color: '#fa8c16' } }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待过账"
              value={draftCount}
              suffix="单"
              styles={{ content: { color: '#999' } }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已支付"
              value={paidCount}
              suffix="单"
              styles={{ content: { color: '#52c41a' } }}
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
            onOpenChange={setStatusSelectOpen}
            onChange={(value) => {
              setStatusFilter(value);
              setStatusSelectOpen(false);
            }} 
            style={{ width: 150 }}
          >
            <Option value="all">全部状态</Option>
            <Option value="Draft">待过账</Option>
            <Option value="Posted">已过账</Option>
            <Option value="Paid">已支付</Option>
          </Select>
          <span style={{ color: '#999' }}>共 {filteredOrders.length} 条记录</span>
        </Space>
      </Card>

      {/* 数据表格 */}
      <Table
        columns={columns}
        dataSource={filteredOrders}
        rowKey="po_id"
        loading={loading}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
      />

      {/* 详情弹窗 */}
      <Modal
        title="采购订单详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={selectedOrder && (
          <Space>
            {selectedOrder.status === 'Draft' && user?.role && checkPermission(user.role, 'purchase:create') && (
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => handlePost(selectedOrder)}
              >
                过账
              </Button>
            )}
            <Button onClick={() => setDetailVisible(false)}>关闭</Button>
          </Space>
        )}
        width={700}
      >
        {selectedOrder && (
          <>
            <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="订单编号">{selectedOrder.po_id}</Descriptions.Item>
              <Descriptions.Item label="供应商">{getSupplierName(selectedOrder.supplier_id)}</Descriptions.Item>
              <Descriptions.Item label="订单日期">{formatDate(selectedOrder.date)}</Descriptions.Item>
              <Descriptions.Item label="预计交货">{selectedOrder.expected_delivery_date ? formatDate(selectedOrder.expected_delivery_date) : '-'}</Descriptions.Item>
              <Descriptions.Item label="订单金额">
                <span style={{ color: '#fa8c16', fontWeight: 'bold' }}>
                  ¥{formatMoney(selectedOrder.total_amount || 0)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={getStatusColor(selectedOrder.status || 'Draft')}>
                  {orderStatusMap[selectedOrder.status || 'Draft']}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="备注" span={2}>{selectedOrder.remark || '无'}</Descriptions.Item>
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

      {/* 过账仓库位置填写对话框 */}
      <Modal
        title="填写仓库位置"
        open={postModalVisible}
        onCancel={() => {
          setPostModalVisible(false);
          postForm.resetFields();
        }}
        onOk={handlePostSubmit}
        confirmLoading={posting}
        width={700}
        okText="确认过账"
        cancelText="取消"
      >
        {postingOrder && (
          <>
            <div style={{ marginBottom: 16 }}>
              <p>请为每个商品填写仓库位置（可选）。过账后将自动创建库存入库记录和会计分录。</p>
            </div>
            <Form form={postForm} layout="vertical">
              {postingOrder.items
                .filter((item: OrderItem) => item.product_id) // 只显示有product_id的商品
                .map((item: OrderItem, index: number) => (
                  <Form.Item
                    key={item.product_id || index}
                    label={
                      <span>
                        <strong>{item.product_name}</strong>
                        <span style={{ marginLeft: 8, color: '#999', fontSize: 12 }}>
                          数量: {item.quantity}
                        </span>
                      </span>
                    }
                    name={`warehouse_${item.product_id}`}
                  >
                    <Input
                      placeholder="请输入仓库位置（可选）"
                      maxLength={100}
                      allowClear
                    />
                  </Form.Item>
                ))}
            </Form>
          </>
        )}
      </Modal>
    </div>
  );
};

export default PurchaseList;
