"""用户相关数据模式"""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field, field_validator

from app.utils.auth import validate_password, validate_username


class UserRole(str, Enum):
    """用户角色"""

    OWNER = "Owner"
    ACCOUNTANT = "Accountant"
    SALES = "Sales"
    PURCHASER = "Purchaser"
    SUPER_ADMIN = "SuperAdmin"


class UserCreate(BaseModel):
    """创建用户"""

    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8)
    role: UserRole
    company_id: str | None = Field(None, description="公司ID（超级管理员可为空）")

    @field_validator("username")
    @classmethod
    def validate_username_format(cls, v: str) -> str:
        """验证用户名格式：英文或数字开头，可包含下划线"""
        if not validate_username(v):
            raise ValueError("用户名必须以英文或数字开头，只能包含字母、数字和下划线")
        return v

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """验证密码强度：至少8位，包含数字、字母和常见符号"""
        if not validate_password(v):
            raise ValueError(
                "密码至少8位，且必须包含数字、字母和常见符号（!@#$%^&*()_+-=[]{}|;:,.<>?）"
            )
        return v


class UserLogin(BaseModel):
    """用户登录"""

    username: str
    password: str


class UserUpdate(BaseModel):
    """更新用户"""

    role: UserRole = None
    password: str = Field(None, min_length=8)

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str | None) -> str | None:
        """验证密码强度：至少8位，包含数字、字母和常见符号"""
        if v is not None and not validate_password(v):
            raise ValueError(
                "密码至少8位，且必须包含数字、字母和常见符号（!@#$%^&*()_+-=[]{}|;:,.<>?）"
            )
        return v

    class Config:
        """Pydantic配置"""

        from_attributes = True


class UserResponse(BaseModel):
    """用户响应"""

    user_id: str
    username: str
    role: str
    company_id: str | None = None
    created_at: datetime

    class Config:
        """Pydantic配置"""

        from_attributes = True


class Token(BaseModel):
    """令牌"""

    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """令牌数据"""

    user_id: str
