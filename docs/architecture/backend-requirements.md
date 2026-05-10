# 后端需求分析文档

## 1. 文档概述

本文档从后端视角出发，基于系统架构文档定义的内容，补充后端技术实现细节、接口设计规范及关键技术方案。后端技术栈统一采用微信云开发（CloudBase），不重复系统架构中已定义的内容。

---

## 2. 后端技术栈说明

### 2.1 技术选型依据

微信云开发是微信小程序官方提供的一站式后端云服务，选择理由：

| 优势 | 说明 |
|------|------|
| 免服务器运维 | 云函数自动扩缩容，开发者无需管理服务器 |
| 与小程序天然集成 | 可通过 `wx.cloud` 直接调用，鉴权更便捷 |
| 免费额度充足 | 每月有足够的云函数调用次数和数据库操作数 |
| 云数据库 MongoDB | 原生支持 JSON 文档型数据，契合小程序数据模型 |
| 微信支付深度集成 | 云开发提供微信支付统一下单和回调封装 |

### 2.2 技术组件对应关系

```
前端调用层
    ↓ wx.cloud.callFunction
云函数层（18个函数）
    ↓ db.collection()
云数据库层（9个集合）
```

### 2.3 后端技术栈清单

| 组件 | 技术 | 版本/规格 |
|------|------|-----------|
| 云函数运行时 | Node.js | 16.x 或 18.x（云开发内置） |
| 云函数框架 | 云开发 SCF SDK | `@cloudbase/node-sdk` |
| 数据库 | MongoDB | 云数据库提供，3.2+ 协议 |
| 访问凭证 | CloudBase | 环境级别的 secretId/secretKey |
| 微信支付 | 微信支付 v2/v3 API | 小程序支付 |
| 日志服务 | 云开发日志服务 | 内置 |

---

## 3. 云函数清单及功能说明

### 3.1 函数总览

共 18 个云函数，按模块划分：

| 模块 | 函数名 | 功能 |
|------|--------|------|
| user | user.login | 微信登录/注册 |
| user | user.getProfile | 获取用户信息 |
| user | user.updateProfile | 更新用户资料 |
| user | user.getAddressList | 获取收货地址列表 |
| user | user.addAddress | 新增收货地址 |
| user | user.setDefaultAddress | 设置默认地址 |
| product | product.getCategories | 获取分类列表 |
| product | product.getList | 获取商品列表（支持分页、筛选） |
| product | product.getDetail | 获取商品详情（含规格和SKU列表） |
| sku | sku.getStock | 查询SKU库存状态 |
| order | order.create | 创建订单（含库存原子扣减） |
| order | order.pay | 发起微信支付 |
| order | order.payCallback | 支付回调处理 |
| order | order.getList | 获取用户订单列表（分页） |
| order | order.getDetail | 获取订单详情 |
| order | order.cancel | 取消订单 |
| reservation | reservation.getSlots | 获取可用预约时段 |
| reservation | reservation.reserve | 预约时间段 |

### 3.2 函数入口规范

所有云函数入口文件统一为 `index.js`，导出统一的处理函数：

```javascript
// 云函数入口文件规范
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  // event: 客户端传入参数
  // context: 调用上下文（含 openid、appid 等）
  const { action, data } = event

  try {
    switch (action) {
      // ...
    }
  } catch (err) {
    return { success: false, error: err.message }
  }
}
```

**统一返回格式**：
```javascript
// 成功
{ success: true, data: { ... } }

// 失败
{ success: false, error: '错误描述', code: 'ERROR_CODE' }
```

### 3.3 核心函数详细说明

#### 3.3.1 user.login

**功能**：微信登录/注册，自动创建用户记录。

**入参**：
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| code | string | 是 | 微信授权 code |

**处理流程**：
1. 通过 `code` 调用微信接口获取 `openid`
2. 查询 `users` 集合是否存在该 `openid`
3. 不存在则创建新用户记录
4. 生成会话 token（JWT 格式，有效期 7 天）
5. 返回用户信息 + token

**出参**：
```javascript
{
  success: true,
  data: {
    user_id: string,        // 用户ID
    openid: string,          // 微信openid
    nickname: string,        // 昵称
    phone: string,           // 手机号（可能为空）
    member_level: number,    // 会员等级
    token: string            // 会话token
  }
}
```

#### 3.3.2 order.create

**功能**：创建订单，包含库存原子扣减和预约时段锁定。

**入参**：
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| user_id | string | 是 | 用户ID |
| items | array | 是 | 订单商品列表 |
| items[].sku_id | string | 是 | SKU ID |
| items[].quantity | number | 是 | 购买数量 |
| delivery_type | number | 是 | 1-自提 2-配送 |
| reservation_date | string | 是 | 预约日期 "YYYY-MM-DD" |
| reservation_time_slot | string | 是 | 预约时间段 "HH:MM-HH:MM" |
| receiver_id | string | 否 | 配送时必传，收货地址ID |
| remark | string | 否 | 用户备注 |

**处理流程**：
1. 验证用户登录态（token 校验）
2. 校验每个 SKU 的库存（原子操作，库存不足抛错）
3. 计算订单金额（累加各 SKU 单价 × 数量）
4. 生成订单号（格式：`ORD` + 时间戳 + 6 位随机数）
5. 事务写入 `orders` 和 `order_items`
6. 原子更新 `sku_stock.reservation_count`（+1）
7. 原子更新 `reservations.reserved_count`（+1）

**出参**：
```javascript
{
  success: true,
  data: {
    order_id: string,        // 订单ID
    order_no: string,       // 订单号
    total_amount: number     // 订单总金额（分）
  }
}
```

**异常码**：
| 错误码 | 说明 |
|--------|------|
| STOCK_SHORTAGE | 库存不足 |
| SLOT_FULL | 预约时段已满 |
| INVALID_DELIVERY_TYPE | 配送类型错误 |
| ADDRESS_NOT_FOUND | 收货地址不存在 |

#### 3.3.3 order.pay

**功能**：发起微信支付统一下单。

**入参**：
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| order_id | string | 是 | 订单ID |
| openid | string | 是 | 用户openid |

**处理流程**：
1. 校验订单存在且状态为待付款（status=0）
2. 校验订单金额与数据库一致（防篡改）
3. 调用微信支付统一下单接口
4. 返回支付参数（timeStamp, nonceStr, package, signType, paySign）

**出参**：
```javascript
{
  success: true,
  data: {
    timeStamp: string,
    nonceStr: string,
    package: string,       // prepay_id
    signType: string,      // 'RSA'
    paySign: string
  }
}
```

#### 3.3.4 order.payCallback

**功能**：处理微信支付回调，更新订单状态。

**入参**：微信支付回调 XML 数据（云开发自动解析）

**处理流程**：
1. 验证回调签名（使用微信支付密钥）
2. 解析订单号和支付状态
3. 更新订单状态：0-待付款 → 1-已付款待确认
4. 更新 `pay_time` 字段
5. 实际库存扣减：`stock - 1`（从 reservation_count 转入实际消耗）
6. 更新预约时段 `reserved_count`
7. 发送订阅消息通知用户（微信消息订阅）

**注意**：需幂等处理，同一订单号重复回调不重复更新状态。

**出参**：
```javascript
// 返回给微信的确认消息
{ return_code: 'SUCCESS', return_msg: 'OK' }
```

#### 3.3.5 reservation.getSlots

**功能**：获取指定日期的可用预约时段。

**入参**：
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| date | string | 是 | 日期 "YYYY-MM-DD" |

**出参**：
```javascript
{
  success: true,
  data: {
    date: string,
    slots: [
      {
        time_slot: string,          // "09:00-12:00"
        capacity: number,           // 总容量
        reserved: number,            // 已预约数
        available: boolean           // 是否可预约
      }
    ]
  }
}
```

---

## 4. 数据权限设计

### 4.1 用户数据隔离

用户只能访问自己的数据，云函数通过 `context.openid` 获取当前用户身份，查询时强制携带 `user_id` 条件：

```javascript
// 错误示例：未校验归属
db.collection('orders').where({ status: 0 }).get()

// 正确示例：校验归属
db.collection('orders').where({
  user_id: userIdFromToken,  // 从 token 中解析的 user_id
  status: 0
}).get()
```

### 4.2 云函数权限配置

| 函数 | 权限级别 | 说明 |
|------|----------|------|
| user.login | 公开 | 无需登录 |
| product.getCategories | 公开 | 无需登录 |
| product.getList | 公开 | 无需登录 |
| product.getDetail | 公开 | 无需登录 |
| sku.getStock | 公开 | 无需登录 |
| user.getProfile | 登录 | 需携带有效 token |
| user.updateProfile | 登录 | 需携带有效 token |
| user.getAddressList | 登录 | 需携带有效 token |
| user.addAddress | 登录 | 需携带有效 token |
| user.setDefaultAddress | 登录 | 需携带有效 token |
| order.create | 登录 | 需携带有效 token |
| order.pay | 登录 | 需携带有效 token |
| order.getList | 登录 | 需携带有效 token |
| order.getDetail | 登录 | 需携带有效 token |
| order.cancel | 登录 | 需携带有效 token |
| order.payCallback | 管理员 | 需微信支付密钥验证 |
| reservation.getSlots | 公开 | 无需登录 |
| reservation.reserve | 登录 | 需携带有效 token |

### 4.3 数据库集合权限

| 集合 | 读 | 写 | 说明 |
|------|----|----|------|
| users | 云函数 | 云函数 | 仅本人可读写 |
| categories | 公开 | 管理员 | 仅管理员可写 |
| products | 公开 | 管理员 | 仅管理员可写 |
| specs | 公开 | 管理员 | 仅管理员可写 |
| sku_stock | 公开 | 云函数 | 云函数原子操作 |
| orders | 登录+本人 | 云函数 | 仅本人可读写 |
| order_items | 登录+本人 | 云函数 | 仅本人可读写 |
| reservations | 公开 | 云函数 | 云函数原子操作 |
| addresses | 登录+本人 | 登录+本人 | 仅本人可读写 |

---

## 5. 接口安全策略

### 5.1 认证机制

**Token 方案**：
- 登录成功后返回 JWT 格式 token
- Token 包含：`user_id`、`openid`、`exp`（过期时间）
- 有效期 7 天，过期需重新登录
- 客户端存储在 Storage，调用时放入 header 或参数

**Token 校验流程**：
```
客户端 → 携带 token 调用云函数
       ↓
    云函数校验 token 签名
       ↓
    解析 user_id，检查有效期
       ↓
    校验通过 → 执行业务逻辑
```

### 5.2 防刷机制

| 防护项 | 策略 | 实现方式 |
|--------|------|----------|
| 下单频率限制 | 同一用户 60 秒内最多 1 单 | 云函数入口处查询 Redis 缓存（备注：云开发暂未提供 Redis，可用云数据库计数器集合实现） |
| 库存防泄露 | 库存查询接口不暴露真实剩余量 | 只返回 available（0/1），不返回精确数字 |
| 金额防篡改 | 订单金额在后端计算，前端不传金额 | order.create 前端仅传商品和数量，金额服务端计算 |
| 签名验证 | 支付回调验证签名 | 使用微信支付密钥进行 HMAC-SHA256 验证 |

### 5.3 敏感操作二次验证

以下操作需要二次验证（建议阶段2实现）：
- 大额订单支付（金额 > 500 元）
- 余额提现
- 个人信息修改（手机号、身份证）

### 5.4 请求参数校验

所有云函数入参必须校验：

```javascript
// 参数校验示例
function validateCreateOrder(data) {
  if (!data.user_id) throw new Error('USER_ID_REQUIRED')
  if (!Array.isArray(data.items) || data.items.length === 0) {
    throw new Error('ITEMS_REQUIRED')
  }
  if (!data.delivery_type || ![1, 2].includes(data.delivery_type)) {
    throw new Error('INVALID_DELIVERY_TYPE')
  }
  if (!data.reservation_date || !/^\d{4}-\d{2}-\d{2}$/.test(data.reservation_date)) {
    throw new Error('INVALID_DATE_FORMAT')
  }
}
```

---

## 6. 微信支付集成方案

### 6.1 支付流程

```
用户下单 → order.create → 生成待付款订单
    ↓
用户点击支付 → order.pay → 统一下单 → 返回支付参数
    ↓
小程序调用 wx.requestPayment → 微信支付
    ↓
支付成功 → 微信回调 → order.payCallback → 更新订单状态
    ↓
发送订阅消息通知用户
```

### 6.2 统一下单参数

| 参数 | 来源 | 说明 |
|------|------|------|
| appid | 云开发环境 | 小程序 appid |
| mch_id | 微信支付商户号 | 服务商商户号 |
| openid | 用户 openid | 从 token 中获取 |
| body | 商品描述 | "蛋糕工作室-订单号" |
| out_trade_no | 订单号 | 商户订单号 |
| total_fee | 金额（分） | 订单金额 |
| notify_url | 云函数地址 | 支付回调地址 |
| trade_type | "JSAPI" | 小程序支付 |

### 6.3 支付回调配置

回调云函数：`order.payCallback`

- 回调 URL 格式：`https://{env}.service.tcbin.com/order/payCallback`
- 云开发自动解析 XML 回调数据为 JSON
- 需要返回 XML 格式的确认消息给微信

### 6.4 支付状态同步

| 状态码 | 含义 | 处理 |
|--------|------|------|
| 0 | 待付款 | 订单创建初始状态 |
| 1 | 已付款待确认 | 回调成功更新 |
| 2 | 制作中 | 商家后台确认 |
| 3 | 待自提/待配送 | 制作完成 |
| 4 | 已完成 | 用户确认收货 |
| 5 | 已取消 | 超时或用户取消 |

### 6.5 退款流程（建议阶段2实现）

退款需调用微信支付退款接口，当前 MVP 暂不包含。

**建议预留字段**：
- orders.refund_status（0-无退款 1-退款中 2-已退款）
- orders.refund_time

---

## 7. 关键业务规则汇总

### 7.1 SKU 库存流转

```
[有库存] → 用户下单 → reservation_count + 1（锁定）
[有库存] → 支付成功 → stock - 1, reservation_count - 1（实际消耗）
[有库存] → 超时取消 → reservation_count - 1（释放锁定）
```

### 7.2 订单超时机制

- 待付款订单 30 分钟未支付自动取消
- 实现方式：定时触发器（云开发支持，建议阶段2实现）或订单查询时检查

### 7.3 预约时段限制

- 同一时段容量上限由 `reservations.capacity` 控制
- 用户同一时间段只能预约一次
- 预约日期支持范围：当天起至 30 天内

---

## 8. 待确认事项

以下事项需与架构师确认：

| 事项 | 描述 | 决策建议 |
|------|------|----------|
| Token 存储方案 | JWT 存储在客户端 vs 云开发 session | 建议使用 JWT，服务端无状态 |
| 下单频率限制实现 | 云开发暂无 Redis，如何实现计数器 | 建议使用云数据库新建 counter 集合实现 |
| 订单超时取消 | 是否需要实现自动取消定时器 | MVP 阶段可暂不实现，商家手动处理 |
| 退款流程 | MVP 是否需要退款功能 | 建议 MVP 不包含，阶段2再实现 |
| 日志与监控 | 是否需要接入第三方监控 | 建议先使用云开发内置日志，阶段2再扩展 |

---

## 9. 附录

### 9.1 错误码定义

| 错误码 | HTTP状态 | 说明 |
|--------|----------|------|
| SUCCESS | 200 | 成功 |
| PARAM_REQUIRED | 400 | 缺少必填参数 |
| PARAM_INVALID | 400 | 参数格式错误 |
| UNAUTHORIZED | 401 | 未登录或 token 失效 |
| FORBIDDEN | 403 | 无权限访问 |
| NOT_FOUND | 404 | 资源不存在 |
| STOCK_SHORTAGE | 409 | 库存不足 |
| SLOT_FULL | 409 | 预约时段已满 |
| ORDER_STATUS_INVALID | 409 | 订单状态不允许此操作 |
| PAYMENT_FAILED | 500 | 支付失败 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |

### 9.2 云函数环境变量

建议在云函数配置中设置以下环境变量：

| 变量名 | 说明 |
|--------|------|
| WX_APPID | 小程序 appid |
| WX_MCH_ID | 微信支付商户号 |
| WX_PAY_KEY | 微信支付密钥 |
| JWT_SECRET | JWT 签名密钥 |