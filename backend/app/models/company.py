"""公司模型"""

import uuid
from datetime import datetime

from sqlalchemy import DECIMAL, Column, DateTime, Enum, String
from sqlalchemy.orm import relationship

from app.database import Base
from app.utils.helpers import get_beijing_time


class Company(Base):
    """公司/企业信息表"""

    __tablename__ = "company"

    company_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False, comment="公司名称")
    size = Column(Enum("Small", "Medium", "Large"), comment="企业规模")
    registered_capital = Column(DECIMAL(18, 2), comment="注册资本")
    created_at = Column(DateTime, default=get_beijing_time, comment="创建时间")

    # 关系
    users = relationship("User", back_populates="company")
    accounts = relationship("Account", back_populates="company")
    suppliers = relationship("Supplier", back_populates="company")
    customers = relationship("Customer", back_populates="company")
    products = relationship("Product", back_populates="company")
    payments = relationship("Payment", back_populates="company")
    receipts = relationship("Receipt", back_populates="company")
    bank_accounts = relationship("BankAccount", back_populates="company")

    def __repr__(self):
        return f"<Company {self.name}>"
