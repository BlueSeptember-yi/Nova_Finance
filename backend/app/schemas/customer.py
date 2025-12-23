"""客户相关数据模式"""

from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


class CustomerCreate(BaseModel):
    """创建客户"""

    name: str = Field(..., min_length=1, max_length=100, description="客户名称")
    phone: str = Field(..., min_length=1, max_length=20, description="电话")
    address: str = Field(..., min_length=1, max_length=255, description="地址")
    credit_limit: Decimal = Field(0, ge=0, description="信用额度")
    remark: Optional[str] = Field(None, description="备注")


class CustomerUpdate(BaseModel):
    """更新客户"""

    phone: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = Field(None, max_length=255)
    credit_limit: Optional[Decimal] = Field(None, ge=0)
    remark: Optional[str] = None


class CustomerResponse(BaseModel):
    """客户响应"""

    customer_id: str
    company_id: str
    name: str
    phone: Optional[str]
    address: Optional[str]
    credit_limit: Decimal
    remark: Optional[str]
    created_at: datetime

    class Config:
        """Pydantic配置"""

        from_attributes = True
