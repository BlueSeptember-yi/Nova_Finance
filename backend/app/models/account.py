"""会计科目模型"""

import uuid
from datetime import datetime

from sqlalchemy import (
    DECIMAL,
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.database import Base
from app.utils.helpers import get_beijing_time


class Account(Base):
    """会计科目表"""

    __tablename__ = "account"
    __table_args__ = (
        UniqueConstraint("company_id", "code", name="uq_account_company_code"),
        UniqueConstraint("company_id", "path", name="uq_account_company_path"),
    )

    account_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id = Column(
        String(36), ForeignKey("company.company_id"), nullable=False, comment="所属公司"
    )
    parent_id = Column(
        String(36),
        ForeignKey("account.account_id"),
        nullable=True,
        comment="父级科目ID",
    )
    code = Column(String(20), nullable=False, comment="科目编码")
    name = Column(String(100), nullable=False, comment="科目名称")
    type = Column(
        Enum("Asset", "Liability", "Equity", "Revenue", "Expense", "Common"),
        nullable=False,
        comment="科目类型",
    )
    normal_balance = Column(
        Enum("Debit", "Credit"), nullable=False, comment="余额方向：借方/贷方"
    )
    balance_debit = Column(DECIMAL(18, 2), default=0, comment="借方余额（实时缓存）")
    balance_credit = Column(DECIMAL(18, 2), default=0, comment="贷方余额（实时缓存）")
    is_core = Column(Boolean, default=False, comment="是否核心科目")
    path = Column(String(255), nullable=True, comment="层级路径（公司内唯一）")
    remark = Column(String(255), comment="备注")
    created_at = Column(DateTime, default=get_beijing_time, comment="创建时间")

    # 关系
    company = relationship("Company", back_populates="accounts")
    parent = relationship("Account", remote_side=[account_id], backref="children")
    ledger_lines = relationship("LedgerLine", back_populates="account")

    def __repr__(self):
        return f"<Account {self.code} {self.name}>"
