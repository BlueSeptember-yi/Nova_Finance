"""订单相关数据模式"""

from datetime import date, datetime
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel


class OrderStatus(str, Enum):
    """订单状态"""

    DRAFT = "Draft"
    POSTED = "Posted"
    PAID = "Paid"
    COLLECTED = "Collected"


class PaymentMethod(str, Enum):
    """支付方式（统一用于销售单、收款、付款）"""

    CASH = "Cash"  # 现金
    BANK_TRANSFER = "BankTransfer"  # 银行转账
    CREDIT = "Credit"  # 赊销/赊购（形成应收/应付账款）


class OrderItemCreate(BaseModel):
    """创建订单明细"""

    product_id: str | None = None
    product_name: str
    quantity: Decimal
    unit_price: Decimal
    discount_rate: Decimal = 1.0


class PurchaseOrderItemResponse(BaseModel):
    """采购订单明细响应"""

    item_id: str
    purchase_order_id: str
    product_id: str | None = None
    product_name: str
    quantity: Decimal
    unit_price: Decimal
    discount_rate: Decimal
    subtotal: Decimal

    class Config:
        """Pydantic配置"""

        from_attributes = True


class SalesOrderItemResponse(BaseModel):
    """销售订单明细响应"""

    item_id: str
    sales_order_id: str
    product_id: str | None = None
    product_name: str
    quantity: Decimal
    unit_price: Decimal
    discount_rate: Decimal
    subtotal: Decimal

    class Config:
        """Pydantic配置"""

        from_attributes = True


class PurchaseOrderCreate(BaseModel):
    """创建采购订单"""

    supplier_id: str
    date: date
    expected_delivery_date: date | None = None
    items: list[OrderItemCreate]
    remark: str = ""


class PurchaseOrderResponse(BaseModel):
    """采购订单响应"""

    po_id: str
    supplier_id: str
    company_id: str
    date: date
    expected_delivery_date: date | None = None
    total_amount: Decimal
    status: str
    remark: str = ""
    created_at: datetime
    items: list[PurchaseOrderItemResponse] = []

    class Config:
        """Pydantic配置"""

        from_attributes = True


class SalesOrderCreate(BaseModel):
    """创建销售订单"""

    customer_id: str
    date: date
    expected_delivery_date: date | None = None
    payment_method: str = ""
    items: list[OrderItemCreate]
    remark: str = ""


class SalesOrderResponse(BaseModel):
    """销售订单响应"""

    so_id: str
    customer_id: str
    company_id: str
    date: date
    expected_delivery_date: date | None = None
    total_amount: Decimal
    payment_method: str | None = None
    status: str
    remark: str = ""
    created_at: datetime
    items: list[SalesOrderItemResponse] = []

    class Config:
        """Pydantic配置"""

        from_attributes = True


class PostPurchaseOrderRequest(BaseModel):
    """采购订单过账请求"""

    warehouse_locations: dict[
        str, str | None
    ] = {}  # key: product_id, value: warehouse_location

    class Config:
        """Pydantic配置"""

        from_attributes = True


class PostSalesOrderRequest(BaseModel):
    """销售订单过账请求（简化版：不需要位置信息，只检查总库存）"""

    class Config:
        """Pydantic配置"""

        from_attributes = True
