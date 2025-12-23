"""核心科目初始化"""


def get_core_accounts():
    """
    返回核心会计科目列表
    按照中国会计准则，创建五大类一级科目和常用二级科目
    """
    return [
        # 1. 资产类 (Asset)
        {
            "code": "1001",
            "name": "库存现金",
            "type": "Asset",
            "is_core": True,
            "parent_id": None,
        },
        {
            "code": "1002",
            "name": "银行存款",
            "type": "Asset",
            "is_core": True,
            "parent_id": None,
        },
        {
            "code": "1012",
            "name": "其他货币资金",
            "type": "Asset",
            "is_core": True,
            "parent_id": None,
        },
        {
            "code": "1121",
            "name": "应收票据",
            "type": "Asset",
            "is_core": True,
            "parent_id": None,
        },
        {
            "code": "1122",
            "name": "应收账款",
            "type": "Asset",
            "is_core": True,
            "parent_id": None,
        },
        {
            "code": "1123",
            "name": "预付账款",
            "type": "Asset",
            "is_core": True,
            "parent_id": None,
        },
        {
            "code": "1401",
            "name": "材料采购",
            "type": "Asset",
            "is_core": True,
            "parent_id": None,
        },
        {
            "code": "1403",
            "name": "原材料",
            "type": "Asset",
            "is_core": True,
            "parent_id": None,
        },
        {
            "code": "1405",
            "name": "库存商品",
            "type": "Asset",
            "is_core": True,
            "parent_id": None,
        },
        {
            "code": "1601",
            "name": "固定资产",
            "type": "Asset",
            "is_core": True,
            "parent_id": None,
        },
        # 2. 负债类 (Liability)
        {
            "code": "2001",
            "name": "短期借款",
            "type": "Liability",
            "is_core": True,
            "parent_id": None,
        },
        {
            "code": "2201",
            "name": "应付票据",
            "type": "Liability",
            "is_core": True,
            "parent_id": None,
        },
        {
            "code": "2202",
            "name": "应付账款",
            "type": "Liability",
            "is_core": True,
            "parent_id": None,
        },
        {
            "code": "2211",
            "name": "应付职工薪酬",
            "type": "Liability",
            "is_core": True,
            "parent_id": None,
        },
        {
            "code": "2221",
            "name": "应交税费",
            "type": "Liability",
            "is_core": True,
            "parent_id": None,
        },
        # 3. 所有者权益类 (Equity)
        {
            "code": "4001",
            "name": "实收资本",
            "type": "Equity",
            "is_core": True,
            "parent_id": None,
        },
        {
            "code": "4002",
            "name": "资本公积",
            "type": "Equity",
            "is_core": True,
            "parent_id": None,
        },
        {
            "code": "4103",
            "name": "本年利润",
            "type": "Equity",
            "is_core": True,
            "parent_id": None,
        },
        {
            "code": "4104",
            "name": "利润分配",
            "type": "Equity",
            "is_core": True,
            "parent_id": None,
        },
        # 4. 成本类 (Cost) - 按成本归入费用
        {
            "code": "5001",
            "name": "生产成本",
            "type": "Expense",
            "is_core": True,
            "parent_id": None,
        },
        {
            "code": "5101",
            "name": "制造费用",
            "type": "Expense",
            "is_core": True,
            "parent_id": None,
        },
        # 5. 损益类 - 收入
        {
            "code": "6001",
            "name": "主营业务收入",
            "type": "Revenue",
            "is_core": True,
            "parent_id": None,
        },
        {
            "code": "6051",
            "name": "其他业务收入",
            "type": "Revenue",
            "is_core": True,
            "parent_id": None,
        },
        {
            "code": "6111",
            "name": "投资收益",
            "type": "Revenue",
            "is_core": True,
            "parent_id": None,
        },
        # 6. 损益类 - 费用
        {
            "code": "6401",
            "name": "主营业务成本",
            "type": "Expense",
            "is_core": True,
            "parent_id": None,
        },
        {
            "code": "6402",
            "name": "其他业务成本",
            "type": "Expense",
            "is_core": True,
            "parent_id": None,
        },
        {
            "code": "6601",
            "name": "销售费用",
            "type": "Expense",
            "is_core": True,
            "parent_id": None,
        },
        {
            "code": "6602",
            "name": "管理费用",
            "type": "Expense",
            "is_core": True,
            "parent_id": None,
        },
        {
            "code": "6603",
            "name": "财务费用",
            "type": "Expense",
            "is_core": True,
            "parent_id": None,
        },
    ]
