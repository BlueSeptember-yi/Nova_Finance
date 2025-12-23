"""会计分录模型"""

import uuid
from datetime import date, datetime

from sqlalchemy import (
    DECIMAL,
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.orm import relationship, validates

from app.database import Base
from app.utils.helpers import get_beijing_time


class JournalEntry(Base):
    """会计分录表"""

    __tablename__ = "journal_entry"
    __table_args__ = (
        CheckConstraint(
            "total_debit = total_credit", name="check_debit_credit_balance"
        ),
    )

    journal_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id = Column(
        String(36), ForeignKey("company.company_id"), nullable=False, comment="所属公司"
    )
    date = Column(Date, nullable=False, default=date.today, comment="记账日期")
    description = Column(String(255), comment="摘要")
    source_type = Column(
        Enum("PO", "SO", "PAYMENT", "RECEIPT", "MANUAL"),
        nullable=True,
        comment="业务来源类型：采购单/销售单/付款/收款/手工录入",
    )
    source_id = Column(String(36), nullable=True, comment="业务来源ID")
    total_debit = Column(DECIMAL(18, 2), default=0, comment="借方合计")
    total_credit = Column(DECIMAL(18, 2), default=0, comment="贷方合计")
    posted = Column(Boolean, default=False, comment="是否已过账")
    posted_by = Column(
        String(36), ForeignKey("user.user_id"), nullable=True, comment="过账人"
    )
    created_at = Column(DateTime, default=get_beijing_time, comment="创建时间")

    # 关系
    lines = relationship(
        "LedgerLine", back_populates="journal_entry", cascade="all, delete-orphan"
    )
    reconciliations = relationship("Reconciliation", back_populates="journal_entry")

    @validates("total_debit", "total_credit")
    def validate_balance(self, key, value):
        """验证借贷平衡"""
        if value is None:
            return value
        from decimal import Decimal

        value_decimal = Decimal(str(value)) if not isinstance(value, Decimal) else value

        if key == "total_debit":
            if self.total_credit is not None:
                credit_decimal = (
                    Decimal(str(self.total_credit))
                    if not isinstance(self.total_credit, Decimal)
                    else self.total_credit
                )
                if abs(value_decimal - credit_decimal) > Decimal("0.01"):
                    raise ValueError("借贷不平衡")
        elif key == "total_credit":
            if self.total_debit is not None:
                debit_decimal = (
                    Decimal(str(self.total_debit))
                    if not isinstance(self.total_debit, Decimal)
                    else self.total_debit
                )
                if abs(value_decimal - debit_decimal) > Decimal("0.01"):
                    raise ValueError("借贷不平衡")
        return value

    def __repr__(self):
        return f"<JournalEntry {self.journal_id} {self.date}>"


class LedgerLine(Base):
    """分录明细表"""

    __tablename__ = "ledger_line"

    line_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    journal_id = Column(
        String(36), ForeignKey("journal_entry.journal_id"), comment="所属分录"
    )
    account_id = Column(
        String(36), ForeignKey("account.account_id"), comment="对应科目"
    )
    debit = Column(DECIMAL(18, 2), default=0, comment="借方金额")
    credit = Column(DECIMAL(18, 2), default=0, comment="贷方金额")
    memo = Column(String(255), comment="备注")
    created_at = Column(DateTime, default=get_beijing_time, comment="创建时间")

    # 关系
    journal_entry = relationship("JournalEntry", back_populates="lines")
    account = relationship("Account", back_populates="ledger_lines")

    def __repr__(self):
        return f"<LedgerLine {self.line_id}>"
