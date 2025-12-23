"""企业管理路由"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.account import Account
from app.models.company import Company
from app.models.user import User
from app.schemas.company import CompanyCreate, CompanyResponse, CompanyUpdate
from app.utils.auth import generate_random_password, get_current_user, get_password_hash
from app.utils.core_accounts import get_core_accounts
from app.utils.helpers import success_response

router = APIRouter(prefix="/company", tags=["企业管理"])


@router.post("", response_model=dict)
def create_company(company_data: CompanyCreate, db: Session = Depends(get_db)):
    """初始化企业信息 (UC-001)"""

    # 检查企业名称是否已存在
    existing = db.query(Company).filter(Company.name == company_data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="企业名称已存在")

    # 创建企业
    company = Company(
        name=company_data.name,
        size=company_data.size.value if company_data.size else None,
        registered_capital=company_data.registered_capital,
    )
    db.add(company)
    db.commit()
    db.refresh(company)

    # 生成随机密码
    admin_password = generate_random_password(12)

    # 创建默认管理员账户
    admin_user = User(
        company_id=company.company_id,
        username=f"admin_{company.company_id[:8]}",
        password_hash=get_password_hash(admin_password),
        role="Owner",
    )
    db.add(admin_user)
    db.commit()

    # 创建核心会计科目
    core_accounts = get_core_accounts()
    for account_data in core_accounts:
        # 自动判断余额方向
        account_type = account_data.get("type", "Asset")
        if account_type in ["Asset", "Expense"]:
            normal_balance = "Debit"
        else:  # Liability, Equity, Revenue
            normal_balance = "Credit"

        # 构建路径
        path = account_data.get("code", "")

        account = Account(
            company_id=company.company_id,
            code=account_data.get("code"),
            name=account_data.get("name"),
            type=account_type,
            normal_balance=normal_balance,
            parent_id=account_data.get("parent_id"),
            is_core=account_data.get("is_core", True),
            path=path,
        )
        db.add(account)
    db.commit()

    return success_response(
        data={
            "company": CompanyResponse.from_orm(company).dict(),
            "admin_username": admin_user.username,
            "admin_password": admin_password,
            "core_accounts_created": len(core_accounts),
        },
        message="企业初始化成功，已自动创建核心会计科目",
    )


@router.get("", response_model=dict)
def get_company(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """获取企业信息"""
    company = (
        db.query(Company).filter(Company.company_id == current_user.company_id).first()
    )

    if not company:
        raise HTTPException(status_code=404, detail="企业不存在")

    return success_response(data=CompanyResponse.from_orm(company).dict())


@router.put("/{company_id}", response_model=dict)
def update_company(
    company_id: str,
    company_data: CompanyUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """更新企业信息"""

    # 权限检查：只有店主可以修改
    if current_user.role != "Owner":
        raise HTTPException(status_code=403, detail="权限不足")

    company = db.query(Company).filter(Company.company_id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="企业不存在")

    # 更新字段
    update_data = company_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        if hasattr(company, key):
            setattr(company, key, value)

    db.commit()
    db.refresh(company)

    return success_response(
        data=CompanyResponse.from_orm(company).dict(), message="企业信息更新成功"
    )
