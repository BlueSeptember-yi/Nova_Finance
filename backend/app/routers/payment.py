"""付款和收款路由"""

from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.account import Account
from app.models.journal import JournalEntry, LedgerLine
from app.models.order import PurchaseOrder, SalesOrder
from app.models.payment import Payment, Receipt
from app.schemas.payment import (
    PaymentCreate,
    PaymentResponse,
    ReceiptCreate,
    ReceiptResponse,
)
from app.utils.auth import get_current_user, require_permission
from app.utils.helpers import success_response

router = APIRouter(tags=["付款收款"])


# ==================== 付款 ====================


@router.post("/payments", response_model=dict)
def create_payment(
    payment_data: PaymentCreate,
    current_user=Depends(require_permission("payment:create")),
    db: Session = Depends(get_db),
):
    """创建付款记录 (UC-009) - 关联采购单时必须一次付清，不允许部分支付"""

    # 如果关联采购订单，进行业务逻辑验证
    if payment_data.purchase_order_id:
        po = (
            db.query(PurchaseOrder)
            .filter(
                PurchaseOrder.po_id == payment_data.purchase_order_id,
                PurchaseOrder.company_id == current_user.company_id,
            )
            .first()
        )
        if not po:
            raise HTTPException(status_code=404, detail="采购订单不存在")

        # 验证采购单状态：必须是已过账状态
        if po.status != "Posted":
            raise HTTPException(
                status_code=400,
                detail=f"只能对已过账的采购单进行付款，当前状态：{po.status}",
            )

        # 计算已付金额（该采购单的所有付款记录总和）
        paid_amount = db.query(func.sum(Payment.amount)).filter(
            Payment.purchase_order_id == payment_data.purchase_order_id,
            Payment.company_id == current_user.company_id,
        ).scalar() or Decimal("0")

        # 计算未付金额
        unpaid_amount = po.total_amount - paid_amount

        # 验证付款金额必须等于未付金额（必须一次付清）
        if payment_data.amount != unpaid_amount:
            raise HTTPException(
                status_code=400,
                detail=f"必须一次付清，付款金额必须等于未付金额 {unpaid_amount}，采购单总金额：{po.total_amount}，已付金额：{paid_amount}",
            )

        # 验证付款金额必须大于0
        if payment_data.amount <= 0:
            raise HTTPException(status_code=400, detail="付款金额必须大于0")

    payment = Payment(
        company_id=current_user.company_id,
        purchase_order_id=payment_data.purchase_order_id,
        date=payment_data.date,
        amount=payment_data.amount,
        payment_method=payment_data.payment_method.value,
        remark=payment_data.remark,
    )
    db.add(payment)
    db.flush()  # 先flush以便计算新的已付金额

    # 如果关联了采购单，检查是否需要更新采购单状态
    if payment_data.purchase_order_id:
        # 重新计算已付金额（包括本次付款）
        new_paid_amount = db.query(func.sum(Payment.amount)).filter(
            Payment.purchase_order_id == payment_data.purchase_order_id,
            Payment.company_id == current_user.company_id,
        ).scalar() or Decimal("0")

        # 如果已付金额等于或超过总金额，更新采购单状态为"Paid"
        if new_paid_amount >= po.total_amount:
            po.status = "Paid"

    # 自动生成付款分录
    # 借：应付账款  贷：银行存款/库存现金
    try:
        # 查找应付账款科目（2202）
        payable_account = (
            db.query(Account)
            .filter(
                Account.company_id == current_user.company_id,
                Account.code == "2202",  # 应付账款
            )
            .first()
        )

        # 根据付款方式选择贷方科目
        if payment_data.payment_method.value == "Cash":
            credit_account_code = "1001"  # 库存现金
            credit_account_name = "库存现金"
        elif payment_data.payment_method.value == "BankTransfer":
            credit_account_code = "1002"  # 银行存款
            credit_account_name = "银行存款"
        else:
            # Credit方式在付款时不应该出现，但为了兼容性，使用银行存款
            credit_account_code = "1002"
            credit_account_name = "银行存款"

        credit_account = (
            db.query(Account)
            .filter(
                Account.company_id == current_user.company_id,
                Account.code == credit_account_code,
            )
            .first()
        )

        if not payable_account or not credit_account:
            missing = []
            if not payable_account:
                missing.append("2202-应付账款")
            if not credit_account:
                missing.append(f"{credit_account_code}-{credit_account_name}")
            raise HTTPException(
                status_code=400,
                detail=f"缺少必需的会计科目：{', '.join(missing)}，请先创建",
            )

        # 创建会计分录
        journal = JournalEntry(
            company_id=current_user.company_id,
            date=payment_data.date,
            description=f"付款 - 采购单：{payment_data.purchase_order_id[:8] if payment_data.purchase_order_id else '无关联订单'}",
            source_type="PAYMENT",
            source_id=payment.payment_id,
            total_debit=payment_data.amount,
            total_credit=payment_data.amount,
            posted=True,
            posted_by=current_user.user_id,
        )
        db.add(journal)
        db.flush()

        # 借方：应付账款
        debit_line = LedgerLine(
            journal_id=journal.journal_id,
            account_id=payable_account.account_id,
            debit=payment_data.amount,
            credit=0,
            memo=f"支付供应商货款",
        )
        db.add(debit_line)

        # 贷方：银行存款/库存现金
        credit_line = LedgerLine(
            journal_id=journal.journal_id,
            account_id=credit_account.account_id,
            debit=0,
            credit=payment_data.amount,
            memo=f"付款",
        )
        db.add(credit_line)

    except HTTPException:
        raise
    except Exception as e:
        # 如果分录生成失败，记录错误但不阻止付款记录创建
        import logging

        logging.error(f"付款分录生成失败：{str(e)}")

    db.commit()
    db.refresh(payment)

    return success_response(
        data=PaymentResponse.from_orm(payment).dict(),
        message="付款记录创建成功，会计分录已自动生成",
    )


@router.get("/payments", response_model=dict)
def get_payments(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
    purchase_order_id: str = None,
    skip: int = 0,
    limit: int = 20,
):
    """获取付款记录列表"""
    query = db.query(Payment).filter(Payment.company_id == current_user.company_id)

    if purchase_order_id:
        query = query.filter(Payment.purchase_order_id == purchase_order_id)

    payments = query.order_by(Payment.created_at.desc()).offset(skip).limit(limit).all()

    return success_response(data=[PaymentResponse.from_orm(p).dict() for p in payments])


@router.get("/payments/available-orders", response_model=dict)
def get_available_purchase_orders(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取可付款的采购单列表（已过账且未完全支付）"""
    # 查询已过账的采购单
    orders = (
        db.query(PurchaseOrder)
        .filter(
            PurchaseOrder.company_id == current_user.company_id,
            PurchaseOrder.status == "Posted",
        )
        .all()
    )

    result = []
    for order in orders:
        # 计算已付金额
        paid_amount = db.query(func.sum(Payment.amount)).filter(
            Payment.purchase_order_id == order.po_id,
            Payment.company_id == current_user.company_id,
        ).scalar() or Decimal("0")

        # 计算未付金额
        unpaid_amount = order.total_amount - paid_amount

        # 只返回未完全支付的采购单
        if unpaid_amount > 0:
            result.append(
                {
                    "po_id": order.po_id,
                    "supplier_id": order.supplier_id,
                    "date": order.date.isoformat() if order.date else None,
                    "total_amount": float(order.total_amount),
                    "paid_amount": float(paid_amount),
                    "unpaid_amount": float(unpaid_amount),
                    "status": order.status,
                }
            )

    return success_response(data=result)


@router.get("/payments/{payment_id}", response_model=dict)
def get_payment(
    payment_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取付款记录详情"""
    payment = (
        db.query(Payment)
        .filter(
            Payment.payment_id == payment_id,
            Payment.company_id == current_user.company_id,
        )
        .first()
    )

    if not payment:
        raise HTTPException(status_code=404, detail="付款记录不存在")

    return success_response(data=PaymentResponse.from_orm(payment).dict())


# ==================== 收款 ====================


@router.post("/receipts", response_model=dict)
def create_receipt(
    receipt_data: ReceiptCreate,
    current_user=Depends(require_permission("receipt:create")),
    db: Session = Depends(get_db),
):
    """创建收款记录 (UC-010)"""

    # 如果关联销售订单，验证订单存在
    if receipt_data.sales_order_id:
        so = (
            db.query(SalesOrder)
            .filter(
                SalesOrder.so_id == receipt_data.sales_order_id,
                SalesOrder.company_id == current_user.company_id,
            )
            .first()
        )
        if not so:
            raise HTTPException(status_code=404, detail="销售订单不存在")

        # 验证销售单状态：必须是已过账状态
        if so.status != "Posted":
            raise HTTPException(
                status_code=400,
                detail=f"只能对已过账的销售单进行收款，当前状态：{so.status}",
            )

        # 计算已收金额（该销售单的所有收款记录总和）
        received_amount = db.query(func.sum(Receipt.amount)).filter(
            Receipt.sales_order_id == receipt_data.sales_order_id,
            Receipt.company_id == current_user.company_id,
        ).scalar() or Decimal("0")

        # 计算未收金额
        unreceived_amount = so.total_amount - received_amount

        # 验证未收金额必须大于0
        if unreceived_amount <= 0:
            raise HTTPException(
                status_code=400,
                detail=f"该销售单已完全收款，无法再次收款。销售单总金额：{so.total_amount}，已收金额：{received_amount}",
            )

        # 验证收款金额不能超过未收金额
        if receipt_data.amount > unreceived_amount:
            raise HTTPException(
                status_code=400,
                detail=f"收款金额不能超过未收金额 {unreceived_amount}，销售单总金额：{so.total_amount}，已收金额：{received_amount}",
            )

    receipt = Receipt(
        company_id=current_user.company_id,
        sales_order_id=receipt_data.sales_order_id,
        date=receipt_data.date,
        amount=receipt_data.amount,
        method=receipt_data.method.value,
        remark=receipt_data.remark,
    )
    db.add(receipt)
    db.flush()  # 先flush以便计算新的已收金额

    # 如果关联了销售单，检查是否需要更新销售单状态
    if receipt_data.sales_order_id:
        # 重新计算已收金额（包括本次收款）
        new_received_amount = db.query(func.sum(Receipt.amount)).filter(
            Receipt.sales_order_id == receipt_data.sales_order_id,
            Receipt.company_id == current_user.company_id,
        ).scalar() or Decimal("0")

        # 如果已收金额等于或超过总金额，更新销售单状态为"Collected"
        if new_received_amount >= so.total_amount:
            so.status = "Collected"

    # 自动生成收款分录
    # 借：银行存款/库存现金  贷：应收账款
    try:
        # 查找应收账款科目（1122）
        receivable_account = (
            db.query(Account)
            .filter(
                Account.company_id == current_user.company_id,
                Account.code == "1122",  # 应收账款
            )
            .first()
        )

        # 根据收款方式选择借方科目
        if receipt_data.method.value == "Cash":
            debit_account_code = "1001"  # 库存现金
            debit_account_name = "库存现金"
        elif receipt_data.method.value == "BankTransfer":
            debit_account_code = "1002"  # 银行存款
            debit_account_name = "银行存款"
        else:
            # Credit方式表示收回应收账款，使用银行存款
            debit_account_code = "1002"
            debit_account_name = "银行存款"

        debit_account = (
            db.query(Account)
            .filter(
                Account.company_id == current_user.company_id,
                Account.code == debit_account_code,
            )
            .first()
        )

        if not receivable_account or not debit_account:
            missing = []
            if not receivable_account:
                missing.append("1122-应收账款")
            if not debit_account:
                missing.append(f"{debit_account_code}-{debit_account_name}")
            raise HTTPException(
                status_code=400,
                detail=f"缺少必需的会计科目：{', '.join(missing)}，请先创建",
            )

        # 创建会计分录
        journal = JournalEntry(
            company_id=current_user.company_id,
            date=receipt_data.date,
            description=f"收款 - 销售单：{receipt_data.sales_order_id[:8] if receipt_data.sales_order_id else '无关联订单'}",
            source_type="RECEIPT",
            source_id=receipt.receipt_id,
            total_debit=receipt_data.amount,
            total_credit=receipt_data.amount,
            posted=True,
            posted_by=current_user.user_id,
        )
        db.add(journal)
        db.flush()

        # 借方：银行存款/库存现金
        debit_line = LedgerLine(
            journal_id=journal.journal_id,
            account_id=debit_account.account_id,
            debit=receipt_data.amount,
            credit=0,
            memo=f"收到客户货款",
        )
        db.add(debit_line)

        # 贷方：应收账款
        credit_line = LedgerLine(
            journal_id=journal.journal_id,
            account_id=receivable_account.account_id,
            debit=0,
            credit=receipt_data.amount,
            memo=f"收回应收账款",
        )
        db.add(credit_line)

    except HTTPException:
        raise
    except Exception as e:
        # 如果分录生成失败，记录错误但不阻止收款记录创建
        import logging

        logging.error(f"收款分录生成失败：{str(e)}")

    db.commit()
    db.refresh(receipt)

    return success_response(
        data=ReceiptResponse.from_orm(receipt).dict(),
        message="收款记录创建成功，会计分录已自动生成",
    )


@router.get("/receipts", response_model=dict)
def get_receipts(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
    sales_order_id: str = None,
    skip: int = 0,
    limit: int = 20,
):
    """获取收款记录列表"""
    query = db.query(Receipt).filter(Receipt.company_id == current_user.company_id)

    if sales_order_id:
        query = query.filter(Receipt.sales_order_id == sales_order_id)

    receipts = query.order_by(Receipt.created_at.desc()).offset(skip).limit(limit).all()

    return success_response(data=[ReceiptResponse.from_orm(r).dict() for r in receipts])


@router.get("/receipts/available-orders", response_model=dict)
def get_available_sales_orders(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取可收款的销售单列表（已过账且未完全收款）"""
    # 查询已过账的销售单
    orders = (
        db.query(SalesOrder)
        .filter(
            SalesOrder.company_id == current_user.company_id,
            SalesOrder.status == "Posted",
        )
        .all()
    )

    result = []
    for order in orders:
        # 计算已收金额
        received_amount = db.query(func.sum(Receipt.amount)).filter(
            Receipt.sales_order_id == order.so_id,
            Receipt.company_id == current_user.company_id,
        ).scalar() or Decimal("0")

        # 计算未收金额
        unreceived_amount = order.total_amount - received_amount

        # 只返回未完全收款的销售单
        if unreceived_amount > 0:
            result.append(
                {
                    "so_id": order.so_id,
                    "customer_id": order.customer_id,
                    "date": order.date.isoformat() if order.date else None,
                    "total_amount": float(order.total_amount),
                    "received_amount": float(received_amount),
                    "unreceived_amount": float(unreceived_amount),
                    "status": order.status,
                    "payment_method": order.payment_method,
                }
            )

    return success_response(data=result)


@router.get("/receipts/{receipt_id}", response_model=dict)
def get_receipt(
    receipt_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取收款记录详情"""
    receipt = (
        db.query(Receipt)
        .filter(
            Receipt.receipt_id == receipt_id,
            Receipt.company_id == current_user.company_id,
        )
        .first()
    )

    if not receipt:
        raise HTTPException(status_code=404, detail="收款记录不存在")

    return success_response(data=ReceiptResponse.from_orm(receipt).dict())
