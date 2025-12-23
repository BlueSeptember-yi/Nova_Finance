# 🌟 Nova Finance
### 下一代智能企业财务管理系统 | Next-Gen Enterprise Financial System

> **Nova Finance** 是基于 URSBook 架构深度优化的现代化财务管理解决方案。我们致力于通过重构的前端交互体验（UI/UX）和容器化部署方案，为中小企业提供更高效、更直观的财务运营支持。

---

## 🚀 项目亮点 (Key Highlights)

*   **🎨 全新交互界面**：基于 Ant Design 的深度定制，提供更清晰的数据可视化和操作流程。
*   **🐳 Docker 一键部署**：告别繁琐的环境配置，开箱即用。
*   **🏢 多租户架构**：支持多公司/多账套管理，数据严格隔离。
*   **🔐 完备的权限体系**：基于角色的访问控制（RBAC），保障财务数据安全。

---

## 🛠 技术栈 (Tech Stack)

| 模块 | 技术选型 | 说明 |
| :--- | :--- | :--- |
| **Frontend** | React 18 + TypeScript | 现代化组件开发 |
| **UI Framework** | Ant Design + Vite | 高性能构建与精美组件 |
| **Backend** | Python FastAPI | 高性能异步 Web 框架 |
| **Database** | MySQL 8.0 | 稳定可靠的关系型数据库 |
| **ORM** | SQLAlchemy | 灵活的数据库操作层 |

---
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

---
## 📦 快速开始 (Docker 部署)

**这是推荐的启动方式，适合所有用户。**

### 前置要求
*   安装 [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### 启动步骤

1.  **克隆项目**
    ```bash
    git clone https://github.com/BlueSeptember-yi/nova-finance.git
    cd nova-finance
    ```

2.  **一键启动**
    ```bash
    docker-compose up -d --build
    ```

3.  **初始化管理员账号**
    ```bash
    docker exec -it ursbook_backend python scripts/create_super_admin.py
    # 按照提示输入邮箱（账号）和密码
    ```

4.  **访问系统**
    *   前台页面: [http://localhost:8080](http://localhost:8080)
    *   API 文档: [http://localhost:8001/docs](http://localhost:8001/docs)

---

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

- **Owner（店主）**: 拥有所有权限，可管理企业信息和所有业务数据
- **Accountant（会计）**: 负责会计科目、会计分录、财务报表等财务相关操作
- **Sales（销售）**: 负责客户管理、销售订单、收款等销售相关操作
- **Purchaser（采购）**: 负责供应商管理、采购订单、付款等采购相关操作
- **SuperAdmin（超级管理员）**: 系统级别管理员，可管理所有公司
