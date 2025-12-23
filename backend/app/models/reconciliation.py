"""对账模型"""

import uuid
from datetime import date, datetime

from sqlalchemy import DECIMAL, Column, Date, DateTime, ForeignKey, String
from sqlalchemy.orm import relationship

from app.database import Base
from app.utils.helpers import get_beijing_time


class Reconciliation(Base):
    """对账表（支持多对多关系：一笔银行流水可对应多个分录，多个分录可对应一笔银行流水）"""

    __tablename__ = "reconciliation"

    recon_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id = Column(
        String(36), ForeignKey("company.company_id"), nullable=False, comment="公司"
    )
    bank_statement_id = Column(
        String(36),
        ForeignKey("bank_statement.statement_id"),
        nullable=False,
        comment="银行流水ID",
    )
    journal_id = Column(
        String(36),
        ForeignKey("journal_entry.journal_id"),
        nullable=False,
        comment="匹配的分录ID",
    )
    matched_amount = Column(DECIMAL(18, 2), nullable=False, comment="匹配金额")
    match_date = Column(Date, nullable=False, default=date.today, comment="匹配日期")
    remark = Column(String(255), comment="备注")
    created_at = Column(DateTime, default=get_beijing_time, comment="创建时间")

    # 关系
    company = relationship("Company")
    bank_statement = relationship("BankStatement", back_populates="reconciliations")
    journal_entry = relationship("JournalEntry", back_populates="reconciliations")

    def __repr__(self):
        return f"<Reconciliation {self.recon_id}>"
