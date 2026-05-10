# 蛋糕工作室小程序 - 系统架构文档

## 1. 项目概述

### 1.1 项目背景
蛋糕工作室微信小程序，面向烘焙工作室的在线销售与预约管理平台。

### 1.2 MVP功能范围
- 店铺信息展示
- 蛋糕画册（商品列表 + 详情）
- 规格选择（尺寸/口味/配件）
- 时间预约系统（含SKU独立库存）
- 微信支付
- 用户账号体系
- 到店自提 / 同城配送

### 1.3 技术选型
| 层级 | 技术方案 |
|------|----------|
| 前端 | 微信小程序原生 + Skyline渲染器 + glass-easel |
| 后端 | 微信云开发（CloudBase） |
| 数据库 | 云数据库 MongoDB（CloudBase提供） |
| 云函数 | 微信云函数 |
| 支付 | 微信支付 |
| 文件存储 | 云存储 |

---

## 2. 系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        微信小程序客户端                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │  用户模块 │  │  商品模块 │  │  订单模块 │  │  预约模块 │         │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘         │
│       │             │             │             │                │
│  ┌────┴─────────────┴─────────────┴─────────────┴────┐         │
│  │                    API 调用层                       │         │
│  │         wx.cloud.callFunction / wx.request         │         │
│  └────────────────────────┬────────────────────────────┘         │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      微信云开发平台                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                      云函数层                            │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │   │
│  │  │用户函数  │ │商品函数  │ │订单函数  │ │预约函数  │         │   │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘         │   │
│  └───────┼───────────┼───────────┼───────────┼───────────────┘   │
│  ┌───────┴───────────┴───────────┴───────────┴───────────────┐   │
│  │                     云数据库层                            │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │   │
│  │  │  用户   │ │  商品   │ │  订单   │ │  预约   │         │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘         │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 数据库设计

### 3.1 集合总览

| 集合名 | 说明 |
|--------|------|
| `users` | 用户账号信息 |
| `categories` | 蛋糕分类 |
| `products` | 蛋糕商品（含规格） |
| `specs` | 规格选项（尺寸/口味等） |
| `sku_stock` | SKU库存管理 |
| `orders` | 订单主表 |
| `order_items` | 订单明细 |
| `reservations` | 预约时间表 |
| `addresses` | 用户收货地址 |

---

### 3.2 详细数据结构

#### 3.2.1 users（用户集合）

```javascript
{
  _id: ObjectId,              // 用户ID
  openid: String,              // 微信openid（唯一）
  phone: String,               // 授权手机号
  nickname: String,            // 微信昵称
  avatar: String,              // 微信头像URL
  member_level: Number,       // 会员等级（默认1）
  balance: Number,            // 账户余额（分为单位）
  points: Number,             // 积分
  created_at: Date,
  updated_at: Date
}
```

**索引**：`openid`（唯一）、`phone`

---

#### 3.2.2 categories（分类集合）

```javascript
{
  _id: ObjectId,
  name: String,                // 分类名称
  sort: Number,                // 排序
  icon: String,                // 图标URL
  status: Number               // 1-启用 0-禁用
}
```

---

#### 3.2.3 products（商品集合）

```javascript
{
  _id: ObjectId,
  category_id: ObjectId,       // 关联分类
  name: String,                // 商品名称
  description: String,         // 图文详情（富文本）
  images: [String],            // 图片列表
  base_price: Number,          // 基准价格（分）
  specifications: [            // 规格选项列表
    {
      name: String,            // 规格名称（如"尺寸"）
      options: [
        { value: String, price_mod: Number }  // 选项值及加价（分）
      ]
    }
  ],
  tags: [String],             // 标签
  status: Number,              // 1-上架 0-下架
  created_at: Date
}
```

---

#### 3.2.4 sku_stock（SKU库存集合）

每个SKU = 商品 + 规格组合的唯一键

```javascript
{
  _id: ObjectId,
  product_id: ObjectId,        // 商品ID
  sku_key: String,             // SKU唯一标识，如 "size_8寸_flavor_草莓"
  sku_name: String,            // 展示名称，如 "8寸 草莓"
  price: Number,               // SKU价格（分）
  stock: Number,               // 库存数量
  reservation_count: Number,   // 已预约数量
  status: Number               // 1-有货 0-缺货
}
```

**索引**：`product_id`、`sku_key`（唯一）、`status`

---

#### 3.2.5 orders（订单主表）

```javascript
{
  _id: ObjectId,
  order_no: String,            // 订单号（唯一）
  user_id: ObjectId,           // 用户ID
  status: Number,              // 订单状态
  // 状态流转：0-待付款 → 1-已付款待确认 → 2-制作中 → 3-待自提/待配送 → 4-已完成 → 5-已取消
  total_amount: Number,        // 订单总金额（分）
  discount_amount: Number,     // 优惠金额（分）
  pay_amount: Number,          // 实付金额（分）
  pay_time: Date,              // 支付时间
  delivery_type: Number,       // 1-到店自提 2-同城配送
  reservation_date: Date,      // 预约日期
  reservation_time_slot: String, // 预约时间段，如 "10:00-12:00"
  // delivery相关字段（delivery_type=2时）
  receiver_name: String,
  receiver_phone: String,
  address: String,             // 完整地址
  // 发票信息
  invoice_type: Number,        // 0-不开发票 1-普通发票 2-增值税发票
  invoice抬头: String,
  remark: String,              // 用户备注
  created_at: Date,
  updated_at: Date
}
```

**索引**：`order_no`（唯一）、`user_id`、`status`、`reservation_date`

---

#### 3.2.6 order_items（订单明细）

```javascript
{
  _id: ObjectId,
  order_id: ObjectId,           // 订单ID
  product_id: ObjectId,         // 商品ID
  sku_id: ObjectId,             // SKU ID
  sku_name: String,            // SKU名称快照
  product_name: String,        // 商品名称快照
  product_image: String,       // 商品图片快照
  price: Number,               // 单价（分）
  quantity: Number,            // 数量
  subtotal: Number             // 小计（分）
}
```

---

#### 3.2.7 reservations（预约时间表）

```javascript
{
  _id: ObjectId,
  date: String,                // 日期 "2024-01-15"
  time_slot: String,           // 时间段 "10:00-12:00"
  capacity: Number,            // 该时段总容量
  reserved_count: Number,      // 已预约数
  status: Number              // 1-可预约 0-已约满
}
```

**索引**：`date` + `time_slot`（复合唯一）

---

#### 3.2.8 addresses（收货地址）

```javascript
{
  _id: ObjectId,
  user_id: ObjectId,
  name: String,
  phone: String,
  province: String,
  city: String,
  district: String,
  detail: String,              // 详细地址
  is_default: Number           // 1-默认 0-否
}
```

---

## 4. 云函数设计

### 4.1 函数总览

| 函数名 | 用途 |
|--------|------|
| `user.login` | 微信登录/注册 |
| `user.getProfile` | 获取用户信息 |
| `user.updateProfile` | 更新用户资料 |
| `user.getAddressList` | 获取收货地址 |
| `user.addAddress` | 新增收货地址 |
| `user.setDefaultAddress` | 设置默认地址 |
| `product.getCategories` | 获取分类列表 |
| `product.getList` | 获取商品列表 |
| `product.getDetail` | 获取商品详情（含SKU） |
| `sku.getStock` | 查询SKU库存 |
| `order.create` | 创建订单 |
| `order.pay` | 发起支付 |
| `order.payCallback` | 支付回调 |
| `order.getList` | 获取订单列表 |
| `order.getDetail` | 获取订单详情 |
| `order.cancel` | 取消订单 |
| `reservation.getSlots` | 获取可用预约时段 |
| `reservation.reserve` | 预约时间段 |

---

### 4.2 核心接口详解

#### 4.2.1 user.login

**入口参数**：微信授权code

**处理流程**：
1. 通过code换取openid
2. 查询users集合，若不存在则创建
3. 返回userInfo + token

**返回**：
```javascript
{
  success: true,
  data: {
    user_id: String,
    openid: String,
    nickname: String,
    phone: String,
    member_level: Number,
    token: String
  }
}
```

---

#### 4.2.2 order.create

**入口参数**：
```javascript
{
  user_id: String,
  items: [{
    sku_id: String,
    quantity: Number
  }],
  delivery_type: Number,      // 1-自提 2-配送
  reservation_date: String,    // "2024-01-15"
  reservation_time_slot: String,
  receiver_id: String,        // 配送时需要
  remark: String
}
```

**处理流程**：
1. 校验用户登录态
2. 校验SKU库存（原子操作，库存不足则创建失败）
3. 计算价格
4. 生成订单号（时间戳+随机数）
5. 写入orders + order_items集合
6. 更新sku_stock.reservation_count（乐观锁）
7. 锁定预约时段

**返回**：
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

**异常处理**：
- 库存不足返回错误
- 并发超卖：数据库原子操作保证
- 预约时段满：返回特定错误码

---

#### 4.2.3 order.pay

**入口参数**：`order_id`

**处理流程**：
1. 校验订单状态（须为待付款）
2. 调用微信支付统一下单
3. 返回支付参数（timeStamp, nonceStr, package, signType, paySign）

---

#### 4.2.4 order.payCallback

**入口参数**：微信支付回调数据

**处理流程**：
1. 验证签名
2. 更新订单状态：待付款 → 已付款待确认
3. 发送订阅消息通知用户
4. 实际库存扣减（reservation_count → stock实际减少）

---

#### 4.2.5 reservation.getSlots

**入口参数**：`date`（日期字符串）

**返回**：
```javascript
{
  success: true,
  data: {
    date: String,
    slots: [
      { time_slot: "09:00-12:00", capacity: 10, reserved: 3, available: true },
      { time_slot: "14:00-17:00", capacity: 10, reserved: 10, available: false },
      { time_slot: "18:00-21:00", capacity: 8, reserved: 2, available: true }
    ]
  }
}
```

---

## 5. 前端架构

### 5.1 页面结构

```
pages/
├── index/                    # 首页（店铺 banner + 分类 + 推荐商品）
├── category/                 # 分类页
├── product/                  # 商品详情页
├── cart/                     # 购物车（未来扩展）
├── order/                    # 订单确认页
├── my/                       # 个人中心
│   ├── orderList/           # 订单列表
│   ├── orderDetail/         # 订单详情
│   ├── address/             # 收货地址管理
│   └── member/              # 会员中心
├── reservation/              # 预约页面
└── payment/                  # 支付页面
```

### 5.2 模块划分

| 模块 | 职责 |
|------|------|
| 用户模块 | 登录、授权手机号、查看个人信息 |
| 商品模块 | 浏览、搜索、查看详情 |
| 购物车 | 暂不开发（第一版直接下单） |
| 订单模块 | 创建订单、支付、取消、查看订单 |
| 预约模块 | 选择日期、时间段 |
| 配送模块 | 地址管理 |

---

## 6. 状态流转

### 6.1 订单状态流转

```
[0-待付款] ──支付成功──→ [1-已付款待确认] ──商家确认──→ [2-制作中]
                              │                              │
                              │ 超时未支付                   │
                              ↓                              ↓
                         [5-已取消]                    [3-待自提/待配送]
                                                          │
                              完成收货 ─────────────────────┘
                                        ↓
                                   [4-已完成]
```

### 6.2 SKU库存流转

```
[有库存] ──用户下单锁定──→ [reservation_count + 1]
[有库存] ──支付成功──→ [stock - 1, reservation_count - 1]
[有库存] ──超时取消──→ [reservation_count - 1]（释放锁定）
```

---

## 7. 安全考虑

### 7.1 鉴权
- 所有云函数调用需携带user_id + token
- token有效期7天
- 敏感操作（支付、退款）需二次验证

### 7.2 防刷
- 下单频率限制：同一用户60秒内最多1单
- 库存校验在云函数端，不暴露真实库存

### 7.3 支付安全
- 支付回调需验证签名
- 金额计算在后端，前端仅传order_id
- 签名使用HMAC-SHA256

---

## 8. 开发任务拆分

### 8.1 后端任务（云函数）

| 优先级 | 任务 | 说明 |
|--------|------|------|
| P0 | 用户登录 | openid获取、注册 |
| P0 | 商品查询 | 分类、商品列表、商品详情 |
| P0 | SKU库存 | 库存查询与锁定 |
| P0 | 订单创建 | 含库存校验 |
| P0 | 微信支付 | 统一下单 + 回调 |
| P1 | 预约时段 | 获取可用时段 |
| P1 | 地址管理 | CRUD |
| P2 | 订单列表 | 分页查询 |
| P2 | 订单取消 | 含超时检查 |

### 8.2 前端任务（小程序）

| 优先级 | 任务 | 说明 |
|--------|------|------|
| P0 | 项目框架 | skyline + glass-easel 配置 |
| P0 | 自定义导航栏 | 完善现有组件 |
| P0 | 首页 | banner、分类、商品列表 |
| P0 | 商品详情页 | 规格选择（SKU联动） |
| P0 | 预约组件 | 日期 + 时间段选择器 |
| P0 | 订单确认页 | 信息汇总 + 提交 |
| P0 | 支付流程 | 调用wx.requestPayment |
| P1 | 个人中心 | 订单列表、地址管理 |
| P1 | 地址管理页 | 新增、编辑、删除 |
| P2 | 会员中心 | 积分、余额展示 |

---

## 9. 目录结构

### 9.1 后端（云函数）

```
cloudfunctions/              # 云函数目录
├── user/
│   ├── login/
│   ├── getProfile/
│   └── updateProfile/
├── product/
│   ├── getCategories/
│   ├── getList/
│   └── getDetail/
├── sku/
│   └── getStock/
├── order/
│   ├── create/
│   ├── pay/
│   ├── payCallback/
│   ├── getList/
│   ├── getDetail/
│   └── cancel/
└── reservation/
    ├── getSlots/
    └── reserve/
```

### 9.2 前端（小程序）

```
├── app.js
├── app.json
├── app.wxss
├── components/
│   └── navigation-bar/      # 已完成
├── pages/
│   ├── index/               # 首页
│   ├── category/            # 分类页
│   ├── product/             # 商品详情
│   ├── order/                # 订单确认
│   ├── my/                   # 个人中心（含子页面）
│   ├── reservation/          # 预约
│   └── payment/             # 支付页
└── services/                # 公共方法
    ├── api.js              # API 调用封装
    ├── auth.js             # 鉴权逻辑
    └── payment.js          # 支付相关
```

---

## 10. 技术债务与扩展点

### 10.1 MVP后扩展
- 阶段2：优惠券系统（需新增coupon集合）
- 阶段2：内容社区（需新增article集合）
- 阶段3：会员积分（users.balance + users.points 已预留）
- 阶段3：储值卡（需新增recharge集合）

### 10.2 当前未处理的场景
- 退货退款流程（建议阶段2再做）
- 发票开票流程（订单预留字段，阶段2接入）
- 物流跟踪（配送场景，阶段2接入）