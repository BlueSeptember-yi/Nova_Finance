"""库存相关数据模式"""

from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional

from pydantic import BaseModel


class InventoryTransactionType(str, Enum):
    """库存流水类型"""

    IN = "IN"  # 入库
    OUT = "OUT"  # 出库


class InventorySourceType(str, Enum):
    """库存来源类型"""

    PO = "PO"  # 采购单
    SO = "SO"  # 销售单
    MANUAL = "Manual"  # 手工录入
    ADJUSTMENT = "Adjustment"  # 调整


class InventoryTransactionCreate(BaseModel):
    """创建库存流水"""

    product_id: str
    type: InventoryTransactionType
    quantity: Decimal
    source_type: InventorySourceType
    source_id: Optional[str] = None
    warehouse_location: Optional[str] = None
    remark: str = ""


class InventoryTransactionResponse(BaseModel):
    """库存流水响应"""

    transaction_id: str
    company_id: str
    product_id: str
    inventory_id: Optional[str] = None
    type: str
    quantity: Decimal
    source_type: str
    source_id: Optional[str] = None
    warehouse_location: Optional[str] = None
    remark: str = ""
    created_at: datetime
    # 商品信息
    product_name: Optional[str] = None
    product_sku: Optional[str] = None

    class Config:
        """Pydantic配置"""

        from_attributes = True


class InventoryItemResponse(BaseModel):
    """库存记录响应"""

    inventory_id: str
    product_id: str
    company_id: str
    quantity: Decimal
    updated_at: datetime
    # 商品信息
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    # 从流水记录汇总的位置信息（不在模型中，由API动态添加）
    warehouse_locations: Optional[list[str]] = None
    warehouse_location: Optional[str] = None  # 兼容字段，显示所有位置的汇总

    class Config:
        """Pydantic配置"""

        from_attributes = True
