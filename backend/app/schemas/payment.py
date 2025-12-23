"""付款和收款相关数据模式"""

from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Optional

from pydantic import BaseModel


class PaymentMethod(str, Enum):
    """支付方式（统一用于销售单、收款、付款）"""

    CASH = "Cash"  # 现金
    BANK_TRANSFER = "BankTransfer"  # 银行转账
    CREDIT = "Credit"  # 赊销/赊购（形成应收/应付账款）


class PaymentCreate(BaseModel):
    """创建付款记录"""

    purchase_order_id: Optional[str] = None
    date: date
    amount: Decimal
    payment_method: PaymentMethod
    remark: str = ""


class PaymentResponse(BaseModel):
    """付款记录响应"""

    payment_id: str
    company_id: str
    purchase_order_id: Optional[str] = None
    date: date
    amount: Decimal
    payment_method: str
    remark: str = ""
    created_at: datetime

    class Config:
        """Pydantic配置"""

        from_attributes = True


class ReceiptCreate(BaseModel):
    """创建收款记录"""

    sales_order_id: Optional[str] = None
    date: date
    amount: Decimal
    method: PaymentMethod
    remark: str = ""


class ReceiptResponse(BaseModel):
    """收款记录响应"""

    receipt_id: str
    company_id: str
    sales_order_id: Optional[str] = None
    date: date
    amount: Decimal
    method: str
    remark: str = ""
    created_at: datetime

    class Config:
        """Pydantic配置"""

        from_attributes = True
