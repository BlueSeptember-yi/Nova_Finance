"""商品模型"""

import uuid

from sqlalchemy import DECIMAL, Column, ForeignKey, String
from sqlalchemy.orm import relationship

from app.database import Base


class Product(Base):
    """商品表"""

    __tablename__ = "product"

    product_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id = Column(
        String(36), ForeignKey("company.company_id"), comment="所属公司"
    )
    sku = Column(
        String(50),
        nullable=False,
        comment="SKU编码（公司内唯一，通过复合唯一索引实现）",
    )
    name = Column(String(100), nullable=False, comment="商品名称")
    price = Column(DECIMAL(18, 2), comment="销售价")
    cost = Column(DECIMAL(18, 2), comment="成本价")

    # 关系
    company = relationship("Company", back_populates="products")
    inventory_items = relationship("InventoryItem", back_populates="product")

    def __repr__(self):
        return f"<Product {self.name}>"
