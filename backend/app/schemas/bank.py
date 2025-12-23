"""银行和对账相关数据模式"""

from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Optional

from pydantic import BaseModel


class BankStatementType(str, Enum):
    """银行流水类型"""

    CREDIT = "Credit"  # 收入
    DEBIT = "Debit"  # 支出


class BankAccountCreate(BaseModel):
    """创建银行账户"""

    account_number: str
    bank_name: str
    currency: str = "CNY"
    initial_balance: Optional[Decimal] = Decimal("0")
    remark: str = ""


class BankAccountResponse(BaseModel):
    """银行账户响应"""

    bank_account_id: str
    company_id: str
    account_number: str
    bank_name: str
    currency: str
    initial_balance: Decimal = Decimal("0")
    remark: str = ""
    created_at: datetime

    class Config:
        """Pydantic配置"""

        from_attributes = True


class BankStatementCreate(BaseModel):
    """创建银行流水"""

    bank_account_id: str
    date: date
    amount: Decimal
    type: BankStatementType
    balance: Optional[Decimal] = None
    description: str = ""


class BankStatementResponse(BaseModel):
    """银行流水响应"""

    statement_id: str
    company_id: str
    bank_account_id: str
    date: date
    amount: Decimal
    type: str
    balance: Optional[Decimal] = None
    description: str = ""
    is_reconciled: Optional[bool] = False  # 对账状态（是否已对账）
    created_at: datetime

    class Config:
        """Pydantic配置"""

        from_attributes = True


class ReconciliationCreate(BaseModel):
    """创建对账记录"""

    bank_statement_id: str
    journal_id: str
    matched_amount: Decimal
    match_date: date
    remark: str = ""


class ReconciliationResponse(BaseModel):
    """对账记录响应"""

    recon_id: str
    company_id: str
    bank_statement_id: str
    journal_id: str
    matched_amount: Decimal
    match_date: date
    remark: str = ""
    created_at: datetime

    class Config:
        """Pydantic配置"""

        from_attributes = True
