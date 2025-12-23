"""会计分录相关数据模式"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


class LedgerLineCreate(BaseModel):
    account_id: str
    debit: Decimal = 0
    credit: Decimal = 0
    memo: str = ""


class LedgerLineResponse(BaseModel):
    line_id: str
    journal_id: str
    account_id: str
    debit: Decimal
    credit: Decimal
    memo: str = ""
    created_at: datetime

    class Config:
        """Pydantic配置"""

        from_attributes = True


class JournalEntryCreate(BaseModel):
    date: date
    description: str = ""
    source_type: Optional[str] = None  # 'PO', 'SO', 'PAYMENT', 'RECEIPT', 'MANUAL'
    source_id: Optional[str] = None
    lines: list[LedgerLineCreate]


class JournalEntryResponse(BaseModel):
    journal_id: str
    company_id: str
    date: date
    description: str = ""
    source_type: Optional[str] = None
    source_id: Optional[str] = None
    total_debit: Decimal
    total_credit: Decimal
    posted: bool = False
    posted_by: Optional[str] = None
    created_at: datetime
    lines: list[LedgerLineResponse] = []

    class Config:
        """Pydantic配置"""

        from_attributes = True


class JournalEntryPost(BaseModel):
    """过账请求"""

    posted_by: str
