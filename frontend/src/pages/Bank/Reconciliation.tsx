import { useEffect, useState } from 'react';
import {
  Button,
  Table,
  Card,
  Space,
  Tag,
  Select,
  DatePicker,
  message,
  Modal,
  Form,
  Row,
  Col,
  Divider,
  Popconfirm,
} from 'antd';
import {
  ReloadOutlined,
  ThunderboltOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { bankApi } from '@/services/bank';
import { formatDate, formatMoney } from '@/utils';
import type { BankAccount } from '@/types';
import type { ColumnsType } from 'antd/es/table';

const { Option } = Select;
const { RangePicker } = DatePicker;

interface MatchedPair {
  statement: {
    statement_id: string;
    date: string;
    amount: number;
    type: string;
    description: string;
  };
  journal: {
    journal_id: string;
    date: string;
    description: string;
    amount: number;
  };
  reconciliation_id: string;
  match_date: string;
}

interface UnmatchedStatement {
  statement_id: string;
  date: string;
  amount: number;
  type: string;
  description: string;
}

interface UnmatchedJournal {
  journal_id: string;
  date: string;
  description: string;
  amount: number;
}

const ReconciliationPage = () => {
  const [loading, setLoading] = useState(false);
  const [matching, setMatching] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<MatchedPair[]>([]);
  const [unmatchedStatements, setUnmatchedStatements] = useState<UnmatchedStatement[]>([]);
  const [unmatchedJournals, setUnmatchedJournals] = useState<UnmatchedJournal[]>([]);

  // 获取银行账户列表
  const fetchBankAccounts = async () => {
    try {
      const response = await bankApi.getAccounts();
      if (response.success) {
        setBankAccounts(response.data || []);
      }
    } catch (error) {
      console.error('Fetch bank accounts error:', error);
    }
  };

  // 获取对账数据
  const fetchReconciliationData = async () => {
    if (!selectedAccount || !dateRange) {
      message.warning('请先选择银行账户和日期范围');
      return;
    }

    setLoading(true);
    try {
      const [startDate, endDate] = dateRange;
      const response = await bankApi.getReconciliationData({
        bank_account_id: selectedAccount,
        start_date: startDate.format('YYYY-MM-DD'),
        end_date: endDate.format('YYYY-MM-DD'),
      });

      if (response.success) {
        setMatchedPairs(response.data.matched_pairs || []);
        setUnmatchedStatements(response.data.unmatched_statements || []);
        setUnmatchedJournals(response.data.unmatched_journals || []);
      }
    } catch (error: any) {
      message.error(error.response?.data?.detail || '获取对账数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 自动匹配
  const handleAutoMatch = async () => {
    if (!selectedAccount || !dateRange) {
      message.warning('请先选择银行账户和日期范围');
      return;
    }

    setMatching(true);
    try {
      const [startDate, endDate] = dateRange;
      const response = await bankApi.autoMatch({
        bank_account_id: selectedAccount,
        start_date: startDate.format('YYYY-MM-DD'),
        end_date: endDate.format('YYYY-MM-DD'),
      });

      if (response.success) {
        message.success(`自动匹配完成：成功匹配 ${response.data.matched_count || 0} 条记录`);
        // 刷新对账数据
        await fetchReconciliationData();
      }
    } catch (error: any) {
      message.error(error.response?.data?.detail || '自动匹配失败');
    } finally {
      setMatching(false);
    }
  };

  // 删除对账记录
  const handleDeleteReconciliation = async (reconciliationId: string) => {
    try {
      const response = await bankApi.deleteReconciliation(reconciliationId);
      if (response.success) {
        message.success('删除成功');
        await fetchReconciliationData();
      }
    } catch (error: any) {
      message.error(error.response?.data?.detail || '删除失败');
    }
  };

  useEffect(() => {
    fetchBankAccounts();
  }, []);

  // 已匹配对的表格列
  const matchedPairsColumns: ColumnsType<MatchedPair> = [
    {
      title: '日期',
      dataIndex: ['statement', 'date'],
      key: 'date',
      width: 120,
      render: (date: string) => formatDate(date),
    },
    {
      title: '银行流水',
      key: 'statement',
      render: (_: any, record: MatchedPair) => (
        <div>
          <div>{record.statement.description}</div>
          <div style={{ color: '#999', fontSize: '12px' }}>
            {formatMoney(record.statement.amount)} ({record.statement.type === 'Credit' ? '收入' : '支出'})
          </div>
        </div>
      ),
    },
    {
      title: '系统分录',
      key: 'journal',
      render: (_: any, record: MatchedPair) => (
        <div>
          <div>{record.journal.description}</div>
          <div style={{ color: '#999', fontSize: '12px' }}>
            {formatMoney(record.journal.amount)}
          </div>
        </div>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: MatchedPair) => (
        <Popconfirm
          title="确定要删除这个对账记录吗？"
          onConfirm={() => handleDeleteReconciliation(record.reconciliation_id)}
          okText="确定"
          cancelText="取消"
        >
          <Button type="link" danger icon={<DeleteOutlined />} size="small">
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ];

  // 未匹配银行流水的表格列
  const unmatchedStatementColumns: ColumnsType<UnmatchedStatement> = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (date: string) => formatDate(date),
    },
    {
      title: '摘要',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 150,
      align: 'right',
      render: (amount: number, record: UnmatchedStatement) => (
        <span style={{ color: record.type === 'Credit' ? '#3f8600' : '#cf1322' }}>
          {formatMoney(amount)}
        </span>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => (
        <Tag color={type === 'Credit' ? 'green' : 'red'}>
          {type === 'Credit' ? '收入' : '支出'}
        </Tag>
      ),
    },
  ];

  // 未匹配分录的表格列
  const unmatchedJournalColumns: ColumnsType<UnmatchedJournal> = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (date: string) => formatDate(date),
    },
    {
      title: '摘要',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 150,
      align: 'right',
      render: (amount: number) => formatMoney(amount),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* 筛选条件 */}
          <Row gutter={16}>
            <Col span={8}>
              <Select
                placeholder="选择银行账户"
                style={{ width: '100%' }}
                value={selectedAccount}
                onChange={setSelectedAccount}
              >
                {bankAccounts.map((account) => (
                  <Option key={account.bank_account_id} value={account.bank_account_id}>
                    {account.bank_name} - {account.account_number}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col span={8}>
              <RangePicker
                style={{ width: '100%' }}
                value={dateRange}
                onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs] | null)}
                format="YYYY-MM-DD"
              />
            </Col>
            <Col span={8}>
              <Space>
                <Button
                  type="primary"
                  icon={<ReloadOutlined />}
                  onClick={fetchReconciliationData}
                  loading={loading}
                  disabled={!selectedAccount || !dateRange}
                >
                  查询
                </Button>
                <Button
                  icon={<ThunderboltOutlined />}
                  onClick={handleAutoMatch}
                  loading={matching}
                  disabled={!selectedAccount || !dateRange}
                >
                  自动匹配
                </Button>
              </Space>
            </Col>
          </Row>

          <Divider />

          {/* 已匹配对 */}
          <Card
            title={
              <Space>
                <CheckCircleOutlined style={{ color: '#3f8600' }} />
                <span>已匹配 ({matchedPairs.length})</span>
              </Space>
            }
            size="small"
          >
            <Table
              columns={matchedPairsColumns}
              dataSource={matchedPairs}
              rowKey={(record) => record.reconciliation_id}
              loading={loading}
              pagination={{
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条`,
              }}
            />
          </Card>

          {/* 未匹配项 */}
          <Row gutter={16}>
            <Col span={12}>
              <Card
                title={
                  <Space>
                    <span>未匹配银行流水 ({unmatchedStatements.length})</span>
                  </Space>
                }
                size="small"
              >
                <Table
                  columns={unmatchedStatementColumns}
                  dataSource={unmatchedStatements}
                  rowKey="statement_id"
                  loading={loading}
                  pagination={{
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total) => `共 ${total} 条`,
                  }}
                />
              </Card>
            </Col>
            <Col span={12}>
              <Card
                title={
                  <Space>
                    <span>未匹配系统分录 ({unmatchedJournals.length})</span>
                  </Space>
                }
                size="small"
              >
                <Table
                  columns={unmatchedJournalColumns}
                  dataSource={unmatchedJournals}
                  rowKey="journal_id"
                  loading={loading}
                  pagination={{
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total) => `共 ${total} 条`,
                  }}
                />
              </Card>
            </Col>
          </Row>
        </Space>
      </Card>
    </div>
  );
};

export default ReconciliationPage;
