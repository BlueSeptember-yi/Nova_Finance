"""辅助工具函数"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict


def get_beijing_time() -> datetime:
    """获取北京标准时间（UTC+8）"""
    beijing_tz = timezone(timedelta(hours=8))
    return datetime.now(beijing_tz).replace(tzinfo=None)


def success_response(data: Any = None, message: str = "操作成功") -> Dict:
    """成功响应格式"""
    return {"success": True, "data": data, "message": message, "code": 200}


def error_response(message: str, code: int = 400) -> Dict:
    """错误响应格式"""
    return {"success": False, "data": None, "message": message, "code": code}


def validate_journal_balance(total_debit: float, total_credit: float) -> bool:
    """验证借贷平衡"""
    return abs(total_debit - total_credit) < 0.01  # 允许0.01的误差
