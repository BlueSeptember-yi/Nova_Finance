"""收付款模型"""

import uuid
from datetime import date, datetime

from sqlalchemy import DECIMAL, Column, Date, DateTime, Enum, ForeignKey, String
from sqlalchemy.orm import relationship

from app.database import Base
from app.utils.helpers import get_beijing_time


class Payment(Base):
    """付款记录表"""

    __tablename__ = "payment"

    payment_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id = Column(
        String(36), ForeignKey("company.company_id"), nullable=False, comment="所属公司"
    )
    purchase_order_id = Column(
        String(36),
        ForeignKey("purchase_order.po_id"),
        nullable=True,
        comment="对应采购单ID",
    )
    date = Column(Date, nullable=False, default=date.today, comment="付款日期")
    amount = Column(DECIMAL(18, 2), nullable=False, comment="金额")
    payment_method = Column(
        Enum("Cash", "BankTransfer", "Credit"),
        nullable=False,
        comment="付款方式：Cash-现金, BankTransfer-银行转账, Credit-赊购",
    )
    remark = Column(String(255), comment="备注")
    created_at = Column(DateTime, default=get_beijing_time, comment="创建时间")

    # 关系
    company = relationship("Company", back_populates="payments")
    purchase_order = relationship("PurchaseOrder", back_populates="payments")

    def __repr__(self):
        return f"<Payment {self.payment_id}>"


class Receipt(Base):
    """收款记录表"""

    __tablename__ = "receipt"

    receipt_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id = Column(
        String(36), ForeignKey("company.company_id"), nullable=False, comment="所属公司"
    )
    sales_order_id = Column(
        String(36),
        ForeignKey("sales_order.so_id"),
        nullable=True,
        comment="对应销售单ID",
    )
    date = Column(Date, nullable=False, default=date.today, comment="收款日期")
    amount = Column(DECIMAL(18, 2), nullable=False, comment="金额")
    method = Column(
        Enum("Cash", "BankTransfer", "Credit"),
        nullable=False,
        comment="收款方式：Cash-现金, BankTransfer-银行转账, Credit-收回应收账款",
    )
    remark = Column(String(255), comment="备注")
    created_at = Column(DateTime, default=get_beijing_time, comment="创建时间")

    # 关系
    company = relationship("Company", back_populates="receipts")
    sales_order = relationship("SalesOrder", back_populates="receipts")

    def __repr__(self):
        return f"<Receipt {self.receipt_id}>"
