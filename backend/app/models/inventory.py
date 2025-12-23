"""库存模型"""

import uuid
from datetime import datetime

from sqlalchemy import DECIMAL, Column, DateTime, Enum, ForeignKey, String
from sqlalchemy.orm import relationship

from app.database import Base
from app.utils.helpers import get_beijing_time


class InventoryItem(Base):
    """库存记录表（实时库存快照，由流水计算得出）"""

    __tablename__ = "inventory_item"

    inventory_id = Column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    product_id = Column(
        String(36), ForeignKey("product.product_id"), nullable=False, comment="商品"
    )
    company_id = Column(
        String(36), ForeignKey("company.company_id"), nullable=False, comment="公司"
    )
    quantity = Column(
        DECIMAL(18, 2),
        default=0,
        comment="数量（=SUM(inventory_transaction.quantity)）",
    )
    average_cost = Column(
        DECIMAL(18, 2),
        default=0,
        comment="加权平均成本",
    )
    updated_at = Column(
        DateTime,
        default=get_beijing_time,
        onupdate=get_beijing_time,
        comment="更新时间",
    )

    # 关系
    product = relationship("Product", back_populates="inventory_items")
    transactions = relationship("InventoryTransaction", back_populates="inventory_item")

    def __repr__(self):
        return f"<InventoryItem {self.inventory_id}>"


class InventoryTransaction(Base):
    """库存流水表"""

    __tablename__ = "inventory_transaction"

    transaction_id = Column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    company_id = Column(
        String(36), ForeignKey("company.company_id"), nullable=False, comment="公司"
    )
    product_id = Column(
        String(36), ForeignKey("product.product_id"), nullable=False, comment="商品"
    )
    inventory_id = Column(
        String(36),
        ForeignKey("inventory_item.inventory_id"),
        nullable=True,
        comment="库存记录ID",
    )
    type = Column(Enum("IN", "OUT"), nullable=False, comment="类型：入库/出库")
    quantity = Column(
        DECIMAL(18, 2), nullable=False, comment="数量（入库为正，出库为负）"
    )
    unit_cost = Column(
        DECIMAL(18, 2),
        comment="单位成本（入库时记录采购成本，出库时记录加权平均成本）",
    )
    source_type = Column(
        Enum("PO", "SO", "Manual", "Adjustment"),
        nullable=False,
        comment="来源类型：采购单/销售单/手工录入/调整",
    )
    source_id = Column(String(36), nullable=True, comment="来源ID（如订单ID）")
    warehouse_location = Column(String(100), comment="仓库位置（每个流水记录的位置）")
    remark = Column(String(255), comment="备注")
    created_at = Column(DateTime, default=get_beijing_time, comment="创建时间")

    # 关系
    company = relationship("Company")
    product = relationship("Product")
    inventory_item = relationship("InventoryItem", back_populates="transactions")

    def __repr__(self):
        return f"<InventoryTransaction {self.transaction_id} {self.type}>"
