"""标准会计科目路由"""

from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models.standard_account import StandardAccount
from app.schemas.standard_account import StandardAccountResponse
from app.utils.auth import get_current_user
from app.utils.helpers import success_response

router = APIRouter(prefix="/standard-accounts", tags=["标准会计科目"])


@router.get("", response_model=dict)
def get_standard_accounts(
    type: Optional[str] = Query(None, description="科目类型"),
    level: Optional[int] = Query(None, description="层级（1表示一级科目）"),
    parent_code: Optional[str] = Query(None, description="父级科目编码"),
    search: Optional[str] = Query(None, description="搜索关键词（科目编码或名称）"),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """查询标准会计科目
    
    支持以下查询方式：
    - 按类型查询一级科目：type=Asset&level=1
    - 按父级查询子科目：parent_code=1001
    - 模糊搜索：search=现金
    """
    query = db.query(StandardAccount)
    
    # 按类型筛选
    if type:
        query = query.filter(StandardAccount.type == type)
    
    # 按层级筛选
    if level is not None:
        query = query.filter(StandardAccount.level == level)
    
    # 按父级科目编码筛选
    if parent_code:
        query = query.filter(StandardAccount.parent_code == parent_code)
    
    # 模糊搜索（科目编码或名称）
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                StandardAccount.code.like(search_pattern),
                StandardAccount.name.like(search_pattern)
            )
        )
    
    # 按顺序号排序
    query = query.order_by(StandardAccount.seq_num)
    
    accounts = query.all()
    
    return success_response(
        data=[StandardAccountResponse.from_orm(acc).dict() for acc in accounts]
    )

