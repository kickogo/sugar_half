# 蛋糕工作室小程序 MVP 实施指南

> 本文档定义 MVP 阶段的功能范围、技术架构、数据库设计、API 规范和前端设计。
> 原设计文档保留作为完整规划蓝图，本文档聚焦当前 MVP 实施。

---

## 1. 项目概述

### 1.1 MVP 目标

打造一个可运行的蛋糕在线展示和下单小程序，用于验证业务模式和收集用户反馈。

### 1.2 MVP 功能范围

| 模块 | 功能 |
|------|------|
| 商品展示 | 分类列表、商品列表、商品详情（含多图） |
| 规格选择 | 三级规格联动：尺寸 + 夹馅 + 奶油 |
| 下单购买 | 创建订单、模拟支付、订单完成 |
| 预约取货 | 灵活预约时间（用户自选，商家确认） |
| 商家管理 | 手机号登录、订单查看、订单确认 |

### 1.3 暂不做功能（记录到产品计划）

- 地址管理
- 手机号登录（用户侧）
- 优惠券/积分/会员余额
- 动态夹馅配置（商家后台）
- 配送服务

---

## 2. 技术架构

### 2.1 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | 微信小程序（Skyline + glass-easel） |
| 后端 | 微信云开发（云函数 + 云数据库） |
| 数据库 | MongoDB（云开发提供） |
| 支付 | 微信支付（模拟） |

### 2.2 云函数目录结构

```
cloudfunctions/
├── user/
│   ├── login/           # 微信登录（openid 自动关联）
│   └── adminLogin/      # 商家手机号登录
├── product/
│   ├── getCategories/   # 获取分类列表
│   ├── getList/         # 获取商品列表
│   └── getDetail/       # 获取商品详情（含 SKU）
├── order/
│   ├── create/          # 创建订单
│   ├── pay/             # 获取支付参数（模拟）
│   ├── payCallback/     # 支付回调（模拟直接成功）
│   ├── getList/         # 获取订单列表
│   ├── getDetail/       # 获取订单详情
│   └── confirm/         # 商家确认订单
└── admin/
    └── getOrders/       # 商家获取订单（按状态筛选）
```

**共 12 个云函数**

### 2.3 数据库集合

| 集合名 | 说明 |
|--------|------|
| `users` | 用户/商家账号 |
| `categories` | 商品分类 |
| `products` | 商品主数据 |
| `fills` | 夹馅选项（初始 8 种） |
| `sku_items` | SKU 主数据（含价格） |
| `orders` | 订单主表 |
| `order_items` | 订单明细 |

### 2.4 系统架构图

```
┌─────────────────────────────────────────────────────────┐
│                    微信小程序客户端                       │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│  │ 用户模块 │  │商品模块  │  │订单模块  │  │商家模块  │    │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘    │
│       └────────────┴────────────┴────────────┘          │
│                         │                                │
│              wx.cloud.callFunction                       │
└─────────────────────────┼───────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    微信云开发平台                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │              云函数层（12个）                     │    │
│  └─────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────┐    │
│  │         云数据库层（7 个集合）                     │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

## 3. 数据库设计

### 3.1 users（用户/商家集合）

```javascript
{
  _id: ObjectId,
  openid: String,           // 微信 openid（唯一）
  phone: String,            // 手机号（商家登录用）
  nickname: String,         // 微信昵称
  avatar: String,          // 微信头像
  is_admin: Boolean,       // 是否商家
  created_at: Date,
  updated_at: Date
}
```

**索引**：`openid`（唯一）、`phone`

---

### 3.2 categories（分类集合）

```javascript
{
  _id: ObjectId,
  name: String,            // 分类名称
  sort: Number,             // 排序
  icon: String,             // 图标 URL
  status: Number            // 1-启用 0-禁用
}
```

---

### 3.3 products（商品集合）

```javascript
{
  _id: ObjectId,
  category_id: ObjectId,    // 关联分类
  name: String,             // 商品名称
  description: String,      // 图文详情（富文本）
  images: [String],         // 图片列表
  base_price: Number,       // 基准价格（分）
  status: Number,           // 1-上架 0-下架
  created_at: Date
}
```

---

### 3.4 fills（夹馅选项集合）

```javascript
{
  _id: ObjectId,
  name: String,             // 夹馅名称
  price_mod: Number,        // 加价（分）
  sort: Number,            // 排序
  status: Number            // 1-启用 0-禁用
}
```

**初始数据（8 种）**：
- 布丁（+5 元）
- 香芋/芋泥（+8 元）
- 麻薯（+6 元）
- 黑糖珍珠（+8 元）
- 巧克力脆麦片（+10 元）
- 水果（罐装）（+12 元）
- 草莓果酱（+6 元）

---

### 3.5 sku_items（SKU 集合）

```javascript
{
  _id: ObjectId,
  product_id: ObjectId,     // 商品 ID
  sku_key: String,          // SKU 唯一标识，如 "size_8寸_fill_布丁-香芋_cream_动物"
  sku_name: String,         // 展示名称，如 "8寸 | 布丁+香芋 | 动物奶油"
  size: String,             // 尺寸值，如 "8寸"
  fills: [String],          // 夹馅数组，如 ["布丁", "香芋"]，按 sort 排序
  cream: String,            // 奶油类型，如 "动物"
  price: Number,            // 最终价格（分）
  stock: Number,            // 库存数量
  status: Number            // 1-有货 0-缺货
}
```

**索引**：`product_id`、`sku_key`（唯一）

---

### 3.6 orders（订单集合）

```javascript
{
  _id: ObjectId,
  order_no: String,         // 订单号（唯一）
  user_id: ObjectId,        // 用户 ID
  status: Number,           // 0-待付款 1-已支付 2-已完成 3-已取消
  total_amount: Number,     // 订单总金额（分）
  pay_amount: Number,       // 实付金额（分）
  pay_time: Date,           // 支付时间
  delivery_type: Number,    // 固定 1（到店自提）
  reservation_date: String,  // 预约日期 "YYYY-MM-DD"
  reservation_time: String, // 预约时间 "HH:MM"
  remark: String,           // 用户备注
  created_at: Date,
  updated_at: Date
}
```

**索引**：`order_no`（唯一）、`user_id`、`status`、`created_at`

---

### 3.7 order_items（订单明细集合）

```javascript
{
  _id: ObjectId,
  order_id: ObjectId,       // 订单 ID
  product_id: ObjectId,      // 商品 ID
  product_name: String,     // 商品名称快照
  sku_id: ObjectId,          // SKU ID
  sku_name: String,         // SKU 名称快照
  price: Number,            // 单价（分）
  quantity: Number          // 数量
}
```

---

## 4. API 设计

### 4.1 user.login - 微信登录

**请求**：
```javascript
{ code: String }  // 微信授权 code
```

**响应**：
```javascript
{
  success: true,
  data: {
    user_id: String,
    openid: String,
    nickname: String,
    is_admin: Boolean,
    token: String
  }
}
```

---

### 4.2 user.adminLogin - 商家手机号登录

**请求**：
```javascript
{ phone: String }  // 手机号（验证码暂跳过）
```

**响应**：
```javascript
{
  success: true,
  data: {
    user_id: String,
    phone: String,
    is_admin: true,
    token: String
  }
}
```

---

### 4.3 product.getCategories - 获取分类

**请求**：无

**响应**：
```javascript
{
  success: true,
  data: [
    { id: "xxx", name: "生日蛋糕", sort: 1, icon: "https://..." },
    { id: "xxx", name: "下午茶", sort: 2, icon: "https://..." }
  ]
}
```

---

### 4.4 product.getList - 获取商品列表

**请求**：
```javascript
{ category_id: String }  // 可选
```

**响应**：
```javascript
{
  success: true,
  data: {
    list: [
      { id: "xxx", name: "草莓慕斯", image: "https://...", price: 26800, tags: ["爆款"] }
    ],
    total: 10
  }
}
```

---

### 4.5 product.getDetail - 获取商品详情

**请求**：
```javascript
{ id: String }
```

**响应**：
```javascript
{
  success: true,
  data: {
    id: "xxx",
    name: "草莓慕斯",
    description: "...",
    images: ["https://..."],
    base_price: 26800,
    fills: [                    // 可选夹馅列表
      { id: "xxx", name: "布丁", price_mod: 500 }
    ],
    skus: [
      {
        sku_id: "xxx",
        sku_key: "size_8寸_fill_布丁_cream_动物",
        sku_name: "8寸 | 布丁 | 动物奶油",
        price: 31800,
        stock: 10,
        status: 1
      }
    ]
  }
}
```

---

### 4.6 order.create - 创建订单

**请求**：
```javascript
{
  user_id: String,
  items: [{
    sku_id: String,
    quantity: Number
  }],
  reservation_date: String,  // "YYYY-MM-DD"
  reservation_time: String,  // "HH:MM"
  remark: String
}
```

**响应**：
```javascript
{
  success: true,
  data: {
    order_id: String,
    order_no: String,
    total_amount: Number
  }
}
```

---

### 4.7 order.pay - 获取支付参数（模拟）

**请求**：
```javascript
{ order_id: String, user_id: String }
```

**响应**：
```javascript
{
  success: true,
  data: {
    mock: true,  // 标记为模拟支付
    order_id: String,
    order_no: String
  }
}
```

---

### 4.8 order.payCallback - 支付回调（模拟）

**处理逻辑**：
- 直接返回成功，不做真实支付验证
- 更新订单状态为 `1-已支付`
- 记录支付时间

---

### 4.9 order.getList - 获取订单列表

**请求**：
```javascript
{
  user_id: String,
  is_admin: Boolean,   // 是否商家
  status: Number,     // 可选，商家筛选用
  page: Number,
  page_size: Number
}
```

**响应**：
```javascript
{
  success: true,
  data: {
    list: [...],
    total: Number,
    page: Number,
    page_size: Number
  }
}
```

---

### 4.10 order.getDetail - 获取订单详情

**请求**：
```javascript
{ order_id: String, user_id: String }
```

---

### 4.11 order.confirm - 商家确认订单

**请求**：
```javascript
{ order_id: String, user_id: String }
```

**处理**：更新订单状态为 `2-已完成`

---

### 4.11 admin.getOrders - 商家获取所有订单

**请求**：
```javascript
{
  user_id: String,
  status: Number,    // 0-全部 1-待处理 2-已完成 3-已取消
  page: Number,
  page_size: Number
}
```

---

## 5. 前端设计

### 5.1 页面结构

| 页面 | 路径 | 说明 |
|------|------|------|
| 首页 | `pages/index/index` | Banner + 分类入口 + 商品列表 |
| 分类 | `pages/category/index` | 按分类查看商品 |
| 商品详情 | `pages/product/index` | 多图 + 规格选择 + SKU |
| 订单确认 | `pages/order/index` | 确认商品 + 取货时间 |
| 支付 | `pages/payment/index` | 模拟支付流程 |
| 我的（用户） | `pages/my/index` | 用户订单列表 |
| 商家后台 | `pages/admin/index` | 商家订单管理 |

### 5.2 规格选择交互

**三级规格联动**：

1. **尺寸**：单选（4寸/6寸/8寸/10寸）
2. **夹馅**：多选（0-2 种），从可选列表中选择
3. **奶油**：单选（动物/植脂）

**SKU 匹配逻辑**：
- 用户选择后，组合 `尺寸_fill_夹馅_cream_奶油` 作为 sku_key
- 前端直接匹配已有 SKU 显示价格
- 如果组合不存在（库存为 0），提示用户重新选择

**规格选择示意**：
```
尺寸：[4寸] [6寸] [8寸] [10寸]
夹馅：[布丁] [香芋] [麻薯] [黑糖珍珠] ...
奶油：[动物奶油] [植脂奶油]

已选：8寸 | 布丁 + 香芋 | 动物奶油
价格：¥318.00
```

---

### 5.3 预约时间选择

**交互流程**：
1. 用户点击"选择取货时间"
2. 弹出日期选择器（只能选今天及以后）
3. 用户输入期望的时间（如"14:00"）
4. 备注可填（如"需要蜡烛"）

**数据存储**：
- `reservation_date`: "2024-01-15"
- `reservation_time`: "14:00"

---

### 5.4 模拟支付流程

**交互流程**：
1. 用户点击"去支付"
2. 显示 `1.5秒` 加载动画："支付中..."
3. 动画结束，跳转成功页
4. 订单状态变为"已支付，待确认"

**订单状态展示**：
- 待付款（0）→ 已支付（1）→ 已完成（2）
- 用户可见状态：待付款、已支付、已完成、已取消

---

### 5.5 商家订单管理

**入口**：我的页面 → 商家入口（手机号登录）

**功能**：
- 订单列表（按状态筛选：全部/待确认/已完成/已取消）
- 订单详情（查看商品、预约时间、联系方式）
- 一键确认（将订单状态从"已支付"改为"已完成"）

---

## 6. 模拟数据

### 6.1 分类数据

| name | sort | icon |
|------|------|------|
| 生日蛋糕 | 1 | 蛋糕图标 |
| 下午茶 | 2 | 茶杯图标 |

### 6.2 商品数据

| name | category | description | base_price |
|------|----------|-------------|------------|
| 草莓慕斯 | 生日蛋糕 | 经典草莓慕斯蛋糕... | 26800 |
| 巧克力浓郁 | 生日蛋糕 | 浓郁巧克力风味... | 29800 |

### 6.3 夹馅数据

| name | price_mod | sort |
|------|-----------|------|
| 布丁 | 500 | 1 |
| 香芋/芋泥 | 800 | 2 |
| 麻薯 | 600 | 3 |
| 黑糖珍珠 | 800 | 4 |
| 巧克力脆麦片 | 1000 | 5 |
| 水果（罐装） | 1200 | 6 |
| 草莓果酱 | 600 | 7 |

### 6.4 SKU 示例（草莓慕斯）

| size | fills | cream | price |
|------|-------|-------|-------|
| 6寸 | 无 | 动物 | 26800 |
| 6寸 | 无 | 植脂 | 24800 |
| 6寸 | 布丁 | 动物 | 27300 |
| 6寸 | 布丁+香芋 | 动物 | 28100 |
| 8寸 | 无 | 动物 | 32800 |
| 8寸 | 无 | 植脂 | 30800 |
| 8寸 | 布丁 | 动物 | 33300 |
| 8寸 | 布丁+香芋 | 动物 | 34100 |
| 10寸 | 无 | 动物 | 42800 |
| ... | ... | ... | ... |

---

## 7. 订单状态流转

```
[0-待付款]
    │
    │ 用户点击支付（模拟）
    ▼
[1-已支付]
    │
    │ 商家确认
    ▼
[2-已完成]
    │
    │ （可扩展：超时未取 / 退款等）
    ▼
[3-已取消]
```

---

## 8. 开发任务拆分

### 后端任务

| 优先级 | 任务 | 说明 |
|--------|------|------|
| P0 | 用户登录 | openid 获取、商家判断 |
| P0 | 商品查询 | 分类、商品列表、商品详情 |
| P0 | SKU 价格 | 根据规格组合返回价格 |
| P0 | 订单创建 | 含库存校验、订单号生成 |
| P0 | 模拟支付 | 支付回调直接成功 |
| P0 | 商家登录 | 手机号登录，验证码暂跳过 |
| P0 | 商家订单 | 按状态筛选、订单确认 |
| P1 | 订单列表 | 用户/商家各自的订单列表 |
| P1 | 订单详情 | 订单明细查询 |

### 前端任务

| 优先级 | 任务 | 说明 |
|--------|------|------|
| P0 | 项目框架 | Skyline + glass-easel 配置 |
| P0 | 首页 | Banner + 分类 + 商品列表 |
| P0 | 商品详情 | 三级规格选择 + SKU 联动 |
| P0 | 订单确认 | 商品汇总 + 取货时间 |
| P0 | 模拟支付 | 1-2秒 loading + 成功跳转 |
| P0 | 商家后台 | 订单列表 + 筛选 + 确认 |
| P1 | 分类页 | 按分类查看商品 |
| P1 | 我的订单 | 用户订单列表 |

### 测试任务

| 优先级 | 任务 | 说明 |
|--------|------|------|
| P0 | 模拟数据初始化 | 分类、商品、SKU、夹馅 |
| P0 | 商品查询测试 | 分类列表、商品列表、商品详情 |
| P0 | 下单流程测试 | 创建订单 + 模拟支付 + 订单查询 |
| P0 | 商家功能测试 | 登录、订单列表、订单确认 |
| P1 | 规格联动测试 | SKU 选择、价格计算 |
| P1 | 状态流转测试 | 订单各状态转换 |

---

## 9. 目录结构

### 9.1 后端（云函数）

```
cloudfunctions/
├── user/
│   ├── login/
│   └── adminLogin/
├── product/
│   ├── getCategories/
│   ├── getList/
│   └── getDetail/
├── order/
│   ├── create/
│   ├── pay/
│   ├── payCallback/
│   ├── getList/
│   ├── getDetail/
│   └── confirm/
└── admin/
    └── getOrders/
```

### 9.2 前端（小程序）

```
miniprogram/
├── app.js
├── app.json
├── components/
│   ├── navigation-bar/
│   ├── time-picker/
│   └── spec-selector/
├── pages/
│   ├── index/
│   ├── category/
│   ├── product/
│   ├── order/
│   ├── payment/
│   ├── my/
│   └── admin/
└── services/
    ├── api.js
    ├── auth.js
    └── payment.js
```

---

## 10. 更新记录

| 日期 | 版本 | 更新内容 |
|------|------|---------|
| 2026-05-10 | v1.0 | 初始版本，MVP 实施指南 |