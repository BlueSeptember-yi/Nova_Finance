"""客户管理路由"""

from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.customer import Customer
from app.models.order import SalesOrder
from app.models.payment import Receipt
from app.schemas.customer import CustomerCreate, CustomerResponse, CustomerUpdate
from app.utils.auth import get_current_user, require_permission
from app.utils.helpers import success_response

router = APIRouter(prefix="/customers", tags=["客户管理"])


@router.post("", response_model=dict)
def create_customer(
    customer_data: CustomerCreate,
    current_user=Depends(require_permission("customer:create")),
    db: Session = Depends(get_db),
):
    """新增客户 (UC-006-1)"""

    # 检查名称是否重复
    existing = (
        db.query(Customer)
        .filter(
            Customer.name == customer_data.name,
            Customer.company_id == current_user.company_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="客户名称已存在")

    # 创建客户
    customer = Customer(
        company_id=current_user.company_id,
        name=customer_data.name,
        phone=customer_data.phone,
        address=customer_data.address,
        credit_limit=customer_data.credit_limit,
        remark=customer_data.remark,
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)

    return success_response(
        data=CustomerResponse.from_orm(customer).dict(), message="客户创建成功"
    )


@router.get("", response_model=dict)
def get_customers(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 50,
):
    """获取客户列表（包含订单统计信息）"""
    customers = (
        db.query(Customer)
        .filter(Customer.company_id == current_user.company_id)
        .offset(skip)
        .limit(limit)
        .all()
    )

    # 为每个客户计算订单统计信息
    result = []
    for customer in customers:
        customer_data = CustomerResponse.from_orm(customer).dict()

        # 查询该客户的所有销售订单
        orders = (
            db.query(SalesOrder)
            .filter(
                SalesOrder.customer_id == customer.customer_id,
                SalesOrder.company_id == current_user.company_id,
            )
            .all()
        )

        # 统计订单数量
        draft_count = sum(1 for o in orders if o.status == "Draft")
        posted_count = sum(1 for o in orders if o.status == "Posted")
        collected_count = sum(1 for o in orders if o.status == "Collected")
        total_orders = len(orders)

        # 计算当前欠款（所有已过账但未完全收款的赊销订单的未收金额总和）
        current_debt = Decimal("0")
        posted_credit_orders = [
            o for o in orders if o.status == "Posted" and o.payment_method == "Credit"
        ]

        for order in posted_credit_orders:
            # 计算该订单的已收金额
            received_amount = db.query(func.sum(Receipt.amount)).filter(
                Receipt.sales_order_id == order.so_id,
                Receipt.company_id == current_user.company_id,
            ).scalar() or Decimal("0")
            # 计算未收金额
            unreceived_amount = order.total_amount - received_amount
            current_debt += unreceived_amount

        # 计算总销售额（所有已过账订单的总金额）
        total_sales = sum(
            float(o.total_amount) for o in orders if o.status in ("Posted", "Collected")
        )

        # 计算已收款总额
        total_received = db.query(func.sum(Receipt.amount)).join(
            SalesOrder, Receipt.sales_order_id == SalesOrder.so_id
        ).filter(
            SalesOrder.customer_id == customer.customer_id,
            Receipt.company_id == current_user.company_id,
        ).scalar() or Decimal("0")

        # 计算可用信用额度
        available_credit = (
            customer.credit_limit - current_debt
            if customer.credit_limit > 0
            else Decimal("0")
        )

        # 添加统计信息
        customer_data.update(
            {
                "order_stats": {
                    "total_orders": total_orders,
                    "draft_count": draft_count,
                    "posted_count": posted_count,
                    "collected_count": collected_count,
                    "current_debt": float(current_debt),
                    "total_sales": total_sales,
                    "total_received": float(total_received),
                    "available_credit": float(available_credit),
                }
            }
        )

        result.append(customer_data)

    return success_response(data=result)


@router.get("/{customer_id}", response_model=dict)
def get_customer(
    customer_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取客户详情"""
    customer = (
        db.query(Customer)
        .filter(
            Customer.customer_id == customer_id,
            Customer.company_id == current_user.company_id,
        )
        .first()
    )

    if not customer:
        raise HTTPException(status_code=404, detail="客户不存在")

    return success_response(data=CustomerResponse.from_orm(customer).dict())


@router.put("/{customer_id}", response_model=dict)
def update_customer(
    customer_id: str,
    customer_data: CustomerUpdate,
    current_user=Depends(require_permission("customer:update")),
    db: Session = Depends(get_db),
):
    """修改客户 (UC-006-2)"""
    customer = (
        db.query(Customer)
        .filter(
            Customer.customer_id == customer_id,
            Customer.company_id == current_user.company_id,
        )
        .first()
    )

    if not customer:
        raise HTTPException(status_code=404, detail="客户不存在")

    # 更新字段（客户名称锁定，不能修改）
    update_data = customer_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        if hasattr(customer, key):
            setattr(customer, key, value)

    db.commit()
    db.refresh(customer)

    return success_response(
        data=CustomerResponse.from_orm(customer).dict(), message="客户更新成功"
    )


@router.delete("/{customer_id}", response_model=dict)
def delete_customer(
    customer_id: str,
    current_user=Depends(require_permission("customer:delete")),
    db: Session = Depends(get_db),
):
    """删除客户 (UC-006-3)"""
    customer = (
        db.query(Customer)
        .filter(
            Customer.customer_id == customer_id,
            Customer.company_id == current_user.company_id,
        )
        .first()
    )

    if not customer:
        raise HTTPException(status_code=404, detail="客户不存在")

    # TODO: 检查是否有未结清应收账款
    # TODO: 检查是否有未完成的销售订单

    db.delete(customer)
    db.commit()

    return success_response(message="客户删除成功")
