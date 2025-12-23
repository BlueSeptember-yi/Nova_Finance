import { useState } from 'react';
import { Card, DatePicker, Button, Table, Space, message, Row, Col, Statistic, Collapse, Typography } from 'antd';
import { FileTextOutlined, SearchOutlined, DownloadOutlined, CalculatorOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { reportApi } from '@/services/report';
import { formatMoney } from '@/utils';
import type { IncomeStatement } from '@/services/report';

const { Text, Paragraph } = Typography;

const { RangePicker } = DatePicker;

const IncomeStatement = () => {
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);
  const [data, setData] = useState<IncomeStatement | null>(null);

  const handleSearch = async () => {
    if (!dateRange || !dateRange[0] || !dateRange[1]) {
      message.warning('请选择日期范围');
      return;
    }

    setLoading(true);
    try {
      const response = await reportApi.getIncomeStatement(
        dateRange[0].format('YYYY-MM-DD'),
        dateRange[1].format('YYYY-MM-DD')
      );
      
      if (response.success) {
        setData(response.data || null);
        message.success('利润表生成成功');
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
    if (!dateRange || !dateRange[0] || !dateRange[1]) {
      message.warning('请选择日期范围');
      return;
    }

    try {
      await reportApi.exportIncomeStatement(
        dateRange[0].format('YYYY-MM-DD'),
        dateRange[1].format('YYYY-MM-DD')
      );
      message.success('导出成功');
    } catch (error: any) {
      message.error('导出失败');
    }
  };

  const columns = [
    {
      title: '项目',
      dataIndex: 'item',
      key: 'item',
      width: 200,
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right' as const,
      render: (amount: number) => (
        <span style={{ fontWeight: 'bold' }}>¥{formatMoney(amount)}</span>
      ),
    },
  ];

  const tableData = data ? [
    { key: '1', item: '一、营业收入', amount: data.revenue },
    { key: '2', item: '减：营业成本', amount: data.cost },
    { key: '3', item: '减：期间费用', amount: data.expenses },
    { key: '4', item: '二、营业利润', amount: data.operating_profit },
    { key: '5', item: '减：税金及附加', amount: data.tax },
    { key: '6', item: '三、净利润', amount: data.net_profit },
  ] : [];

  return (
    <div>
      <Card
        title={
          <span>
            <FileTextOutlined /> 利润表
          </span>
        }
        extra={
          <Space>
            <RangePicker
              value={dateRange}
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  setDateRange([dates[0], dates[1]]);
                }
              }}
              format="YYYY-MM-DD"
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
                    <Text strong>利润表计算公式：</Text>
                  </Paragraph>
                  
                  <Paragraph style={{ marginTop: 16 }}>
                    <Text strong>营业收入：</Text>
                  </Paragraph>
                  <Paragraph style={{ marginLeft: 16, fontFamily: 'monospace' }}>
                    营业收入 = Σ(主营业务收入账户(6001)的贷方 - 借方)
                  </Paragraph>
                  
                  <Paragraph style={{ marginTop: 16 }}>
                    <Text strong>营业成本：</Text>
                  </Paragraph>
                  <Paragraph style={{ marginLeft: 16, fontFamily: 'monospace' }}>
                    营业成本 = Σ(主营业务成本账户(6401)的借方 - 贷方)
                  </Paragraph>
                  
                  <Paragraph style={{ marginTop: 16 }}>
                    <Text strong>期间费用：</Text>
                  </Paragraph>
                  <Paragraph style={{ marginLeft: 16, fontFamily: 'monospace' }}>
                    期间费用 = 销售费用(6601) + 管理费用(6602) + 财务费用(6603)<br />
                    各项费用 = Σ(费用账户的借方 - 贷方)
                  </Paragraph>
                  
                  <Paragraph style={{ marginTop: 16 }}>
                    <Text strong>税金及附加：</Text>
                  </Paragraph>
                  <Paragraph style={{ marginLeft: 16, fontFamily: 'monospace' }}>
                    税金及附加 = Σ(税金及附加账户(6403)的借方 - 贷方)
                  </Paragraph>
                  
                  <Paragraph style={{ marginTop: 16 }}>
                    <Text strong>营业利润：</Text>
                  </Paragraph>
                  <Paragraph style={{ marginLeft: 16, fontFamily: 'monospace' }}>
                    营业利润 = 营业收入 - 营业成本 - 期间费用
                  </Paragraph>
                  
                  <Paragraph style={{ marginTop: 16 }}>
                    <Text strong>净利润：</Text>
                  </Paragraph>
                  <Paragraph style={{ marginLeft: 16, fontFamily: 'monospace' }}>
                    净利润 = 营业利润 - 税金及附加
                  </Paragraph>
                  
                  <Paragraph style={{ marginTop: 16, color: '#666' }}>
                    <Text type="secondary">注：所有计算仅统计已过账的分录，且仅统计指定期间内的交易。</Text>
                  </Paragraph>
                </div>
              ),
            },
          ]}
        />

        {data && (
          <>
            {/* 统计卡片 */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="营业收入"
                    value={data.revenue}
                    precision={2}
                    prefix="¥"
                    valueStyle={{ color: '#3f8600' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="营业成本"
                    value={data.cost}
                    precision={2}
                    prefix="¥"
                    valueStyle={{ color: '#cf1322' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="营业利润"
                    value={data.operating_profit}
                    precision={2}
                    prefix="¥"
                    valueStyle={{ color: data.operating_profit >= 0 ? '#3f8600' : '#cf1322' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="净利润"
                    value={data.net_profit}
                    precision={2}
                    prefix="¥"
                    valueStyle={{ color: data.net_profit >= 0 ? '#3f8600' : '#cf1322' }}
                  />
                </Card>
              </Col>
            </Row>

            {/* 利润表 */}
            <Table
              columns={columns}
              dataSource={tableData}
              pagination={false}
              bordered
              summary={() => (
                <Table.Summary fixed>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0}>
                      <strong>报表期间：{dateRange[0].format('YYYY-MM-DD')} 至 {dateRange[1].format('YYYY-MM-DD')}</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <strong style={{ fontSize: 16 }}>
                        {data.net_profit >= 0 ? '盈利' : '亏损'}：¥{formatMoney(Math.abs(data.net_profit))}
                      </strong>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </>
        )}

        {!data && (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <p>请选择日期范围并点击"生成报表"查看利润表</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default IncomeStatement;
