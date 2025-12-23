"""标准会计科目相关数据模式"""

from typing import Optional
from pydantic import BaseModel, Field


class StandardAccountResponse(BaseModel):
    """标准会计科目响应"""

    seq_num: int
    code: str
    name: str
    type: str
    normal_balance: str
    category: str
    category_detail: str
    parent_code: Optional[str]
    level: int

    class Config:
        """Pydantic配置"""

        from_attributes = True

