"""企业相关数据模式"""
from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class CompanySize(str, Enum):
    """企业规模"""
    SMALL = "Small"
    MEDIUM = "Medium"
    LARGE = "Large"


class CompanyCreate(BaseModel):
    """创建企业"""
    name: str = Field(..., min_length=1, max_length=100, description="企业名称")
    size: Optional[CompanySize] = Field(CompanySize.SMALL, description="企业规模")
    registered_capital: Optional[float] = Field(None, ge=0, description="注册资本")


class CompanyUpdate(BaseModel):
    """更新企业信息"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    size: Optional[CompanySize] = None
    registered_capital: Optional[float] = Field(None, ge=0)


class CompanyResponse(BaseModel):
    """企业响应"""
    company_id: str
    name: str
    size: Optional[str]
    registered_capital: Optional[float]
    created_at: datetime
    
    class Config:
        """Pydantic配置"""
        from_attributes = True

