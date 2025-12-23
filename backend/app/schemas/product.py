"""商品相关数据模式"""

import re
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, field_validator


class ProductCreate(BaseModel):
    """创建商品"""

    sku: str
    name: str
    price: Optional[Decimal] = None
    cost: Optional[Decimal] = None

    @field_validator("sku")
    @classmethod
    def validate_sku(cls, v: str) -> str:
        """验证SKU格式：2位字母+3位数字，如AB123"""
        if not v or v.strip() == "":
            raise ValueError("SKU不能为空")
        v = v.strip().upper()  # 转换为大写并去除空格
        if not re.match(r"^[A-Z]{2}\d{3}$", v):
            raise ValueError("SKU格式错误：必须是2位字母+3位数字，例如：AB123")
        return v


class ProductUpdate(BaseModel):
    """更新商品"""

    sku: Optional[str] = None  # 更新时可以为空（不更新）
    name: Optional[str] = None
    price: Optional[Decimal] = None
    cost: Optional[Decimal] = None

    @field_validator("sku")
    @classmethod
    def validate_sku(cls, v: Optional[str]) -> Optional[str]:
        """验证SKU格式：2位字母+3位数字，如AB123"""
        if v is None or v.strip() == "":
            return None  # 更新时允许为空（表示不更新该字段）
        v = v.strip().upper()  # 转换为大写并去除空格
        if not re.match(r"^[A-Z]{2}\d{3}$", v):
            raise ValueError("SKU格式错误：必须是2位字母+3位数字，例如：AB123")
        return v


class ProductResponse(BaseModel):
    """商品响应"""

    product_id: str
    company_id: str
    sku: str
    name: str
    price: Optional[Decimal] = None
    cost: Optional[Decimal] = None
    average_cost: Optional[Decimal] = None  # 加权平均成本（从库存获取）

    class Config:
        """Pydantic配置"""

        from_attributes = True
