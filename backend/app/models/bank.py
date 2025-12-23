"""银行账户和流水模型"""

import uuid
from datetime import date, datetime

from sqlalchemy import (
    DECIMAL,
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    String,
)
from sqlalchemy.orm import relationship

from app.database import Base
from app.utils.helpers import get_beijing_time


class BankAccount(Base):
    """银行账户表"""

    __tablename__ = "bank_account"

    bank_account_id = Column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    company_id = Column(
        String(36), ForeignKey("company.company_id"), nullable=False, comment="所属公司"
    )
    account_number = Column(String(50), nullable=False, comment="银行账号")
    bank_name = Column(String(100), nullable=False, comment="银行名称")
    currency = Column(String(10), default="CNY", comment="币种")
    initial_balance = Column(DECIMAL(18, 2), default=0, comment="初始余额")
    remark = Column(String(255), comment="备注")
    created_at = Column(DateTime, default=get_beijing_time, comment="创建时间")

    # 关系
    company = relationship("Company", back_populates="bank_accounts")
    statements = relationship("BankStatement", back_populates="bank_account")

    def __repr__(self):
        return f"<BankAccount {self.bank_name} {self.account_number}>"


class BankStatement(Base):
    """银行流水表"""

    __tablename__ = "bank_statement"

    statement_id = Column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    company_id = Column(
        String(36), ForeignKey("company.company_id"), nullable=False, comment="公司"
    )
    bank_account_id = Column(
        String(36),
        ForeignKey("bank_account.bank_account_id"),
        nullable=False,
        comment="银行账户",
    )
    date = Column(Date, nullable=False, comment="交易日期")
    amount = Column(DECIMAL(18, 2), nullable=False, comment="金额")
    type = Column(Enum("Credit", "Debit"), nullable=False, comment="类型：收入/支出")
    balance = Column(DECIMAL(18, 2), comment="当前余额")
    description = Column(String(255), comment="摘要")
    is_reconciled = Column(Boolean, default=False, comment="是否已对账")
    created_at = Column(DateTime, default=get_beijing_time, comment="创建时间")

    # 关系
    company = relationship("Company")
    bank_account = relationship("BankAccount", back_populates="statements")
    reconciliations = relationship("Reconciliation", back_populates="bank_statement")

    def __repr__(self):
        return f"<BankStatement {self.statement_id} {self.date}>"
