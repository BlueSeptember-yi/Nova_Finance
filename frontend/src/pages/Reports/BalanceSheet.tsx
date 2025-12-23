import { useState } from 'react';
import { Card, DatePicker, Button, Table, Space, message, Row, Col, Statistic, Alert, Collapse, Typography } from 'antd';
import { FileTextOutlined, SearchOutlined, DownloadOutlined, CalculatorOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { reportApi } from '@/services/report';
import { formatMoney } from '@/utils';
import type { BalanceSheet } from '@/services/report';

const { Text, Paragraph } = Typography;

const BalanceSheet = () => {
  const [loading, setLoading] = useState(false);
  const [asOfDate, setAsOfDate] = useState<Dayjs>(dayjs());
  const [data, setData] = useState<BalanceSheet | null>(null);

  const handleSearch = async () => {
    if (!asOfDate) {
      message.warning('请选择报表日期');
      return;
    }

    setLoading(true);
    try {
      const response = await reportApi.getBalanceSheet(asOfDate.format('YYYY-MM-DD'));
      
      if (response.success) {
        setData(response.data || null);
        message.success('资产负债表生成成功');
      } else {
        message.error(response.message || '生成失败');
      }
    } catch (error: any) {
      message.error(error.response?.data?.detail || '生成失败');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!asOfDate) {
      message.warning('请选择报表日期');
      return;
    }

    try {
      await reportApi.exportBalanceSheet(asOfDate.format('YYYY-MM-DD'));
      message.success('导出成功');
    } catch (error: any) {
      message.error('导出失败');
    }
  };

  const assetColumns = [
    {
      title: '科目编码',
      dataIndex: 'code',
      key: 'code',
      width: 120,
    },
    {
      title: '科目名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: '金额',
      dataIndex: 'balance',
      key: 'balance',
      align: 'right' as const,
      render: (amount: number) => (
        <span style={{ fontWeight: 'bold' }}>¥{formatMoney(amount)}</span>
      ),
    },
  ];

  const liabilityColumns = [
    {
      title: '科目编码',
      dataIndex: 'code',
      key: 'code',
      width: 120,
    },
    {
      title: '科目名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: '金额',
      dataIndex: 'balance',
      key: 'balance',
      align: 'right' as const,
      render: (amount: number) => (
        <span style={{ fontWeight: 'bold' }}>¥{formatMoney(amount)}</span>
      ),
    },
  ];

  return (
    <div>
      <Card
        title={
          <span>
            <FileTextOutlined /> 资产负债表
          </span>
        }
        extra={
          <Space>
            <DatePicker
              value={asOfDate}
              onChange={(date) => {
                if (date) {
                  setAsOfDate(date);
                }
              }}
              format="YYYY-MM-DD"
              placeholder="选择报表日期"
            />
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleSearch}
              loading={loading}
            >
              生成报表
            </Button>
            {data && (
              <Button
                icon={<DownloadOutlined />}
                onClick={handleExport}
              >
                导出
              </Button>
            )}
          </Space>
        }
      >
        {/* 计算公式说明 */}
        <Collapse
          ghost
          style={{ marginBottom: 16 }}
          items={[
            {
              key: 'formula',
              label: (
                <span>
                  <CalculatorOutlined /> 计算公式说明
                </span>
              ),
              children: (
                <div style={{ padding: '8px 0' }}>
                  <Paragraph>
                    <Text strong>资产负债表基本公式：</Text>
                  </Paragraph>
                  <Paragraph style={{ marginLeft: 16, fontFamily: 'monospace' }}>
                    资产 = 负债 + 所有者权益
                  </Paragraph>
                  
                  <Paragraph style={{ marginTop: 16 }}>
                    <Text strong>资产计算：</Text>
                  </Paragraph>
                  <Paragraph style={{ marginLeft: 16, fontFamily: 'monospace' }}>
                    资产总额 = 流动资产 + 非流动资产<br />
                    流动资产 = Σ(资产类账户余额，科目编码 &lt; 1600)<br />
                    非流动资产 = Σ(资产类账户余额，科目编码 ≥ 1600)
                  </Paragraph>
                  
                  <Paragraph style={{ marginTop: 16 }}>
                    <Text strong>负债计算：</Text>
                  </Paragraph>
                  <Paragraph style={{ marginLeft: 16, fontFamily: 'monospace' }}>
                    负债总额 = 流动负债 + 非流动负债<br />
                    流动负债 = Σ(负债类账户余额，科目编码 &lt; 2500)<br />
                    非流动负债 = Σ(负债类账户余额，科目编码 ≥ 2500)
                  </Paragraph>
                  
                  <Paragraph style={{ marginTop: 16 }}>
                    <Text strong>所有者权益计算：</Text>
                  </Paragraph>
                  <Paragraph style={{ marginLeft: 16, fontFamily: 'monospace' }}>
                    所有者权益 = Σ(所有者权益类账户余额) + 本年利润<br />
                    本年利润 = Σ(收入类账户余额) - Σ(费用类账户余额)
                  </Paragraph>
                  
                  <Paragraph style={{ marginTop: 16 }}>
                    <Text strong>账户余额计算：</Text>
                  </Paragraph>
                  <Paragraph style={{ marginLeft: 16, fontFamily: 'monospace' }}>
                    借方余额账户：余额 = 借方合计 - 贷方合计<br />
                    贷方余额账户：余额 = 贷方合计 - 借方合计
                  </Paragraph>
                </div>
              ),
            },
          ]}
        />

        {data && (
          <>
            {/* 平衡检查提示 */}
            {!data.is_balanced && (
              <Alert
                message="资产负债表不平衡"
                description={`资产总额与负债和所有者权益总额相差 ¥${formatMoney(data.balance_check)}`}
                type="warning"
                showIcon
                style={{ marginBottom: 24 }}
              />
            )}

            {/* 统计卡片 */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="资产总额"
                    value={data.assets.total}
                    precision={2}
                    prefix="¥"
                    valueStyle={{ color: '#3f8600' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="负债总额"
                    value={data.liabilities.total}
                    precision={2}
                    prefix="¥"
                    valueStyle={{ color: '#cf1322' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="所有者权益"
                    value={data.equity.total}
                    precision={2}
                    prefix="¥"
                    valueStyle={{ color: '#3f8600' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="负债和所有者权益合计"
                    value={data.total_liabilities_and_equity}
                    precision={2}
                    prefix="¥"
                    valueStyle={{ color: data.is_balanced ? '#3f8600' : '#cf1322' }}
                  />
                </Card>
              </Col>
            </Row>

            {/* 资产负债表 */}
            <Row gutter={16}>
              <Col span={12}>
                <Card title="资产" size="small">
                  <Table
                    columns={assetColumns}
                    dataSource={[
                      { key: 'current', code: '', name: '流动资产', balance: data.assets.current_assets },
                      ...data.assets.details.map((item, index) => ({
                        key: `asset-${index}`,
                        ...item,
                      })),
                      { key: 'non-current', code: '', name: '非流动资产', balance: data.assets.non_current_assets },
                      { key: 'total', code: '', name: '资产合计', balance: data.assets.total },
                    ]}
                    pagination={false}
                    bordered
                    size="small"
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card title="负债和所有者权益" size="small">
                  <Table
                    columns={liabilityColumns}
                    dataSource={[
                      { key: 'current-liab', code: '', name: '流动负债', balance: data.liabilities.current_liabilities },
                      ...data.liabilities.details.map((item, index) => ({
                        key: `liab-${index}`,
                        ...item,
                      })),
                      { key: 'non-current-liab', code: '', name: '非流动负债', balance: data.liabilities.non_current_liabilities },
                      { key: 'liab-total', code: '', name: '负债合计', balance: data.liabilities.total },
                      ...data.equity.details.map((item, index) => ({
                        key: `equity-${index}`,
                        ...item,
                      })),
                      { key: 'profit', code: '', name: '本年利润', balance: data.equity.current_year_profit },
                      { key: 'equity-total', code: '', name: '所有者权益合计', balance: data.equity.total },
                      { key: 'total', code: '', name: '负债和所有者权益合计', balance: data.total_liabilities_and_equity },
                    ]}
                    pagination={false}
                    bordered
                    size="small"
                  />
                </Card>
              </Col>
            </Row>

            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <p><strong>报表日期：{asOfDate.format('YYYY-MM-DD')}</strong></p>
            </div>
          </>
        )}

        {!data && (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <p>请选择报表日期并点击"生成报表"查看资产负债表</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default BalanceSheet;

