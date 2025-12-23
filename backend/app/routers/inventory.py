"""库存管理路由"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.inventory import InventoryItem, InventoryTransaction
from app.models.product import Product
from app.schemas.inventory import (
    InventoryItemResponse,
    InventoryTransactionCreate,
    InventoryTransactionResponse,
)
from app.utils.auth import get_current_user
from app.utils.helpers import success_response

router = APIRouter(prefix="/inventory", tags=["库存管理"])


@router.get("/items", response_model=dict)
def get_inventory_items(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
    product_id: str = None,
    skip: int = 0,
    limit: int = 20,
):
    """获取库存列表"""
    from sqlalchemy.orm import joinedload

    query = (
        db.query(InventoryItem)
        .filter(InventoryItem.company_id == current_user.company_id)
        .options(joinedload(InventoryItem.product))
    )

    if product_id:
        query = query.filter(InventoryItem.product_id == product_id)

    items = query.offset(skip).limit(limit).all()

    result = []
    for item in items:
        item_dict = InventoryItemResponse.from_orm(item).dict()
        # 确保quantity被序列化为数字而不是字符串
        if "quantity" in item_dict and item_dict["quantity"] is not None:
            item_dict["quantity"] = float(item_dict["quantity"])
        if item.product:
            item_dict["product_name"] = item.product.name
            item_dict["product_sku"] = item.product.sku

        # 从流水记录中汇总仓库位置（获取所有不同的位置）
        locations = (
            db.query(InventoryTransaction.warehouse_location)
            .filter(
                InventoryTransaction.product_id == item.product_id,
                InventoryTransaction.company_id == item.company_id,
                InventoryTransaction.type == "IN",
                InventoryTransaction.warehouse_location.isnot(None),
                InventoryTransaction.warehouse_location != "",
            )
            .distinct()
            .all()
        )
        # 提取位置字符串并去重
        location_list = [loc[0] for loc in locations if loc[0]]
        if location_list:
            item_dict["warehouse_locations"] = location_list
            item_dict["warehouse_location"] = ", ".join(
                location_list
            )  # 兼容字段，显示所有位置的汇总
        else:
            item_dict["warehouse_locations"] = []
            item_dict["warehouse_location"] = None

        result.append(item_dict)

    return success_response(data=result)


@router.get("/items/{inventory_id}", response_model=dict)
def get_inventory_item(
    inventory_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取库存详情"""
    from sqlalchemy.orm import joinedload

    item = (
        db.query(InventoryItem)
        .options(joinedload(InventoryItem.product))
        .filter(
            InventoryItem.inventory_id == inventory_id,
            InventoryItem.company_id == current_user.company_id,
        )
        .first()
    )

    if not item:
        raise HTTPException(status_code=404, detail="库存记录不存在")

    item_dict = InventoryItemResponse.from_orm(item).dict()
    # 确保quantity被序列化为数字而不是字符串
    if "quantity" in item_dict and item_dict["quantity"] is not None:
        item_dict["quantity"] = float(item_dict["quantity"])
    if item.product:
        item_dict["product_name"] = item.product.name
        item_dict["product_sku"] = item.product.sku

    # 从流水记录中汇总仓库位置
    locations = (
        db.query(InventoryTransaction.warehouse_location)
        .filter(
            InventoryTransaction.product_id == item.product_id,
            InventoryTransaction.company_id == item.company_id,
            InventoryTransaction.type == "IN",
            InventoryTransaction.warehouse_location.isnot(None),
            InventoryTransaction.warehouse_location != "",
        )
        .distinct()
        .all()
    )
    location_list = [loc[0] for loc in locations if loc[0]]
    if location_list:
        item_dict["warehouse_locations"] = location_list
        item_dict["warehouse_location"] = ", ".join(location_list)
    else:
        item_dict["warehouse_locations"] = []
        item_dict["warehouse_location"] = None

    return success_response(data=item_dict)


@router.post("/transactions", response_model=dict)
def create_inventory_transaction(
    transaction_data: InventoryTransactionCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """创建库存流水（手工录入或调整）"""
    # 验证商品存在
    product = (
        db.query(Product)
        .filter(
            Product.product_id == transaction_data.product_id,
            Product.company_id == current_user.company_id,
        )
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="商品不存在")

    # 获取或创建库存记录
    inventory = (
        db.query(InventoryItem)
        .filter(
            InventoryItem.product_id == transaction_data.product_id,
            InventoryItem.company_id == current_user.company_id,
        )
        .first()
    )

    if not inventory:
        inventory = InventoryItem(
            product_id=transaction_data.product_id,
            company_id=current_user.company_id,
            quantity=0,
        )
        db.add(inventory)
        db.flush()

    # 创建库存流水（触发器会自动更新库存数量）
    transaction = InventoryTransaction(
        company_id=current_user.company_id,
        product_id=transaction_data.product_id,
        inventory_id=inventory.inventory_id,
        type=transaction_data.type.value,
        quantity=transaction_data.quantity,
        source_type=transaction_data.source_type.value,
        source_id=transaction_data.source_id,
        warehouse_location=transaction_data.warehouse_location,
        remark=transaction_data.remark,
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    trans_dict = InventoryTransactionResponse.from_orm(transaction).dict()
    # 确保quantity被序列化为数字而不是字符串
    if "quantity" in trans_dict and trans_dict["quantity"] is not None:
        trans_dict["quantity"] = float(trans_dict["quantity"])

    return success_response(
        data=trans_dict,
        message="库存流水创建成功",
    )


@router.get("/transactions", response_model=dict)
def get_inventory_transactions(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
    product_id: str = None,
    source_type: str = None,
    skip: int = 0,
    limit: int = 50,
):
    """获取库存流水列表"""
    from sqlalchemy.orm import joinedload

    query = (
        db.query(InventoryTransaction)
        .filter(InventoryTransaction.company_id == current_user.company_id)
        .options(joinedload(InventoryTransaction.product))
    )

    if product_id:
        query = query.filter(InventoryTransaction.product_id == product_id)
    if source_type:
        query = query.filter(InventoryTransaction.source_type == source_type)

    transactions = (
        query.order_by(InventoryTransaction.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    result = []
    for transaction in transactions:
        trans_dict = InventoryTransactionResponse.from_orm(transaction).dict()
        # 确保quantity被序列化为数字而不是字符串
        if "quantity" in trans_dict and trans_dict["quantity"] is not None:
            trans_dict["quantity"] = float(trans_dict["quantity"])
        if transaction.product:
            trans_dict["product_name"] = transaction.product.name
            trans_dict["product_sku"] = transaction.product.sku
        result.append(trans_dict)

    return success_response(data=result)


# 已移除按位置查询库存的API，系统简化为单一仓库模式
