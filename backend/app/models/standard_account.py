"""标准会计科目模型"""
from sqlalchemy import Column, String, Enum, Integer

from app.database import Base


class StandardAccount(Base):
    """标准会计科目表（国家标准，只读参考）"""
    
    __tablename__ = "standard_account"
    
    seq_num = Column(Integer, primary_key=True, comment="顺序号")
    code = Column(String(20), unique=True, nullable=False, comment="科目编码")
    name = Column(String(100), nullable=False, comment="科目名称")
    type = Column(
        Enum('Asset', 'Liability', 'Equity', 'Revenue', 'Expense', 'Common'),
        nullable=False,
        comment="科目类型"
    )
    normal_balance = Column(
        Enum('Debit', 'Credit'),
        nullable=False,
        comment="余额方向：借方/贷方"
    )
    category = Column(String(50), nullable=False, comment="科目类别（如：资产类、负债类）")
    category_detail = Column(String(50), nullable=False, comment="科目类别详情（如：流动资产、长期资产）")
    parent_code = Column(String(20), nullable=True, comment="父级科目编码")
    level = Column(Integer, nullable=False, comment="层级")
    
    def __repr__(self):
        return f"<StandardAccount {self.code} {self.name}>"

