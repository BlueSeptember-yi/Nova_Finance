"""会计科目路由"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.account import Account
from app.models.journal import LedgerLine
from app.schemas.account import (
    AccountCreate,
    AccountResponse,
    AccountTreeNode,
    AccountUpdate,
)
from app.utils.auth import get_current_user, require_permission
from app.utils.helpers import success_response

router = APIRouter(prefix="/accounts", tags=["会计科目"])


@router.post("", response_model=dict)
def create_account(
    account_data: AccountCreate,
    current_user=Depends(require_permission("account:create")),
    db: Session = Depends(get_db),
):
    """新增会计科目 (UC-002-1)"""

    # 检查科目编码是否已存在
    existing = (
        db.query(Account)
        .filter(
            Account.code == account_data.code,
            Account.company_id == current_user.company_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="科目编码已存在")

    # 检查父科目是否存在
    if account_data.parent_id:
        parent = (
            db.query(Account)
            .filter(Account.account_id == account_data.parent_id)
            .first()
        )
        if not parent:
            raise HTTPException(status_code=404, detail="父科目不存在")
        # 子科目不能设置为核心科目
        is_core = False
    else:
        is_core = account_data.is_core

    # 自动判断余额方向（如果未提供）
    if account_data.normal_balance:
        normal_balance = account_data.normal_balance.value
    else:
        # 根据科目类型自动判断
        if account_data.type.value in ["Asset", "Expense"]:
            normal_balance = "Debit"
        else:  # Liability, Equity, Revenue
            normal_balance = "Credit"

    # 创建科目
    account = Account(
        company_id=current_user.company_id,
        parent_id=account_data.parent_id,
        code=account_data.code,
        name=account_data.name,
        type=account_data.type.value,
        normal_balance=normal_balance,
        is_core=is_core,
        remark=account_data.remark,
    )

    if account_data.parent_id:
        parent = (
            db.query(Account)
            .filter(Account.account_id == account_data.parent_id)
            .first()
        )
        account.path = f"{parent.path}/{account.code}" if parent.path else account.code
    else:
        account.path = account.code

    db.add(account)
    db.commit()
    db.refresh(account)

    return success_response(
        data=AccountResponse.from_orm(account).dict(), message="科目创建成功"
    )


@router.get("", response_model=dict)
def get_accounts(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
    parent_id: str = None,
):
    """获取会计科目列表"""
    query = db.query(Account).filter(Account.company_id == current_user.company_id)

    if parent_id:
        query = query.filter(Account.parent_id == parent_id)

    accounts = query.all()

    return success_response(
        data=[AccountResponse.from_orm(acc).dict() for acc in accounts]
    )


@router.get("/tree", response_model=dict)
def get_account_tree(
    current_user=Depends(get_current_user), db: Session = Depends(get_db)
):
    """获取会计科目树"""

    def build_tree(parent_id=None):
        """递归构建科目树"""
        accounts = (
            db.query(Account)
            .filter(
                Account.company_id == current_user.company_id,
                Account.parent_id == parent_id,
            )
            .all()
        )

        tree = []
        for account in accounts:
            node = {
                "account_id": account.account_id,
                "code": account.code,
                "name": account.name,
                "type": account.type,
                "is_core": account.is_core,
                "children": build_tree(account.account_id),
            }
            tree.append(node)

        return tree

    tree = build_tree()
    return success_response(data=tree)


@router.get("/{account_id}", response_model=dict)
def get_account(
    account_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取科目详情"""
    account = (
        db.query(Account)
        .filter(
            Account.account_id == account_id,
            Account.company_id == current_user.company_id,
        )
        .first()
    )

    if not account:
        raise HTTPException(status_code=404, detail="科目不存在")

    return success_response(data=AccountResponse.from_orm(account).dict())


@router.put("/{account_id}", response_model=dict)
def update_account(
    account_id: str,
    account_data: AccountUpdate,
    current_user=Depends(require_permission("account:update")),
    db: Session = Depends(get_db),
):
    """修改会计科目 (UC-002-2)"""
    account = (
        db.query(Account)
        .filter(
            Account.account_id == account_id,
            Account.company_id == current_user.company_id,
        )
        .first()
    )

    if not account:
        raise HTTPException(status_code=404, detail="科目不存在")

    # 只允许修改名称和备注
    if account_data.name:
        account.name = account_data.name
    if account_data.remark is not None:
        account.remark = account_data.remark

    db.commit()
    db.refresh(account)

    return success_response(
        data=AccountResponse.from_orm(account).dict(), message="科目更新成功"
    )


@router.delete("/{account_id}", response_model=dict)
def delete_account(
    account_id: str,
    current_user=Depends(require_permission("account:delete")),
    db: Session = Depends(get_db),
):
    """删除会计科目 (UC-002-3)"""
    account = (
        db.query(Account)
        .filter(
            Account.account_id == account_id,
            Account.company_id == current_user.company_id,
        )
        .first()
    )

    if not account:
        raise HTTPException(status_code=404, detail="科目不存在")

    # 检查是否为核心科目
    if account.is_core:
        raise HTTPException(status_code=400, detail="核心科目不能删除")

    # 检查是否有下级科目
    children = db.query(Account).filter(Account.parent_id == account_id).first()
    if children:
        raise HTTPException(status_code=400, detail="存在下级科目，不能删除")

    # 检查是否有交易记录
    ledger_line = (
        db.query(LedgerLine).filter(LedgerLine.account_id == account_id).first()
    )
    if ledger_line:
        raise HTTPException(status_code=400, detail="科目存在交易记录，不能删除")

    db.delete(account)
    db.commit()

    return success_response(message="科目删除成功")
