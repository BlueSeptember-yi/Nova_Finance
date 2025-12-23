import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Table, Card, Space, Tag, Select, Modal, Upload, message, Alert } from 'antd';
import { PlusOutlined, ReloadOutlined, UploadOutlined, CheckCircleOutlined, CloseCircleOutlined, DownloadOutlined } from '@ant-design/icons';
import { bankApi } from '@/services/bank';
import { formatDate, formatMoney } from '@/utils';
import type { BankStatement, BankAccount } from '@/types';
import type { ColumnsType } from 'antd/es/table';
// import type { UploadFile } from 'antd/es/upload/interface'; // 未使用

const { Option } = Select;

const BankStatementList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [statements, setStatements] = useState<BankStatement[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string | undefined>();
  const [accountSelectOpen, setAccountSelectOpen] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported_count: number;
    error_count: number;
    errors: string[];
  } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedAccount) {
        params.bank_account_id = selectedAccount;
      }
      const statementsRes = await bankApi.getStatements(params);
      if (statementsRes.success) {
        setStatements(statementsRes.data || []);
      }
    } catch (error) {
      console.error('Fetch bank statements error:', error);
    } finally {
      setLoading(false);
    }
  };

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

  useEffect(() => {
    fetchBankAccounts();
  }, []);

  useEffect(() => {
    fetchData();
  }, [selectedAccount]);

  const handleImport = async (file: File) => {
    if (!selectedAccount) {
      message.warning('请先选择银行账户');
      return false;
    }

    setImporting(true);
    setImportResult(null);
    try {
      const response = await bankApi.importStatements(selectedAccount, file);
      if (response.success && response.data) {
        setImportResult(response.data);
        if (response.data.error_count === 0) {
          message.success(`导入成功：共导入 ${response.data.imported_count || 0} 条记录`);
          fetchData();
          setTimeout(() => {
            setImportModalVisible(false);
            setImportResult(null);
          }, 2000);
        } else {
          message.warning(`导入完成：成功 ${response.data.imported_count || 0} 条，失败 ${response.data.error_count || 0} 条`);
        }
      }
    } catch (error: any) {
      message.error(error.response?.data?.detail || '导入失败');
    } finally {
      setImporting(false);
    }
    return false; // 阻止默认上传行为
  };

  const handleDownloadTemplate = async () => {
    try {
      await bankApi.downloadTemplate();
      message.success('模板下载成功');
    } catch (error: any) {
      message.error(error.response?.data?.detail || '模板下载失败');
    }
  };

  const columns: ColumnsType<BankStatement> = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (date: string) => formatDate(date),
    },
    {
      title: '银行账户',
      dataIndex: 'bank_account_id',
      key: 'bank_account_id',
      ellipsis: true,
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
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 150,
      align: 'right',
      render: (amount: number, record: BankStatement) => (
        <span style={{ 
          color: record.type === 'Credit' ? '#52c41a' : '#f5222d', 
          fontWeight: 500 
        }}>
          {record.type === 'Credit' ? '+' : '-'}¥{formatMoney(amount)}
        </span>
      ),
    },
    {
      title: '余额',
      dataIndex: 'balance',
      key: 'balance',
      width: 150,
      align: 'right',
      render: (balance: number) => balance ? `¥${formatMoney(balance)}` : '-',
    },
    {
      title: '摘要',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '对账状态',
      key: 'reconciliation_status',
      width: 120,
      render: (_: any, record: BankStatement) => {
        const isReconciled = record.is_reconciled || false;
        return isReconciled ? (
          <Tag color="success" icon={<CheckCircleOutlined />}>
            已对账
          </Tag>
        ) : (
          <Tag color="warning" icon={<CloseCircleOutlined />}>
            未对账
          </Tag>
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
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>银行流水</h1>
        <Space>
          <Select
            style={{ width: 200 }}
            placeholder="筛选银行账户"
            allowClear
            value={selectedAccount}
            open={accountSelectOpen}
            onDropdownVisibleChange={setAccountSelectOpen}
            onChange={(value) => {
              setSelectedAccount(value);
              setAccountSelectOpen(false);
            }}
          >
            {bankAccounts.map(account => (
              <Option key={account.bank_account_id} value={account.bank_account_id}>
                {account.bank_name} - {account.account_number}
              </Option>
            ))}
          </Select>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>
            刷新
          </Button>
          <Button
            icon={<UploadOutlined />}
            onClick={() => {
              if (!selectedAccount) {
                message.warning('请先选择银行账户');
                return;
              }
              setImportModalVisible(true);
              setImportResult(null);
            }}
          >
            导入Excel
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/bank/statements/new')}
          >
            新增流水
          </Button>
        </Space>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={statements}
          rowKey="statement_id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      <Modal
        title="导入银行流水（Excel）"
        open={importModalVisible}
        onCancel={() => {
          setImportModalVisible(false);
          setImportResult(null);
        }}
        footer={null}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <Alert
            message="Excel文件格式要求"
            description={
              <div>
                <p>Excel文件需包含以下列（支持多种列名）：</p>
                <ul style={{ marginBottom: 0 }}>
                  <li><strong>日期</strong>：交易日期（支持：日期、交易日期、date、Date、DATE）</li>
                  <li><strong>金额</strong>：交易金额（支持：金额、交易金额、amount、Amount、AMOUNT）</li>
                  <li><strong>类型</strong>：收入/支出（支持：类型、交易类型、type、Type、TYPE、方向）</li>
                  <li><strong>摘要</strong>：交易描述（支持：摘要、描述、description、Description、DESCRIPTION、备注）</li>
                  <li><strong>余额</strong>：账户余额（可选，支持：余额、balance）</li>
                </ul>
              </div>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleDownloadTemplate}
            block
          >
            下载导入模板
          </Button>
        </div>

        <Upload
          accept=".xlsx,.xls"
          beforeUpload={handleImport}
          showUploadList={false}
          disabled={importing || !selectedAccount}
        >
          <Button
            type="primary"
            icon={<UploadOutlined />}
            loading={importing}
            disabled={!selectedAccount}
            block
          >
            {importing ? '正在导入...' : '选择Excel文件并上传'}
          </Button>
        </Upload>

        {!selectedAccount && (
          <Alert
            message="请先在列表上方选择银行账户"
            type="warning"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}

        {importResult && (
          <div style={{ marginTop: 16 }}>
            <Alert
              message={`导入完成：成功 ${importResult.imported_count} 条，失败 ${importResult.error_count} 条`}
              type={importResult.error_count === 0 ? 'success' : 'warning'}
              showIcon
              style={{ marginBottom: 16 }}
            />
            {importResult.errors.length > 0 && (
              <div>
                <p><strong>错误详情（前10条）：</strong></p>
                <ul style={{ maxHeight: 200, overflow: 'auto' }}>
                  {importResult.errors.map((error, index) => (
                    <li key={index} style={{ color: '#ff4d4f' }}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BankStatementList;

