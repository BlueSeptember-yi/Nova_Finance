"""超级管理员路由"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.company import Company
from app.models.user import User
from app.schemas.company import CompanyCreate, CompanyResponse, CompanyUpdate
from app.schemas.user import UserCreate, UserResponse, UserRole, UserUpdate
from app.utils.auth import (
    generate_random_password,
    get_current_user,
    get_password_hash,
    is_super_admin,
    require_super_admin,
)
from app.utils.helpers import success_response


class ResetPasswordRequest(BaseModel):
    """重置密码请求"""

    new_password: Optional[str] = None


router = APIRouter(prefix="/super-admin", tags=["超级管理员"])


# ==================== 公司管理 ====================


@router.get("/companies", response_model=dict)
def get_all_companies(
    current_user: User = Depends(require_super_admin()),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
):
    """获取所有公司列表（仅超级管理员）"""
    companies = db.query(Company).offset(skip).limit(limit).all()
    total = db.query(Company).count()

    return success_response(
        data={
            "items": [CompanyResponse.from_orm(c).dict() for c in companies],
            "total": total,
            "skip": skip,
            "limit": limit,
        }
    )


@router.get("/companies/{company_id}", response_model=dict)
def get_company_detail(
    company_id: str,
    current_user: User = Depends(require_super_admin()),
    db: Session = Depends(get_db),
):
    """获取公司详情（仅超级管理员）"""
    company = db.query(Company).filter(Company.company_id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="公司不存在")

    return success_response(data=CompanyResponse.from_orm(company).dict())


@router.post("/companies", response_model=dict)
def create_company(
    company_data: CompanyCreate,
    current_user: User = Depends(require_super_admin()),
    db: Session = Depends(get_db),
):
    """创建公司（仅超级管理员）"""
    # 检查公司名称是否已存在
    existing = db.query(Company).filter(Company.name == company_data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="公司名称已存在")

    company = Company(
        name=company_data.name,
        size=company_data.size.value if company_data.size else None,
        registered_capital=company_data.registered_capital,
    )
    db.add(company)
    db.commit()
    db.refresh(company)

    return success_response(
        data=CompanyResponse.from_orm(company).dict(), message="公司创建成功"
    )


@router.put("/companies/{company_id}", response_model=dict)
def update_company(
    company_id: str,
    company_data: CompanyUpdate,
    current_user: User = Depends(require_super_admin()),
    db: Session = Depends(get_db),
):
    """更新公司信息（仅超级管理员）"""
    company = db.query(Company).filter(Company.company_id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="公司不存在")

    update_data = company_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        if hasattr(company, key) and value is not None:
            if key == "size" and hasattr(value, "value"):
                setattr(company, key, value.value)
            else:
                setattr(company, key, value)

    db.commit()
    db.refresh(company)

    return success_response(
        data=CompanyResponse.from_orm(company).dict(), message="公司信息更新成功"
    )


@router.delete("/companies/{company_id}", response_model=dict)
def delete_company(
    company_id: str,
    current_user: User = Depends(require_super_admin()),
    db: Session = Depends(get_db),
):
    """删除公司（仅超级管理员）"""
    company = db.query(Company).filter(Company.company_id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="公司不存在")

    # 检查是否有用户关联
    user_count = db.query(User).filter(User.company_id == company_id).count()
    if user_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"无法删除公司：该公司还有 {user_count} 个用户，请先删除或转移用户",
        )

    db.delete(company)
    db.commit()

    return success_response(message="公司删除成功")


# ==================== 用户管理 ====================


@router.get("/users", response_model=dict)
def get_all_users(
    current_user: User = Depends(require_super_admin()),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    company_id: Optional[str] = None,
    role: Optional[str] = None,
    username: Optional[str] = None,
):
    """获取所有用户列表（仅超级管理员）"""
    query = db.query(User)

    # 过滤条件
    if company_id:
        query = query.filter(User.company_id == company_id)
    if role:
        query = query.filter(User.role == role)
    if username:
        query = query.filter(User.username.like(f"%{username}%"))

    total = query.count()
    users = query.offset(skip).limit(limit).all()

    # 获取用户所属公司信息
    user_list = []
    for user in users:
        user_dict = UserResponse.from_orm(user).dict()
        if user.company_id:
            company = (
                db.query(Company).filter(Company.company_id == user.company_id).first()
            )
            user_dict["company_name"] = company.name if company else None
        else:
            user_dict["company_name"] = None
        user_list.append(user_dict)

    return success_response(
        data={
            "items": user_list,
            "total": total,
            "skip": skip,
            "limit": limit,
        }
    )


@router.get("/users/{user_id}", response_model=dict)
def get_user_detail(
    user_id: str,
    current_user: User = Depends(require_super_admin()),
    db: Session = Depends(get_db),
):
    """获取用户详情（仅超级管理员）"""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    user_dict = UserResponse.from_orm(user).dict()
    if user.company_id:
        company = (
            db.query(Company).filter(Company.company_id == user.company_id).first()
        )
        user_dict["company_name"] = company.name if company else None
    else:
        user_dict["company_name"] = None

    return success_response(data=user_dict)


@router.post("/users", response_model=dict)
def create_user(
    user_data: UserCreate,
    current_user: User = Depends(require_super_admin()),
    db: Session = Depends(get_db),
):
    """创建用户（仅超级管理员，可跨公司）"""
    # 检查用户名是否已存在
    # 超级管理员用户名全局唯一，普通用户在公司内唯一
    if user_data.role == UserRole.SUPER_ADMIN:
        existing_user = (
            db.query(User).filter(User.username == user_data.username).first()
        )
    else:
        if not user_data.company_id:
            raise HTTPException(
                status_code=400, detail="非超级管理员用户必须指定公司ID"
            )
        existing_user = (
            db.query(User)
            .filter(
                User.username == user_data.username,
                User.company_id == user_data.company_id,
            )
            .first()
        )

    if existing_user:
        raise HTTPException(status_code=400, detail="用户名已存在")

    # 验证公司是否存在（如果不是超级管理员）
    if user_data.company_id and user_data.role != UserRole.SUPER_ADMIN:
        company = (
            db.query(Company).filter(Company.company_id == user_data.company_id).first()
        )
        if not company:
            raise HTTPException(status_code=404, detail="公司不存在")

    new_user = User(
        username=user_data.username,
        password_hash=get_password_hash(user_data.password),
        role=user_data.role.value
        if hasattr(user_data.role, "value")
        else user_data.role,
        company_id=user_data.company_id if user_data.company_id else None,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    user_dict = UserResponse.from_orm(new_user).dict()
    if new_user.company_id:
        company = (
            db.query(Company).filter(Company.company_id == new_user.company_id).first()
        )
        user_dict["company_name"] = company.name if company else None
    else:
        user_dict["company_name"] = None

    return success_response(data=user_dict, message="用户创建成功")


@router.put("/users/{user_id}", response_model=dict)
def update_user(
    user_id: str,
    user_data: UserUpdate,
    current_user: User = Depends(require_super_admin()),
    db: Session = Depends(get_db),
):
    """更新用户信息（仅超级管理员）"""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    # 不能修改自己的角色（防止误操作）
    if user.user_id == current_user.user_id and user_data.role:
        raise HTTPException(status_code=400, detail="不能修改自己的角色")

    update_data = user_data.dict(exclude_unset=True)
    if "role" in update_data and update_data["role"]:
        user.role = (
            update_data["role"].value
            if hasattr(update_data["role"], "value")
            else update_data["role"]
        )

    if "password" in update_data and update_data["password"]:
        user.password_hash = get_password_hash(update_data["password"])

    db.commit()
    db.refresh(user)

    user_dict = UserResponse.from_orm(user).dict()
    if user.company_id:
        company = (
            db.query(Company).filter(Company.company_id == user.company_id).first()
        )
        user_dict["company_name"] = company.name if company else None
    else:
        user_dict["company_name"] = None

    return success_response(data=user_dict, message="用户更新成功")


@router.post("/users/{user_id}/reset-password", response_model=dict)
def reset_user_password(
    user_id: str,
    request_data: ResetPasswordRequest,
    current_user: User = Depends(require_super_admin()),
    db: Session = Depends(get_db),
):
    """重置用户密码（仅超级管理员）"""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    # 如果未提供新密码，生成随机密码
    new_password = request_data.new_password
    if not new_password:
        new_password = generate_random_password(12)

    user.password_hash = get_password_hash(new_password)
    db.commit()

    return success_response(
        data={
            "user_id": user.user_id,
            "username": user.username,
            "new_password": new_password,
        },
        message="密码重置成功",
    )


@router.delete("/users/{user_id}", response_model=dict)
def delete_user(
    user_id: str,
    current_user: User = Depends(require_super_admin()),
    db: Session = Depends(get_db),
):
    """删除用户（仅超级管理员）"""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    # 不能删除自己
    if user.user_id == current_user.user_id:
        raise HTTPException(status_code=400, detail="不能删除自己的账户")

    db.delete(user)
    db.commit()

    return success_response(message="用户删除成功")


# ==================== 统计信息 ====================


@router.get("/stats", response_model=dict)
def get_system_stats(
    current_user: User = Depends(require_super_admin()),
    db: Session = Depends(get_db),
):
    """获取系统统计信息（仅超级管理员）"""
    total_companies = db.query(Company).count()
    total_users = db.query(User).count()

    # 按角色统计用户
    role_stats = {}
    for role in ["Owner", "Accountant", "Sales", "Purchaser", "SuperAdmin"]:
        count = db.query(User).filter(User.role == role).count()
        role_stats[role] = count

    return success_response(
        data={
            "total_companies": total_companies,
            "total_users": total_users,
            "users_by_role": role_stats,
        }
    )
