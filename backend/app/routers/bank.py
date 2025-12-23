"""银行和对账路由"""

import io
from datetime import date
from decimal import Decimal
from urllib.parse import quote

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.account import Account
from app.models.bank import BankAccount, BankStatement
from app.models.reconciliation import Reconciliation
from app.schemas.bank import (
    BankAccountCreate,
    BankAccountResponse,
    BankStatementCreate,
    BankStatementResponse,
    ReconciliationCreate,
    ReconciliationResponse,
)
from app.utils.auth import get_current_user
from app.utils.helpers import success_response

router = APIRouter(prefix="/bank", tags=["银行对账"])


def get_all_child_account_ids(db: Session, parent_account_id: str) -> list:
    """递归获取科目及其所有子科目的ID列表"""
    result = [parent_account_id]
    children = db.query(Account).filter(Account.parent_id == parent_account_id).all()
    for child in children:
        result.extend(get_all_child_account_ids(db, child.account_id))
    return result


# ==================== 银行账户 ====================


@router.post("/accounts", response_model=dict)
def create_bank_account(
    account_data: BankAccountCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """创建银行账户"""
    existing = (
        db.query(BankAccount)
        .filter(
            BankAccount.company_id == current_user.company_id,
            BankAccount.account_number == account_data.account_number,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="账户编号已存在")

    bank_account = BankAccount(
        company_id=current_user.company_id,
        account_number=account_data.account_number,
        bank_name=account_data.bank_name,
        currency=account_data.currency or "CNY",
        initial_balance=account_data.initial_balance or Decimal("0"),
        remark=account_data.remark,
    )
    db.add(bank_account)
    db.commit()
    db.refresh(bank_account)

    return success_response(
        data=BankAccountResponse.from_orm(bank_account).dict(),
        message="银行账户创建成功",
    )


@router.get("/accounts", response_model=dict)
def get_bank_accounts(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取银行账户列表"""
    accounts = (
        db.query(BankAccount)
        .filter(BankAccount.company_id == current_user.company_id)
        .order_by(BankAccount.created_at.desc())
        .all()
    )

    return success_response(
        data=[BankAccountResponse.from_orm(a).dict() for a in accounts]
    )


@router.get("/accounts/{account_id}", response_model=dict)
def get_bank_account(
    account_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取银行账户详情"""
    account = (
        db.query(BankAccount)
        .filter(
            BankAccount.bank_account_id == account_id,
            BankAccount.company_id == current_user.company_id,
        )
        .first()
    )
    if not account:
        raise HTTPException(status_code=404, detail="银行账户不存在")

    return success_response(data=BankAccountResponse.from_orm(account).dict())


# ==================== 银行流水 ====================


@router.post("/statements", response_model=dict)
def create_bank_statement(
    statement_data: BankStatementCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """创建银行流水"""
    bank_account = (
        db.query(BankAccount)
        .filter(
            BankAccount.bank_account_id == statement_data.bank_account_id,
            BankAccount.company_id == current_user.company_id,
        )
        .first()
    )
    if not bank_account:
        raise HTTPException(status_code=404, detail="银行账户不存在")

    statement = BankStatement(
        company_id=current_user.company_id,
        bank_account_id=statement_data.bank_account_id,
        date=statement_data.date,
        amount=statement_data.amount,
        type=statement_data.type,
        description=statement_data.description,
        balance=statement_data.balance,
    )
    db.add(statement)
    db.commit()
    db.refresh(statement)

    return success_response(
        data=BankStatementResponse.from_orm(statement).dict(),
        message="银行流水创建成功",
    )


@router.get("/statements", response_model=dict)
def get_bank_statements(
    bank_account_id: str = Query(None, description="银行账户ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=1000),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取银行流水列表"""
    query = db.query(BankStatement).filter(
        BankStatement.company_id == current_user.company_id
    )

    if bank_account_id:
        query = query.filter(BankStatement.bank_account_id == bank_account_id)

    statements = (
        query.order_by(BankStatement.date.desc()).offset(skip).limit(limit).all()
    )

    result = []
    for s in statements:
        statement_dict = BankStatementResponse.from_orm(s).dict()
        statement_dict["is_reconciled"] = s.is_reconciled or False
        result.append(statement_dict)

    return success_response(data=result)


@router.get("/statements/template", response_class=Response)
def download_statement_template(
    current_user=Depends(get_current_user),
):
    """下载银行流水导入模板"""
    try:
        template_data = {
            "日期": ["2025-01-01"],
            "金额": [1000.00],
            "类型": ["收入"],
            "摘要": ["示例：收到货款"],
            "余额": [1000.00],
        }
        df = pd.DataFrame(template_data)
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="银行流水")
        output.seek(0)
        filename = quote("银行流水导入模板.xlsx")
        return Response(
            content=output.read(),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成模板失败：{str(e)}")


@router.get("/statements/{statement_id}", response_model=dict)
def get_bank_statement(
    statement_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取银行流水详情"""
    statement = (
        db.query(BankStatement)
        .filter(
            BankStatement.statement_id == statement_id,
            BankStatement.company_id == current_user.company_id,
        )
        .first()
    )
    if not statement:
        raise HTTPException(status_code=404, detail="银行流水不存在")

    statement_dict = BankStatementResponse.from_orm(statement).dict()
    statement_dict["is_reconciled"] = statement.is_reconciled or False

    return success_response(data=statement_dict)


# ==================== 对账 ====================


@router.get("/reconciliations/data", response_model=dict)
def get_reconciliation_data(
    bank_account_id: str = Query(..., description="银行账户ID"),
    start_date: date = Query(..., description="开始日期"),
    end_date: date = Query(..., description="结束日期"),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取对账数据（银行流水和分录）"""
    bank_account = (
        db.query(BankAccount)
        .filter(
            BankAccount.bank_account_id == bank_account_id,
            BankAccount.company_id == current_user.company_id,
        )
        .first()
    )
    if not bank_account:
        raise HTTPException(status_code=404, detail="银行账户不存在")

    # 查找银行存款科目（1002）及其所有子科目
    bank_account_subject = (
        db.query(Account)
        .filter(
            Account.company_id == current_user.company_id,
            Account.code == "1002",  # 银行存款
        )
        .first()
    )
    if not bank_account_subject:
        raise HTTPException(
            status_code=400, detail="缺少银行存款科目（1002），请先创建"
        )

    # 获取银行存款科目及其所有子科目的ID列表
    bank_account_ids = get_all_child_account_ids(db, bank_account_subject.account_id)

    from app.models.journal import JournalEntry, LedgerLine

    # 筛选出所有与银行存款相关的分录
    bank_journal_ids_subq = (
        db.query(LedgerLine.journal_id)
        .filter(
            LedgerLine.account_id.in_(bank_account_ids),
            or_(LedgerLine.debit > 0, LedgerLine.credit > 0),
        )
        .distinct()
        .subquery()
    )

    journals = (
        db.query(JournalEntry)
        .filter(
            JournalEntry.company_id == current_user.company_id,
            JournalEntry.journal_id.in_(db.query(bank_journal_ids_subq.c.journal_id)),
            JournalEntry.date >= start_date,
            JournalEntry.date <= end_date,
            JournalEntry.posted.is_(True),
        )
        .order_by(JournalEntry.date.desc())
        .all()
    )

    statements = (
        db.query(BankStatement)
        .filter(
            BankStatement.company_id == current_user.company_id,
            BankStatement.bank_account_id == bank_account_id,
            BankStatement.date >= start_date,
            BankStatement.date <= end_date,
        )
        .order_by(BankStatement.date.desc())
        .all()
    )

    # 获取已匹配的对账记录
    reconciliations = (
        db.query(Reconciliation)
        .filter(Reconciliation.company_id == current_user.company_id)
        .all()
    )

    matched_statement_ids = {r.bank_statement_id for r in reconciliations}
    matched_journal_ids = {r.journal_id for r in reconciliations if r.journal_id}
    matched_pairs = []
    for rec in reconciliations:
        if rec.journal_id:
            # 查找对应的银行流水和分录
            statement = next(
                (s for s in statements if s.statement_id == rec.bank_statement_id), None
            )
            journal = next(
                (j for j in journals if j.journal_id == rec.journal_id), None
            )
            if statement and journal:
                bank_line = (
                    db.query(LedgerLine)
                    .filter(
                        LedgerLine.journal_id == journal.journal_id,
                        LedgerLine.account_id.in_(bank_account_ids),
                    )
                    .first()
                )
                journal_amount = (
                    float(bank_line.debit)
                    if bank_line and bank_line.debit > 0
                    else float(bank_line.credit)
                    if bank_line
                    else 0
                )
                matched_pairs.append(
                    {
                        "statement": {
                            "statement_id": statement.statement_id,
                            "date": statement.date.isoformat(),
                            "amount": float(statement.amount),
                            "type": statement.type,
                            "description": statement.description,
                        },
                        "journal": {
                            "journal_id": journal.journal_id,
                            "date": journal.date.isoformat(),
                            "description": journal.description,
                            "amount": journal_amount,
                        },
                        "reconciliation_id": rec.recon_id,
                        "match_date": rec.match_date.isoformat(),
                    }
                )

    unmatched_statements = [
        {
            "statement_id": s.statement_id,
            "date": s.date.isoformat(),
            "amount": float(s.amount),
            "type": s.type,
            "description": s.description,
        }
        for s in statements
        if s.statement_id not in matched_statement_ids
    ]

    unmatched_journals = []
    for journal in journals:
        if journal.journal_id not in matched_journal_ids:
            bank_line = (
                db.query(LedgerLine)
                .filter(
                    LedgerLine.journal_id == journal.journal_id,
                    LedgerLine.account_id.in_(bank_account_ids),
                )
                .first()
            )
            journal_amount = (
                float(bank_line.debit)
                if bank_line and bank_line.debit > 0
                else float(bank_line.credit)
                if bank_line
                else 0
            )
            unmatched_journals.append(
                {
                    "journal_id": journal.journal_id,
                    "date": journal.date.isoformat(),
                    "description": journal.description,
                    "amount": journal_amount,
                }
            )

    return success_response(
        data={
            "matched_pairs": matched_pairs,
            "unmatched_statements": unmatched_statements,
            "unmatched_journals": unmatched_journals,
        }
    )


@router.post("/reconciliations/auto-match", response_model=dict)
def auto_match_reconciliation(
    bank_account_id: str = Query(..., description="银行账户ID"),
    start_date: date = Query(..., description="开始日期"),
    end_date: date = Query(..., description="结束日期"),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """自动匹配银行流水和系统记录"""
    bank_account = (
        db.query(BankAccount)
        .filter(
            BankAccount.bank_account_id == bank_account_id,
            BankAccount.company_id == current_user.company_id,
        )
        .first()
    )
    if not bank_account:
        raise HTTPException(status_code=404, detail="银行账户不存在")

    # 查找银行存款科目（1002）及其所有子科目
    bank_account_subject = (
        db.query(Account)
        .filter(
            Account.company_id == current_user.company_id,
            Account.code == "1002",  # 银行存款
        )
        .first()
    )
    if not bank_account_subject:
        raise HTTPException(
            status_code=400, detail="缺少银行存款科目（1002），请先创建"
        )

    # 获取银行存款科目及其所有子科目的ID列表
    bank_account_ids = get_all_child_account_ids(db, bank_account_subject.account_id)

    from app.models.journal import JournalEntry, LedgerLine

    # 筛选出所有与银行存款相关的分录
    bank_journal_ids_subq = (
        db.query(LedgerLine.journal_id)
        .filter(
            LedgerLine.account_id.in_(bank_account_ids),
            or_(LedgerLine.debit > 0, LedgerLine.credit > 0),
        )
        .distinct()
        .subquery()
    )

    all_bank_journals = (
        db.query(JournalEntry)
        .filter(
            JournalEntry.company_id == current_user.company_id,
            JournalEntry.journal_id.in_(db.query(bank_journal_ids_subq.c.journal_id)),
            JournalEntry.date >= start_date,
            JournalEntry.date <= end_date,
            JournalEntry.posted.is_(True),
        )
        .all()
    )

    matched_reconciliations = (
        db.query(Reconciliation)
        .filter(Reconciliation.company_id == current_user.company_id)
        .all()
    )
    matched_journal_ids = {
        r.journal_id for r in matched_reconciliations if r.journal_id
    }
    matched_statement_ids = {r.bank_statement_id for r in matched_reconciliations}
    all_statements = (
        db.query(BankStatement)
        .filter(
            BankStatement.company_id == current_user.company_id,
            BankStatement.bank_account_id == bank_account_id,
            BankStatement.date >= start_date,
            BankStatement.date <= end_date,
        )
        .all()
    )

    matched_count = 0
    matched_journal_set = set()
    matched_statement_set = set()
    unmatched_statements = [
        s for s in all_statements if s.statement_id not in matched_statement_ids
    ]
    unmatched_journals = [
        j for j in all_bank_journals if j.journal_id not in matched_journal_ids
    ]

    for statement in unmatched_statements:
        statement_amount = abs(Decimal(str(statement.amount)))
        is_income = statement.type == "Credit"

        for journal in unmatched_journals:
            bank_line = (
                db.query(LedgerLine)
                .filter(
                    LedgerLine.journal_id == journal.journal_id,
                    LedgerLine.account_id.in_(bank_account_ids),
                )
                .first()
            )

            if not bank_line:
                continue

            journal_amount = Decimal(
                str(bank_line.debit if bank_line.debit > 0 else bank_line.credit)
            )
            journal_is_income = bank_line.debit > 0

            if (
                abs(statement_amount - journal_amount) <= Decimal("0.01")
                and is_income == journal_is_income
            ):
                date_diff = abs((statement.date - journal.date).days)
                if date_diff <= 3:
                    reconciliation = Reconciliation(
                        company_id=current_user.company_id,
                        bank_statement_id=statement.statement_id,
                        journal_id=journal.journal_id,
                        matched_amount=statement_amount,
                        match_date=date.today(),
                        remark="自动匹配",
                    )
                    db.add(reconciliation)
                    statement.is_reconciled = True
                    matched_count += 1
                    matched_journal_set.add(journal.journal_id)
                    matched_statement_set.add(statement.statement_id)
                    break

    db.commit()

    return success_response(
        data={"matched_count": matched_count},
        message=f"自动匹配完成，共匹配 {matched_count} 条记录",
    )


@router.post("/reconciliations", response_model=dict)
def create_reconciliation(
    reconciliation_data: ReconciliationCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """创建对账记录"""
    from app.models.journal import JournalEntry

    statement = (
        db.query(BankStatement)
        .filter(
            BankStatement.statement_id == reconciliation_data.bank_statement_id,
            BankStatement.company_id == current_user.company_id,
        )
        .first()
    )
    if not statement:
        raise HTTPException(status_code=404, detail="银行流水不存在")

    if reconciliation_data.journal_id:
        journal = (
            db.query(JournalEntry)
            .filter(
                JournalEntry.journal_id == reconciliation_data.journal_id,
                JournalEntry.company_id == current_user.company_id,
            )
            .first()
        )
        if not journal:
            raise HTTPException(status_code=404, detail="分录不存在")

    reconciliation = Reconciliation(
        company_id=current_user.company_id,
        bank_statement_id=reconciliation_data.bank_statement_id,
        journal_id=reconciliation_data.journal_id,
        matched_amount=reconciliation_data.matched_amount,
        match_date=reconciliation_data.match_date,
        remark=reconciliation_data.remark,
    )
    db.add(reconciliation)
    statement.is_reconciled = True
    db.commit()
    db.refresh(reconciliation)

    return success_response(
        data=ReconciliationResponse.from_orm(reconciliation).dict(),
        message="对账记录创建成功",
    )


@router.delete("/reconciliations/{reconciliation_id}", response_model=dict)
def delete_reconciliation(
    reconciliation_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """删除对账记录"""
    reconciliation = (
        db.query(Reconciliation)
        .filter(
            Reconciliation.recon_id == reconciliation_id,
            Reconciliation.company_id == current_user.company_id,
        )
        .first()
    )
    if not reconciliation:
        raise HTTPException(status_code=404, detail="对账记录不存在")

    other_reconciliations = (
        db.query(Reconciliation)
        .filter(
            Reconciliation.bank_statement_id == reconciliation.bank_statement_id,
            Reconciliation.recon_id != reconciliation_id,
            Reconciliation.company_id == current_user.company_id,
        )
        .first()
    )

    if not other_reconciliations:
        statement = (
            db.query(BankStatement)
            .filter(BankStatement.statement_id == reconciliation.bank_statement_id)
            .first()
        )
        if statement:
            statement.is_reconciled = False

    db.delete(reconciliation)
    db.commit()

    return success_response(message="对账记录删除成功")


@router.get("/reconciliations/balance-sheet", response_model=dict)
def get_balance_sheet(
    bank_account_id: str = Query(..., description="银行账户ID"),
    statement_date: date = Query(..., description="对账日期"),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """生成银行存款余额调节表"""
    bank_account = (
        db.query(BankAccount)
        .filter(
            BankAccount.bank_account_id == bank_account_id,
            BankAccount.company_id == current_user.company_id,
        )
        .first()
    )
    if not bank_account:
        raise HTTPException(status_code=404, detail="银行账户不存在")

    bank_account_subject = (
        db.query(Account)
        .filter(
            Account.company_id == current_user.company_id,
            Account.code == "1002",
        )
        .first()
    )
    if not bank_account_subject:
        raise HTTPException(
            status_code=400, detail="缺少银行存款科目（1002），请先创建"
        )

    bank_account_ids = get_all_child_account_ids(db, bank_account_subject.account_id)
    from app.models.journal import JournalEntry, LedgerLine

    latest_statement = (
        db.query(BankStatement)
        .filter(
            BankStatement.company_id == current_user.company_id,
            BankStatement.bank_account_id == bank_account_id,
            BankStatement.date <= statement_date,
            BankStatement.balance.isnot(None),
        )
        .order_by(BankStatement.date.desc())
        .first()
    )

    if latest_statement and latest_statement.balance is not None:
        bank_balance = Decimal(str(latest_statement.balance))
    else:
        # 从初始余额开始累加
        bank_balance = bank_account.initial_balance or Decimal("0")
        statements = (
            db.query(BankStatement)
            .filter(
                BankStatement.company_id == current_user.company_id,
                BankStatement.bank_account_id == bank_account_id,
                BankStatement.date <= statement_date,
            )
            .order_by(BankStatement.date.asc())
            .all()
        )
        for stmt in statements:
            bank_balance += Decimal(str(stmt.amount))

    # 计算系统余额（银行存款科目的余额）
    debit_total = db.query(func.sum(LedgerLine.debit)).join(JournalEntry).filter(
        LedgerLine.account_id.in_(bank_account_ids),
        JournalEntry.company_id == current_user.company_id,
        JournalEntry.date <= statement_date,
        JournalEntry.posted.is_(True),
    ).scalar() or Decimal("0")

    credit_total = db.query(func.sum(LedgerLine.credit)).join(JournalEntry).filter(
        LedgerLine.account_id.in_(bank_account_ids),
        JournalEntry.company_id == current_user.company_id,
        JournalEntry.date <= statement_date,
        JournalEntry.posted.is_(True),
    ).scalar() or Decimal("0")

    system_balance = debit_total - credit_total

    # 获取已匹配的对账记录
    matched_reconciliations = (
        db.query(Reconciliation)
        .filter(Reconciliation.company_id == current_user.company_id)
        .all()
    )

    matched_journal_ids_subq = (
        db.query(Reconciliation.journal_id)
        .filter(
            Reconciliation.company_id == current_user.company_id,
            Reconciliation.journal_id.isnot(None),
        )
        .subquery()
    )

    # 银行已收，企业未收（银行流水已记录，但系统分录未记录）
    system_received_not_in_bank = db.query(func.sum(LedgerLine.debit)).join(
        JournalEntry
    ).filter(
        LedgerLine.account_id.in_(bank_account_ids),
        JournalEntry.company_id == current_user.company_id,
        JournalEntry.date <= statement_date,
        JournalEntry.posted.is_(True),
        LedgerLine.debit > 0,
        ~JournalEntry.journal_id.in_(db.query(matched_journal_ids_subq.c.journal_id)),
    ).scalar() or Decimal("0")

    # 银行已付，企业未付（银行流水已记录，但系统分录未记录）
    system_paid_not_in_bank = db.query(func.sum(LedgerLine.credit)).join(
        JournalEntry
    ).filter(
        LedgerLine.account_id.in_(bank_account_ids),
        JournalEntry.company_id == current_user.company_id,
        JournalEntry.date <= statement_date,
        JournalEntry.posted.is_(True),
        LedgerLine.credit > 0,
        ~JournalEntry.journal_id.in_(db.query(matched_journal_ids_subq.c.journal_id)),
    ).scalar() or Decimal("0")

    bank_received_not_in_system = Decimal("0")
    matched_statement_ids = {r.bank_statement_id for r in matched_reconciliations}
    unmatched_statements = (
        db.query(BankStatement)
        .filter(
            BankStatement.company_id == current_user.company_id,
            BankStatement.bank_account_id == bank_account_id,
            BankStatement.date <= statement_date,
            ~BankStatement.statement_id.in_(matched_statement_ids),
            BankStatement.type == "Credit",
        )
        .all()
    )
    for stmt in unmatched_statements:
        bank_received_not_in_system += Decimal(str(stmt.amount))

    # 企业已付，银行未付（系统分录已记录，但银行流水未记录）
    bank_paid_not_in_system = Decimal("0")
    unmatched_paid_statements = (
        db.query(BankStatement)
        .filter(
            BankStatement.company_id == current_user.company_id,
            BankStatement.bank_account_id == bank_account_id,
            BankStatement.date <= statement_date,
            ~BankStatement.statement_id.in_(matched_statement_ids),
            BankStatement.type == "Debit",
        )
        .all()
    )
    for stmt in unmatched_paid_statements:
        bank_paid_not_in_system += abs(Decimal(str(stmt.amount)))

    # 计算调节后余额
    adjusted_bank_balance = (
        bank_balance
        + system_received_not_in_bank
        - system_paid_not_in_bank
        - bank_received_not_in_system
        + bank_paid_not_in_system
    )

    adjusted_system_balance = (
        system_balance
        + bank_received_not_in_system
        - bank_paid_not_in_system
        - system_received_not_in_bank
        + system_paid_not_in_bank
    )

    return success_response(
        data={
            "bank_balance": float(bank_balance),
            "system_balance": float(system_balance),
            "system_received_not_in_bank": float(system_received_not_in_bank),
            "system_paid_not_in_bank": float(system_paid_not_in_bank),
            "bank_received_not_in_system": float(bank_received_not_in_system),
            "bank_paid_not_in_system": float(bank_paid_not_in_system),
            "adjusted_bank_balance": float(adjusted_bank_balance),
            "adjusted_system_balance": float(adjusted_system_balance),
        }
    )


# ==================== 导入导出 ====================


@router.post("/statements/import", response_model=dict)
def import_statements(
    bank_account_id: str = Query(..., description="银行账户ID"),
    file: UploadFile = File(..., description="Excel文件"),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """导入银行流水（Excel）"""
    # 验证银行账户存在
    bank_account = (
        db.query(BankAccount)
        .filter(
            BankAccount.bank_account_id == bank_account_id,
            BankAccount.company_id == current_user.company_id,
        )
        .first()
    )
    if not bank_account:
        raise HTTPException(status_code=404, detail="银行账户不存在")

    imported_count = 0
    error_count = 0
    errors = []

    try:
        # 读取Excel文件
        contents = file.file.read()
        df = pd.read_excel(io.BytesIO(contents))

        # 列名映射（支持多种列名）
        date_columns = ["日期", "交易日期", "date", "Date", "DATE"]
        amount_columns = ["金额", "交易金额", "amount", "Amount", "AMOUNT"]
        type_columns = ["类型", "交易类型", "type", "Type", "TYPE", "方向"]
        description_columns = [
            "摘要",
            "描述",
            "description",
            "Description",
            "DESCRIPTION",
            "备注",
        ]
        balance_columns = ["余额", "balance", "Balance"]

        date_col = None
        amount_col = None
        type_col = None
        description_col = None
        balance_col = None

        for col in df.columns:
            if col in date_columns and date_col is None:
                date_col = col
            if col in amount_columns and amount_col is None:
                amount_col = col
            if col in type_columns and type_col is None:
                type_col = col
            if col in description_columns and description_col is None:
                description_col = col
            if col in balance_columns and balance_col is None:
                balance_col = col

        # 验证必需列
        if not date_col or not amount_col or not description_col:
            raise HTTPException(
                status_code=400,
                detail="Excel文件缺少必需列：日期、金额、摘要",
            )

        # 处理每一行
        for index, row in df.iterrows():
            try:
                # 解析日期
                date_value = pd.to_datetime(row[date_col]).date()

                # 解析金额
                amount_value = float(row[amount_col])

                # 解析类型
                type_value = "Credit"  # 默认收入
                if type_col:
                    type_str = str(row[type_col]).strip()
                    if any(
                        keyword in type_str
                        for keyword in ["支出", "支付", "付款", "Debit", "debit", "出"]
                    ):
                        type_value = "Debit"
                    elif any(
                        keyword in type_str
                        for keyword in ["收入", "收款", "Credit", "credit", "入"]
                    ):
                        type_value = "Credit"
                    else:
                        # 根据金额正负判断
                        type_value = "Credit" if amount_value >= 0 else "Debit"

                # 解析摘要
                description_value = (
                    str(row[description_col]) if pd.notna(row[description_col]) else ""
                )

                # 解析余额（可选）
                balance_value = None
                if balance_col and pd.notna(row[balance_col]):
                    try:
                        balance_value = float(row[balance_col])
                    except:
                        pass

                statement = BankStatement(
                    company_id=current_user.company_id,
                    bank_account_id=bank_account_id,
                    date=date_value,
                    amount=amount_value,
                    type=type_value,
                    description=description_value,
                    balance=balance_value,
                )
                db.add(statement)
                imported_count += 1

            except Exception as e:
                error_count += 1
                errors.append(f"第 {index + 2} 行：{str(e)}")
                if len(errors) >= 10:  # 最多记录10个错误
                    break

        db.commit()

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"导入失败：{str(e)}")

    return success_response(
        data={
            "imported_count": imported_count,
            "error_count": error_count,
            "errors": errors,
        },
        message=f"导入完成：成功 {imported_count} 条，失败 {error_count} 条",
    )
