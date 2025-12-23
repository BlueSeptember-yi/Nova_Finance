# 财务管理系统

## 项目简介

NovaFinance 财务管理系统是一个基于Web的完整财务管理解决方案，采用前后端分离架构，支持多公司（多租户）运营模式。系统提供会计科目管理、会计分录、采购销售、库存管理、银行对账和财务报表等核心财务管理功能。

## 技术栈

### 后端
- Python 3.x
- FastAPI 0.104.1
- SQLAlchemy 2.0.23
- MySQL 8.0+
- JWT认证
- Pydantic数据验证

### 前端
- React 19.2.0
- TypeScript 5.9.3
- Ant Design 6.0.0
- React Router 7.9.6
- Axios 1.13.2
- Vite 7.2.4

### 数据库
- MySQL 8.0+
- 字符集: utf8mb4
- 存储引擎: InnoDB

## 功能特性

### 核心功能
- **多公司（多租户）支持**：通过company_id实现数据隔离
- **会计科目管理**：支持多级科目结构，自动计算父科目余额（包含所有子科目）
- **会计分录管理**：自动校验借贷平衡，支持业务单据自动生成分录
- **标准会计科目参考**：内置国家标准会计科目体系
- **采购订单管理**：采购订单、入库、成本核算
- **销售订单管理**：销售订单、出库、收入确认
- **商品管理**：商品信息、价格管理
- **库存管理**：流水驱动，加权平均成本法，支持多仓库
- **付款管理**：供应商付款记录，自动生成会计分录
- **收款管理**：客户收款记录，自动生成会计分录
- **银行账户管理**：支持初始余额设置，多账户管理
- **银行流水管理**：支持Excel批量导入，支持多种列名格式
- **银行对账**：
  - 自动匹配：金额相同、方向一致、日期相近（±3天）
  - 智能筛选：只显示与银行存款相关的分录（排除采购成本、销售成本等）
  - 支持子科目：自动识别银行存款科目的所有子科目
  - 余额调节表：自动生成银行存款余额调节表
- **财务报表**：资产负债表、利润表、现金流量表

### 系统管理
- 用户管理（多角色支持）
- 权限控制（基于角色的访问控制）
- 企业管理
- 超级管理员功能

### 技术特性
- RESTful API设计
- JWT无状态认证
- 数据库触发器自动维护数据
- 余额实时缓存
- 库存流水可追溯
- 业务单据自动生成会计分录

## 快速开始

### 环境要求

- Python 3.8+
- Node.js 16+
- MySQL 8.0+

### 数据库初始化

1. 创建MySQL数据库：
```sql
CREATE DATABASE ursbook CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. 执行DDL脚本初始化数据库表结构：
```bash
mysql -u root -p ursbook < ddl.sql
```

### 后端启动

1. 进入后端目录：
```bash
cd backend
```

2. 创建虚拟环境（推荐）：
```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

3. 安装依赖：
```bash
pip install -r requirements.txt
```

4. 配置环境变量（可选）：
创建`.env`文件，配置数据库连接等信息：
```
DATABASE_URL=mysql+pymysql://root:root123@localhost:3306/ursbook?charset=utf8mb4
SECRET_KEY=your-secret-key-change-this-in-production
DEBUG=True
```

5. 启动服务：
```bash
python -m app.main
```

或使用uvicorn：
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

后端服务默认运行在 `http://localhost:8000`
API文档地址：`http://localhost:8000/docs`

### 前端启动

1. 进入前端目录：
```bash
cd frontend
```

2. 安装依赖：
```bash
npm install
```

3. 启动开发服务器：
```bash
npm run dev
```

前端服务默认运行在 `http://localhost:5173`

### 创建超级管理员

系统提供脚本用于创建超级管理员账户：

```bash
cd backend
python scripts/create_super_admin.py
```

按照提示输入用户名、邮箱和密码即可创建超级管理员账户。

## 项目结构

```
financial-manager/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models/
│   │   ├── routers/
│   │   ├── schemas/
│   │   └── utils/
│   ├── alembic/
│   ├── scripts/
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── types/
│   │   └── utils/
│   ├── package.json
│   └── vite.config.ts
├── ddl.sql
├── DATABASE_SCHEMA.md
├── ARCHITECTURE.md
├── USER_GUIDE.md
└── README.md
```

## 用户角色

系统支持以下用户角色：

- **Owner（企业主）**: 拥有所有权限，可管理企业信息和所有业务数据
- **Accountant（会计）**: 负责会计科目、会计分录、财务报表等财务相关操作
- **Sales（销售）**: 负责客户管理、销售订单、收款等销售相关操作
- **Purchaser（采购）**: 负责供应商管理、采购订单、付款等采购相关操作
- **SuperAdmin（超级管理员）**: 系统级别管理员，可管理所有公司

## API文档

启动后端服务后，可通过以下地址访问API文档：

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`