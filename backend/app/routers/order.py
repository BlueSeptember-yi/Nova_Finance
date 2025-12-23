"""订单管理路由"""

from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.account import Account
from app.models.customer import Customer
from app.models.inventory import InventoryItem, InventoryTransaction
from app.models.journal import JournalEntry, LedgerLine
from app.models.order import (
    PurchaseOrder,
    PurchaseOrderItem,
    SalesOrder,
    SalesOrderItem,
)
from app.models.supplier import Supplier
from app.schemas.order import (
    PostPurchaseOrderRequest,
    PostSalesOrderRequest,
    PurchaseOrderCreate,
    PurchaseOrderResponse,
    SalesOrderCreate,
    SalesOrderResponse,
)
from app.utils.auth import get_current_user, require_permission
from app.utils.helpers import success_response

router = APIRouter(tags=["订单管理"])


# ==================== 采购订单 ====================


@router.post("/purchase/orders", response_model=dict)
def create_purchase_order(
    order_data: PurchaseOrderCreate,
    current_user=Depends(require_permission("purchase:create")),
    db: Session = Depends(get_db),
):
    """下采购订单 (UC-005)"""

    # 验证供应商存在
    supplier = (
        db.query(Supplier)
        .filter(
            Supplier.supplier_id == order_data.supplier_id,
            Supplier.company_id == current_user.company_id,
        )
        .first()
    )
    if not supplier:
        raise HTTPException(status_code=404, detail="供应商不存在")

    # 计算总金额
    total_amount = sum(
        item.quantity * item.unit_price * item.discount_rate
        for item in order_data.items
    )

    # 创建采购订单
    purchase_order = PurchaseOrder(
        supplier_id=order_data.supplier_id,
        company_id=current_user.company_id,
        date=order_data.date,
        expected_delivery_date=order_data.expected_delivery_date,
        total_amount=total_amount,
        remark=order_data.remark,
    )
    db.add(purchase_order)
    db.flush()

    # 创建订单明细
    from app.models.order import PurchaseOrderItem

    for item_data in order_data.items:
        subtotal = item_data.quantity * item_data.unit_price * item_data.discount_rate
        item = PurchaseOrderItem(
            purchase_order_id=purchase_order.po_id,
            product_id=item_data.product_id,
            product_name=item_data.product_name,
            quantity=item_data.quantity,
            unit_price=item_data.unit_price,
            discount_rate=item_data.discount_rate,
            subtotal=subtotal,
        )
        db.add(item)

    db.commit()
    db.refresh(purchase_order)

    return success_response(
        data=PurchaseOrderResponse.from_orm(purchase_order).dict(),
        message="采购订单创建成功",
    )


@router.get("/purchase/orders", response_model=dict)
def get_purchase_orders(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
    status: str = None,
    skip: int = 0,
    limit: int = 20,
):
    """获取采购订单列表"""
    query = db.query(PurchaseOrder).filter(
        PurchaseOrder.company_id == current_user.company_id
    )

    if status:
        query = query.filter(PurchaseOrder.status == status)

    orders = (
        query.order_by(PurchaseOrder.created_at.desc()).offset(skip).limit(limit).all()
    )

    return success_response(
        data=[PurchaseOrderResponse.from_orm(o).dict() for o in orders]
    )


@router.get("/purchase/orders/{po_id}", response_model=dict)
def get_purchase_order(
    po_id: str, current_user=Depends(get_current_user), db: Session = Depends(get_db)
):
    """获取采购订单详情"""
    order = (
        db.query(PurchaseOrder)
        .filter(
            PurchaseOrder.po_id == po_id,
            PurchaseOrder.company_id == current_user.company_id,
        )
        .first()
    )

    if not order:
        raise HTTPException(status_code=404, detail="采购订单不存在")

    return success_response(data=PurchaseOrderResponse.from_orm(order).dict())


@router.post("/purchase/orders/{po_id}/post", response_model=dict)
def post_purchase_order(
    po_id: str,
    post_data: PostPurchaseOrderRequest | None = Body(default=None),
    current_user=Depends(require_permission("purchase:create")),
    db: Session = Depends(get_db),
):
    """采购订单过账 - 创建库存流水和会计分录"""

    # 获取采购订单
    order = (
        db.query(PurchaseOrder)
        .filter(
            PurchaseOrder.po_id == po_id,
            PurchaseOrder.company_id == current_user.company_id,
        )
        .first()
    )

    if not order:
        raise HTTPException(status_code=404, detail="采购订单不存在")

    if order.status != "Draft":
        raise HTTPException(
            status_code=400, detail=f"订单状态为 {order.status}，只有草稿状态才能过账"
        )

    # 获取仓库位置信息（如果有）
    warehouse_locations = post_data.warehouse_locations if post_data else {}

    # 查找必需的会计科目
    # 库存商品（资产类）- 借方
    inventory_account = (
        db.query(Account)
        .filter(
            Account.company_id == current_user.company_id,
            Account.code == "1405",  # 库存商品
        )
        .first()
    )

    # 应付账款（负债类）- 贷方
    payable_account = (
        db.query(Account)
        .filter(
            Account.company_id == current_user.company_id,
            Account.code == "2202",  # 应付账款
        )
        .first()
    )

    if not inventory_account or not payable_account:
        raise HTTPException(
            status_code=400,
            detail="缺少必需的会计科目（1405-库存商品 或 2202-应付账款），请先创建",
        )

    try:
        # 1. 创建库存流水（入库）
        for item in order.items:
            if item.product_id:
                # 获取或创建库存记录
                inventory = (
                    db.query(InventoryItem)
                    .filter(
                        InventoryItem.product_id == item.product_id,
                        InventoryItem.company_id == current_user.company_id,
                    )
                    .first()
                )

                if not inventory:
                    inventory = InventoryItem(
                        product_id=item.product_id,
                        company_id=current_user.company_id,
                        quantity=0,
                        average_cost=0,
                    )
                    db.add(inventory)
                    db.flush()

                # 获取该商品的仓库位置（如果有提供）
                warehouse_location = (
                    warehouse_locations.get(item.product_id)
                    if item.product_id
                    else None
                )

                # 计算加权平均成本
                # 公式：新平均成本 = (旧库存数量 × 旧平均成本 + 新入库数量 × 新采购单价) / (旧库存数量 + 新入库数量)
                purchase_unit_price = (
                    item.unit_price * item.discount_rate
                )  # 实际采购单价（考虑折扣）
                old_quantity = inventory.quantity
                old_average_cost = inventory.average_cost or Decimal("0")
                new_quantity = item.quantity

                if old_quantity + new_quantity > 0:
                    new_average_cost = (
                        old_quantity * old_average_cost
                        + new_quantity * purchase_unit_price
                    ) / (old_quantity + new_quantity)
                else:
                    new_average_cost = purchase_unit_price

                # 创建入库流水（触发器会自动更新库存数量）
                # 仓库位置保存在流水记录中，而不是库存记录中
                transaction = InventoryTransaction(
                    company_id=current_user.company_id,
                    product_id=item.product_id,
                    inventory_id=inventory.inventory_id,
                    type="IN",
                    quantity=item.quantity,
                    unit_cost=purchase_unit_price,  # 记录本次采购的单位成本
                    source_type="PO",
                    source_id=order.po_id,
                    warehouse_location=warehouse_location,
                    remark=f"采购入库：{item.product_name}",
                )
                db.add(transaction)
                db.flush()  # 立即刷新，确保触发器执行并更新库存数量

                # 更新库存的加权平均成本
                inventory.average_cost = new_average_cost
                db.flush()

        # 2. 创建会计分录
        # 借：库存商品  贷：应付账款
        journal = JournalEntry(
            company_id=current_user.company_id,
            date=order.date,
            description=f"采购入库 - 订单号：{order.po_id[:8]}",
            source_type="PO",
            source_id=order.po_id,
            total_debit=order.total_amount,
            total_credit=order.total_amount,
            posted=True,  # 自动过账
            posted_by=current_user.user_id,
        )
        db.add(journal)
        db.flush()

        # 借方：库存商品
        debit_line = LedgerLine(
            journal_id=journal.journal_id,
            account_id=inventory_account.account_id,
            debit=order.total_amount,
            credit=0,
            memo=f"采购入库",
        )
        db.add(debit_line)

        # 贷方：应付账款
        credit_line = LedgerLine(
            journal_id=journal.journal_id,
            account_id=payable_account.account_id,
            debit=0,
            credit=order.total_amount,
            memo=f"应付供应商",
        )
        db.add(credit_line)

        # 3. 更新订单状态
        order.status = "Posted"

        db.commit()
        db.refresh(order)

        return success_response(
            data=PurchaseOrderResponse.from_orm(order).dict(),
            message="采购订单过账成功，库存和会计分录已生成",
        )

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"过账失败：{str(e)}")


# ==================== 销售订单 ====================


@router.post("/sales/orders", response_model=dict)
def create_sales_order(
    order_data: SalesOrderCreate,
    current_user=Depends(require_permission("sales:create")),
    db: Session = Depends(get_db),
):
    """开具销售单 (UC-007)"""

    # 验证客户存在
    customer = (
        db.query(Customer)
        .filter(
            Customer.customer_id == order_data.customer_id,
            Customer.company_id == current_user.company_id,
        )
        .first()
    )
    if not customer:
        raise HTTPException(status_code=404, detail="客户不存在")

    # 计算总金额
    total_amount = sum(
        item.quantity * item.unit_price * item.discount_rate
        for item in order_data.items
    )

    # 检查信用额度（如果是赊销）
    payment_method_str = (
        order_data.payment_method
        if isinstance(order_data.payment_method, str)
        else (order_data.payment_method.value if order_data.payment_method else None)
    )
    if payment_method_str == "Credit":
        # 检查客户是否有信用额度
        if customer.credit_limit <= 0:
            raise HTTPException(
                status_code=400,
                detail="该客户没有设置信用额度，不能使用赊销方式",
            )

        # 计算客户当前欠款（所有已过账但未完全收款的赊销订单的未收金额总和）
        from sqlalchemy import func

        from app.models.payment import Receipt

        # 查询该客户所有已过账的赊销订单
        posted_credit_orders = (
            db.query(SalesOrder)
            .filter(
                SalesOrder.customer_id == order_data.customer_id,
                SalesOrder.company_id == current_user.company_id,
                SalesOrder.payment_method == "Credit",
                SalesOrder.status == "Posted",  # 只有已过账的才产生应收账款
            )
            .all()
        )

        # 计算所有已过账赊销订单的未收金额总和
        current_debt = Decimal("0")
        for order in posted_credit_orders:
            # 计算该订单的已收金额
            received_amount = db.query(func.sum(Receipt.amount)).filter(
                Receipt.sales_order_id == order.so_id,
                Receipt.company_id == current_user.company_id,
            ).scalar() or Decimal("0")
            # 计算未收金额
            unreceived_amount = order.total_amount - received_amount
            current_debt += unreceived_amount

        # 检查加上本次订单金额后是否超出信用额度
        if current_debt + total_amount > customer.credit_limit:
            available_credit = customer.credit_limit - current_debt
            raise HTTPException(
                status_code=400,
                detail=f"超出信用额度！当前欠款: ¥{current_debt:.2f}, 本次订单金额: ¥{total_amount:.2f}, "
                f"信用额度: ¥{customer.credit_limit:.2f}, 可用额度: ¥{available_credit:.2f}",
            )

    # 创建销售订单
    sales_order = SalesOrder(
        customer_id=order_data.customer_id,
        company_id=current_user.company_id,
        date=order_data.date,
        expected_delivery_date=order_data.expected_delivery_date,
        total_amount=total_amount,
        payment_method=payment_method_str,
        remark=order_data.remark,
    )
    db.add(sales_order)
    db.flush()

    # 创建订单明细
    from app.models.order import SalesOrderItem

    for item_data in order_data.items:
        subtotal = item_data.quantity * item_data.unit_price * item_data.discount_rate
        item = SalesOrderItem(
            sales_order_id=sales_order.so_id,
            product_id=item_data.product_id,
            product_name=item_data.product_name,
            quantity=item_data.quantity,
            unit_price=item_data.unit_price,
            discount_rate=item_data.discount_rate,
            subtotal=subtotal,
        )
        db.add(item)

    db.commit()
    db.refresh(sales_order)

    return success_response(
        data=SalesOrderResponse.from_orm(sales_order).dict(), message="销售订单创建成功"
    )


@router.get("/sales/orders", response_model=dict)
def get_sales_orders(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
    status: str = None,
    skip: int = 0,
    limit: int = 20,
):
    """获取销售订单列表"""
    query = db.query(SalesOrder).filter(
        SalesOrder.company_id == current_user.company_id
    )

    if status:
        query = query.filter(SalesOrder.status == status)

    orders = (
        query.order_by(SalesOrder.created_at.desc()).offset(skip).limit(limit).all()
    )

    return success_response(
        data=[SalesOrderResponse.from_orm(o).dict() for o in orders]
    )


@router.get("/sales/orders/{so_id}", response_model=dict)
def get_sales_order(
    so_id: str, current_user=Depends(get_current_user), db: Session = Depends(get_db)
):
    """获取销售订单详情"""
    order = (
        db.query(SalesOrder)
        .filter(
            SalesOrder.so_id == so_id, SalesOrder.company_id == current_user.company_id
        )
        .first()
    )

    if not order:
        raise HTTPException(status_code=404, detail="销售订单不存在")

    return success_response(data=SalesOrderResponse.from_orm(order).dict())


@router.post("/sales/orders/{so_id}/post", response_model=dict)
def post_sales_order(
    so_id: str,
    post_data: PostSalesOrderRequest | None = Body(default=None),
    current_user=Depends(require_permission("sales:create")),
    db: Session = Depends(get_db),
):
    """销售订单过账 - 检查库存、创建出库流水和会计分录"""

    # 获取销售订单
    order = (
        db.query(SalesOrder)
        .filter(
            SalesOrder.so_id == so_id,
            SalesOrder.company_id == current_user.company_id,
        )
        .first()
    )

    if not order:
        raise HTTPException(status_code=404, detail="销售订单不存在")

    if order.status != "Draft":
        raise HTTPException(
            status_code=400, detail=f"订单状态为 {order.status}，只有草稿状态才能过账"
        )

    # 如果是赊销，在过账时检查信用额度（过账后才真正产生应收账款）
    if order.payment_method == "Credit":
        # 获取客户信息
        customer = (
            db.query(Customer)
            .filter(
                Customer.customer_id == order.customer_id,
                Customer.company_id == current_user.company_id,
            )
            .first()
        )

        if not customer:
            raise HTTPException(status_code=404, detail="客户不存在")

        # 检查客户是否有信用额度
        if customer.credit_limit <= 0:
            raise HTTPException(
                status_code=400,
                detail="该客户没有设置信用额度，不能对赊销订单进行过账",
            )

        # 计算客户当前欠款（所有已过账但未完全收款的赊销订单的未收金额总和）
        from sqlalchemy import func

        from app.models.payment import Receipt

        # 查询该客户所有已过账的赊销订单（不包括当前订单）
        posted_credit_orders = (
            db.query(SalesOrder)
            .filter(
                SalesOrder.customer_id == order.customer_id,
                SalesOrder.company_id == current_user.company_id,
                SalesOrder.payment_method == "Credit",
                SalesOrder.status == "Posted",  # 只有已过账的才产生应收账款
                SalesOrder.so_id != order.so_id,  # 排除当前订单
            )
            .all()
        )

        # 计算所有已过账赊销订单的未收金额总和
        current_debt = Decimal("0")
        for posted_order in posted_credit_orders:
            # 计算该订单的已收金额
            received_amount = db.query(func.sum(Receipt.amount)).filter(
                Receipt.sales_order_id == posted_order.so_id,
                Receipt.company_id == current_user.company_id,
            ).scalar() or Decimal("0")
            # 计算未收金额
            unreceived_amount = posted_order.total_amount - received_amount
            current_debt += unreceived_amount

        # 检查加上本次订单金额后是否超出信用额度
        if current_debt + order.total_amount > customer.credit_limit:
            available_credit = customer.credit_limit - current_debt
            raise HTTPException(
                status_code=400,
                detail=f"超出信用额度！当前欠款: ¥{current_debt:.2f}, 本次订单金额: ¥{order.total_amount:.2f}, "
                f"信用额度: ¥{customer.credit_limit:.2f}, 可用额度: ¥{available_credit:.2f}。"
                f"请先收款或调整信用额度后再过账。",
            )

    # 查找必需的会计科目（按照标准科目）
    # 库存商品（资产类）- 1405
    inventory_account = (
        db.query(Account)
        .filter(
            Account.company_id == current_user.company_id,
            Account.code == "1405",  # 库存商品
        )
        .first()
    )

    # 主营业务收入（收入类）- 6001
    revenue_account = (
        db.query(Account)
        .filter(
            Account.company_id == current_user.company_id,
            Account.code == "6001",  # 主营业务收入
        )
        .first()
    )

    # 主营业务成本（费用类）- 6401
    cost_account = (
        db.query(Account)
        .filter(
            Account.company_id == current_user.company_id,
            Account.code == "6401",  # 主营业务成本
        )
        .first()
    )

    # 应收账款（资产类）- 1122
    # 销售收入过账应统一使用应收账款科目，无论付款方式如何
    receivable_account = (
        db.query(Account)
        .filter(
            Account.company_id == current_user.company_id,
            Account.code == "1122",  # 应收账款
        )
        .first()
    )

    if not all([inventory_account, revenue_account, cost_account, receivable_account]):
        missing = []
        if not inventory_account:
            missing.append("1405-库存商品")
        if not revenue_account:
            missing.append("6001-主营业务收入")
        if not cost_account:
            missing.append("6401-主营业务成本")
        if not receivable_account:
            missing.append("1122-应收账款")
        raise HTTPException(
            status_code=400,
            detail=f"缺少必需的会计科目：{', '.join(missing)}，请先创建",
        )

    try:
        # 1. 检查库存并创建出库流水（简化版：只检查总库存，不涉及位置）
        total_cost = Decimal(0)

        for item in order.items:
            if item.product_id:
                # 获取或创建库存记录
                inventory = (
                    db.query(InventoryItem)
                    .filter(
                        InventoryItem.product_id == item.product_id,
                        InventoryItem.company_id == current_user.company_id,
                    )
                    .first()
                )

                if not inventory:
                    raise HTTPException(
                        status_code=400,
                        detail=f"商品 {item.product_name} 没有库存记录",
                    )

                # 检查总库存是否充足
                if inventory.quantity < item.quantity:
                    raise HTTPException(
                        status_code=400,
                        detail=f"商品 {item.product_name} 库存不足，当前库存：{inventory.quantity}，需要：{item.quantity}",
                    )

                # 获取当前加权平均成本
                if not inventory.average_cost or inventory.average_cost == 0:
                    raise HTTPException(
                        status_code=400,
                        detail=f"商品 {item.product_name} 没有成本信息，请先进行采购入库",
                    )

                unit_cost = inventory.average_cost
                cost = item.quantity * unit_cost
                total_cost += cost

                # 创建出库流水（触发器会自动减少库存数量）
                # 不记录位置信息，因为系统只支持单一仓库
                transaction = InventoryTransaction(
                    company_id=current_user.company_id,
                    product_id=item.product_id,
                    inventory_id=inventory.inventory_id,
                    type="OUT",
                    quantity=item.quantity,
                    unit_cost=unit_cost,  # 记录出库时的加权平均成本
                    source_type="SO",
                    source_id=order.so_id,
                    warehouse_location=None,  # 不记录位置
                    remark=f"销售出库：{item.product_name}",
                )
                db.add(transaction)
                db.flush()  # 立即刷新，确保触发器执行并更新库存数量

        # 2. 创建会计分录1：确认收入
        # 借：应收账款/银行存款  贷：主营业务收入
        journal_revenue = JournalEntry(
            company_id=current_user.company_id,
            date=order.date,
            description=f"销售收入 - 订单号：{order.so_id[:8]}",
            source_type="SO",
            source_id=order.so_id,
            total_debit=order.total_amount,
            total_credit=order.total_amount,
            posted=True,
            posted_by=current_user.user_id,
        )
        db.add(journal_revenue)
        db.flush()

        # 借方：应收账款/银行存款
        debit_line1 = LedgerLine(
            journal_id=journal_revenue.journal_id,
            account_id=receivable_account.account_id,
            debit=order.total_amount,
            credit=0,
            memo=f"销售收入",
        )
        db.add(debit_line1)

        # 贷方：主营业务收入
        credit_line1 = LedgerLine(
            journal_id=journal_revenue.journal_id,
            account_id=revenue_account.account_id,
            debit=0,
            credit=order.total_amount,
            memo=f"销售收入",
        )
        db.add(credit_line1)

        # 3. 创建会计分录2：结转成本
        # 借：主营业务成本  贷：库存商品
        journal_cost = JournalEntry(
            company_id=current_user.company_id,
            date=order.date,
            description=f"销售成本 - 订单号：{order.so_id[:8]}",
            source_type="SO",
            source_id=order.so_id,
            total_debit=total_cost,
            total_credit=total_cost,
            posted=True,
            posted_by=current_user.user_id,
        )
        db.add(journal_cost)
        db.flush()

        # 借方：主营业务成本
        debit_line2 = LedgerLine(
            journal_id=journal_cost.journal_id,
            account_id=cost_account.account_id,
            debit=total_cost,
            credit=0,
            memo=f"销售成本",
        )
        db.add(debit_line2)

        # 贷方：库存商品
        credit_line2 = LedgerLine(
            journal_id=journal_cost.journal_id,
            account_id=inventory_account.account_id,
            debit=0,
            credit=total_cost,
            memo=f"结转成本",
        )
        db.add(credit_line2)

        # 4. 更新订单状态
        order.status = "Posted"

        db.commit()
        db.refresh(order)

        return success_response(
            data=SalesOrderResponse.from_orm(order).dict(),
            message="销售订单过账成功，库存已出库，会计分录已生成",
        )

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"过账失败：{str(e)}")
