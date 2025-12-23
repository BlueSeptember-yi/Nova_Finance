-- ============================================================================
-- 财务管理系统 DDL
-- 兼容 MySQL 8.0+
-- ============================================================================
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET FOREIGN_KEY_CHECKS = 0;

-- =========================
-- 1. 核心基础表
-- =========================

CREATE TABLE IF NOT EXISTS company (
    company_id CHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL COMMENT '公司名称',
    size ENUM('Small','Medium','Large') COMMENT '企业规模',
    registered_capital DECIMAL(18,2) COMMENT '注册资本',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='公司表';

CREATE TABLE IF NOT EXISTS `user` (
    user_id CHAR(36) PRIMARY KEY,
    company_id CHAR(36) NULL COMMENT '所属公司（超级管理员可为空）',
    username VARCHAR(50) NOT NULL COMMENT '登录名（公司内唯一，超级管理员全局唯一）',
    email VARCHAR(100) COMMENT '邮箱',
    password_hash VARCHAR(255) NOT NULL COMMENT '加密密码',
    role ENUM('Owner','Accountant','Sales','Purchaser','SuperAdmin') NOT NULL COMMENT '用户角色',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    FOREIGN KEY (company_id) REFERENCES company(company_id) ON DELETE CASCADE,
    UNIQUE KEY uq_user_company_username (company_id, username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='用户表';

-- 注意：
-- 1. company_id 允许为 NULL，用于超级管理员（SuperAdmin 角色）
-- 2. 普通用户的 (company_id, username) 组合必须唯一（数据库约束保证）
-- 3. 超级管理员的用户名全局唯一（应用层代码保证，因为 MySQL 的 UNIQUE 约束对 NULL 值不生效）
-- 4. 外键约束允许 company_id 为 NULL，NULL 值不会触发外键检查

CREATE TABLE IF NOT EXISTS account (
    account_id CHAR(36) PRIMARY KEY,
    company_id CHAR(36) NOT NULL COMMENT '所属公司',
    parent_id CHAR(36) NULL COMMENT '父级科目ID',
    code VARCHAR(20) NOT NULL COMMENT '科目编码',
    name VARCHAR(100) NOT NULL COMMENT '科目名称',
    type ENUM('Asset','Liability','Equity','Revenue','Expense','Common') NOT NULL COMMENT '科目类型',
    normal_balance ENUM('Debit','Credit') NOT NULL COMMENT '余额方向',
    balance_debit DECIMAL(18,2) DEFAULT 0 COMMENT '借方余额（缓存）',
    balance_credit DECIMAL(18,2) DEFAULT 0 COMMENT '贷方余额（缓存）',
    is_core BOOLEAN DEFAULT FALSE COMMENT '是否核心科目',
    path VARCHAR(255) COMMENT '层级路径',
    remark VARCHAR(255) COMMENT '备注',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    FOREIGN KEY (company_id) REFERENCES company(company_id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES account(account_id) ON DELETE SET NULL,
    UNIQUE KEY uq_account_company_code (company_id, code),
    UNIQUE KEY uq_account_company_path (company_id, path)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='会计科目表';

CREATE TABLE IF NOT EXISTS standard_account (
    code VARCHAR(20) NOT NULL COMMENT '科目编码',
    name VARCHAR(100) NOT NULL COMMENT '科目名称',
    type ENUM('Asset','Liability','Equity','Revenue','Expense','Common') NOT NULL COMMENT '科目类型',
    normal_balance ENUM('Debit','Credit') NOT NULL COMMENT '余额方向：借方/贷方',
    category VARCHAR(50) NOT NULL COMMENT '科目类别（如：资产类、负债类）',
    category_detail VARCHAR(50) NOT NULL COMMENT '科目类别详情（如：流动资产、长期资产）',
    parent_code VARCHAR(20) NULL COMMENT '父级科目编码',
    seq_num INT NOT NULL COMMENT '顺序号',
    level INT NOT NULL COMMENT '层级',
    PRIMARY KEY (seq_num),
    UNIQUE KEY uq_standard_account_code (code),
    KEY idx_standard_account_type (type),
    KEY idx_standard_account_parent (parent_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='标准会计科目表（国家标准，只读参考）';

-- =========================
-- 标准会计科目初始数据
-- =========================
INSERT INTO standard_account (seq_num, code, name, type, normal_balance, category, category_detail, parent_code, level) VALUES
(1, '1001', '库存现金', 'Asset', 'Debit', '资产类', '流动资产', NULL, 1),
(2, '1002', '银行存款', 'Asset', 'Debit', '资产类', '流动资产', NULL, 1),
(3, '1002.01', '基本存款账户', 'Asset', 'Debit', '资产类', '流动资产', '1002', 2),
(4, '1002.02', '一般存款账户', 'Asset', 'Debit', '资产类', '流动资产', '1002', 2),
(5, '1004', '备用金', 'Asset', 'Debit', '资产类', '流动资产', NULL, 1),
(6, '1012', '其他货币资金', 'Asset', 'Debit', '资产类', '流动资产', NULL, 1),
(7, '1012.01', '外埠存款', 'Asset', 'Debit', '资产类', '流动资产', '1012', 2),
(8, '1012.02', '银行汇票', 'Asset', 'Debit', '资产类', '流动资产', '1012', 2),
(9, '1012.03', '银行本票', 'Asset', 'Debit', '资产类', '流动资产', '1012', 2),
(10, '1012.04', '信用卡', 'Asset', 'Debit', '资产类', '流动资产', '1012', 2),
(11, '1012.05', '信用证保证金', 'Asset', 'Debit', '资产类', '流动资产', '1012', 2),
(12, '1012.06', '存出投资款', 'Asset', 'Debit', '资产类', '流动资产', '1012', 2),
(13, '1101', '交易性金融资产', 'Asset', 'Debit', '资产类', '流动资产', NULL, 1),
(14, '1101.01', '本金', 'Asset', 'Debit', '资产类', '流动资产', '1101', 2),
(15, '1101.02', '公允价值变动', 'Asset', 'Debit', '资产类', '流动资产', '1101', 2),
(16, '1121', '应收票据', 'Asset', 'Debit', '资产类', '流动资产', NULL, 1),
(17, '1122', '应收账款', 'Asset', 'Debit', '资产类', '流动资产', NULL, 1),
(18, '1123', '预付账款', 'Asset', 'Debit', '资产类', '流动资产', NULL, 1),
(19, '1123.01', '预付货款', 'Asset', 'Debit', '资产类', '流动资产', '1123', 2),
(20, '1131', '应收股利', 'Asset', 'Debit', '资产类', '流动资产', NULL, 1),
(21, '1132', '应收利息', 'Asset', 'Debit', '资产类', '流动资产', NULL, 1),
(22, '1221', '其他应收款', 'Asset', 'Debit', '资产类', '流动资产', NULL, 1),
(23, '1221.01', '应收单位款', 'Asset', 'Debit', '资产类', '流动资产', '1221', 2),
(24, '1221.02', '应收个人款', 'Asset', 'Debit', '资产类', '流动资产', '1221', 2),
(25, '1231', '坏账准备', 'Asset', 'Credit', '资产类', '流动资产', NULL, 1),
(26, '1321', '代理业务资产', 'Asset', 'Debit', '资产类', '流动资产', NULL, 1),
(27, '1401', '材料采购', 'Asset', 'Debit', '资产类', '流动资产', NULL, 1),
(28, '1402', '在途物资', 'Asset', 'Debit', '资产类', '流动资产', NULL, 1),
(29, '1403', '原材料', 'Asset', 'Debit', '资产类', '流动资产', NULL, 1),
(30, '1404', '材料成本差异', 'Asset', 'Debit', '资产类', '流动资产', NULL, 1),
(31, '1405', '库存商品', 'Asset', 'Debit', '资产类', '流动资产', NULL, 1),
(32, '1406', '发出商品', 'Asset', 'Debit', '资产类', '流动资产', NULL, 1),
(33, '1407', '商品进销差价', 'Asset', 'Credit', '资产类', '流动资产', NULL, 1),
(34, '1408', '委托加工物资', 'Asset', 'Debit', '资产类', '流动资产', NULL, 1),
(35, '1411', '周转材料', 'Asset', 'Debit', '资产类', '流动资产', NULL, 1),
(36, '1471', '存货跌价准备', 'Asset', 'Credit', '资产类', '流动资产', NULL, 1),
(37, '1501', '持有至到期投资', 'Asset', 'Debit', '资产类', '长期资产', NULL, 1),
(38, '1501.01', '投资成本', 'Asset', 'Debit', '资产类', '长期资产', '1501', 2),
(39, '1501.02', '损益调整', 'Asset', 'Debit', '资产类', '长期资产', '1501', 2),
(40, '1501.03', '所有者权益其他变动', 'Asset', 'Debit', '资产类', '长期资产', '1501', 2),
(41, '1502', '持有至到期投资减值准备', 'Asset', 'Credit', '资产类', '长期资产', NULL, 1),
(42, '1503', '可供出售金融资产', 'Asset', 'Debit', '资产类', '长期资产', NULL, 1),
(43, '1503.01', '成本', 'Asset', 'Debit', '资产类', '长期资产', '1503', 2),
(44, '1503.02', '公允价值变动', 'Asset', 'Debit', '资产类', '长期资产', '1503', 2),
(45, '1503.03', '减值准备', 'Asset', 'Debit', '资产类', '长期资产', '1503', 2),
(46, '1511', '长期股权投资', 'Asset', 'Debit', '资产类', '长期资产', NULL, 1),
(47, '1511.01', '投资成本', 'Asset', 'Debit', '资产类', '长期资产', '1511', 2),
(48, '1511.02', '损益调整', 'Asset', 'Debit', '资产类', '长期资产', '1511', 2),
(49, '1511.03', '所有者权益其他变动', 'Asset', 'Debit', '资产类', '长期资产', '1511', 2),
(50, '1512', '长期股权投资减值准备', 'Asset', 'Credit', '资产类', '长期资产', NULL, 1),
(51, '1521', '投资性房地产', 'Asset', 'Debit', '资产类', '长期资产', NULL, 1),
(52, '1521.01', '成本', 'Asset', 'Debit', '资产类', '长期资产', '1521', 2),
(53, '1521.02', '公允价值变动', 'Asset', 'Debit', '资产类', '长期资产', '1521', 2),
(54, '1531', '长期应收款', 'Asset', 'Debit', '资产类', '长期资产', NULL, 1),
(55, '1532', '未实现融资收益', 'Asset', 'Credit', '资产类', '长期资产', NULL, 1),
(56, '1601', '固定资产', 'Asset', 'Debit', '资产类', '长期资产', NULL, 1),
(57, '1602', '累计折旧', 'Asset', 'Credit', '资产类', '长期资产', NULL, 1),
(58, '1603', '固定资产减值准备', 'Asset', 'Credit', '资产类', '长期资产', NULL, 1),
(59, '1604', '在建工程', 'Asset', 'Debit', '资产类', '长期资产', NULL, 1),
(60, '1605', '工程物资', 'Asset', 'Debit', '资产类', '长期资产', NULL, 1),
(61, '1605.01', '专用材料', 'Asset', 'Debit', '资产类', '长期资产', '1605', 2),
(62, '1605.02', '专用设备', 'Asset', 'Debit', '资产类', '长期资产', '1605', 2),
(63, '1605.03', '预付大型设备款', 'Asset', 'Debit', '资产类', '长期资产', '1605', 2),
(64, '1605.04', '为生产准备的工具及器具', 'Asset', 'Debit', '资产类', '长期资产', '1605', 2),
(65, '1606', '固定资产清理', 'Asset', 'Debit', '资产类', '长期资产', NULL, 1),
(66, '1701', '无形资产', 'Asset', 'Debit', '资产类', '长期资产', NULL, 1),
(67, '1702', '累计摊销', 'Asset', 'Credit', '资产类', '长期资产', NULL, 1),
(68, '1703', '无形资产减值准备', 'Asset', 'Credit', '资产类', '长期资产', NULL, 1),
(69, '1711', '商誉', 'Asset', 'Debit', '资产类', '长期资产', NULL, 1),
(70, '1801', '长期待摊费用', 'Asset', 'Debit', '资产类', '长期资产', NULL, 1),
(71, '1811', '递延所得税资产', 'Asset', 'Debit', '资产类', '长期资产', NULL, 1),
(72, '1901', '待处理财产损溢', 'Asset', 'Debit', '资产类', '流动资产', NULL, 1),
(73, '2001', '短期借款', 'Liability', 'Credit', '负债类', '流动负债', NULL, 1),
(74, '2101', '交易性金融负债', 'Liability', 'Credit', '负债类', '流动负债', NULL, 1),
(75, '2101.01', '本金', 'Liability', 'Credit', '负债类', '流动负债', '2101', 2),
(76, '2101.02', '公允价值变动', 'Liability', 'Credit', '负债类', '流动负债', '2101', 2),
(77, '2201', '应付票据', 'Liability', 'Credit', '负债类', '流动负债', NULL, 1),
(78, '2202', '应付账款', 'Liability', 'Credit', '负债类', '流动负债', NULL, 1),
(79, '2203', '预收账款', 'Liability', 'Credit', '负债类', '流动负债', NULL, 1),
(80, '2211', '应付职工薪酬', 'Liability', 'Credit', '负债类', '流动负债', NULL, 1),
(81, '2211.01', '工资', 'Liability', 'Credit', '负债类', '流动负债', '2211', 2),
(82, '2211.02', '职工福利', 'Liability', 'Credit', '负债类', '流动负债', '2211', 2),
(83, '2211.03', '社会保险费', 'Liability', 'Credit', '负债类', '流动负债', '2211', 2),
(84, '2211.04', '住房公积金', 'Liability', 'Credit', '负债类', '流动负债', '2211', 2),
(85, '2211.05', '工会经费', 'Liability', 'Credit', '负债类', '流动负债', '2211', 2),
(86, '2211.06', '职工教育经费', 'Liability', 'Credit', '负债类', '流动负债', '2211', 2),
(87, '2211.07', '解除职工劳动关系补偿', 'Liability', 'Credit', '负债类', '流动负债', '2211', 2),
(88, '2221', '应交税费', 'Liability', 'Credit', '负债类', '流动负债', NULL, 1),
(89, '2221.01', '增值税', 'Liability', 'Credit', '负债类', '流动负债', '2221', 2),
(90, '2221.01.01', '进项税额', 'Liability', 'Debit', '负债类', '流动负债', '2221.01', 3),
(91, '2221.01.02', '销项税额', 'Liability', 'Credit', '负债类', '流动负债', '2221.01', 3),
(92, '2221.01.03', '出口抵减内销产品应纳税额', 'Liability', 'Debit', '负债类', '流动负债', '2221.01', 3),
(93, '2221.01.04', '进项税额转出', 'Liability', 'Credit', '负债类', '流动负债', '2221.01', 3),
(94, '2221.01.05', '出口退税', 'Liability', 'Credit', '负债类', '流动负债', '2221.01', 3),
(95, '2221.01.06', '已交税金', 'Liability', 'Debit', '负债类', '流动负债', '2221.01', 3),
(96, '2221.01.07', '转出未交增值税', 'Liability', 'Debit', '负债类', '流动负债', '2221.01', 3),
(97, '2221.01.08', '销项税额抵减', 'Liability', 'Debit', '负债类', '流动负债', '2221.01', 3),
(98, '2221.01.09', '减免税款', 'Liability', 'Debit', '负债类', '流动负债', '2221.01', 3),
(99, '2221.01.10', '转出多交增值税', 'Liability', 'Credit', '负债类', '流动负债', '2221.01', 3),
(100, '2221.02', '未交增值税', 'Liability', 'Credit', '负债类', '流动负债', '2221', 2),
(101, '2221.03', '消费税', 'Liability', 'Credit', '负债类', '流动负债', '2221', 2),
(102, '2221.04', '企业所得税', 'Liability', 'Credit', '负债类', '流动负债', '2221', 2),
(103, '2221.05', '城市维护建设税', 'Liability', 'Credit', '负债类', '流动负债', '2221', 2),
(104, '2221.06', '资源税', 'Liability', 'Credit', '负债类', '流动负债', '2221', 2),
(105, '2221.07', '土地增值税', 'Liability', 'Credit', '负债类', '流动负债', '2221', 2),
(106, '2221.08', '城镇土地使用税', 'Liability', 'Credit', '负债类', '流动负债', '2221', 2),
(107, '2221.09', '房产税', 'Liability', 'Credit', '负债类', '流动负债', '2221', 2),
(108, '2221.10', '教育费附加', 'Liability', 'Credit', '负债类', '流动负债', '2221', 2),
(109, '2221.11', '车船税', 'Liability', 'Credit', '负债类', '流动负债', '2221', 2),
(110, '2221.12', '矿产资源补偿费', 'Liability', 'Credit', '负债类', '流动负债', '2221', 2),
(111, '2221.13', '排污费', 'Liability', 'Credit', '负债类', '流动负债', '2221', 2),
(112, '2221.14', '个人所得税', 'Liability', 'Credit', '负债类', '流动负债', '2221', 2),
(113, '2221.15', '预交增值税', 'Liability', 'Debit', '负债类', '流动负债', '2221', 2),
(114, '2221.16', '待抵扣进项税', 'Liability', 'Debit', '负债类', '流动负债', '2221', 2),
(115, '2221.17', '待认证进项税', 'Liability', 'Debit', '负债类', '流动负债', '2221', 2),
(116, '2221.18', '待转销项税额', 'Liability', 'Credit', '负债类', '流动负债', '2221', 2),
(117, '2221.19', '增值税留抵税额', 'Liability', 'Debit', '负债类', '流动负债', '2221', 2),
(118, '2221.20', '简易计税', 'Liability', 'Credit', '负债类', '流动负债', '2221', 2),
(119, '2221.21', '转让金融商品应交增值税', 'Liability', 'Credit', '负债类', '流动负债', '2221', 2),
(120, '2221.22', '代扣代交增值税', 'Liability', 'Credit', '负债类', '流动负债', '2221', 2),
(121, '2231', '应付利息', 'Liability', 'Credit', '负债类', '流动负债', NULL, 1),
(122, '2232', '应付股利', 'Liability', 'Credit', '负债类', '流动负债', NULL, 1),
(123, '2241', '其他应付款', 'Liability', 'Credit', '负债类', '流动负债', NULL, 1),
(124, '2241.01', '个人', 'Liability', 'Credit', '负债类', '流动负债', '2241', 2),
(125, '2241.02', '客户', 'Liability', 'Credit', '负债类', '流动负债', '2241', 2),
(126, '2314', '代理业务负债', 'Liability', 'Credit', '负债类', '流动负债', NULL, 1),
(127, '2401', '递延收益', 'Liability', 'Credit', '负债类', '长期负债', NULL, 1),
(128, '2501', '长期借款', 'Liability', 'Credit', '负债类', '长期负债', NULL, 1),
(129, '2501.01', '本金', 'Liability', 'Credit', '负债类', '长期负债', '2501', 2),
(130, '2501.02', '利息调整', 'Liability', 'Credit', '负债类', '长期负债', '2501', 2),
(131, '2502', '应付债券', 'Liability', 'Credit', '负债类', '长期负债', NULL, 1),
(132, '2502.01', '面值', 'Liability', 'Credit', '负债类', '长期负债', '2502', 2),
(133, '2502.02', '利息调整', 'Liability', 'Credit', '负债类', '长期负债', '2502', 2),
(134, '2502.03', '应计利息', 'Liability', 'Credit', '负债类', '长期负债', '2502', 2),
(135, '2701', '长期应付款', 'Liability', 'Credit', '负债类', '长期负债', NULL, 1),
(136, '2702', '未确认融资费用', 'Liability', 'Debit', '负债类', '长期负债', NULL, 1),
(137, '2711', '专项应付款', 'Liability', 'Credit', '负债类', '长期负债', NULL, 1),
(138, '2801', '预计负债', 'Liability', 'Credit', '负债类', '流动负债', NULL, 1),
(139, '2801.01', '对外提供担保', 'Liability', 'Credit', '负债类', '流动负债', '2801', 2),
(140, '2801.02', '未决诉讼', 'Liability', 'Credit', '负债类', '流动负债', '2801', 2),
(141, '2801.03', '产品质量保证', 'Liability', 'Credit', '负债类', '流动负债', '2801', 2),
(142, '2901', '递延所得税负债', 'Liability', 'Credit', '负债类', '长期负债', NULL, 1),
(143, '3101', '衍生工具', 'Common', 'Debit', '共同类', '共同类', NULL, 1),
(144, '3201', '套期工具', 'Common', 'Debit', '共同类', '共同类', NULL, 1),
(145, '3202', '被套期项目', 'Common', 'Debit', '共同类', '共同类', NULL, 1),
(146, '4001', '实收资本', 'Equity', 'Credit', '权益类', '所有者权益', NULL, 1),
(147, '4002', '资本公积', 'Equity', 'Credit', '权益类', '所有者权益', NULL, 1),
(148, '4002.01', '资本溢价', 'Equity', 'Credit', '权益类', '所有者权益', '4002', 2),
(149, '4002.02', '股本溢价', 'Equity', 'Credit', '权益类', '所有者权益', '4002', 2),
(150, '4002.03', '其他资本公积', 'Equity', 'Credit', '权益类', '所有者权益', '4002', 2),
(151, '4101', '盈余公积', 'Equity', 'Credit', '权益类', '所有者权益', NULL, 1),
(152, '4101.01', '法定盈余公积', 'Equity', 'Credit', '权益类', '所有者权益', '4101', 2),
(153, '4101.02', '任意盈余公积', 'Equity', 'Credit', '权益类', '所有者权益', '4101', 2),
(154, '4101.03', '储备基金', 'Equity', 'Credit', '权益类', '所有者权益', '4101', 2),
(155, '4101.04', '企业发展基金', 'Equity', 'Credit', '权益类', '所有者权益', '4101', 2),
(156, '4101.05', '利润归还投资', 'Equity', 'Credit', '权益类', '所有者权益', '4101', 2),
(157, '4103', '本年利润', 'Equity', 'Credit', '权益类', '所有者权益', NULL, 1),
(158, '4104', '利润分配', 'Equity', 'Credit', '权益类', '所有者权益', NULL, 1),
(159, '4104.01', '提取法定盈余公积', 'Equity', 'Credit', '权益类', '所有者权益', '4104', 2),
(160, '4104.02', '提取任意盈余公积', 'Equity', 'Credit', '权益类', '所有者权益', '4104', 2),
(161, '4104.03', '应付普通股股利', 'Equity', 'Credit', '权益类', '所有者权益', '4104', 2),
(162, '4104.04', '转作股本的股利', 'Equity', 'Credit', '权益类', '所有者权益', '4104', 2),
(163, '4104.05', '盈余公积补亏', 'Equity', 'Credit', '权益类', '所有者权益', '4104', 2),
(164, '4104.06', '未分配利润', 'Equity', 'Credit', '权益类', '所有者权益', '4104', 2),
(165, '4104.07', '提取储备基金', 'Equity', 'Credit', '权益类', '所有者权益', '4104', 2),
(166, '4104.08', '提取企业发展基金', 'Equity', 'Credit', '权益类', '所有者权益', '4104', 2),
(167, '4104.09', '提取职工奖励及福利基金', 'Equity', 'Credit', '权益类', '所有者权益', '4104', 2),
(168, '4104.10', '利润归还投资', 'Equity', 'Credit', '权益类', '所有者权益', '4104', 2),
(169, '4201', '库存股', 'Equity', 'Debit', '权益类', '所有者权益', NULL, 1),
(170, '5001', '生产成本', 'Expense', 'Debit', '成本类', '成本', NULL, 1),
(171, '5101', '制造费用', 'Expense', 'Debit', '成本类', '成本', NULL, 1),
(172, '5201', '劳务成本', 'Expense', 'Debit', '成本类', '成本', NULL, 1),
(173, '5301', '研发支出', 'Expense', 'Debit', '成本类', '成本', NULL, 1),
(174, '5301.01', '费用化支出', 'Expense', 'Debit', '成本类', '成本', '5301', 2),
(175, '5301.02', '资本化支出', 'Expense', 'Debit', '成本类', '成本', '5301', 2),
(176, '6001', '主营业务收入', 'Revenue', 'Credit', '损益类', '营业收入', NULL, 1),
(177, '6001.01', '销售商品收入', 'Revenue', 'Credit', '损益类', '营业收入', '6001', 2),
(178, '6001.01.01', '一般商品销售收入', 'Revenue', 'Credit', '损益类', '营业收入', '6001.01', 3),
(179, '6001.01.02', '非货币性资产交换收入', 'Revenue', 'Credit', '损益类', '营业收入', '6001.01', 3),
(180, '6001.02', '提供劳务收入', 'Revenue', 'Credit', '损益类', '营业收入', '6001', 2),
(181, '6001.03', '造合同收入', 'Revenue', 'Credit', '损益类', '营业收入', '6001', 2),
(182, '6001.04', '让渡资产使用权收入', 'Revenue', 'Credit', '损益类', '营业收入', '6001', 2),
(183, '6051', '其他业务收入', 'Revenue', 'Credit', '损益类', '其他收益', NULL, 1),
(184, '6051.01', '销售材料收入', 'Revenue', 'Credit', '损益类', '其他收益', '6051', 2),
(185, '6051.01.01', '一般销售材料收入', 'Revenue', 'Credit', '损益类', '其他收益', '6051.01', 3),
(186, '6051.01.02', '非货币性资产交换收入', 'Revenue', 'Credit', '损益类', '其他收益', '6051.01', 3),
(187, '6051.02', '出租固定资产收入', 'Revenue', 'Credit', '损益类', '其他收益', '6051', 2),
(188, '6051.03', '出租无形资产收入', 'Revenue', 'Credit', '损益类', '其他收益', '6051', 2),
(189, '6051.04', '出租包装物和商品收入', 'Revenue', 'Credit', '损益类', '其他收益', '6051', 2),
(190, '6101', '公允价值变动损益', 'Revenue', 'Credit', '损益类', '其他收益', NULL, 1),
(191, '6111', '投资收益', 'Revenue', 'Credit', '损益类', '其他收益', NULL, 1),
(192, '6301', '营业外收入', 'Revenue', 'Credit', '损益类', '其他收益', NULL, 1),
(193, '6301.01', '处置非流动资产利得', 'Revenue', 'Credit', '损益类', '其他收益', '6301', 2),
(194, '6301.02', '非货币性资产交换利得', 'Revenue', 'Credit', '损益类', '其他收益', '6301', 2),
(195, '6301.03', '债务重组利得', 'Revenue', 'Credit', '损益类', '其他收益', '6301', 2),
(196, '6301.04', '罚没利得', 'Revenue', 'Credit', '损益类', '其他收益', '6301', 2),
(197, '6301.05', '政府补助利得', 'Revenue', 'Credit', '损益类', '其他收益', '6301', 2),
(198, '6301.06', '确实无法偿付的应付款项', 'Revenue', 'Credit', '损益类', '其他收益', '6301', 2),
(199, '6301.07', '捐赠利得', 'Revenue', 'Credit', '损益类', '其他收益', '6301', 2),
(200, '6301.08', '汇兑收益', 'Revenue', 'Credit', '损益类', '其他收益', '6301', 2),
(201, '6401', '主营业务成本', 'Expense', 'Debit', '损益类', '营业成本及税金', NULL, 1),
(202, '6401.01', '销售商品成本', 'Expense', 'Debit', '损益类', '营业成本及税金', '6401', 2),
(203, '6401.01.01', '一般商品销售成本', 'Expense', 'Debit', '损益类', '营业成本及税金', '6401.01', 3),
(204, '6401.01.02', '非货币性资产交换成本', 'Expense', 'Debit', '损益类', '营业成本及税金', '6401.01', 3),
(205, '6401.02', '提供劳务成本', 'Expense', 'Debit', '损益类', '营业成本及税金', '6401', 2),
(206, '6401.03', '建造合同成本', 'Expense', 'Debit', '损益类', '营业成本及税金', '6401', 2),
(207, '6401.04', '让渡资产使用权成本', 'Expense', 'Debit', '损益类', '营业成本及税金', '6401', 2),
(208, '6401.05', '其他', 'Expense', 'Debit', '损益类', '营业成本及税金', '6401', 2),
(209, '6402', '其他业务成本', 'Expense', 'Debit', '损益类', '其他损失', NULL, 1),
(210, '6402.01', '材料销售成本', 'Expense', 'Debit', '损益类', '其他损失', '6402', 2),
(211, '6402.01.01', '一般材料销售成本', 'Expense', 'Debit', '损益类', '其他损失', '6402.01', 3),
(212, '6402.01.02', '非货币性资产交换成本', 'Expense', 'Debit', '损益类', '其他损失', '6402.01', 3),
(213, '6402.02', '出租固定资产成本', 'Expense', 'Debit', '损益类', '其他损失', '6402', 2),
(214, '6402.03', '出租无形资产成本', 'Expense', 'Debit', '损益类', '其他损失', '6402', 2),
(215, '6402.04', '包装物出租成本', 'Expense', 'Debit', '损益类', '其他损失', '6402', 2),
(216, '6402.05', '其他', 'Expense', 'Debit', '损益类', '其他损失', '6402', 2),
(217, '6403', '税金及附加', 'Expense', 'Debit', '损益类', '营业成本及税金', NULL, 1),
(218, '6601', '销售费用', 'Expense', 'Debit', '损益类', '期间费用', NULL, 1),
(219, '6601.01', '职工薪酬', 'Expense', 'Debit', '损益类', '期间费用', '6601', 2),
(220, '6601.02', '业务费', 'Expense', 'Debit', '损益类', '期间费用', '6601', 2),
(221, '6601.03', '折旧费', 'Expense', 'Debit', '损益类', '期间费用', '6601', 2),
(222, '6601.04', '差旅费', 'Expense', 'Debit', '损益类', '期间费用', '6601', 2),
(223, '6601.05', '保险费', 'Expense', 'Debit', '损益类', '期间费用', '6601', 2),
(224, '6601.06', '包装费', 'Expense', 'Debit', '损益类', '期间费用', '6601', 2),
(225, '6601.07', '展览费和广告费', 'Expense', 'Debit', '损益类', '期间费用', '6601', 2),
(226, '6601.08', '商品维修费', 'Expense', 'Debit', '损益类', '期间费用', '6601', 2),
(227, '6601.09', '预计产品质量保证损失', 'Expense', 'Debit', '损益类', '期间费用', '6601', 2),
(228, '6601.10', '运输费', 'Expense', 'Debit', '损益类', '期间费用', '6601', 2),
(229, '6601.11', '装卸费', 'Expense', 'Debit', '损益类', '期间费用', '6601', 2),
(230, '6602', '管理费用', 'Expense', 'Debit', '损益类', '期间费用', NULL, 1),
(231, '6602.01', '职工薪酬', 'Expense', 'Debit', '损益类', '期间费用', '6602', 2),
(232, '6602.02', '折旧', 'Expense', 'Debit', '损益类', '期间费用', '6602', 2),
(233, '6602.03', '办公费', 'Expense', 'Debit', '损益类', '期间费用', '6602', 2),
(234, '6602.04', '差旅费', 'Expense', 'Debit', '损益类', '期间费用', '6602', 2),
(235, '6602.05', '工会经费', 'Expense', 'Debit', '损益类', '期间费用', '6602', 2),
(236, '6602.06', '董事会费', 'Expense', 'Debit', '损益类', '期间费用', '6602', 2),
(237, '6602.07', '业务招待费', 'Expense', 'Debit', '损益类', '期间费用', '6602', 2),
(238, '6602.08', '租赁费', 'Expense', 'Debit', '损益类', '期间费用', '6602', 2),
(239, '6602.09', '水电费', 'Expense', 'Debit', '损益类', '期间费用', '6602', 2),
(240, '6602.10', '房产税', 'Expense', 'Debit', '损益类', '期间费用', '6602', 2),
(241, '6602.11', '车船使用税', 'Expense', 'Debit', '损益类', '期间费用', '6602', 2),
(242, '6602.12', '土地使用税', 'Expense', 'Debit', '损益类', '期间费用', '6602', 2),
(243, '6602.13', '印花税', 'Expense', 'Debit', '损益类', '期间费用', '6602', 2),
(244, '6602.14', '矿产资源补偿费', 'Expense', 'Debit', '损益类', '期间费用', '6602', 2),
(245, '6602.15', '排污费', 'Expense', 'Debit', '损益类', '期间费用', '6602', 2),
(246, '6602.16', '无形资产摊销', 'Expense', 'Debit', '损益类', '期间费用', '6602', 2),
(247, '6602.17', '长期待摊费用摊销', 'Expense', 'Debit', '损益类', '期间费用', '6602', 2),
(248, '6603', '财务费用', 'Expense', 'Debit', '损益类', '期间费用', NULL, 1),
(249, '6603.01', '利息支出', 'Expense', 'Debit', '损益类', '期间费用', '6603', 2),
(250, '6603.02', '利息收入', 'Expense', 'Debit', '损益类', '期间费用', '6603', 2),
(251, '6603.03', '汇兑差额', 'Expense', 'Debit', '损益类', '期间费用', '6603', 2),
(252, '6603.04', '手续费', 'Expense', 'Debit', '损益类', '期间费用', '6603', 2),
(253, '6603.05', '现金折扣', 'Expense', 'Debit', '损益类', '期间费用', '6603', 2),
(254, '6701', '资产减值损失', 'Expense', 'Debit', '损益类', '其他损失', NULL, 1),
(255, '6711', '营业外支出', 'Expense', 'Debit', '损益类', '其他损失', NULL, 1),
(256, '6711.01', '处置非流动资产损失', 'Expense', 'Debit', '损益类', '其他损失', '6711', 2),
(257, '6711.02', '非货币性资产交换损失', 'Expense', 'Debit', '损益类', '其他损失', '6711', 2),
(258, '6711.03', '债务重组损失', 'Expense', 'Debit', '损益类', '其他损失', '6711', 2),
(259, '6711.04', '罚款支出', 'Expense', 'Debit', '损益类', '其他损失', '6711', 2),
(260, '6711.05', '捐赠支出', 'Expense', 'Debit', '损益类', '其他损失', '6711', 2),
(261, '6711.06', '非常损失', 'Expense', 'Debit', '损益类', '其他损失', '6711', 2),
(262, '6711.07', '赞助支出', 'Expense', 'Debit', '损益类', '其他损失', '6711', 2),
(263, '6711.08', '罚没支出', 'Expense', 'Debit', '损益类', '其他损失', '6711', 2),
(264, '6711.09', '坏账损失', 'Expense', 'Debit', '损益类', '其他损失', '6711', 2),
(265, '6711.10', '无法收回的债券股权投资损失', 'Expense', 'Debit', '损益类', '其他损失', '6711', 2),
(266, '6801', '所得税费用', 'Expense', 'Debit', '损益类', '所得税', NULL, 1),
(267, '6801.01', '当期所得税费用', 'Expense', 'Debit', '损益类', '所得税', '6801', 2),
(268, '6801.02', '递延所得税费用', 'Expense', 'Debit', '损益类', '所得税', '6801', 2),
(269, '6901', '以前年度损益调整', 'Expense', 'Credit', '损益类', '以前年度损益调整', NULL, 1);

CREATE TABLE IF NOT EXISTS journal_entry (
    journal_id CHAR(36) PRIMARY KEY,
    company_id CHAR(36) NOT NULL COMMENT '所属公司',
    date DATE NOT NULL COMMENT '记账日期',
    description VARCHAR(255) COMMENT '摘要',
    source_type ENUM('PO','SO','PAYMENT','RECEIPT','MANUAL') COMMENT '业务来源类型',
    source_id CHAR(36) COMMENT '业务来源ID',
    total_debit DECIMAL(18,2) DEFAULT 0 COMMENT '借方合计（触发器维护）',
    total_credit DECIMAL(18,2) DEFAULT 0 COMMENT '贷方合计（触发器维护）',
    posted BOOLEAN DEFAULT FALSE COMMENT '是否已过账',
    posted_by CHAR(36) NULL COMMENT '过账人',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    FOREIGN KEY (company_id) REFERENCES company(company_id) ON DELETE CASCADE,
    FOREIGN KEY (posted_by) REFERENCES `user`(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='会计分录表';

CREATE TABLE IF NOT EXISTS ledger_line (
    line_id CHAR(36) PRIMARY KEY,
    journal_id CHAR(36) NOT NULL COMMENT '所属分录',
    account_id CHAR(36) NOT NULL COMMENT '对应科目',
    debit DECIMAL(18,2) DEFAULT 0 COMMENT '借方金额',
    credit DECIMAL(18,2) DEFAULT 0 COMMENT '贷方金额',
    memo VARCHAR(255) COMMENT '备注',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    FOREIGN KEY (journal_id) REFERENCES journal_entry(journal_id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES account(account_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='分录明细表';

-- =========================
-- 2. 业务表
-- =========================

CREATE TABLE IF NOT EXISTS supplier (
    supplier_id CHAR(36) PRIMARY KEY,
    company_id CHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    contact VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    address VARCHAR(255),
    tax_no VARCHAR(50),
    bank_account VARCHAR(50),
    remark TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES company(company_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='供应商表';

CREATE TABLE IF NOT EXISTS customer (
    customer_id CHAR(36) PRIMARY KEY,
    company_id CHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    address VARCHAR(255),
    tax_no VARCHAR(50),
    credit_limit DECIMAL(18,2) DEFAULT 0,
    remark TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES company(company_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='客户表';

CREATE TABLE IF NOT EXISTS product (
    product_id CHAR(36) PRIMARY KEY,
    company_id CHAR(36) NOT NULL,
    sku VARCHAR(50) NOT NULL COMMENT 'SKU编码',
    name VARCHAR(100) NOT NULL,
    price DECIMAL(18,2),
    cost DECIMAL(18,2),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES company(company_id) ON DELETE CASCADE,
    UNIQUE KEY uq_product_company_sku (company_id, sku)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='商品表';

CREATE TABLE IF NOT EXISTS purchase_order (
    po_id CHAR(36) PRIMARY KEY,
    supplier_id CHAR(36) NOT NULL,
    company_id CHAR(36) NOT NULL,
    date DATE NOT NULL,
    expected_delivery_date DATE,
    total_amount DECIMAL(18,2) DEFAULT 0,
    status ENUM('Draft','Posted','Paid') DEFAULT 'Draft',
    remark TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES supplier(supplier_id),
    FOREIGN KEY (company_id) REFERENCES company(company_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='采购订单表';

CREATE TABLE IF NOT EXISTS purchase_order_item (
    item_id CHAR(36) PRIMARY KEY,
    purchase_order_id CHAR(36) NOT NULL,
    product_id CHAR(36) NULL,
    product_name VARCHAR(100) NOT NULL,
    quantity DECIMAL(18,2) NOT NULL,
    unit_price DECIMAL(18,2) NOT NULL,
    discount_rate DECIMAL(5,4) DEFAULT 1.0,
    subtotal DECIMAL(18,2) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_order(po_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES product(product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='采购订单明细表';

CREATE TABLE IF NOT EXISTS sales_order (
    so_id CHAR(36) PRIMARY KEY,
    customer_id CHAR(36) NOT NULL,
    company_id CHAR(36) NOT NULL,
    date DATE NOT NULL,
    expected_delivery_date DATE,
    total_amount DECIMAL(18,2) DEFAULT 0,
    payment_method ENUM('Cash','BankTransfer','Credit') COMMENT '收款方式',
    status ENUM('Draft','Posted','Collected') DEFAULT 'Draft',
    remark TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customer(customer_id),
    FOREIGN KEY (company_id) REFERENCES company(company_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='销售订单表';

CREATE TABLE IF NOT EXISTS sales_order_item (
    item_id CHAR(36) PRIMARY KEY,
    sales_order_id CHAR(36) NOT NULL,
    product_id CHAR(36) NULL,
    product_name VARCHAR(100) NOT NULL,
    quantity DECIMAL(18,2) NOT NULL,
    unit_price DECIMAL(18,2) NOT NULL,
    discount_rate DECIMAL(5,4) DEFAULT 1.0,
    subtotal DECIMAL(18,2) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sales_order_id) REFERENCES sales_order(so_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES product(product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='销售订单明细表';

CREATE TABLE IF NOT EXISTS payment (
    payment_id CHAR(36) PRIMARY KEY,
    company_id CHAR(36) NOT NULL,
    purchase_order_id CHAR(36) NULL,
    date DATE NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    payment_method ENUM('Cash','BankTransfer','Credit') NOT NULL,
    remark VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES company(company_id) ON DELETE CASCADE,
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_order(po_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='付款记录表';

CREATE TABLE IF NOT EXISTS receipt (
    receipt_id CHAR(36) PRIMARY KEY,
    company_id CHAR(36) NOT NULL,
    sales_order_id CHAR(36) NULL,
    date DATE NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    method ENUM('Cash','BankTransfer','Credit') NOT NULL,
    remark VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES company(company_id) ON DELETE CASCADE,
    FOREIGN KEY (sales_order_id) REFERENCES sales_order(so_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='收款记录表';

-- =========================
-- 3. 库存（含流水）
-- =========================

CREATE TABLE IF NOT EXISTS inventory_item (
    inventory_id CHAR(36) PRIMARY KEY,
    product_id CHAR(36) NOT NULL,
    company_id CHAR(36) NOT NULL,
    quantity DECIMAL(18,2) DEFAULT 0,
    average_cost DECIMAL(18,2) DEFAULT 0 COMMENT '加权平均成本',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES product(product_id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES company(company_id) ON DELETE CASCADE,
    UNIQUE KEY uq_inventory_product_company (product_id, company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='库存记录表';

CREATE TABLE IF NOT EXISTS inventory_transaction (
    transaction_id CHAR(36) PRIMARY KEY,
    company_id CHAR(36) NOT NULL,
    product_id CHAR(36) NOT NULL,
    inventory_id CHAR(36) NULL,
    type ENUM('IN','OUT') NOT NULL,
    quantity DECIMAL(18,2) NOT NULL,
    unit_cost DECIMAL(18,2) COMMENT '单位成本（入库时记录采购成本，出库时记录加权平均成本）',
    source_type ENUM('PO','SO','Manual','Adjustment') NOT NULL,
    source_id CHAR(36) NULL,
    warehouse_location VARCHAR(100) COMMENT '仓库位置（每个流水记录的位置）',
    remark VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES company(company_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES product(product_id),
    FOREIGN KEY (inventory_id) REFERENCES inventory_item(inventory_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='库存流水表';

-- =========================
-- 4. 银行与对账
-- =========================

CREATE TABLE IF NOT EXISTS bank_account (
    bank_account_id CHAR(36) PRIMARY KEY,
    company_id CHAR(36) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    bank_name VARCHAR(100) NOT NULL,
    currency VARCHAR(10) DEFAULT 'CNY',
    initial_balance DECIMAL(18,2) DEFAULT 0 COMMENT '初始余额',
    remark VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES company(company_id) ON DELETE CASCADE,
    UNIQUE KEY uq_bank_account_company_number (company_id, account_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='银行账户表';

CREATE TABLE IF NOT EXISTS bank_statement (
    statement_id CHAR(36) PRIMARY KEY,
    company_id CHAR(36) NOT NULL,
    bank_account_id CHAR(36) NOT NULL,
    date DATE NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    type ENUM('Credit','Debit') NOT NULL,
    balance DECIMAL(18,2),
    description VARCHAR(255),
    is_reconciled BOOLEAN DEFAULT FALSE COMMENT '是否已对账',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES company(company_id) ON DELETE CASCADE,
    FOREIGN KEY (bank_account_id) REFERENCES bank_account(bank_account_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='银行流水表';

CREATE TABLE IF NOT EXISTS reconciliation (
    recon_id CHAR(36) PRIMARY KEY,
    company_id CHAR(36) NOT NULL,
    bank_statement_id CHAR(36) NOT NULL,
    journal_id CHAR(36) NOT NULL,
    matched_amount DECIMAL(18,2) NOT NULL,
    match_date DATE NOT NULL,
    remark VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES company(company_id) ON DELETE CASCADE,
    FOREIGN KEY (bank_statement_id) REFERENCES bank_statement(statement_id) ON DELETE CASCADE,
    FOREIGN KEY (journal_id) REFERENCES journal_entry(journal_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='对账表';

-- =========================
-- 5. 存储过程：更新科目及其父级余额（安全实现）
-- =========================

DELIMITER $$
DROP PROCEDURE IF EXISTS sp_update_account_hierarchy$$
CREATE PROCEDURE sp_update_account_hierarchy(
    IN p_account_id CHAR(36),
    IN p_delta_debit DECIMAL(18,2),
    IN p_delta_credit DECIMAL(18,2)
)
BEGIN
    DECLARE v_curr CHAR(36);
    DECLARE v_parent CHAR(36);
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_parent = NULL;

    SET v_curr = p_account_id;

    WHILE v_curr IS NOT NULL DO
        UPDATE account
        SET balance_debit = COALESCE(balance_debit,0) + p_delta_debit,
            balance_credit = COALESCE(balance_credit,0) + p_delta_credit
        WHERE account_id = v_curr;

        SELECT parent_id INTO v_parent FROM account WHERE account_id = v_curr LIMIT 1;
        SET v_curr = v_parent;
    END WHILE;
END$$
DELIMITER ;

-- =========================
-- 6. 触发器：ledger_line -> 更新 journal totals 与 account 缓存（insert/update/delete）
-- =========================

DELIMITER $$
DROP TRIGGER IF EXISTS trg_ledger_after_insert$$
CREATE TRIGGER trg_ledger_after_insert
AFTER INSERT ON ledger_line
FOR EACH ROW
BEGIN
    -- 更新 account 及其父级余额
    CALL sp_update_account_hierarchy(NEW.account_id, NEW.debit, NEW.credit);

    -- 更新 journal totals
    UPDATE journal_entry
    SET total_debit = (
        SELECT COALESCE(SUM(debit),0) FROM ledger_line WHERE journal_id = NEW.journal_id
    ), total_credit = (
        SELECT COALESCE(SUM(credit),0) FROM ledger_line WHERE journal_id = NEW.journal_id
    )
    WHERE journal_id = NEW.journal_id;
END$$

DROP TRIGGER IF EXISTS trg_ledger_after_update$$
CREATE TRIGGER trg_ledger_after_update
AFTER UPDATE ON ledger_line
FOR EACH ROW
BEGIN
    IF OLD.account_id <> NEW.account_id THEN
        -- 回退旧科目
        CALL sp_update_account_hierarchy(OLD.account_id, -OLD.debit, -OLD.credit);
        -- 增加新科目
        CALL sp_update_account_hierarchy(NEW.account_id, NEW.debit, NEW.credit);
    ELSE
        -- 同科目按差额更新
        CALL sp_update_account_hierarchy(NEW.account_id, NEW.debit - OLD.debit, NEW.credit - OLD.credit);
    END IF;

    -- 更新 journal totals
    UPDATE journal_entry
    SET total_debit = (
        SELECT COALESCE(SUM(debit),0) FROM ledger_line WHERE journal_id = NEW.journal_id
    ), total_credit = (
        SELECT COALESCE(SUM(credit),0) FROM ledger_line WHERE journal_id = NEW.journal_id
    )
    WHERE journal_id = NEW.journal_id;
END$$

DROP TRIGGER IF EXISTS trg_ledger_after_delete$$
CREATE TRIGGER trg_ledger_after_delete
AFTER DELETE ON ledger_line
FOR EACH ROW
BEGIN
    -- 回退余额
    CALL sp_update_account_hierarchy(OLD.account_id, -OLD.debit, -OLD.credit);

    -- 更新 journal totals
    UPDATE journal_entry
    SET total_debit = (
        SELECT COALESCE(SUM(debit),0) FROM ledger_line WHERE journal_id = OLD.journal_id
    ), total_credit = (
        SELECT COALESCE(SUM(credit),0) FROM ledger_line WHERE journal_id = OLD.journal_id
    )
    WHERE journal_id = OLD.journal_id;
END$$
DELIMITER ;

-- =========================
-- 7. 触发器：journal_entry 过账前检查（posted 从 false->true）
-- =========================

DELIMITER $$
DROP TRIGGER IF EXISTS trg_journal_before_update$$
CREATE TRIGGER trg_journal_before_update
BEFORE UPDATE ON journal_entry
FOR EACH ROW
BEGIN
    DECLARE v_debit DECIMAL(18,2) DEFAULT 0;
    DECLARE v_credit DECIMAL(18,2) DEFAULT 0;

    IF (OLD.posted = FALSE OR OLD.posted IS NULL) AND (NEW.posted = TRUE) THEN
        IF NEW.posted_by IS NULL THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Posting requires posted_by to be set';
        END IF;

        SELECT COALESCE(SUM(debit),0), COALESCE(SUM(credit),0)
        INTO v_debit, v_credit
        FROM ledger_line WHERE journal_id = NEW.journal_id;

        IF v_debit <> v_credit THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot post journal: debits != credits';
        END IF;

        SET NEW.total_debit = v_debit;
        SET NEW.total_credit = v_credit;
    END IF;
END$$
DELIMITER ;

-- =========================
-- 8. 触发器：订单总金额自动维护（PO / SO items insert/update/delete）
-- =========================

DELIMITER $$
DROP TRIGGER IF EXISTS trg_update_po_total_after_insert$$
DROP TRIGGER IF EXISTS trg_update_po_total_after_update$$
DROP TRIGGER IF EXISTS trg_update_po_total_after_delete$$
DROP TRIGGER IF EXISTS trg_update_so_total_after_insert$$
DROP TRIGGER IF EXISTS trg_update_so_total_after_update$$
DROP TRIGGER IF EXISTS trg_update_so_total_after_delete$$

CREATE TRIGGER trg_update_po_total_after_insert
AFTER INSERT ON purchase_order_item
FOR EACH ROW
BEGIN
    UPDATE purchase_order
    SET total_amount = (
        SELECT COALESCE(SUM(subtotal),0)
        FROM purchase_order_item
        WHERE purchase_order_id = NEW.purchase_order_id
    )
    WHERE po_id = NEW.purchase_order_id;
END$$

CREATE TRIGGER trg_update_po_total_after_update
AFTER UPDATE ON purchase_order_item
FOR EACH ROW
BEGIN
    UPDATE purchase_order
    SET total_amount = (
        SELECT COALESCE(SUM(subtotal),0)
        FROM purchase_order_item
        WHERE purchase_order_id = NEW.purchase_order_id
    )
    WHERE po_id = NEW.purchase_order_id;
END$$

CREATE TRIGGER trg_update_po_total_after_delete
AFTER DELETE ON purchase_order_item
FOR EACH ROW
BEGIN
    UPDATE purchase_order
    SET total_amount = (
        SELECT COALESCE(SUM(subtotal),0)
        FROM purchase_order_item
        WHERE purchase_order_id = OLD.purchase_order_id
    )
    WHERE po_id = OLD.purchase_order_id;
END$$

CREATE TRIGGER trg_update_so_total_after_insert
AFTER INSERT ON sales_order_item
FOR EACH ROW
BEGIN
    UPDATE sales_order
    SET total_amount = (
        SELECT COALESCE(SUM(subtotal),0)
        FROM sales_order_item
        WHERE sales_order_id = NEW.sales_order_id
    )
    WHERE so_id = NEW.sales_order_id;
END$$

CREATE TRIGGER trg_update_so_total_after_update
AFTER UPDATE ON sales_order_item
FOR EACH ROW
BEGIN
    UPDATE sales_order
    SET total_amount = (
        SELECT COALESCE(SUM(subtotal),0)
        FROM sales_order_item
        WHERE sales_order_id = NEW.sales_order_id
    )
    WHERE so_id = NEW.sales_order_id;
END$$

CREATE TRIGGER trg_update_so_total_after_delete
AFTER DELETE ON sales_order_item
FOR EACH ROW
BEGIN
    UPDATE sales_order
    SET total_amount = (
        SELECT COALESCE(SUM(subtotal),0)
        FROM sales_order_item
        WHERE sales_order_id = OLD.sales_order_id
    )
    WHERE so_id = OLD.sales_order_id;
END$$

DELIMITER ;

-- =========================
-- 9. 触发器：库存流水 -> 更新 inventory_item.quantity（支持 insert/update/delete）
-- =========================

DELIMITER $$
DROP TRIGGER IF EXISTS trg_update_inventory_after_insert$$
DROP TRIGGER IF EXISTS trg_update_inventory_after_update$$
DROP TRIGGER IF EXISTS trg_update_inventory_after_delete$$

CREATE TRIGGER trg_update_inventory_after_insert
AFTER INSERT ON inventory_transaction
FOR EACH ROW
BEGIN
    UPDATE inventory_item
    SET quantity = (
        SELECT COALESCE(SUM(
            CASE WHEN type = 'IN' THEN quantity
                 WHEN type = 'OUT' THEN -quantity
                 ELSE 0 END
        ),0)
        FROM inventory_transaction
        WHERE product_id = NEW.product_id AND company_id = NEW.company_id
    ), updated_at = NOW()
    WHERE product_id = NEW.product_id AND company_id = NEW.company_id;
END$$

CREATE TRIGGER trg_update_inventory_after_update
AFTER UPDATE ON inventory_transaction
FOR EACH ROW
BEGIN
    -- 若 product/company 改变，需刷新旧的与新的库存
    IF OLD.product_id <> NEW.product_id OR OLD.company_id <> NEW.company_id THEN
        UPDATE inventory_item
        SET quantity = (
            SELECT COALESCE(SUM(
                CASE WHEN type = 'IN' THEN quantity
                     WHEN type = 'OUT' THEN -quantity
                     ELSE 0 END
            ),0)
            FROM inventory_transaction
            WHERE product_id = OLD.product_id AND company_id = OLD.company_id
        ), updated_at = NOW()
        WHERE product_id = OLD.product_id AND company_id = OLD.company_id;

        UPDATE inventory_item
        SET quantity = (
            SELECT COALESCE(SUM(
                CASE WHEN type = 'IN' THEN quantity
                     WHEN type = 'OUT' THEN -quantity
                     ELSE 0 END
            ),0)
            FROM inventory_transaction
            WHERE product_id = NEW.product_id AND company_id = NEW.company_id
        ), updated_at = NOW()
        WHERE product_id = NEW.product_id AND company_id = NEW.company_id;
    ELSE
        UPDATE inventory_item
        SET quantity = (
            SELECT COALESCE(SUM(
                CASE WHEN type = 'IN' THEN quantity
                     WHEN type = 'OUT' THEN -quantity
                     ELSE 0 END
            ),0)
            FROM inventory_transaction
            WHERE product_id = NEW.product_id AND company_id = NEW.company_id
        ), updated_at = NOW()
        WHERE product_id = NEW.product_id AND company_id = NEW.company_id;
    END IF;
END$$

CREATE TRIGGER trg_update_inventory_after_delete
AFTER DELETE ON inventory_transaction
FOR EACH ROW
BEGIN
    UPDATE inventory_item
    SET quantity = (
        SELECT COALESCE(SUM(
            CASE WHEN type = 'IN' THEN quantity
                 WHEN type = 'OUT' THEN -quantity
                 ELSE 0 END
        ),0)
        FROM inventory_transaction
        WHERE product_id = OLD.product_id AND company_id = OLD.company_id
    ), updated_at = NOW()
    WHERE product_id = OLD.product_id AND company_id = OLD.company_id;
END$$

DELIMITER ;

-- =========================
-- 10. 实用存储过程：重算 totals / 重算余额 / 重算库存
-- =========================

DELIMITER $$
DROP PROCEDURE IF EXISTS sp_recalc_journal_totals$$
CREATE PROCEDURE sp_recalc_journal_totals(IN p_journal_id CHAR(36))
BEGIN
    UPDATE journal_entry
    SET total_debit = (SELECT COALESCE(SUM(debit),0) FROM ledger_line WHERE journal_id = p_journal_id),
        total_credit = (SELECT COALESCE(SUM(credit),0) FROM ledger_line WHERE journal_id = p_journal_id)
    WHERE journal_id = p_journal_id;
END$$

DROP PROCEDURE IF EXISTS sp_recalc_all_account_balances$$
CREATE PROCEDURE sp_recalc_all_account_balances()
BEGIN
    -- 清空缓存余额
    UPDATE account SET balance_debit = 0, balance_credit = 0;

    -- 按 account 聚合 ledger_line 的借贷并写入
    UPDATE account a
    JOIN (
        SELECT account_id, COALESCE(SUM(debit),0) AS s_debit, COALESCE(SUM(credit),0) AS s_credit
        FROM ledger_line
        GROUP BY account_id
    ) t ON a.account_id = t.account_id
    SET a.balance_debit = t.s_debit, a.balance_credit = t.s_credit;
    -- 注意：父级合计可通过 sp_update_account_hierarchy 在需要时累加
END$$

DROP PROCEDURE IF EXISTS sp_recalc_all_inventory$$
CREATE PROCEDURE sp_recalc_all_inventory()
BEGIN
    UPDATE inventory_item i
    SET i.quantity = (
        SELECT COALESCE(SUM(CASE WHEN type = 'IN' THEN quantity WHEN type = 'OUT' THEN -quantity ELSE 0 END),0)
        FROM inventory_transaction t
        WHERE t.product_id = i.product_id AND t.company_id = i.company_id
    ), i.updated_at = NOW();
END$$
DELIMITER ;

-- =========================
-- 完成
-- =========================

SET FOREIGN_KEY_CHECKS = 1;
-- End of DDL