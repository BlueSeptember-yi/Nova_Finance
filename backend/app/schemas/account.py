"""会计科目相关数据模式"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class AccountType(str, Enum):
    """科目类型"""

    ASSET = "Asset"
    LIABILITY = "Liability"
    EQUITY = "Equity"
    REVENUE = "Revenue"
    EXPENSE = "Expense"
    COMMON = "Common"


class NormalBalance(str, Enum):
    """余额方向"""
    DEBIT = "Debit"
    CREDIT = "Credit"


class AccountCreate(BaseModel):
    """创建会计科目"""

    code: str = Field(..., min_length=4, max_length=20, description="科目编码")
    name: str = Field(..., min_length=1, max_length=100, description="科目名称")
    type: AccountType = Field(..., description="科目类型")
    normal_balance: Optional[NormalBalance] = Field(None, description="余额方向（可选，会根据type自动判断）")
    parent_id: Optional[str] = Field(None, description="父级科目ID")
    is_core: bool = Field(False, description="是否核心科目")
    remark: Optional[str] = Field(None, max_length=255, description="备注")


class AccountUpdate(BaseModel):
    """更新会计科目"""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    remark: Optional[str] = Field(None, max_length=255)


class AccountResponse(BaseModel):
    """会计科目响应"""

    account_id: str
    company_id: str
    parent_id: Optional[str]
    code: str
    name: str
    type: str
    normal_balance: str
    balance_debit: float
    balance_credit: float
    is_core: bool
    path: Optional[str]
    remark: Optional[str]
    created_at: datetime

    class Config:
        """Pydantic配置"""

        from_attributes = True


class AccountTreeNode(BaseModel):
    """科目树节点"""

    account_id: str
    code: str
    name: str
    type: str
    is_core: bool
    children: List = []

    class Config:
        """Pydantic配置"""

        from_attributes = True


# 在类定义后更新前向引用
AccountTreeNode.model_rebuild()
