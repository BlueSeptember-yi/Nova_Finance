"""用户模型"""

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database import Base
from app.utils.helpers import get_beijing_time


class User(Base):
    """用户表"""

    __tablename__ = "user"
    __table_args__ = (
        UniqueConstraint("company_id", "username", name="uq_user_company_username"),
        # 超级管理员的用户名全局唯一
    )

    user_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id = Column(
        String(36),
        ForeignKey("company.company_id"),
        nullable=True,
        comment="所属公司（超级管理员可为空）",
    )
    username = Column(
        String(50), nullable=False, comment="登录名（公司内唯一，超级管理员全局唯一）"
    )
    email = Column(String(100), nullable=True, comment="邮箱（用于登录和找回密码）")
    password_hash = Column(String(255), nullable=False, comment="加密密码")
    role = Column(
        Enum("Owner", "Accountant", "Sales", "Purchaser", "SuperAdmin"),
        nullable=False,
        comment="用户角色",
    )
    created_at = Column(DateTime, default=get_beijing_time, comment="创建时间")

    # 关系
    company = relationship("Company", back_populates="users")

    def __repr__(self):
        return f"<User {self.username} ({self.role})>"
