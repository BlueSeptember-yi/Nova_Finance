# 财务管理系统数据库架构文档

##  目录

1. [概述](#概述)
2. [数据库ER模型](#数据库er模型)
3. [基础表](#基础表)
4. [业务表](#业务表)
5. [库存表](#库存表)
6. [银行和对账表](#银行和对账表)
7. [表关系图](#表关系图)
8. [索引和约束](#索引和约束)
9. [触发器说明](#触发器说明)
10. [数据迁移](#数据迁移)

---

## 数据库ER模型

### 核心实体关系图

```
Company (公司)
├── User (用户) - 1:N, (company_id, username) 复合唯一
├── Account (会计科目) - 1:N, (company_id, code) 复合唯一
├── Supplier (供应商) - 1:N
├── Customer (客户) - 1:N
├── Product (商品) - 1:N
├── Payment (付款) - 1:N
├── Receipt (收款) - 1:N
└── BankAccount (银行账户) - 1:N

StandardAccount (标准会计科目)
└── 独立表，存储国家标准的会计科目参考数据

Account (会计科目)
├── normal_balance (余额方向: Debit/Credit)
├── balance_debit (借方余额缓存)
├── balance_credit (贷方余额缓存)
└── path (层级路径, company内唯一)

JournalEntry (分录)
├── source_type (业务来源: PO/SO/PAYMENT/RECEIPT/MANUAL)
├── source_id (业务来源ID)
├── total_debit = total_credit (借贷平衡约束)
└── LedgerLine (分录明细) - 1:N

PurchaseOrder (采购订单)
├── total_amount (自动计算: SUM(items.subtotal))
└── PurchaseOrderItem (采购明细) - 1:N

SalesOrder (销售订单)
├── total_amount (自动计算: SUM(items.subtotal))
└── SalesOrderItem (销售明细) - 1:N

Payment (付款)
├── company_id (新增)
└── purchase_order_id (FK → PurchaseOrder)

Receipt (收款)
├── company_id (新增)
└── sales_order_id (FK → SalesOrder)

InventoryItem (库存)
└── InventoryTransaction (库存流水) - 1:N
    ├── type (IN/OUT)
    └── source_type (PO/SO/Manual/Adjustment)

BankAccount (银行账户)
└── BankStatement (银行流水) - 1:N

BankStatement (银行流水)
└── Reconciliation (对账) - 1:N

JournalEntry (分录)
└── Reconciliation (对账) - 1:N
```

### 关键关系说明

1. **公司隔离**：所有业务表都包含 `company_id`，实现多租户隔离
2. **复合唯一性**：
   - `(company_id, code)` - 会计科目编码
   - `(company_id, username)` - 用户名
   - `(company_id, path)` - 科目路径
3. **业务来源追踪**：`JournalEntry` 通过 `source_type` 和 `source_id` 关联业务单据
4. **库存流水驱动**：`InventoryItem.quantity` 由 `InventoryTransaction` 汇总计算
5. **订单总金额自动计算**：通过数据库触发器或ORM事件自动更新

---

## 概述

本数据库包含 **16张核心表**，支持多公司（多租户）架构，所有业务表都通过 `company_id` 实现数据隔离。

### 表分类统计

| 分类 | 表数量 | 表名 |
|------|--------|------|
| 基础表 | 6 | company, user, account, standard_account, journal_entry, ledger_line |
| 业务表 | 8 | supplier, customer, product, purchase_order, purchase_order_item, sales_order, sales_order_item, payment, receipt |
| 库存表 | 2 | inventory_item, inventory_transaction |
| 银行和对账表 | 3 | bank_account, bank_statement, reconciliation |
| **总计** | **16** | - |

---

## 基础表

### 1. company（公司表）

存储公司/企业基本信息，是所有业务数据的根节点。

| 字段名 | 数据类型 | 约束 | 默认值 | 说明 |
|--------|----------|------|--------|------|
| company_id | CHAR(36) | PRIMARY KEY | - | 公司ID（UUID） |
| name | VARCHAR(100) | NOT NULL | - | 公司名称 |
| size | ENUM('Small', 'Medium', 'Large') | - | NULL | 企业规模 |
| registered_capital | DECIMAL(18, 2) | - | NULL | 注册资本 |
| created_at | DATETIME | - | CURRENT_TIMESTAMP | 创建时间 |

**索引：**
- PRIMARY KEY: `company_id`

---

### 2. user（用户表）

存储系统用户信息，支持多公司环境。

| 字段名 | 数据类型 | 约束 | 默认值 | 说明 |
|--------|----------|------|--------|------|
| user_id | CHAR(36) | PRIMARY KEY | - | 用户ID（UUID） |
| company_id | CHAR(36) | NOT NULL, FK → company | - | 所属公司 |
| username | VARCHAR(50) | NOT NULL | - | 登录名（公司内唯一） |
| email | VARCHAR(100) | - | NULL | 邮箱（用于登录和找回密码） |
| password_hash | VARCHAR(255) | NOT NULL | - | 加密密码 |
| role | ENUM('Owner', 'Accountant', 'Sales', 'Purchaser') | NOT NULL | - | 用户角色 |
| created_at | DATETIME | - | CURRENT_TIMESTAMP | 创建时间 |

**索引：**
- PRIMARY KEY: `user_id`
- UNIQUE: `(company_id, username)` - 确保公司内用户名唯一
- FOREIGN KEY: `company_id` → `company(company_id)` ON DELETE CASCADE

**说明：**
- `username` 在公司内唯一，不同公司可以有相同的用户名
- `email` 字段用于登录和密码找回功能

---

### 3. account（会计科目表）

存储会计科目信息，支持层级结构。

| 字段名 | 数据类型 | 约束 | 默认值 | 说明 |
|--------|----------|------|--------|------|
| account_id | CHAR(36) | PRIMARY KEY | - | 科目ID（UUID） |
| company_id | CHAR(36) | NOT NULL, FK → company | - | 所属公司 |
| parent_id | CHAR(36) | FK → account | NULL | 父级科目ID（自引用） |
| code | VARCHAR(20) | NOT NULL | - | 科目编码（公司内唯一） |
| name | VARCHAR(100) | NOT NULL | - | 科目名称 |
| type | ENUM('Asset', 'Liability', 'Equity', 'Revenue', 'Expense', 'Common') | NOT NULL | - | 科目类型 |
| normal_balance | ENUM('Debit', 'Credit') | NOT NULL | - | 余额方向（借方/贷方） |
| balance_debit | DECIMAL(18, 2) | - | 0 | 借方余额（实时缓存） |
| balance_credit | DECIMAL(18, 2) | - | 0 | 贷方余额（实时缓存） |
| is_core | BOOLEAN | - | FALSE | 是否核心科目 |
| path | VARCHAR(255) | - | NULL | 层级路径（公司内唯一） |
| remark | VARCHAR(255) | - | NULL | 备注 |
| created_at | DATETIME | - | CURRENT_TIMESTAMP | 创建时间 |

**索引：**
- PRIMARY KEY: `account_id`
- UNIQUE: `(company_id, code)` - 确保公司内科目编码唯一
- UNIQUE: `(company_id, path)` - 确保公司内路径唯一
- FOREIGN KEY: `company_id` → `company(company_id)` ON DELETE CASCADE
- FOREIGN KEY: `parent_id` → `account(account_id)` ON DELETE SET NULL

**说明：**
- `normal_balance` 用于自动判断余额方向
- `balance_debit` 和 `balance_credit` 是实时缓存字段，由触发器自动更新
- `path` 字段用于快速查询科目层级关系
- `type` 字段支持 `Common` 类型，用于符合国家会计标准的通用科目

---

### 4. standard_account（标准会计科目表）

存储国家标准的会计科目信息，作为参考数据，通常为只读。

| 字段名 | 数据类型 | 约束 | 默认值 | 说明 |
|--------|----------|------|--------|------|
| code | VARCHAR(20) | UNIQUE | - | 科目编码 |
| name | VARCHAR(100) | NOT NULL | - | 科目名称 |
| type | ENUM('Asset', 'Liability', 'Equity', 'Revenue', 'Expense', 'Common') | NOT NULL | - | 科目类型 |
| normal_balance | ENUM('Debit', 'Credit') | NOT NULL | - | 余额方向（借方/贷方） |
| category | VARCHAR(50) | NOT NULL | - | 科目类别（如：资产类、负债类） |
| category_detail | VARCHAR(50) | NOT NULL | - | 科目类别详情（如：流动资产、长期资产） |
| parent_code | VARCHAR(20) | - | NULL | 父级科目编码 |
| seq_num | INT | PRIMARY KEY | - | 顺序号 |
| level | INT | NOT NULL | - | 层级 |

**索引：**
- PRIMARY KEY: `seq_num` - 顺序号作为主键
- UNIQUE: `code` - 确保科目编码唯一
- INDEX: `type` - 按类型查询
- INDEX: `parent_code` - 按父级查询

**说明：**
- 此表存储国家标准的会计科目，作为参考数据
- 通常为只读，用于指导企业创建自己的会计科目
- `type` 字段支持 `Common` 类型，符合国家会计标准
- 通过 `parent_code` 实现层级结构
- `seq_num` 作为主键，用于排序和唯一标识

---

### 5. journal_entry（分录表）

存储会计分录主表，记录每笔业务的分录信息。

| 字段名 | 数据类型 | 约束 | 默认值 | 说明 |
|--------|----------|------|--------|------|
| journal_id | CHAR(36) | PRIMARY KEY | - | 分录ID（UUID） |
| company_id | CHAR(36) | NOT NULL, FK → company | - | 所属公司 |
| date | DATE | NOT NULL | - | 记账日期 |
| description | VARCHAR(255) | - | NULL | 摘要 |
| source_type | ENUM('PO', 'SO', 'PAYMENT', 'RECEIPT', 'MANUAL') | - | NULL | 业务来源类型 |
| source_id | CHAR(36) | - | NULL | 业务来源ID |
| total_debit | DECIMAL(18, 2) | - | 0 | 借方合计（触发器维护） |
| total_credit | DECIMAL(18, 2) | - | 0 | 贷方合计（触发器维护） |
| posted | BOOLEAN | - | FALSE | 是否已过账 |
| posted_by | CHAR(36) | FK → user | NULL | 过账人 |
| created_at | DATETIME | - | CURRENT_TIMESTAMP | 创建时间 |

**索引：**
- PRIMARY KEY: `journal_id`
- FOREIGN KEY: `company_id` → `company(company_id)` ON DELETE CASCADE
- FOREIGN KEY: `posted_by` → `user(user_id)`

**说明：**
- `source_type` 和 `source_id` 用于关联业务单据（采购单、销售单、付款、收款等）
- `total_debit` 和 `total_credit` 由触发器自动维护，无需手动设置
- `posted` 字段控制分录是否已过账，过账前会自动校验借贷平衡
- `posted_by` 在过账时必须设置，过账前为 NULL

---

### 6. ledger_line（分录明细表）

存储分录的明细行，每行对应一个会计科目。

| 字段名 | 数据类型 | 约束 | 默认值 | 说明 |
|--------|----------|------|--------|------|
| line_id | CHAR(36) | PRIMARY KEY | - | 明细行ID（UUID） |
| journal_id | CHAR(36) | NOT NULL, FK → journal_entry | - | 所属分录 |
| account_id | CHAR(36) | NOT NULL, FK → account | - | 对应科目 |
| debit | DECIMAL(18, 2) | - | 0 | 借方金额 |
| credit | DECIMAL(18, 2) | - | 0 | 贷方金额 |
| memo | VARCHAR(255) | - | NULL | 备注 |
| created_at | DATETIME | - | CURRENT_TIMESTAMP | 创建时间 |

**索引：**
- PRIMARY KEY: `line_id`
- FOREIGN KEY: `journal_id` → `journal_entry(journal_id)` ON DELETE CASCADE
- FOREIGN KEY: `account_id` → `account(account_id)`

**说明：**
- 每行必须至少有一个 `debit` 或 `credit` 不为0
- 插入/更新时会自动更新对应科目的余额

---

## 业务表

### 7. supplier（供应商表）

存储供应商信息。

| 字段名 | 数据类型 | 约束 | 默认值 | 说明 |
|--------|----------|------|--------|------|
| supplier_id | CHAR(36) | PRIMARY KEY | - | 供应商ID（UUID） |
| company_id | CHAR(36) | NOT NULL, FK → company | - | 所属公司 |
| name | VARCHAR(100) | NOT NULL | - | 供应商名称 |
| contact | VARCHAR(100) | - | NULL | 联系人 |
| phone | VARCHAR(20) | - | NULL | 电话 |
| email | VARCHAR(100) | - | NULL | 邮箱 |
| address | VARCHAR(255) | - | NULL | 地址 |
| tax_no | VARCHAR(50) | - | NULL | 税号 |
| bank_account | VARCHAR(50) | - | NULL | 银行账户 |
| remark | TEXT | - | NULL | 备注 |
| created_at | DATETIME | - | CURRENT_TIMESTAMP | 创建时间 |

**索引：**
- PRIMARY KEY: `supplier_id`
- FOREIGN KEY: `company_id` → `company(company_id)` ON DELETE CASCADE

---

### 8. customer（客户表）

存储客户信息。

| 字段名 | 数据类型 | 约束 | 默认值 | 说明 |
|--------|----------|------|--------|------|
| customer_id | CHAR(36) | PRIMARY KEY | - | 客户ID（UUID） |
| company_id | CHAR(36) | NOT NULL, FK → company | - | 所属公司 |
| name | VARCHAR(100) | NOT NULL | - | 客户名称 |
| phone | VARCHAR(20) | - | NULL | 电话 |
| email | VARCHAR(100) | - | NULL | 邮箱 |
| address | VARCHAR(255) | - | NULL | 地址 |
| tax_no | VARCHAR(50) | - | NULL | 税号 |
| credit_limit | DECIMAL(18, 2) | - | 0 | 信用额度 |
| remark | TEXT | - | NULL | 备注 |
| created_at | DATETIME | - | CURRENT_TIMESTAMP | 创建时间 |

**索引：**
- PRIMARY KEY: `customer_id`
- FOREIGN KEY: `company_id` → `company(company_id)` ON DELETE CASCADE

---

### 9. product（商品表）

存储商品/产品信息。

| 字段名 | 数据类型 | 约束 | 默认值 | 说明 |
|--------|----------|------|--------|------|
| product_id | CHAR(36) | PRIMARY KEY | - | 商品ID（UUID） |
| company_id | CHAR(36) | NOT NULL, FK → company | - | 所属公司 |
| sku | VARCHAR(50) | NOT NULL | - | SKU编码（公司内唯一，格式：2位字母+3位数字） |
| name | VARCHAR(100) | NOT NULL | - | 商品名称 |
| price | DECIMAL(18, 2) | - | NULL | 销售价 |
| cost | DECIMAL(18, 2) | - | NULL | 成本价 |
| created_at | DATETIME | - | CURRENT_TIMESTAMP | 创建时间 |

**索引：**
- PRIMARY KEY: `product_id`
- UNIQUE: `(company_id, sku)` - 确保公司内SKU编码唯一
- FOREIGN KEY: `company_id` → `company(company_id)` ON DELETE CASCADE

---

### 10. purchase_order（采购订单表）

存储采购订单主表。

| 字段名 | 数据类型 | 约束 | 默认值 | 说明 |
|--------|----------|------|--------|------|
| po_id | CHAR(36) | PRIMARY KEY | - | 采购订单ID（UUID） |
| supplier_id | CHAR(36) | NOT NULL, FK → supplier | - | 供应商 |
| company_id | CHAR(36) | NOT NULL, FK → company | - | 所属公司 |
| date | DATE | NOT NULL | - | 下单日期 |
| expected_delivery_date | DATE | - | NULL | 预计交货日期 |
| total_amount | DECIMAL(18, 2) | - | 0 | 总金额（自动计算） |
| status | ENUM('Draft', 'Posted', 'Paid') | - | 'Draft' | 状态 |
| remark | TEXT | - | NULL | 备注 |
| created_at | DATETIME | - | CURRENT_TIMESTAMP | 创建时间 |

**索引：**
- PRIMARY KEY: `po_id`
- FOREIGN KEY: `supplier_id` → `supplier(supplier_id)`
- FOREIGN KEY: `company_id` → `company(company_id)` ON DELETE CASCADE

**说明：**
- `total_amount` 由触发器自动计算：`SUM(purchase_order_item.subtotal)`

---

### 11. purchase_order_item（采购订单明细表）

存储采购订单的明细行。

| 字段名 | 数据类型 | 约束 | 默认值 | 说明 |
|--------|----------|------|--------|------|
| item_id | CHAR(36) | PRIMARY KEY | - | 明细行ID（UUID） |
| purchase_order_id | CHAR(36) | NOT NULL, FK → purchase_order | - | 采购订单ID |
| product_id | CHAR(36) | FK → product | NULL | 商品ID |
| product_name | VARCHAR(100) | NOT NULL | - | 商品名称 |
| quantity | DECIMAL(18, 2) | NOT NULL | - | 数量 |
| unit_price | DECIMAL(18, 2) | NOT NULL | - | 单价 |
| discount_rate | DECIMAL(5, 4) | - | 1.0 | 折扣率 |
| subtotal | DECIMAL(18, 2) | NOT NULL | - | 小计（quantity × unit_price × discount_rate） |

**索引：**
- PRIMARY KEY: `item_id`
- FOREIGN KEY: `purchase_order_id` → `purchase_order(po_id)` ON DELETE CASCADE
- FOREIGN KEY: `product_id` → `product(product_id)`

**说明：**
- `subtotal` 应该等于 `quantity × unit_price × discount_rate`
- 插入/更新/删除时会自动触发更新采购订单的 `total_amount`

---

### 12. sales_order（销售订单表）

存储销售订单主表。

| 字段名 | 数据类型 | 约束 | 默认值 | 说明 |
|--------|----------|------|--------|------|
| so_id | CHAR(36) | PRIMARY KEY | - | 销售订单ID（UUID） |
| customer_id | CHAR(36) | NOT NULL, FK → customer | - | 客户 |
| company_id | CHAR(36) | NOT NULL, FK → company | - | 所属公司 |
| date | DATE | NOT NULL | - | 销售日期 |
| expected_delivery_date | DATE | - | NULL | 预计出库日期 |
| total_amount | DECIMAL(18, 2) | - | 0 | 总金额（自动计算） |
| payment_method | ENUM('Cash', 'Bank', 'Credit') | - | NULL | 收款方式 |
| status | ENUM('Draft', 'Posted', 'Collected') | - | 'Draft' | 状态 |
| remark | TEXT | - | NULL | 备注 |
| created_at | DATETIME | - | CURRENT_TIMESTAMP | 创建时间 |

**索引：**
- PRIMARY KEY: `so_id`
- FOREIGN KEY: `customer_id` → `customer(customer_id)`
- FOREIGN KEY: `company_id` → `company(company_id)` ON DELETE CASCADE

**说明：**
- `total_amount` 由触发器自动计算：`SUM(sales_order_item.subtotal)`

---

### 13. sales_order_item（销售订单明细表）

存储销售订单的明细行。

| 字段名 | 数据类型 | 约束 | 默认值 | 说明 |
|--------|----------|------|--------|------|
| item_id | CHAR(36) | PRIMARY KEY | - | 明细行ID（UUID） |
| sales_order_id | CHAR(36) | NOT NULL, FK → sales_order | - | 销售订单ID |
| product_id | CHAR(36) | FK → product | NULL | 商品ID |
| product_name | VARCHAR(100) | NOT NULL | - | 商品名称 |
| quantity | DECIMAL(18, 2) | NOT NULL | - | 数量 |
| unit_price | DECIMAL(18, 2) | NOT NULL | - | 单价 |
| discount_rate | DECIMAL(5, 4) | - | 1.0 | 折扣率 |
| subtotal | DECIMAL(18, 2) | NOT NULL | - | 小计（quantity × unit_price × discount_rate） |

**索引：**
- PRIMARY KEY: `item_id`
- FOREIGN KEY: `sales_order_id` → `sales_order(so_id)` ON DELETE CASCADE
- FOREIGN KEY: `product_id` → `product(product_id)`

**说明：**
- `subtotal` 应该等于 `quantity × unit_price × discount_rate`
- 插入/更新/删除时会自动触发更新销售订单的 `total_amount`

---

### 14. payment（付款表）

存储付款记录。

| 字段名 | 数据类型 | 约束 | 默认值 | 说明 |
|--------|----------|------|--------|------|
| payment_id | CHAR(36) | PRIMARY KEY | - | 付款ID（UUID） |
| company_id | CHAR(36) | NOT NULL, FK → company | - | 所属公司 |
| purchase_order_id | CHAR(36) | FK → purchase_order | NULL | 对应采购单ID |
| date | DATE | NOT NULL | - | 付款日期 |
| amount | DECIMAL(18, 2) | NOT NULL | - | 金额 |
| payment_method | ENUM('Cash', 'Bank', 'Transfer') | NOT NULL | - | 付款方式 |
| remark | VARCHAR(255) | - | NULL | 备注 |
| created_at | DATETIME | - | CURRENT_TIMESTAMP | 创建时间 |

**索引：**
- PRIMARY KEY: `payment_id`
- FOREIGN KEY: `company_id` → `company(company_id)` ON DELETE CASCADE
- FOREIGN KEY: `purchase_order_id` → `purchase_order(po_id)`

**说明：**
- 付款可以关联采购订单，也可以独立存在

---

### 15. receipt（收款表）

存储收款记录。

| 字段名 | 数据类型 | 约束 | 默认值 | 说明 |
|--------|----------|------|--------|------|
| receipt_id | CHAR(36) | PRIMARY KEY | - | 收款ID（UUID） |
| company_id | CHAR(36) | NOT NULL, FK → company | - | 所属公司 |
| sales_order_id | CHAR(36) | FK → sales_order | NULL | 对应销售单ID |
| date | DATE | NOT NULL | - | 收款日期 |
| amount | DECIMAL(18, 2) | NOT NULL | - | 金额 |
| method | ENUM('Cash', 'Bank', 'Transfer') | NOT NULL | - | 收款方式 |
| remark | VARCHAR(255) | - | NULL | 备注 |
| created_at | DATETIME | - | CURRENT_TIMESTAMP | 创建时间 |

**索引：**
- PRIMARY KEY: `receipt_id`
- FOREIGN KEY: `company_id` → `company(company_id)` ON DELETE CASCADE
- FOREIGN KEY: `sales_order_id` → `sales_order(so_id)`

**说明：**
- 收款可以关联销售订单，也可以独立存在

---

## 库存表

### 16. inventory_item（库存记录表）

存储商品的实时库存快照。

| 字段名 | 数据类型 | 约束 | 默认值 | 说明 |
|--------|----------|------|--------|------|
| inventory_id | CHAR(36) | PRIMARY KEY | - | 库存ID（UUID） |
| product_id | CHAR(36) | NOT NULL, FK → product | - | 商品 |
| company_id | CHAR(36) | NOT NULL, FK → company | - | 公司 |
| quantity | DECIMAL(18, 2) | - | 0 | 数量（由流水汇总） |
| average_cost | DECIMAL(18, 2) | - | 0 | 加权平均成本 |
| updated_at | DATETIME | - | CURRENT_TIMESTAMP ON UPDATE | 更新时间 |

**索引：**
- PRIMARY KEY: `inventory_id`
- UNIQUE: `(product_id, company_id)` - 确保每个公司的每个商品只有一条库存记录
- FOREIGN KEY: `product_id` → `product(product_id)` ON DELETE CASCADE
- FOREIGN KEY: `company_id` → `company(company_id)` ON DELETE CASCADE

**说明：**
- `quantity` 是缓存字段，由触发器根据 `inventory_transaction` 自动计算
- `average_cost` 是加权平均成本，在每次采购入库时自动计算更新
- 加权平均成本公式：新平均成本 = (旧库存数量 × 旧平均成本 + 新入库数量 × 新采购单价) / (旧库存数量 + 新入库数量)
- 所有库存变化必须通过 `inventory_transaction` 记录
- 仓库位置存储在 `inventory_transaction` 表中，支持同一商品存放在多个不同位置

---

### 17. inventory_transaction（库存流水表）

存储所有库存变化流水记录。

| 字段名 | 数据类型 | 约束 | 默认值 | 说明 |
|--------|----------|------|--------|------|
| transaction_id | CHAR(36) | PRIMARY KEY | - | 流水ID（UUID） |
| company_id | CHAR(36) | NOT NULL, FK → company | - | 公司 |
| product_id | CHAR(36) | NOT NULL, FK → product | - | 商品 |
| inventory_id | CHAR(36) | FK → inventory_item | NULL | 库存记录ID |
| type | ENUM('IN', 'OUT') | NOT NULL | - | 类型：入库/出库 |
| quantity | DECIMAL(18, 2) | NOT NULL | - | 数量（入库为正，出库为负） |
| unit_cost | DECIMAL(18, 2) | - | NULL | 单位成本（入库时记录采购成本，出库时记录加权平均成本） |
| source_type | ENUM('PO', 'SO', 'Manual', 'Adjustment') | NOT NULL | - | 来源类型 |
| source_id | CHAR(36) | - | NULL | 来源ID（如订单ID） |
| warehouse_location | VARCHAR(100) | - | NULL | 仓库位置（每个流水记录的位置） |
| remark | VARCHAR(255) | - | NULL | 备注 |
| created_at | DATETIME | - | CURRENT_TIMESTAMP | 创建时间 |

**索引：**
- PRIMARY KEY: `transaction_id`
- FOREIGN KEY: `company_id` → `company(company_id)` ON DELETE CASCADE
- FOREIGN KEY: `product_id` → `product(product_id)`
- FOREIGN KEY: `inventory_id` → `inventory_item(inventory_id)`

**说明：**
- 所有库存变化必须通过此表记录，不能直接修改 `inventory_item.quantity`
- `unit_cost` 记录每次入库/出库的单位成本：
  - 入库时：记录本次采购的实际单价（考虑折扣后的价格）
  - 出库时：记录出库时的加权平均成本（用于销售成本计算）
- `source_type` 说明库存变化的来源：采购单、销售单、手工录入、调整
- `warehouse_location` 记录每次入库/出库的仓库位置，支持同一商品存放在多个不同位置
- 插入新流水时会自动更新对应商品的库存数量和加权平均成本

---

## 银行和对账表

### 18. bank_account（银行账户表）

存储银行账户信息。

| 字段名 | 数据类型 | 约束 | 默认值 | 说明 |
|--------|----------|------|--------|------|
| bank_account_id | CHAR(36) | PRIMARY KEY | - | 银行账户ID（UUID） |
| company_id | CHAR(36) | NOT NULL, FK → company | - | 所属公司 |
| account_number | VARCHAR(50) | NOT NULL | - | 银行账号 |
| bank_name | VARCHAR(100) | NOT NULL | - | 银行名称 |
| currency | VARCHAR(10) | - | 'CNY' | 币种 |
| initial_balance | DECIMAL(18,2) | - | 0 | 初始余额 |
| remark | VARCHAR(255) | - | NULL | 备注 |
| created_at | DATETIME | - | CURRENT_TIMESTAMP | 创建时间 |

**索引：**
- PRIMARY KEY: `bank_account_id`
- UNIQUE: `(company_id, account_number)` - 确保公司内银行账号唯一
- FOREIGN KEY: `company_id` → `company(company_id)` ON DELETE CASCADE

---

### 19. bank_statement（银行流水表）

存储银行交易流水记录。

| 字段名 | 数据类型 | 约束 | 默认值 | 说明 |
|--------|----------|------|--------|------|
| statement_id | CHAR(36) | PRIMARY KEY | - | 银行流水ID（UUID） |
| company_id | CHAR(36) | NOT NULL, FK → company | - | 公司 |
| bank_account_id | CHAR(36) | NOT NULL, FK → bank_account | - | 银行账户 |
| date | DATE | NOT NULL | - | 交易日期 |
| amount | DECIMAL(18, 2) | NOT NULL | - | 金额 |
| type | ENUM('Credit', 'Debit') | NOT NULL | - | 类型：收入/支出 |
| balance | DECIMAL(18, 2) | - | NULL | 当前余额 |
| description | VARCHAR(255) | - | NULL | 摘要 |
| is_reconciled | BOOLEAN | - | FALSE | 是否已对账 |
| created_at | DATETIME | - | CURRENT_TIMESTAMP | 创建时间 |

**索引：**
- PRIMARY KEY: `statement_id`
- FOREIGN KEY: `company_id` → `company(company_id)` ON DELETE CASCADE
- FOREIGN KEY: `bank_account_id` → `bank_account(bank_account_id)` ON DELETE CASCADE

**说明：**
- 银行流水必须关联到具体的银行账户
- `is_reconciled` 字段标识该银行流水是否已与系统分录完成对账匹配
- 当创建对账记录时，系统会自动将该字段更新为 `TRUE`
- 当删除对账记录且该流水没有其他对账记录时，系统会自动将该字段更新为 `FALSE`

---

### 20. reconciliation（对账表）

存储银行流水与分录的匹配关系，实现银行对账功能。

| 字段名 | 数据类型 | 约束 | 默认值 | 说明 |
|--------|----------|------|--------|------|
| recon_id | CHAR(36) | PRIMARY KEY | - | 对账ID（UUID） |
| company_id | CHAR(36) | NOT NULL, FK → company | - | 公司 |
| bank_statement_id | CHAR(36) | NOT NULL, FK → bank_statement | - | 银行流水ID |
| journal_id | CHAR(36) | NOT NULL, FK → journal_entry | - | 匹配的分录ID |
| matched_amount | DECIMAL(18, 2) | NOT NULL | - | 匹配金额 |
| match_date | DATE | NOT NULL | - | 匹配日期 |
| remark | VARCHAR(255) | - | NULL | 备注 |
| created_at | DATETIME | - | CURRENT_TIMESTAMP | 创建时间 |

**索引：**
- PRIMARY KEY: `recon_id`
- FOREIGN KEY: `company_id` → `company(company_id)` ON DELETE CASCADE
- FOREIGN KEY: `bank_statement_id` → `bank_statement(statement_id)` ON DELETE CASCADE
- FOREIGN KEY: `journal_id` → `journal_entry(journal_id)` ON DELETE CASCADE

**说明：**
- 记录银行流水与系统分录的匹配关系
- 一个银行流水对应一个分录（一对一关系）
- `matched_amount` 记录匹配的金额
- 系统支持自动匹配：金额相同（允许0.01误差）、方向一致、日期相近（±3天）
- 系统自动筛选与银行存款科目（1002）及其子科目相关的分录进行匹配

---

## 表关系图

### 核心关系

```
company (公司)
├── user (用户) - 1:N
├── account (会计科目) - 1:N
├── supplier (供应商) - 1:N
├── customer (客户) - 1:N
├── product (商品) - 1:N
├── payment (付款) - 1:N
├── receipt (收款) - 1:N
└── bank_account (银行账户) - 1:N

account (会计科目)
├── account (父级科目) - 自引用 1:N
└── ledger_line (分录明细) - 1:N

journal_entry (分录)
├── user (过账人) - N:1
├── ledger_line (分录明细) - 1:N
└── reconciliation (对账) - 1:N

supplier (供应商)
└── purchase_order (采购订单) - 1:N

customer (客户)
└── sales_order (销售订单) - 1:N

purchase_order (采购订单)
├── purchase_order_item (采购明细) - 1:N
└── payment (付款) - 1:N

sales_order (销售订单)
├── sales_order_item (销售明细) - 1:N
└── receipt (收款) - 1:N

product (商品)
├── purchase_order_item (采购明细) - 1:N
├── sales_order_item (销售明细) - 1:N
└── inventory_item (库存) - 1:N

inventory_item (库存)
└── inventory_transaction (库存流水) - 1:N

bank_account (银行账户)
└── bank_statement (银行流水) - 1:N

bank_statement (银行流水)
└── reconciliation (对账) - 1:N

journal_entry (分录)
└── reconciliation (对账) - 1:N
```

---

## 索引和约束

### 唯一性约束

| 表名 | 唯一性约束 | 说明 |
|------|------------|------|
| user | `(company_id, username)` | 公司内用户名唯一 |
| account | `(company_id, code)` | 公司内科目编码唯一 |
| account | `(company_id, path)` | 公司内路径唯一 |
| product | `(company_id, sku)` | 公司内SKU编码唯一 |
| inventory_item | `(product_id, company_id)` | 每个公司的每个商品只有一条库存记录 |
| bank_account | `(company_id, account_number)` | 公司内银行账号唯一 |

### 外键约束

所有外键关系见上表，主要特点：

- **级联删除**：大部分 `company_id` 外键使用 `ON DELETE CASCADE`，删除公司时自动删除相关数据
- **级联删除**：订单明细使用 `ON DELETE CASCADE`，删除订单时自动删除明细
- **置空删除**：`account.parent_id` 使用 `ON DELETE SET NULL`，删除父科目时子科目的 `parent_id` 置空

---

## 存储过程

### 1. sp_update_account_hierarchy（更新科目层级余额）

自动更新指定科目及其所有父级科目的余额。

**参数：**
- `p_account_id` - 科目ID
- `p_delta_debit` - 借方变化量
- `p_delta_credit` - 贷方变化量

**功能：**
从指定科目开始，沿着父级链向上遍历，累加更新每个科目的借方/贷方余额。

---

### 2. sp_recalc_journal_totals（重算分录合计）

重新计算指定分录的借方/贷方合计。

**参数：**
- `p_journal_id` - 分录ID

---

### 3. sp_recalc_all_account_balances（重算所有科目余额）

从头重新计算所有科目的余额（基于分录明细聚合）。

**用途：**
- 数据迁移后
- 发现余额不一致时
- 定期数据校验

---

### 4. sp_recalc_all_inventory（重算所有库存）

从头重新计算所有库存数量（基于库存流水聚合）。

**用途：**
- 数据迁移后
- 发现库存不一致时
- 定期数据校验

---

## 触发器说明

### 1. 分录明细触发器（3个）

| 触发器名 | 触发时机 | 作用 |
|----------|----------|------|
| `trg_ledger_after_insert` | 分录明细插入后 | 更新科目层级余额 + 更新分录合计 |
| `trg_ledger_after_update` | 分录明细更新后 | 更新科目层级余额 + 更新分录合计 |
| `trg_ledger_after_delete` | 分录明细删除后 | 更新科目层级余额 + 更新分录合计 |

**说明：**
- 使用存储过程 `sp_update_account_hierarchy` 更新科目及其父级余额
- 自动维护 `journal_entry.total_debit` 和 `journal_entry.total_credit`

---

### 2. 分录过账前检查（1个触发器）

| 触发器名 | 触发时机 | 作用 |
|----------|----------|------|
| `trg_journal_before_update` | 分录更新前 | 过账前校验（posted: false → true） |

**校验内容：**
1. 检查 `posted_by` 是否已设置（过账人必填）
2. 校验借贷是否平衡（`total_debit = total_credit`）
3. 自动设置 `total_debit` 和 `total_credit` 的正确值

---

### 3. 订单总金额自动更新（6个触发器）

| 触发器名 | 触发时机 | 作用 |
|----------|----------|------|
| `trg_update_po_total_after_insert` | 采购明细插入后 | 自动更新采购订单总金额 |
| `trg_update_po_total_after_update` | 采购明细更新后 | 自动更新采购订单总金额 |
| `trg_update_po_total_after_delete` | 采购明细删除后 | 自动更新采购订单总金额 |
| `trg_update_so_total_after_insert` | 销售明细插入后 | 自动更新销售订单总金额 |
| `trg_update_so_total_after_update` | 销售明细更新后 | 自动更新销售订单总金额 |
| `trg_update_so_total_after_delete` | 销售明细删除后 | 自动更新销售订单总金额 |

**计算逻辑：**
```sql
total_amount = SUM(subtotal) FROM order_item
```

---

### 4. 库存数量自动更新（3个触发器）

| 触发器名 | 触发时机 | 作用 |
|----------|----------|------|
| `trg_update_inventory_after_insert` | 库存流水插入后 | 自动更新库存数量 |
| `trg_update_inventory_after_update` | 库存流水更新后 | 自动更新库存数量（处理商品/公司变更） |
| `trg_update_inventory_after_delete` | 库存流水删除后 | 自动更新库存数量 |

**计算逻辑：**
```sql
quantity = SUM(
    CASE 
        WHEN type = 'IN' THEN quantity
        WHEN type = 'OUT' THEN -quantity
        ELSE 0
    END
) FROM inventory_transaction
WHERE product_id = NEW.product_id AND company_id = NEW.company_id
```

**特殊处理：**
- 更新时若 `product_id` 或 `company_id` 改变，需同时刷新旧的和新的库存记录

---

## 触发器执行流程图

### 分录过账流程

```
1. 创建分录（posted = false）
2. 添加分录明细 → 触发 trg_ledger_after_insert
   ├─ 更新科目层级余额（sp_update_account_hierarchy）
   └─ 更新分录合计（total_debit, total_credit）
3. 过账（posted = false → true）→ 触发 trg_journal_before_update
   ├─ 检查 posted_by 已设置
   ├─ 验证借贷平衡
   └─ 确认 total_debit = total_credit
```

### 订单创建流程

```
1. 创建订单（total_amount = 0）
2. 添加订单明细 → 触发 trg_update_po/so_total_after_insert
   └─ 自动计算并更新 total_amount = SUM(subtotal)
```

### 库存变化流程

```
1. 创建库存流水记录（type: IN/OUT）
2. 触发 trg_update_inventory_after_insert
   └─ 自动更新 inventory_item.quantity（按 type 计算）
```

---

