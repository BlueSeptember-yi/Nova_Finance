"""供应商管理路由"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.supplier import Supplier
from app.schemas.supplier import SupplierCreate, SupplierUpdate, SupplierResponse
from app.utils.auth import get_current_user, require_permission
from app.utils.helpers import success_response

router = APIRouter(prefix="/suppliers", tags=["供应商管理"])


@router.post("", response_model=dict)
def create_supplier(
    supplier_data: SupplierCreate,
    current_user = Depends(require_permission("supplier:create")),
    db: Session = Depends(get_db)
):
    """新增供应商 (UC-004-1)"""
    
    # 检查名称是否重复
    existing = db.query(Supplier).filter(
        Supplier.name == supplier_data.name,
        Supplier.company_id == current_user.company_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="供应商名称已存在")
    
    # 创建供应商
    supplier = Supplier(
        company_id=current_user.company_id,
        name=supplier_data.name,
        contact=supplier_data.contact,
        phone=supplier_data.phone,
        address=supplier_data.address,
        bank_account=supplier_data.bank_account,
        remark=supplier_data.remark
    )
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    
    return success_response(
        data=SupplierResponse.from_orm(supplier).dict(),
        message="供应商创建成功"
    )


@router.get("", response_model=dict)
def get_suppliers(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 50
):
    """获取供应商列表"""
    suppliers = db.query(Supplier).filter(
        Supplier.company_id == current_user.company_id
    ).offset(skip).limit(limit).all()
    
    return success_response(
        data=[SupplierResponse.from_orm(s).dict() for s in suppliers]
    )


@router.get("/{supplier_id}", response_model=dict)
def get_supplier(
    supplier_id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取供应商详情"""
    supplier = db.query(Supplier).filter(
        Supplier.supplier_id == supplier_id,
        Supplier.company_id == current_user.company_id
    ).first()
    
    if not supplier:
        raise HTTPException(status_code=404, detail="供应商不存在")
    
    return success_response(data=SupplierResponse.from_orm(supplier).dict())


@router.put("/{supplier_id}", response_model=dict)
def update_supplier(
    supplier_id: str,
    supplier_data: SupplierUpdate,
    current_user = Depends(require_permission("supplier:update")),
    db: Session = Depends(get_db)
):
    """修改供应商 (UC-004-2)"""
    supplier = db.query(Supplier).filter(
        Supplier.supplier_id == supplier_id,
        Supplier.company_id == current_user.company_id
    ).first()
    
    if not supplier:
        raise HTTPException(status_code=404, detail="供应商不存在")
    
    # 更新字段（供应商名称锁定，不能修改）
    update_data = supplier_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        if hasattr(supplier, key):
            setattr(supplier, key, value)
    
    db.commit()
    db.refresh(supplier)
    
    return success_response(
        data=SupplierResponse.from_orm(supplier).dict(),
        message="供应商更新成功"
    )


@router.delete("/{supplier_id}", response_model=dict)
def delete_supplier(
    supplier_id: str,
    current_user = Depends(require_permission("supplier:delete")),
    db: Session = Depends(get_db)
):
    """删除供应商 (UC-004-3)"""
    supplier = db.query(Supplier).filter(
        Supplier.supplier_id == supplier_id,
        Supplier.company_id == current_user.company_id
    ).first()
    
    if not supplier:
        raise HTTPException(status_code=404, detail="供应商不存在")
    
    # TODO: 检查是否有未结清应付账款
    # TODO: 检查是否有未完成的采购订单
    
    db.delete(supplier)
    db.commit()
    
    return success_response(message="供应商删除成功")

