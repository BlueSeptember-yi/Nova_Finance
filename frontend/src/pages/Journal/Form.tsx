import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, DatePicker, Input, Button, Card, message, Table, Select, InputNumber } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { journalApi } from '@/services/journal';
import { accountApi } from '@/services/account';
import type { Account } from '@/types';

const JournalForm = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [lines, setLines] = useState<any[]>([
    { key: `line-${Date.now()}-0`, type: 'debit', account_id: '', amount: 0, memo: '' },
    { key: `line-${Date.now()}-1`, type: 'credit', account_id: '', amount: 0, memo: '' },
  ]);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await accountApi.getList();
      if (response.success) {
        setAccounts(response.data);
      }
    } catch (error) {
      console.error('Fetch accounts error:', error);
    }
  };

  const addLine = (type: 'debit' | 'credit') => {
    setLines([...lines, { key: `line-${Date.now()}-${lines.length}`, type, account_id: '', amount: 0, memo: '' }]);
  };

  const removeLine = (index: number) => {
    const newLines = lines.filter((_, i) => i !== index);
    setLines(newLines);
  };

  const updateLine = (index: number, field: string, value: any) => {
    const newLines = [...lines];
    newLines[index][field] = value;
    setLines(newLines);
  };

  const calculateTotal = (type: 'debit' | 'credit') => {
    return lines
      .filter(line => line.type === type)
      .reduce((sum, line) => sum + (Number(line.amount) || 0), 0);
  };

  const onFinish = async (values: any) => {
    const totalDebit = calculateTotal('debit');
    const totalCredit = calculateTotal('credit');

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      message.error(`借贷不平衡：借方 ¥${totalDebit.toFixed(2)}，贷方 ¥${totalCredit.toFixed(2)}`);
      return;
    }

    const journalLines = lines.map(line => ({
      account_id: line.account_id,
      debit: line.type === 'debit' ? Number(line.amount) : 0,
      credit: line.type === 'credit' ? Number(line.amount) : 0,
      memo: line.memo,
    }));

    setLoading(true);
    try {
      const response = await journalApi.create({
        date: values.date.format('YYYY-MM-DD'),
        description: values.description,
        lines: journalLines,
        posted: false,
      });
      
      if (response.success) {
        message.success('分录创建成功');
        navigate('/journals');
      }
    } catch (error) {
      console.error('Create journal error:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: '类型',
      dataIndex: 'type',
      width: 100,
      render: (type: string) => (type === 'debit' ? '借方' : '贷方'),
    },
    {
      title: '科目',
      dataIndex: 'account_id',
      render: (_: any, record: any, index: number) => (
        <Select
          style={{ width: '100%' }}
          value={record.account_id}
          onChange={(value) => updateLine(index, 'account_id', value)}
          placeholder="选择科目"
          showSearch
          optionFilterProp="children"
        >
          {accounts.map(acc => (
            <Select.Option key={acc.account_id} value={acc.account_id}>
              {acc.code} - {acc.name}
            </Select.Option>
          ))}
        </Select>
      ),
    },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 150,
      render: (_: any, record: any, index: number) => (
        <InputNumber
          style={{ width: '100%' }}
          value={record.amount}
          onChange={(value) => updateLine(index, 'amount', value || 0)}
          min={0}
          precision={2}
        />
      ),
    },
    {
      title: '备注',
      dataIndex: 'memo',
      render: (_: any, record: any, index: number) => (
        <Input
          value={record.memo}
          onChange={(e) => updateLine(index, 'memo', e.target.value)}
          placeholder="可选"
        />
      ),
    },
    {
      title: '操作',
      width: 80,
      render: (_: any, __: any, index: number) => (
        <Button
          type="link"
          danger
          icon={<MinusCircleOutlined />}
          onClick={() => removeLine(index)}
        />
      ),
    },
  ];

  const totalDebit = calculateTotal('debit');
  const totalCredit = calculateTotal('credit');
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>新增会计分录</h1>
      
      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            date: dayjs(),
          }}
        >
          <Form.Item
            label="日期"
            name="date"
            rules={[{ required: true, message: '请选择日期' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="摘要"
            name="description"
          >
            <Input placeholder="可选" />
          </Form.Item>

          <Form.Item
            label="业务来源"
            name="source_type"
          >
            <Select placeholder="可选">
              <Select.Option value="MANUAL">手工录入</Select.Option>
              <Select.Option value="PO">采购单</Select.Option>
              <Select.Option value="SO">销售单</Select.Option>
              <Select.Option value="PAYMENT">付款</Select.Option>
              <Select.Option value="RECEIPT">收款</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="来源ID"
            name="source_id"
          >
            <Input placeholder="业务来源ID（可选）" />
          </Form.Item>

          <div style={{ marginBottom: 16 }}>
            <h3>分录明细</h3>
            <Table
              columns={columns}
              dataSource={lines}
              pagination={false}
              rowKey="key"
              summary={() => (
                <Table.Summary fixed>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={2}>
                      <strong>合计</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2}>
                      <strong style={{ color: isBalanced ? 'green' : 'red' }}>
                        借: ¥{totalDebit.toFixed(2)} / 贷: ¥{totalCredit.toFixed(2)}
                        {isBalanced ? ' ✓' : ' ✗'}
                      </strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3} colSpan={2} />
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
            <div style={{ marginTop: 8 }}>
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={() => addLine('debit')}
                style={{ marginRight: 8 }}
              >
                添加借方
              </Button>
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={() => addLine('credit')}
              >
                添加贷方
              </Button>
            </div>
          </div>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              提交
            </Button>
            <Button style={{ marginLeft: 8 }} onClick={() => navigate('/journals')}>
              取消
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default JournalForm;

