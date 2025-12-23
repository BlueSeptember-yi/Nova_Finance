"""认证路由"""

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models.company import Company
from app.models.user import User
from app.schemas.user import UserCreate
from app.utils.auth import (
    authenticate_user,
    create_access_token,
    get_current_user,
    get_password_hash,
    require_role,
)
from app.utils.helpers import success_response

settings = get_settings()
router = APIRouter(prefix="/auth", tags=["认证"])


@router.post("/login", response_model=dict)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    """用户登录"""
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 创建访问令牌
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.user_id}, expires_delta=access_token_expires
    )

    # 获取企业信息
    company_name = None
    if user.company_id:
        company = (
            db.query(Company).filter(Company.company_id == user.company_id).first()
        )
        if company:
            company_name = company.name

    return success_response(
        data={
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "user_id": user.user_id,
                "username": user.username,
                "role": user.role,
                "company_id": user.company_id,
                "company_name": company_name,
                "created_at": user.created_at.isoformat() if user.created_at else None,
            },
        },
        message="登录成功",
    )


@router.post("/register", response_model=dict)
def register(
    user_data: UserCreate,
    current_user=Depends(require_role("Owner")),
    db: Session = Depends(get_db),
):
    """用户注册（仅Owner可访问）"""
    # 确保新用户属于当前公司
    if user_data.company_id != current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="不能为其他公司创建用户"
        )

    # 检查用户名是否已存在（同一公司内）
    existing_user = (
        db.query(User)
        .filter(
            User.username == user_data.username, User.company_id == user_data.company_id
        )
        .first()
    )
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="该用户名在此公司已存在"
        )

    # 创建新用户
    new_user = User(
        username=user_data.username,
        password_hash=get_password_hash(user_data.password),
        role=user_data.role.value
        if hasattr(user_data.role, "value")
        else user_data.role,
        company_id=user_data.company_id,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return success_response(
        data={
            "user_id": new_user.user_id,
            "username": new_user.username,
            "role": new_user.role,
            "company_id": new_user.company_id,
        },
        message="用户注册成功",
    )


@router.get("/current", response_model=dict)
def get_current_user_info(
    current_user=Depends(get_current_user), db: Session = Depends(get_db)
):
    """获取当前用户信息"""
    # 获取企业信息
    company_name = None
    if current_user.company_id:
        company = (
            db.query(Company)
            .filter(Company.company_id == current_user.company_id)
            .first()
        )
        if company:
            company_name = company.name

    return success_response(
        data={
            "user_id": current_user.user_id,
            "username": current_user.username,
            "role": current_user.role,
            "company_id": current_user.company_id,
            "company_name": company_name,
            "created_at": current_user.created_at.isoformat()
            if current_user.created_at
            else None,
        }
    )


class ProfileUpdate(BaseModel):
    """更新个人资料"""

    username: str = Field(..., min_length=3, max_length=50)

    @field_validator("username")
    @classmethod
    def validate_username_format(cls, v: str) -> str:
        """验证用户名格式：英文或数字开头，可包含下划线"""
        from app.utils.auth import validate_username

        if not validate_username(v):
            raise ValueError("用户名必须以英文或数字开头，只能包含字母、数字和下划线")
        return v


@router.put("/profile", response_model=dict)
def update_profile(
    profile_data: ProfileUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """更新个人资料（仅支持修改用户名）"""
    # 检查新用户名是否已存在（同一公司内）
    if profile_data.username != current_user.username:
        existing_user = (
            db.query(User)
            .filter(
                User.username == profile_data.username,
                User.company_id == current_user.company_id,
                User.user_id != current_user.user_id,
            )
            .first()
        )
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="该用户名在此公司已存在"
            )

    # 更新用户名
    current_user.username = profile_data.username
    db.commit()
    db.refresh(current_user)

    # 获取企业信息
    company_name = None
    if current_user.company_id:
        company = (
            db.query(Company)
            .filter(Company.company_id == current_user.company_id)
            .first()
        )
        if company:
            company_name = company.name

    return success_response(
        data={
            "user_id": current_user.user_id,
            "username": current_user.username,
            "role": current_user.role,
            "company_id": current_user.company_id,
            "company_name": company_name,
            "created_at": current_user.created_at.isoformat()
            if current_user.created_at
            else None,
        },
        message="个人资料更新成功",
    )
