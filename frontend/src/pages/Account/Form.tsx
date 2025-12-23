import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Form, Input, Select, Button, Card, message, Steps, AutoComplete } from 'antd';
import { accountApi } from '@/services/account';
import { standardAccountApi, StandardAccount } from '@/services/standardAccount';
import { accountTypeMap } from '@/utils';
import type { Account } from '@/types';

const { Option } = Select;

type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense' | 'Common';
type AccountLevel = 'first' | 'child';

const AccountForm = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [accountData, setAccountData] = useState<Account | null>(null);
  
  // 步骤1: 选择的类型
  const [selectedType, setSelectedType] = useState<AccountType | null>(null);
  const [typeSelectOpen, setTypeSelectOpen] = useState(false);
  
  // 步骤2: 选择的级别
  const [selectedLevel, setSelectedLevel] = useState<AccountLevel | null>(null);
  const [levelSelectOpen, setLevelSelectOpen] = useState(false);
  
  // 步骤3.1: 一级科目相关
  const [standardFirstAccounts, setStandardFirstAccounts] = useState<StandardAccount[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  
  // 步骤3.2: 子科目相关
  const [parentAccounts, setParentAccounts] = useState<Account[]>([]);
  const [selectedParent, setSelectedParent] = useState<Account | null>(null);
  const [standardChildAccounts, setStandardChildAccounts] = useState<StandardAccount[]>([]);
  const [childSearchKeyword, setChildSearchKeyword] = useState('');

  // 编辑模式：加载科目数据
  useEffect(() => {
    if (isEditMode && id) {
      const fetchAccount = async () => {
        setLoading(true);
        try {
          const response = await accountApi.get(id);
          if (response.success && response.data) {
            const account = response.data;
            setAccountData(account);
            setSelectedType(account.type as AccountType);
            setSelectedLevel(account.parent_id ? 'child' : 'first');
            
            // 填充表单
            form.setFieldsValue({
              name: account.name,
              remark: account.remark,
            });
            
            // 如果是子科目，需要设置父科目
            if (account.parent_id) {
              // 获取父科目信息
              const parentResponse = await accountApi.get(account.parent_id);
              if (parentResponse.success && parentResponse.data) {
                setSelectedParent(parentResponse.data);
                form.setFieldsValue({ parent_id: account.parent_id });
              }
            }
          }
        } catch (error) {
          console.error('Fetch account error:', error);
          message.error('加载科目信息失败');
          navigate('/accounts');
        } finally {
          setLoading(false);
        }
      };
      fetchAccount();
    }
  }, [isEditMode, id, form, navigate]);

  // 获取标准一级科目列表
  useEffect(() => {
    if (selectedType && selectedLevel === 'first') {
      fetchStandardFirstAccounts();
    }
  }, [selectedType, selectedLevel]);

  // 获取企业已创建的科目列表（用于选择父科目）
  useEffect(() => {
    if (selectedLevel === 'child') {
      fetchParentAccounts();
    }
  }, [selectedLevel]);

  // 获取标准子科目列表（当选择了父科目后）
  useEffect(() => {
    if (selectedParent && selectedLevel === 'child') {
      fetchStandardChildAccounts();
    }
  }, [selectedParent, selectedLevel]);

  const fetchStandardFirstAccounts = async () => {
    try {
      const params: any = {
        type: selectedType,
        level: 1,
      };
      if (searchKeyword) {
        params.search = searchKeyword;
      }
      const response = await standardAccountApi.getList(params);
      if (response.success) {
        setStandardFirstAccounts(response.data || []);
      }
    } catch (error) {
      console.error('Fetch standard first accounts error:', error);
    }
  };

  const fetchParentAccounts = async () => {
    try {
      const response = await accountApi.getTree();
      if (response.success) {
        // 展平树结构，获取所有科目
        const flattenAccounts = (nodes: any[]): Account[] => {
          let result: Account[] = [];
          nodes.forEach(node => {
            result.push({
              account_id: node.account_id,
              code: node.code,
              name: node.name,
              type: node.type,
              normal_balance: 'Debit', // 默认值，实际不会用到
              is_core: node.is_core,
            } as Account);
            if (node.children && node.children.length > 0) {
              result = result.concat(flattenAccounts(node.children));
            }
          });
          return result;
        };
        setParentAccounts(flattenAccounts(response.data || []));
      }
    } catch (error) {
      console.error('Fetch parent accounts error:', error);
    }
  };

  const fetchStandardChildAccounts = async () => {
    if (!selectedParent) return;
    try {
      const params: any = {
        type: selectedType,
        parent_code: selectedParent.code,
      };
      if (childSearchKeyword) {
        params.search = childSearchKeyword;
      }
      const response = await standardAccountApi.getList(params);
      if (response.success) {
        setStandardChildAccounts(response.data || []);
      }
    } catch (error) {
      console.error('Fetch standard child accounts error:', error);
    }
  };

  // 搜索标准一级科目
  useEffect(() => {
    if (selectedType && selectedLevel === 'first') {
      const timer = setTimeout(() => {
        fetchStandardFirstAccounts();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchKeyword]);

  // 搜索标准子科目
  useEffect(() => {
    if (selectedParent && selectedLevel === 'child') {
      const timer = setTimeout(() => {
        fetchStandardChildAccounts();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [childSearchKeyword]);

  // 处理code输入，只允许数字和小数点
  const handleCodeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // 过滤掉非数字和小数点的字符
    const filteredValue = value.replace(/[^0-9.]/g, '');
    if (filteredValue !== value) {
      form.setFieldsValue({ code: filteredValue });
    }
  };

  // 选择标准一级科目
  const handleSelectStandardFirstAccount = (value: string) => {
    const account = standardFirstAccounts.find(acc => acc.code === value);
    if (account) {
      // 自动填充所有标准信息，且不可修改
      form.setFieldsValue({
        code: account.code,
        name: account.name,
        normal_balance: account.normal_balance,
        _selectedStandardAccount: account.code,
      });
    }
  };

  // 选择标准子科目
  const handleSelectStandardChildAccount = (value: string) => {
    const account = standardChildAccounts.find(acc => acc.code === value);
    if (account) {
      form.setFieldsValue({
        code: account.code,
        name: account.name,
        normal_balance: account.normal_balance,
      });
    }
  };

  // 选择父科目
  const handleSelectParent = (accountId: string) => {
    const parent = parentAccounts.find(acc => acc.account_id === accountId);
    setSelectedParent(parent || null);
    form.setFieldsValue({ parent_id: accountId });
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      if (isEditMode && id) {
        // 编辑模式：只更新名称和备注
        const response = await accountApi.update(id, {
          name: values.name,
          remark: values.remark,
        });
        if (response.success) {
          message.success('科目更新成功');
          navigate('/accounts');
        }
      } else {
        // 创建模式
        const submitData: any = {
          code: values.code,
          name: values.name,
          type: selectedType,
          normal_balance: values.normal_balance,
          is_core: selectedLevel === 'child' ? false : (values.is_core || false), // 子科目强制为非核心科目
          remark: values.remark,
        };
        
        if (selectedLevel === 'child') {
          submitData.parent_id = values.parent_id;
        }
        
        const response = await accountApi.create(submitData);
        if (response.success) {
          message.success('科目创建成功');
          navigate('/accounts');
        }
      }
    } catch (error: any) {
      message.error(error?.response?.data?.detail || (isEditMode ? '更新失败' : '创建失败'));
      console.error(isEditMode ? 'Update account error:' : 'Create account error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentStep === 0) {
      // 验证类型选择
      if (!selectedType) {
        message.warning('请选择科目类型');
        return;
      }
      setCurrentStep(1);
    } else if (currentStep === 1) {
      // 验证级别选择
      if (!selectedLevel) {
        message.warning('请选择创建一级科目还是子科目');
        return;
      }
      setCurrentStep(2);
    }
  };

  // handlePrev function is not used but kept for future use
  // const handlePrev = () => {
  //   if (currentStep > 0) {
  //     setCurrentStep(currentStep - 1);
  //   }
  // };

  const handleBack = () => {
    if (currentStep === 0) {
      navigate('/accounts');
    } else {
      setCurrentStep(currentStep - 1);
    }
  };

  // 渲染步骤内容
  const renderStepContent = () => {
    if (currentStep === 0) {
      // 步骤1: 选择类型
      return (
        <div>
          <Form.Item label="科目类型" required>
            <Select
              placeholder="请选择科目类型"
              value={selectedType}
              open={typeSelectOpen}
              onDropdownVisibleChange={setTypeSelectOpen}
              onChange={(value) => {
                setSelectedType(value);
                setTypeSelectOpen(false);
              }}
              style={{ width: '100%' }}
            >
              {Object.entries(accountTypeMap).map(([key, label]) => (
                <Option key={key} value={key}>
                  {label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </div>
      );
    }

    if (currentStep === 1) {
      // 步骤2: 选择一级科目还是子科目
      return (
        <div>
          <Form.Item label="科目级别" required>
            <Select
              placeholder="请选择创建一级科目还是子科目"
              value={selectedLevel}
              open={levelSelectOpen}
              onDropdownVisibleChange={setLevelSelectOpen}
              onChange={(value) => {
                setSelectedLevel(value);
                setSelectedParent(null);
                form.resetFields(['parent_id', 'code', 'name']);
                setLevelSelectOpen(false);
              }}
              style={{ width: '100%' }}
            >
              <Option value="first">一级科目</Option>
              <Option value="child">子科目</Option>
            </Select>
          </Form.Item>
        </div>
      );
    }

    if (currentStep === 2) {
      // 步骤3: 填写科目信息
      if (selectedLevel === 'first') {
        // 一级科目：从标准科目中选择
        return (
          <>
            <Form.Item
              label="选择标准科目（可通过编码或名称搜索）"
              name="_selectedStandardAccount"
              rules={[{ required: true, message: '请从标准科目中选择一级科目' }]}
              help="一级科目必须从标准科目中选择"
            >
              <AutoComplete
                style={{ width: '100%' }}
                options={standardFirstAccounts.map(acc => ({
                  value: acc.code,
                  label: `${acc.code} - ${acc.name}`,
                }))}
                onSearch={setSearchKeyword}
                onSelect={handleSelectStandardFirstAccount}
                placeholder="输入科目编码或名称进行搜索"
                filterOption={false}
              />
            </Form.Item>

            <Form.Item
              label="科目编码"
              name="code"
              rules={[
                { required: true, message: '请从标准科目中选择' },
                { pattern: /^[0-9.]+$/, message: '科目编码只能包含数字和小数点' },
              ]}
            >
              <Input
                placeholder="从标准科目中选择后自动填充"
                readOnly
                style={{ cursor: 'not-allowed', backgroundColor: '#f5f5f5' }}
              />
            </Form.Item>

            <Form.Item
              label="科目名称"
              name="name"
              rules={[{ required: true, message: '请从标准科目中选择' }]}
            >
              <Input
                placeholder="从标准科目中选择后自动填充"
                readOnly
                style={{ cursor: 'not-allowed', backgroundColor: '#f5f5f5' }}
              />
            </Form.Item>

            <Form.Item
              label="余额方向"
              name="normal_balance"
              rules={[{ required: true, message: '请从标准科目中选择' }]}
            >
              <Form.Item shouldUpdate noStyle>
                {({ getFieldValue }) => {
                  const balance = getFieldValue('normal_balance');
                  const balanceText = balance === 'Debit' ? '借方' : balance === 'Credit' ? '贷方' : '';
                  return (
                    <Input
                      placeholder="从标准科目中选择后自动填充"
                      readOnly
                      value={balanceText}
                      style={{ cursor: 'not-allowed', backgroundColor: '#f5f5f5' }}
                    />
                  );
                }}
              </Form.Item>
            </Form.Item>

            <Form.Item
              label="是否核心科目"
              name="is_core"
              initialValue={false}
              tooltip="核心科目不能删除和编辑"
            >
              <Select>
                <Option value={false}>否</Option>
                <Option value={true}>是</Option>
              </Select>
            </Form.Item>

            <Form.Item label="备注" name="remark">
              <Input.TextArea rows={3} placeholder="可选" />
            </Form.Item>
          </>
        );
      } else {
        // 子科目：先选择父科目，然后填写子科目信息
        return (
          <>
            <Form.Item
              label="选择父科目"
              name="parent_id"
              rules={[{ required: true, message: '请选择父科目' }]}
            >
              <Select
                placeholder="请选择父科目"
                showSearch
                filterOption={(input, option) => {
                  const label = typeof option?.label === 'string' ? option.label : String(option?.label || '');
                  const value = String(option?.value || '');
                  return label.toLowerCase().includes(input.toLowerCase()) ||
                    value.toLowerCase().includes(input.toLowerCase());
                }}
                onChange={handleSelectParent}
                style={{ width: '100%' }}
              >
                {parentAccounts.map(acc => (
                  <Option key={acc.account_id} value={acc.account_id}>
                    {acc.code} - {acc.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            {selectedParent && (
              <>
                <Form.Item
                  label="选择标准子科目（可通过编码或名称搜索，可选）"
                  help="可以从标准科目中选择推荐，也可以手动填写"
                >
                  <AutoComplete
                    style={{ width: '100%' }}
                    options={standardChildAccounts.map(acc => ({
                      value: acc.code,
                      label: `${acc.code} - ${acc.name}`,
                    }))}
                    onSearch={setChildSearchKeyword}
                    onSelect={handleSelectStandardChildAccount}
                    placeholder="输入科目编码或名称进行搜索"
                    filterOption={false}
                  />
                </Form.Item>

                <Form.Item
                  label="科目编码"
                  name="code"
                  rules={[
                    { required: true, message: '请输入科目编码' },
                    { pattern: /^[0-9.]+$/, message: '科目编码只能包含数字和小数点' },
                  ]}
                >
                  <Input
                    placeholder="如: 1001.01"
                    onChange={handleCodeInput}
                  />
                </Form.Item>

                <Form.Item
                  label="科目名称"
                  name="name"
                  rules={[{ required: true, message: '请输入科目名称' }]}
                >
                  <Input placeholder="如: 库存现金-人民币" />
                </Form.Item>

                <Form.Item
                  label="余额方向"
                  name="normal_balance"
                  rules={[{ required: true, message: '请选择余额方向' }]}
                >
                  <Select placeholder="请选择余额方向">
                    <Option value="Debit">借方</Option>
                    <Option value="Credit">贷方</Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  label="是否核心科目"
                  name="is_core"
                  initialValue={false}
                  tooltip="子科目默认为非核心科目"
                >
                  <Select disabled>
                    <Option value={false}>否</Option>
                  </Select>
                </Form.Item>

                <Form.Item label="备注" name="remark">
                  <Input.TextArea rows={3} placeholder="可选" />
                </Form.Item>
              </>
            )}
          </>
        );
      }
    }

    return null;
  };

  // 编辑模式：直接显示编辑表单
  if (isEditMode) {
    if (!accountData) {
      return <div>加载中...</div>;
    }
    
    return (
      <div>
        <h1 style={{ marginBottom: 24 }}>编辑会计科目</h1>
        
        <Card>
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            autoComplete="off"
          >
            <Form.Item label="科目编码">
              <Input value={accountData.code} readOnly style={{ cursor: 'not-allowed', backgroundColor: '#f5f5f5' }} />
            </Form.Item>
            
            <Form.Item label="科目类型">
              <Input value={(accountTypeMap[accountData.type] || accountData.type) as string} readOnly style={{ cursor: 'not-allowed', backgroundColor: '#f5f5f5' }} />
            </Form.Item>
            
            <Form.Item label="余额方向">
              <Input value={accountData.normal_balance === 'Debit' ? '借方' : '贷方'} readOnly style={{ cursor: 'not-allowed', backgroundColor: '#f5f5f5' }} />
            </Form.Item>
            
            <Form.Item label="是否核心科目">
              <Input value={accountData.is_core ? '是' : '否'} readOnly style={{ cursor: 'not-allowed', backgroundColor: '#f5f5f5' }} />
            </Form.Item>
            
            <Form.Item
              label="科目名称"
              name="name"
              rules={[{ required: true, message: '请输入科目名称' }]}
            >
              <Input placeholder="请输入科目名称" />
            </Form.Item>
            
            <Form.Item label="备注" name="remark">
              <Input.TextArea rows={3} placeholder="可选" />
            </Form.Item>
            
            <Form.Item style={{ marginTop: 24 }}>
              <Button onClick={() => navigate('/accounts')} style={{ marginRight: 8 }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                保存
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>新增会计科目</h1>
      
      <Card>
        <Steps current={currentStep} style={{ marginBottom: 32 }}
          items={[
            { title: '选择类型' },
            { title: '选择级别' },
            { title: '填写信息' },
          ]}
        />

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          autoComplete="off"
        >
          {renderStepContent()}

          <Form.Item style={{ marginTop: 24 }}>
            <Button onClick={handleBack} style={{ marginRight: 8 }}>
              {currentStep === 0 ? '取消' : '上一步'}
            </Button>
            {currentStep < 2 ? (
              <Button type="primary" onClick={handleNext}>
                下一步
              </Button>
            ) : (
              <Button type="primary" htmlType="submit" loading={loading}>
                提交
              </Button>
            )}
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default AccountForm;
