"""供应商相关数据模式"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class SupplierCreate(BaseModel):
    """创建供应商"""
    name: str = Field(..., min_length=1, max_length=100, description="供应商名称")
    contact: Optional[str] = Field(None, max_length=100, description="联系人")
    phone: str = Field(..., min_length=1, max_length=20, description="电话")
    address: str = Field(..., min_length=1, max_length=255, description="地址")
    bank_account: Optional[str] = Field(None, max_length=50, description="银行账户")
    remark: Optional[str] = Field(None, description="备注")


class SupplierUpdate(BaseModel):
    """更新供应商"""
    contact: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = Field(None, max_length=255)
    bank_account: Optional[str] = Field(None, max_length=50)
    remark: Optional[str] = None


class SupplierResponse(BaseModel):
    """供应商响应"""
    supplier_id: str
    company_id: str
    name: str
    contact: Optional[str]
    phone: Optional[str]
    address: Optional[str]
    bank_account: Optional[str]
    remark: Optional[str]
    created_at: datetime
    
    class Config:
        """Pydantic配置"""
        from_attributes = True

