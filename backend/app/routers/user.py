"""用户管理路由"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate, UserResponse, UserRole
from app.utils.auth import get_current_user, get_password_hash, require_role
from app.utils.helpers import success_response

router = APIRouter(prefix="/users", tags=["用户管理"])


@router.get("", response_model=dict)
def get_users(
    current_user = Depends(require_role("Owner")),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 50
):
    """获取用户列表（仅Owner可访问）"""
    users = db.query(User).filter(
        User.company_id == current_user.company_id
    ).offset(skip).limit(limit).all()
    
    return success_response(
        data=[UserResponse.from_orm(u).dict() for u in users]
    )


@router.get("/{user_id}", response_model=dict)
def get_user(
    user_id: str,
    current_user = Depends(require_role("Owner")),
    db: Session = Depends(get_db)
):
    """获取用户详情（仅Owner可访问）"""
    user = db.query(User).filter(
        User.user_id == user_id,
        User.company_id == current_user.company_id
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    return success_response(data=UserResponse.from_orm(user).dict())


@router.post("", response_model=dict)
def create_user(
    user_data: UserCreate,
    current_user = Depends(require_role("Owner")),
    db: Session = Depends(get_db)
):
    """创建用户（仅Owner可访问）"""
    # 检查用户名是否已存在（同一公司内）
    existing_user = db.query(User).filter(
        User.username == user_data.username,
        User.company_id == current_user.company_id
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=400, detail="该用户名在此公司已存在"
        )
    
    # 确保新用户属于当前公司
    if user_data.company_id != current_user.company_id:
        raise HTTPException(
            status_code=403, detail="不能为其他公司创建用户"
        )
    
    # 创建新用户
    new_user = User(
        username=user_data.username,
        password_hash=get_password_hash(user_data.password),
        role=user_data.role.value if hasattr(user_data.role, "value") else user_data.role,
        company_id=user_data.company_id,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return success_response(
        data=UserResponse.from_orm(new_user).dict(),
        message="用户创建成功"
    )


@router.put("/{user_id}", response_model=dict)
def update_user(
    user_id: str,
    user_data: UserUpdate,
    current_user = Depends(require_role("Owner")),
    db: Session = Depends(get_db)
):
    """更新用户信息（仅Owner可访问）"""
    user = db.query(User).filter(
        User.user_id == user_id,
        User.company_id == current_user.company_id
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    # 更新允许的字段
    update_data = user_data.dict(exclude_unset=True)
    if "role" in update_data:
        user.role = update_data["role"].value if hasattr(update_data["role"], "value") else update_data["role"]
    
    if "password" in update_data:
        user.password_hash = get_password_hash(update_data["password"])
    
    db.commit()
    db.refresh(user)
    
    return success_response(
        data=UserResponse.from_orm(user).dict(),
        message="用户更新成功"
    )


@router.delete("/{user_id}", response_model=dict)
def delete_user(
    user_id: str,
    current_user = Depends(require_role("Owner")),
    db: Session = Depends(get_db)
):
    """删除用户（仅Owner可访问）"""
    user = db.query(User).filter(
        User.user_id == user_id,
        User.company_id == current_user.company_id
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    # 不能删除自己
    if user.user_id == current_user.user_id:
        raise HTTPException(status_code=400, detail="不能删除自己的账户")
    
    db.delete(user)
    db.commit()
    
    return success_response(message="用户删除成功")

