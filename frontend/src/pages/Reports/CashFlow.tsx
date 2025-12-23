import { useState } from 'react';
import { Card, DatePicker, Button, Table, Space, message, Row, Col, Statistic, Collapse, Typography } from 'antd';
import { FileTextOutlined, SearchOutlined, DownloadOutlined, CalculatorOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { reportApi } from '@/services/report';
import { formatMoney } from '@/utils';
import type { CashFlow } from '@/services/report';

const { Text, Paragraph } = Typography;

const { RangePicker } = DatePicker;

const CashFlow = () => {
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);
  const [data, setData] = useState<CashFlow | null>(null);

  const handleSearch = async () => {
    if (!dateRange || !dateRange[0] || !dateRange[1]) {
      message.warning('请选择日期范围');
      return;
    }

    setLoading(true);
    try {
      const response = await reportApi.getCashFlow(
        dateRange[0].format('YYYY-MM-DD'),
        dateRange[1].format('YYYY-MM-DD')
      );
      
      if (response.success) {
        setData(response.data || null);
        message.success('现金流量表生成成功');
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
      await reportApi.exportCashFlow(
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
      width: 300,
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right' as const,
      render: (amount: number) => (
        <span style={{ fontWeight: 'bold' }}>
          {amount !== null && amount !== undefined ? `¥${formatMoney(Math.abs(amount))}` : ''}
        </span>
      ),
    },
  ];

  const tableData = data ? [
    { key: '1', item: '一、经营活动产生的现金流量', amount: null },
    { key: '2', item: '  现金流入', amount: data.operating_activities.cash_in },
    { key: '3', item: '  现金流出', amount: -data.operating_activities.cash_out },
    { key: '4', item: '  经营活动产生的现金流量净额', amount: data.operating_activities.net },
    { key: '5', item: '', amount: null },
    { key: '6', item: '二、投资活动产生的现金流量', amount: null },
    { key: '7', item: '  现金流入', amount: data.investing_activities.cash_in },
    { key: '8', item: '  现金流出', amount: -data.investing_activities.cash_out },
    { key: '9', item: '  投资活动产生的现金流量净额', amount: data.investing_activities.net },
    { key: '10', item: '', amount: null },
    { key: '11', item: '三、筹资活动产生的现金流量', amount: null },
    { key: '12', item: '  现金流入', amount: data.financing_activities.cash_in },
    { key: '13', item: '  现金流出', amount: -data.financing_activities.cash_out },
    { key: '14', item: '  筹资活动产生的现金流量净额', amount: data.financing_activities.net },
    { key: '15', item: '', amount: null },
    { key: '16', item: '四、现金及现金等价物净增加额', amount: data.net_cash_flow },
    { key: '17', item: '  期初现金及现金等价物余额', amount: data.beginning_cash },
    { key: '18', item: '  期末现金及现金等价物余额', amount: data.ending_cash },
  ] : [];

  return (
    <div>
      <Card
        title={
          <span>
            <FileTextOutlined /> 现金流量表
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
                    <Text strong>现金流量表计算公式：</Text>
                  </Paragraph>
                  
                  <Paragraph style={{ marginTop: 16 }}>
                    <Text strong>经营活动现金流量：</Text>
                  </Paragraph>
                  <Paragraph style={{ marginLeft: 16, fontFamily: 'monospace' }}>
                    现金流入 = Σ(现金账户借方，来源：销售订单/收款/手工录入，对应收入或应收账款)<br />
                    现金流出 = Σ(现金账户贷方，来源：采购订单/付款/手工录入，对应费用或应付账款)<br />
                    经营活动现金流量净额 = 现金流入 - 现金流出
                  </Paragraph>
                  
                  <Paragraph style={{ marginTop: 16 }}>
                    <Text strong>投资活动现金流量：</Text>
                  </Paragraph>
                  <Paragraph style={{ marginLeft: 16, fontFamily: 'monospace' }}>
                    投资活动现金流量净额 = 投资活动现金流入 - 投资活动现金流出<br />
                    <Text type="secondary">（当前版本暂未实现投资活动现金流统计）</Text>
                  </Paragraph>
                  
                  <Paragraph style={{ marginTop: 16 }}>
                    <Text strong>筹资活动现金流量：</Text>
                  </Paragraph>
                  <Paragraph style={{ marginLeft: 16, fontFamily: 'monospace' }}>
                    筹资活动现金流量净额 = 筹资活动现金流入 - 筹资活动现金流出<br />
                    <Text type="secondary">（当前版本暂未实现筹资活动现金流统计）</Text>
                  </Paragraph>
                  
                  <Paragraph style={{ marginTop: 16 }}>
                    <Text strong>现金净增加额：</Text>
                  </Paragraph>
                  <Paragraph style={{ marginLeft: 16, fontFamily: 'monospace' }}>
                    现金净增加额 = 经营活动现金流量净额 + 投资活动现金流量净额 + 筹资活动现金流量净额
                  </Paragraph>
                  
                  <Paragraph style={{ marginTop: 16 }}>
                    <Text strong>期初和期末现金余额：</Text>
                  </Paragraph>
                  <Paragraph style={{ marginLeft: 16, fontFamily: 'monospace' }}>
                    期初现金余额 = Σ(现金账户(1001, 1002)在开始日期之前的余额)<br />
                    期末现金余额 = Σ(现金账户(1001, 1002)在结束日期的余额)<br />
                    期末现金余额 = 期初现金余额 + 现金净增加额
                  </Paragraph>
                  
                  <Paragraph style={{ marginTop: 16, color: '#666' }}>
                    <Text type="secondary">注：现金账户包括库存现金(1001)和银行存款(1002)，仅统计已过账的分录。</Text>
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
                    title="经营活动现金流量净额"
                    value={data.operating_activities.net}
                    precision={2}
                    prefix="¥"
                    valueStyle={{ color: data.operating_activities.net >= 0 ? '#3f8600' : '#cf1322' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="投资活动现金流量净额"
                    value={data.investing_activities.net}
                    precision={2}
                    prefix="¥"
                    valueStyle={{ color: data.investing_activities.net >= 0 ? '#3f8600' : '#cf1322' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="筹资活动现金流量净额"
                    value={data.financing_activities.net}
                    precision={2}
                    prefix="¥"
                    valueStyle={{ color: data.financing_activities.net >= 0 ? '#3f8600' : '#cf1322' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="现金净增加额"
                    value={data.net_cash_flow}
                    precision={2}
                    prefix="¥"
                    valueStyle={{ color: data.net_cash_flow >= 0 ? '#3f8600' : '#cf1322' }}
                  />
                </Card>
              </Col>
            </Row>

            {/* 现金流量表 */}
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
                        期末现金余额：¥{formatMoney(data.ending_cash)}
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
            <p>请选择日期范围并点击"生成报表"查看现金流量表</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default CashFlow;

