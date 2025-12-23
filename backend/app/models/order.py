"""订单模型"""

import uuid
from datetime import date, datetime

from sqlalchemy import (
    DECIMAL,
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    String,
    Text,
    event,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base
from app.utils.helpers import get_beijing_time


class PurchaseOrder(Base):
    """采购订单表"""

    __tablename__ = "purchase_order"

    po_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    supplier_id = Column(
        String(36), ForeignKey("supplier.supplier_id"), nullable=False, comment="供应商"
    )
    company_id = Column(
        String(36), ForeignKey("company.company_id"), nullable=False, comment="所属公司"
    )
    date = Column(Date, nullable=False, default=date.today, comment="下单日期")
    expected_delivery_date = Column(Date, comment="预计交货日期")
    total_amount = Column(
        DECIMAL(18, 2), default=0, comment="总金额（自动计算：SUM(items.subtotal)）"
    )
    status = Column(Enum("Draft", "Posted", "Paid"), default="Draft", comment="状态")
    remark = Column(Text, comment="备注")
    created_at = Column(DateTime, default=get_beijing_time, comment="创建时间")

    # 关系
    supplier = relationship("Supplier", back_populates="purchase_orders")
    items = relationship(
        "PurchaseOrderItem",
        back_populates="purchase_order",
        cascade="all, delete-orphan",
    )
    payments = relationship("Payment", back_populates="purchase_order")

    def __repr__(self):
        return f"<PurchaseOrder {self.po_id}>"


class SalesOrder(Base):
    """销售订单表"""

    __tablename__ = "sales_order"

    so_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    customer_id = Column(
        String(36), ForeignKey("customer.customer_id"), nullable=False, comment="客户"
    )
    company_id = Column(
        String(36), ForeignKey("company.company_id"), nullable=False, comment="所属公司"
    )
    date = Column(Date, nullable=False, default=date.today, comment="销售日期")
    expected_delivery_date = Column(Date, comment="预计出库日期")
    total_amount = Column(
        DECIMAL(18, 2), default=0, comment="总金额（自动计算：SUM(items.subtotal)）"
    )
    payment_method = Column(Enum("Cash", "BankTransfer", "Credit"), comment="收款方式")
    status = Column(
        Enum("Draft", "Posted", "Collected"), default="Draft", comment="状态"
    )
    remark = Column(Text, comment="备注")
    created_at = Column(DateTime, default=get_beijing_time, comment="创建时间")

    # 关系
    customer = relationship("Customer", back_populates="sales_orders")
    items = relationship(
        "SalesOrderItem", back_populates="sales_order", cascade="all, delete-orphan"
    )
    receipts = relationship("Receipt", back_populates="sales_order")

    def __repr__(self):
        return f"<SalesOrder {self.so_id}>"


class PurchaseOrderItem(Base):
    """采购订单明细表"""

    __tablename__ = "purchase_order_item"

    item_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    purchase_order_id = Column(
        String(36),
        ForeignKey("purchase_order.po_id"),
        nullable=False,
        comment="采购订单ID",
    )
    product_id = Column(
        String(36), ForeignKey("product.product_id"), nullable=True, comment="商品ID"
    )
    product_name = Column(String(100), nullable=False, comment="商品名称")
    quantity = Column(DECIMAL(18, 2), nullable=False, comment="数量")
    unit_price = Column(DECIMAL(18, 2), nullable=False, comment="单价")
    discount_rate = Column(DECIMAL(5, 4), default=1.0, comment="折扣率")
    subtotal = Column(
        DECIMAL(18, 2),
        nullable=False,
        comment="小计（quantity * unit_price * discount_rate）",
    )

    # 关系
    purchase_order = relationship("PurchaseOrder", back_populates="items")
    product = relationship("Product")

    def __repr__(self):
        return f"<PurchaseOrderItem {self.item_id} {self.product_name}>"


class SalesOrderItem(Base):
    """销售订单明细表"""

    __tablename__ = "sales_order_item"

    item_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    sales_order_id = Column(
        String(36),
        ForeignKey("sales_order.so_id"),
        nullable=False,
        comment="销售订单ID",
    )
    product_id = Column(
        String(36), ForeignKey("product.product_id"), nullable=True, comment="商品ID"
    )
    product_name = Column(String(100), nullable=False, comment="商品名称")
    quantity = Column(DECIMAL(18, 2), nullable=False, comment="数量")
    unit_price = Column(DECIMAL(18, 2), nullable=False, comment="单价")
    discount_rate = Column(DECIMAL(5, 4), default=1.0, comment="折扣率")
    subtotal = Column(
        DECIMAL(18, 2),
        nullable=False,
        comment="小计（quantity * unit_price * discount_rate）",
    )

    # 关系
    sales_order = relationship("SalesOrder", back_populates="items")
    product = relationship("Product")

    def __repr__(self):
        return f"<SalesOrderItem {self.item_id} {self.product_name}>"


# 事件监听器：自动更新订单总金额
@event.listens_for(PurchaseOrderItem, "after_insert")
@event.listens_for(PurchaseOrderItem, "after_update")
@event.listens_for(PurchaseOrderItem, "after_delete")
def update_purchase_order_total(mapper, connection, target):
    """采购订单明细变更后自动更新订单总金额"""
    from sqlalchemy import func, select

    order_id = target.purchase_order_id
    result = connection.execute(
        select(func.sum(PurchaseOrderItem.subtotal)).where(
            PurchaseOrderItem.purchase_order_id == order_id
        )
    ).scalar()
    total = result or 0
    connection.execute(
        PurchaseOrder.__table__.update()
        .where(PurchaseOrder.po_id == order_id)
        .values(total_amount=total)
    )


@event.listens_for(SalesOrderItem, "after_insert")
@event.listens_for(SalesOrderItem, "after_update")
@event.listens_for(SalesOrderItem, "after_delete")
def update_sales_order_total(mapper, connection, target):
    """销售订单明细变更后自动更新订单总金额"""
    from sqlalchemy import func, select

    order_id = target.sales_order_id
    result = connection.execute(
        select(func.sum(SalesOrderItem.subtotal)).where(
            SalesOrderItem.sales_order_id == order_id
        )
    ).scalar()
    total = result or 0
    connection.execute(
        SalesOrder.__table__.update()
        .where(SalesOrder.so_id == order_id)
        .values(total_amount=total)
    )
