"""供应商模型"""

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship

from app.database import Base
from app.utils.helpers import get_beijing_time


class Supplier(Base):
    """供应商表"""

    __tablename__ = "supplier"

    supplier_id = Column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    company_id = Column(
        String(36), ForeignKey("company.company_id"), nullable=False, comment="所属公司"
    )
    name = Column(String(100), nullable=False, comment="供应商名称")
    contact = Column(String(100), comment="联系人")
    phone = Column(String(20), comment="电话")
    email = Column(String(100), comment="邮箱")
    address = Column(String(255), comment="地址")
    tax_no = Column(String(50), comment="税号")
    bank_account = Column(String(50), comment="银行账户")
    remark = Column(Text, comment="备注")
    created_at = Column(DateTime, default=get_beijing_time, comment="创建时间")

    # 关系
    company = relationship("Company", back_populates="suppliers")
    purchase_orders = relationship("PurchaseOrder", back_populates="supplier")

    def __repr__(self):
        return f"<Supplier {self.name}>"
