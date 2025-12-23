"""会计分录路由"""

from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.account import Account
from app.models.journal import JournalEntry, LedgerLine
from app.schemas.journal import (
    JournalEntryCreate,
    JournalEntryPost,
    JournalEntryResponse,
)
from app.utils.auth import get_current_user, require_permission
from app.utils.helpers import success_response

router = APIRouter(prefix="/journals", tags=["会计分录"])


@router.post("", response_model=dict)
def create_journal_entry(
    entry_data: JournalEntryCreate,
    current_user=Depends(require_permission("journal:create")),
    db: Session = Depends(get_db),
):
    """录入会计分录 (UC-003)"""

    for line in entry_data.lines:
        account = (
            db.query(Account)
            .filter(
                Account.account_id == line.account_id,
                Account.company_id == current_user.company_id,
            )
            .first()
        )
        if not account:
            raise HTTPException(
                status_code=404, detail=f"科目 {line.account_id} 不存在"
            )

    total_debit = sum(Decimal(str(line.debit or 0)) for line in entry_data.lines)
    total_credit = sum(Decimal(str(line.credit or 0)) for line in entry_data.lines)

    if abs(total_debit - total_credit) > Decimal("0.01"):
        raise HTTPException(
            status_code=400,
            detail=f"借贷不平衡：借方 {total_debit}，贷方 {total_credit}",
        )

    journal = JournalEntry(
        company_id=current_user.company_id,
        date=entry_data.date,
        description=entry_data.description,
        source_type=entry_data.source_type,
        source_id=entry_data.source_id,
        total_debit=total_debit,
        total_credit=total_credit,
        posted=False,
        posted_by=None,
    )
    db.add(journal)
    db.flush()

    for line_data in entry_data.lines:
        line = LedgerLine(
            journal_id=journal.journal_id,
            account_id=line_data.account_id,
            debit=Decimal(str(line_data.debit or 0)),
            credit=Decimal(str(line_data.credit or 0)),
            memo=line_data.memo,
        )
        db.add(line)

    db.commit()
    db.refresh(journal)

    return success_response(
        data=JournalEntryResponse.from_orm(journal).dict(), message="分录创建成功"
    )


@router.get("", response_model=dict)
def get_journal_entries(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 20,
):
    """获取会计分录列表"""
    journals = (
        db.query(JournalEntry)
        .filter(JournalEntry.company_id == current_user.company_id)
        .order_by(JournalEntry.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return success_response(
        data=[JournalEntryResponse.from_orm(j).dict() for j in journals]
    )


@router.get("/{journal_id}", response_model=dict)
def get_journal_entry(
    journal_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取分录详情"""
    journal = (
        db.query(JournalEntry)
        .filter(
            JournalEntry.journal_id == journal_id,
            JournalEntry.company_id == current_user.company_id,
        )
        .first()
    )

    if not journal:
        raise HTTPException(status_code=404, detail="分录不存在")

    return success_response(data=JournalEntryResponse.from_orm(journal).dict())


@router.get("/account/{account_id}/ledger", response_model=dict)
def get_account_ledger(
    account_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 50,
):
    """获取科目明细账"""

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

    lines = (
        db.query(LedgerLine)
        .join(JournalEntry)
        .filter(
            LedgerLine.account_id == account_id,
            JournalEntry.company_id == current_user.company_id,
        )
        .order_by(JournalEntry.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    balance = Decimal(0)
    ledger_data = []

    for line in lines:
        debit = Decimal(str(line.debit or 0))
        credit = Decimal(str(line.credit or 0))
        if account.type in ["Asset", "Expense"]:
            balance += debit - credit
        else:
            balance += credit - debit

        ledger_data.append(
            {
                "date": line.journal_entry.date,
                "description": line.journal_entry.description,
                "debit": float(line.debit),
                "credit": float(line.credit),
                "balance": float(balance),
                "memo": line.memo,
            }
        )

    return success_response(
        data={
            "account": {
                "account_id": account.account_id,
                "code": account.code,
                "name": account.name,
                "type": account.type,
                "normal_balance": account.normal_balance,
                "balance_debit": float(account.balance_debit or 0),
                "balance_credit": float(account.balance_credit or 0),
            },
            "ledger": ledger_data,
            "current_balance": float(balance),
        }
    )


@router.post("/{journal_id}/post", response_model=dict)
def post_journal_entry(
    journal_id: str,
    post_data: JournalEntryPost,
    current_user=Depends(require_permission("journal:post")),
    db: Session = Depends(get_db),
):
    """过账分录"""
    journal = (
        db.query(JournalEntry)
        .filter(
            JournalEntry.journal_id == journal_id,
            JournalEntry.company_id == current_user.company_id,
        )
        .first()
    )

    if not journal:
        raise HTTPException(status_code=404, detail="分录不存在")

    if journal.posted:
        raise HTTPException(status_code=400, detail="分录已过账，不能重复过账")

    # 验证借贷平衡
    if abs(journal.total_debit - journal.total_credit) > Decimal("0.01"):
        raise HTTPException(
            status_code=400,
            detail=f"借贷不平衡：借方 {journal.total_debit}，贷方 {journal.total_credit}",
        )

    journal.posted = True
    journal.posted_by = post_data.posted_by

    db.commit()
    db.refresh(journal)

    return success_response(
        data=JournalEntryResponse.from_orm(journal).dict(), message="分录过账成功"
    )
