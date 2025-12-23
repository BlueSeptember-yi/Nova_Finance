import { useEffect, useState } from 'react';
import { Card, Descriptions, Button, Spin } from 'antd';
import { companyApi } from '@/services/company';
import type { Company } from '@/types';

const CompanyPage = () => {
  const [loading, setLoading] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);

  const fetchCompany = async () => {
    setLoading(true);
    try {
      const response = await companyApi.get();
      if (response.success) {
        setCompany(response.data);
      }
    } catch (error) {
      console.error('Fetch company error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompany();
  }, []);

  const sizeMap: Record<string, string> = {
    Small: '小型',
    Medium: '中型',
    Large: '大型',
  };

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>企业信息</h1>
      
      <Spin spinning={loading}>
        <Card
          extra={<Button type="primary">编辑</Button>}
        >
          {company && (
            <Descriptions column={2}>
              <Descriptions.Item label="企业名称">
                {company.name}
              </Descriptions.Item>
              <Descriptions.Item label="企业规模">
                {company.size ? sizeMap[company.size] : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="注册资金">
                {company.registered_capital ? `¥${company.registered_capital.toLocaleString()}` : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {new Date(company.created_at).toLocaleDateString()}
              </Descriptions.Item>
            </Descriptions>
          )}
        </Card>
      </Spin>
    </div>
  );
};

export default CompanyPage;

