"""客户模型"""

import uuid
from datetime import datetime

from sqlalchemy import DECIMAL, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship

from app.database import Base
from app.utils.helpers import get_beijing_time


class Customer(Base):
    """客户表"""

    __tablename__ = "customer"

    customer_id = Column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    company_id = Column(
        String(36), ForeignKey("company.company_id"), nullable=False, comment="所属公司"
    )
    name = Column(String(100), nullable=False, comment="客户名称")
    phone = Column(String(20), comment="电话")
    email = Column(String(100), comment="邮箱")
    address = Column(String(255), comment="地址")
    tax_no = Column(String(50), comment="税号")
    credit_limit = Column(DECIMAL(18, 2), default=0, comment="信用额度")
    remark = Column(Text, comment="备注")
    created_at = Column(DateTime, default=get_beijing_time, comment="创建时间")

    # 关系
    company = relationship("Company", back_populates="customers")
    sales_orders = relationship("SalesOrder", back_populates="customer")

    def __repr__(self):
        return f"<Customer {self.name}>"
