"""商品管理路由"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.inventory import InventoryItem
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductResponse, ProductUpdate
from app.utils.auth import get_current_user
from app.utils.helpers import success_response

router = APIRouter(prefix="/products", tags=["商品管理"])


@router.post("", response_model=dict)
def create_product(
    product_data: ProductCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """创建商品"""
    # 检查 SKU 是否已存在（公司内）
    existing = (
        db.query(Product)
        .filter(
            Product.company_id == current_user.company_id,
            Product.sku == product_data.sku,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="SKU 已存在")

    product = Product(
        company_id=current_user.company_id,
        sku=product_data.sku,
        name=product_data.name,
        price=product_data.price,
        cost=product_data.cost,
    )
    db.add(product)
    db.commit()
    db.refresh(product)

    return success_response(
        data=ProductResponse.from_orm(product).dict(), message="商品创建成功"
    )


@router.get("", response_model=dict)
def get_products(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 20,
):
    """获取商品列表"""
    products = (
        db.query(Product)
        .filter(Product.company_id == current_user.company_id)
        .offset(skip)
        .limit(limit)
        .all()
    )

    # 获取每个商品的库存信息（加权平均成本）
    product_dicts = []
    for product in products:
        product_dict = ProductResponse.from_orm(product).dict()
        # 查询库存信息
        inventory = (
            db.query(InventoryItem)
            .filter(
                InventoryItem.product_id == product.product_id,
                InventoryItem.company_id == current_user.company_id,
            )
            .first()
        )
        if inventory:
            product_dict["average_cost"] = inventory.average_cost
        else:
            product_dict["average_cost"] = None
        product_dicts.append(product_dict)

    return success_response(data=product_dicts)


@router.get("/{product_id}", response_model=dict)
def get_product(
    product_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取商品详情"""
    product = (
        db.query(Product)
        .filter(
            Product.product_id == product_id,
            Product.company_id == current_user.company_id,
        )
        .first()
    )

    if not product:
        raise HTTPException(status_code=404, detail="商品不存在")

    product_dict = ProductResponse.from_orm(product).dict()
    # 查询库存信息（加权平均成本）
    inventory = (
        db.query(InventoryItem)
        .filter(
            InventoryItem.product_id == product.product_id,
            InventoryItem.company_id == current_user.company_id,
        )
        .first()
    )
    if inventory:
        product_dict["average_cost"] = inventory.average_cost
    else:
        product_dict["average_cost"] = None

    return success_response(data=product_dict)


@router.put("/{product_id}", response_model=dict)
def update_product(
    product_id: str,
    product_data: ProductUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """更新商品"""
    product = (
        db.query(Product)
        .filter(
            Product.product_id == product_id,
            Product.company_id == current_user.company_id,
        )
        .first()
    )

    if not product:
        raise HTTPException(status_code=404, detail="商品不存在")

    # 检查 SKU 是否冲突
    if product_data.sku and product_data.sku != product.sku:
        existing = (
            db.query(Product)
            .filter(
                Product.company_id == current_user.company_id,
                Product.sku == product_data.sku,
                Product.product_id != product_id,
            )
            .first()
        )
        if existing:
            raise HTTPException(status_code=400, detail="SKU 已存在")

    # 更新字段
    if product_data.sku is not None:
        product.sku = product_data.sku
    if product_data.name is not None:
        product.name = product_data.name
    if product_data.price is not None:
        product.price = product_data.price
    if product_data.cost is not None:
        product.cost = product_data.cost

    db.commit()
    db.refresh(product)

    return success_response(
        data=ProductResponse.from_orm(product).dict(), message="商品更新成功"
    )


@router.delete("/{product_id}", response_model=dict)
def delete_product(
    product_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """删除商品"""
    product = (
        db.query(Product)
        .filter(
            Product.product_id == product_id,
            Product.company_id == current_user.company_id,
        )
        .first()
    )

    if not product:
        raise HTTPException(status_code=404, detail="商品不存在")

    db.delete(product)
    db.commit()

    return success_response(message="商品删除成功")
