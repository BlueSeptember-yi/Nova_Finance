"""认证相关工具"""

import re
import secrets
import string
from datetime import datetime, timedelta
from typing import List, Optional, Union

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models.user import User

settings = get_settings()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_PREFIX}/auth/login")

ROLE_PERMISSIONS = {
    "SuperAdmin": [
        "*",
        "super_admin:*",
        "company:*",
        "user:*",
    ],
    "Owner": [
        "company:*",
        "user:*",
        "account:*",
        "journal:*",
        "supplier:*",
        "customer:*",
        "purchase:*",
        "sales:*",
        "payment:*",
        "receipt:*",
        "bank:*",
        "reconciliation:*",
        "report:*",
        "tax:*",
    ],
    "Accountant": [
        "account:*",
        "journal:*",
        "purchase:post",
        "sales:post",
        "payment:*",
        "receipt:*",
        "bank:*",
        "reconciliation:*",
        "report:*",
        "tax:*",
    ],
    "Purchaser": [
        "supplier:*",
        "purchase:create",
        "purchase:view",
    ],
    "Sales": [
        "customer:*",
        "sales:create",
        "sales:view",
    ],
}


def validate_username(username: str) -> bool:
    """验证用户名格式：英文或数字开头，可包含下划线"""
    if not username:
        return False
    pattern = r"^[a-zA-Z0-9][a-zA-Z0-9_]*$"
    return bool(re.match(pattern, username))


def validate_password(password: str) -> bool:
    """验证密码强度：至少8位，包含数字、字母和常见符号"""
    if len(password) < 8:
        return False

    has_digit = bool(re.search(r"\d", password))
    has_letter = bool(re.search(r"[a-zA-Z]", password))
    has_symbol = bool(re.search(r"[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]", password))

    return has_digit and has_letter and has_symbol


def generate_random_password(length: int = 12) -> str:
    """生成随机密码"""
    characters = string.ascii_letters + string.digits + "!@#$%^&*()_+-=[]{}|;:,.<>?"
    password = [
        secrets.choice(string.digits),
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.ascii_uppercase),
        secrets.choice("!@#$%^&*()_+-=[]{}|;:,.<>?"),
    ]
    password.extend(secrets.choice(characters) for _ in range(length - 4))
    secrets.SystemRandom().shuffle(password)
    return "".join(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """加密密码"""
    password_str = str(password)
    password_bytes = password_str.encode("utf-8")

    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]
        while len(password_bytes) > 0:
            try:
                password_str = password_bytes.decode("utf-8")
                break
            except UnicodeDecodeError:
                password_bytes = password_bytes[:-1]
        else:
            password_str = ""

    return pwd_context.hash(password_str)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """创建访问令牌"""
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )

    return encoded_jwt


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    """获取当前登录用户"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="无法验证凭据",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.user_id == user_id).first()
    if user is None:
        raise credentials_exception

    return user


def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    """验证用户"""
    user = db.query(User).filter(User.username == username).first()
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def check_permission(user: User, permission: str) -> bool:
    """检查用户是否有指定权限"""
    user_permissions = ROLE_PERMISSIONS.get(user.role, [])
    if "*" in user_permissions:
        return True
    for perm in user_permissions:
        if perm == permission:
            return True
        if perm.endswith(":*"):
            prefix = perm[:-2]
            if permission.startswith(prefix + ":"):
                return True
    return False


def require_permission(permission: str):
    """权限检查依赖函数"""

    def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        if not check_permission(current_user, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"权限不足：需要 {permission} 权限",
            )
        return current_user

    return permission_checker


def require_role(roles: Union[str, List[str]]):
    """角色检查依赖函数"""
    if isinstance(roles, str):
        roles = [roles]

    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"权限不足：需要 {', '.join(roles)} 角色",
            )
        return current_user

    return role_checker


def require_any_role(*roles: str):
    """任意角色检查依赖函数"""

    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"权限不足：需要以下角色之一：{', '.join(roles)}",
            )
        return current_user

    return role_checker


def require_super_admin():
    """超级管理员检查依赖函数"""

    def super_admin_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role != "SuperAdmin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="权限不足：需要超级管理员权限",
            )
        return current_user

    return super_admin_checker


def is_super_admin(user: User) -> bool:
    """检查用户是否为超级管理员"""
    return user.role == "SuperAdmin"
