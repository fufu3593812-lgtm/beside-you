# Beside You - 数据库设计 V1.0

## 概述

约十来张表，覆盖用户、形象、货币、抽卡、互动等核心模块。

---

## 表结构

### 1. users（用户表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| name | VARCHAR(50) | User 名称 |
| created_at | TIMESTAMP | 注册时间 |
| last_login | TIMESTAMP | 最后登录 |
| intimacy | INT | 亲密度 |
| coins | INT | 金币 |
| encounter_coins | INT | 心动币 |

### 2. user_appearance（形象表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 关联用户 |
| hair_style | VARCHAR(30) | 当前发型 |
| hair_color | VARCHAR(10) | 当前发色 |
| outfit_id | UUID | 当前服装 |
| accessory_ids | JSON | 当前配饰列表 |

### 3. outfits（服装表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| name | VARCHAR(50) | 服装名称 |
| category | ENUM | 居家/休闲/日常/约会/职场/睡衣 |
| rarity | ENUM | 稀有度 N/R/SR/SSR |
| image_url | VARCHAR(255) | 素材路径 |
| price | INT | 购买价格（0=不可购买） |

### 4. accessories（配饰表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| name | VARCHAR(50) | 配饰名称 |
| type | ENUM | 眼镜/耳环/项链/发夹/... |
| rarity | ENUM | 稀有度 |
| image_url | VARCHAR(255) | 素材路径 |
| price | INT | 购买价格 |

### 5. user_inventory（背包表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 关联用户 |
| item_type | ENUM | outfit/accessory/merch |
| item_id | UUID | 物品ID |
| obtained_at | TIMESTAMP | 获得时间 |
| source | VARCHAR(30) | 来源（抽卡/购买/签到） |

### 6. gacha_pool（卡池表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| name | VARCHAR(50) | 卡池名称 |
| type | ENUM | 常驻/限定/梦境 |
| start_time | TIMESTAMP | 开始时间 |
| end_time | TIMESTAMP | 结束时间 |
| items | JSON | 卡池内容及概率 |

### 7. gacha_log（抽卡记录）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 关联用户 |
| pool_id | UUID | 卡池 |
| item_id | UUID | 抽到的物品 |
| rarity | ENUM | 稀有度 |
| created_at | TIMESTAMP | 抽卡时间 |

### 8. daily_stats（每日统计）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 关联用户 |
| date | DATE | 日期 |
| online_minutes | INT | 在线时长（分钟） |
| checkin | BOOLEAN | 是否签到 |
| checkin_streak | INT | 连续签到天数 |

### 9. story_progress（剧情进度）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 关联用户 |
| chapter | INT | 当前章节 |
| node | VARCHAR(50) | 当前节点 |
| choices | JSON | 历史选择 |

### 10. community_messages（社区消息）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 发送者 |
| content | TEXT | 消息内容 |
| created_at | TIMESTAMP | 发送时间 |

---

## 设计原则

- 形象相关拆层：基础体型 → 发型 → 服装 → 配饰，自由组合
- 货币双轨：金币（日常）+ 心动币（抽卡）
- 所有物品统一走背包表，方便管理来源和去向
- 抽卡记录独立，方便保底计算
