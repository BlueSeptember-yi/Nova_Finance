import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Table, Tag, Card, Space, Row, Col, Statistic, Modal, Descriptions, Divider, message, Popconfirm } from 'antd';
import { PlusOutlined, ReloadOutlined, EyeOutlined, FileTextOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { journalApi } from '@/services/journal';
import { accountApi } from '@/services/account';
import { formatDate, formatMoney, getUser, checkPermission } from '@/utils';
import type { JournalEntry, LedgerLine, Account } from '@/types';
import type { ColumnsType } from 'antd/es/table';

const JournalList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedJournal, setSelectedJournal] = useState<JournalEntry | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const user = getUser();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [journalsRes, accountsRes] = await Promise.all([
        journalApi.getList(0, 100),
        accountApi.getList(),
      ]);
      if (journalsRes.success) {
        setJournals(journalsRes.data || []);
      }
      if (accountsRes.success) {
        setAccounts(accountsRes.data || []);
      }
    } catch (error) {
      console.error('Fetch data error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // 获取当前用户信息
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    }
  }, []);

  const handlePost = async (journal: JournalEntry) => {
    if (!currentUser) {
      message.error('无法获取用户信息');
      return;
    }
    try {
      const response = await journalApi.post(journal.journal_id!, currentUser.user_id);
      if (response.success) {
        message.success('分录过账成功');
        fetchData();
      }
    } catch (error) {
      console.error('Post journal error:', error);
    }
  };

  const getAccountName = (accountId: string) => {
    const account = accounts.find(a => a.account_id === accountId);
    return account ? `${account.code} - ${account.name}` : accountId;
  };

  const showDetail = (journal: JournalEntry) => {
    setSelectedJournal(journal);
    setDetailVisible(true);
  };

  // 计算统计数据
  const totalDebit = journals.reduce((sum, j) => sum + (parseFloat(String(j.total_debit)) || 0), 0);
  const totalCredit = journals.reduce((sum, j) => sum + (parseFloat(String(j.total_credit)) || 0), 0);

  const columns: ColumnsType<JournalEntry> = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      sorter: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      render: (date: string) => formatDate(date),
    },
    {
      title: '摘要',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text: string) => text || <span style={{ color: '#999' }}>无摘要</span>,
    },
    {
      title: '借方金额',
      dataIndex: 'total_debit',
      key: 'total_debit',
      width: 150,
      align: 'right',
      render: (amount: number) => (
        <span style={{ color: '#1890ff', fontWeight: 500 }}>¥{formatMoney(amount)}</span>
      ),
    },
    {
      title: '贷方金额',
      dataIndex: 'total_credit',
      key: 'total_credit',
      width: 150,
      align: 'right',
      render: (amount: number) => (
        <span style={{ color: '#52c41a', fontWeight: 500 }}>¥{formatMoney(amount)}</span>
      ),
    },
    {
      title: '分录行',
      key: 'lines',
      width: 80,
      align: 'center',
      render: (_: unknown, record: JournalEntry) => (
        <Tag>{record.lines?.length || 0}行</Tag>
      ),
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_: unknown, record: JournalEntry) => (
        record.posted ? (
          <Tag color="green">已过账</Tag>
        ) : (
          <Tag color="orange">未过账</Tag>
        )
      ),
    },
    {
      title: '来源',
      key: 'source_type',
      width: 100,
      render: (_: unknown, record: JournalEntry) => {
        const sourceTypeMap: Record<string, string> = {
          'MANUAL': '手工',
          'PO': '采购单',
          'SO': '销售单',
          'PAYMENT': '付款',
          'RECEIPT': '收款',
        };
        return record.source_type ? (
          <Tag>{sourceTypeMap[record.source_type] || record.source_type}</Tag>
        ) : (
          <span style={{ color: '#999' }}>-</span>
        );
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (date: string) => formatDate(date, 'YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: unknown, record: JournalEntry) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => showDetail(record)}
          >
            详情
          </Button>
          {!record.posted && user?.role && checkPermission(user.role, 'journal:post') && (
            <Popconfirm
              title="确定要过账吗？"
              description="过账后将无法修改"
              onConfirm={() => handlePost(record)}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="link"
                size="small"
                icon={<CheckCircleOutlined />}
                danger
              >
                过账
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* 页面标题 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>会计分录</h1>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>
            刷新
          </Button>
          {user?.role && checkPermission(user.role, 'journal:create') && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/journals/new')}
            >
              新增分录
            </Button>
          )}
        </Space>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="分录总数"
              value={journals.length}
              prefix={<FileTextOutlined />}
              suffix="条"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="借方合计"
              value={totalDebit}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="贷方合计"
              value={totalCredit}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>
      
      {/* 数据表格 */}
      <Table
        columns={columns}
        dataSource={journals}
        rowKey="journal_id"
        loading={loading}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
      />

      {/* 详情弹窗 */}
      <Modal
        title="分录详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={700}
      >
        {selectedJournal && (
          <>
            <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="分录日期">{formatDate(selectedJournal.date)}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{formatDate(selectedJournal.created_at || '', 'YYYY-MM-DD HH:mm')}</Descriptions.Item>
              <Descriptions.Item label="摘要" span={2}>{selectedJournal.description || '无'}</Descriptions.Item>
              <Descriptions.Item label="借方合计">
                <span style={{ color: '#1890ff', fontWeight: 'bold' }}>
                  ¥{formatMoney(selectedJournal.total_debit || 0)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="贷方合计">
                <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
                  ¥{formatMoney(selectedJournal.total_credit || 0)}
                </span>
              </Descriptions.Item>
            </Descriptions>

            <h4>分录明细</h4>
            <div style={{ border: '1px solid #d9d9d9', borderRadius: 4 }}>
              {selectedJournal.lines.map((line: LedgerLine, index: number) => (
                <div key={line.line_id || index}>
                  <div style={{ padding: '12px 16px' }}>
                    <Row style={{ width: '100%' }} align="middle">
                      <Col span={12}>
                        <Tag color="blue">{getAccountName(line.account_id)}</Tag>
                      </Col>
                      <Col span={6} style={{ textAlign: 'right' }}>
                        {parseFloat(String(line.debit)) > 0 && (
                          <span style={{ color: '#1890ff' }}>
                            借: ¥{formatMoney(line.debit)}
                          </span>
                        )}
                      </Col>
                      <Col span={6} style={{ textAlign: 'right' }}>
                        {parseFloat(String(line.credit)) > 0 && (
                          <span style={{ color: '#52c41a' }}>
                            贷: ¥{formatMoney(line.credit)}
                          </span>
                        )}
                      </Col>
                    </Row>
                  </div>
                  {index < selectedJournal.lines.length - 1 && <Divider style={{ margin: 0 }} />}
                </div>
              ))}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default JournalList;
