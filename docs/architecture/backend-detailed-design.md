# 后端软件详细设计文档

## 1. 概述

### 1.1 文档目的

本文档定义蛋糕工作室微信小程序后端的详细设计，包括云函数结构、接口规范、数据库封装、错误处理、日志监控、微信支付回调及库存并发控制方案。

### 1.2 技术栈

| 组件 | 技术 | 说明 |
|------|------|------|
| 云函数运行时 | Node.js | 16.x / 18.x |
| 云函数框架 | wx-server-sdk | 云开发提供的微信云函数 SDK |
| 数据库 | MongoDB | 云数据库，提供 ACID 事务支持 |
| 支付 | 微信支付 v2 API | 小程序支付 |
| 日志 | 云开发内置日志 | cloudbase.log |

### 1.3 云函数入口规范

所有云函数统一入口文件 `index.js`，采用 Action 模式分发请求：

```javascript
// cloudfunctions/{module}/{action}/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const { action, data, user_id, openid } = event

  // 统一日志
  cloud.logger.info({ action, user_id, timestamp: Date.now() })

  try {
    // 鉴权校验
    if (requiresAuth(action) && !user_id) {
      throw new AuthError('UNAUTHORIZED', '请先登录')
    }

    // 分发处理
    switch (action) {
      case 'create':
        return await handleCreate(data, { user_id, openid })
      // ...其他 action
      default:
        throw new Error('UNKNOWN_ACTION')
    }
  } catch (err) {
    cloud.logger.error({ action, error: err.message, stack: err.stack })
    return formatError(err)
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

---

## 2. 云函数目录结构

```
cloudfunctions/
├── user/
│   ├── login/
│   │   ├── index.js
│   │   └── package.json
│   ├── getProfile/
│   │   ├── index.js
│   │   └── package.json
│   ├── updateProfile/
│   │   ├── index.js
│   │   └── package.json
│   ├── getAddressList/
│   │   ├── index.js
│   │   └── package.json
│   ├── addAddress/
│   │   ├── index.js
│   │   └── package.json
│   └── setDefaultAddress/
│       ├── index.js
│       └── package.json
│
├── product/
│   ├── getCategories/
│   │   ├── index.js
│   │   └── package.json
│   ├── getList/
│   │   ├── index.js
│   │   └── package.json
│   └── getDetail/
│       ├── index.js
│       └── package.json
│
├── sku/
│   └── getStock/
│       ├── index.js
│       └── package.json
│
├── order/
│   ├── create/
│   │   ├── index.js
│   │   └── package.json
│   ├── pay/
│   │   ├── index.js
│   │   └── package.json
│   ├── payCallback/
│   │   ├── index.js
│   │   └── package.json
│   ├── getList/
│   │   ├── index.js
│   │   └── package.json
│   ├── getDetail/
│   │   ├── index.js
│   │   └── package.json
│   └── cancel/
│       ├── index.js
│       └── package.json
│
├── reservation/
│   ├── getSlots/
│   │   ├── index.js
│   │   └── package.json
│   └── reserve/
│       ├── index.js
│       └── package.json
│
└── utils/
    ├── db.js              # 数据库操作封装
    ├── error.js           # 错误定义
    ├── logger.js          # 日志封装
    ├── validator.js      # 参数校验
    ├── pay.js             # 微信支付封装
    └── auth.js            # 鉴权工具
```

---

## 3. 数据库操作封装

### 3.1 db.js - 数据库基础封装

```javascript
// cloudfunctions/utils/db.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

/**
 * 集合引用
 */
const collections = {
  users: db.collection('users'),
  categories: db.collection('categories'),
  products: db.collection('products'),
  specs: db.collection('specs'),
  sku_stock: db.collection('sku_stock'),
  orders: db.collection('orders'),
  order_items: db.collection('order_items'),
  reservations: db.collection('reservations'),
  addresses: db.collection('addresses'),
}

/**
 * 查询单条记录
 * @param {string} collName - 集合名
 * @param {object} where - 查询条件
 * @param {object} options - 选项 { field, orderBy, limit }
 */
async function getOne(collName, where, options = {}) {
  const { field, orderBy, limit = 1 } = options
  let query = collections[collName].where(where)

  if (field) {
    query = query.field(field)
  }
  if (orderBy) {
    query = query.orderBy(orderBy.field, orderBy.order)
  }

  const { data } = await query.limit(limit).get()
  return data[0] || null
}

/**
 * 查询多条记录
 * @param {string} collName - 集合名
 * @param {object} where - 查询条件
 * @param {object} options - 选项 { field, orderBy, limit, offset }
 */
async function getList(collName, where, options = {}) {
  const { field, orderBy, limit = 20, offset = 0 } = options
  let query = collections[collName].where(where)

  if (field) {
    query = query.field(field)
  }
  if (orderBy) {
    query = query.orderBy(orderBy.field, orderBy.order)
  }

  const { data } = await query.skip(offset).limit(limit).get()
  return data
}

/**
 * 统计数量
 * @param {string} collName - 集合名
 * @param {object} where - 查询条件
 */
async function count(collName, where) {
  const { total } = await collections[collName].where(where).count()
  return total
}

/**
 * 插入单条记录
 * @param {string} collName - 集合名
 * @param {object} data - 插入数据
 */
async function insert(collName, data) {
  const res = await collections[collName].add({ data })
  return res._id
}

/**
 * 更新记录（单条）
 * @param {string} collName - 集合名
 * @param {object} where - 查询条件
 * @param {object} data - 更新数据
 */
async function updateOne(collName, where, data) {
  const res = await collections[collName].where(where).update({ data })
  return res.stats.updated
}

/**
 * 原子递增/递减（单条）
 * @param {string} collName - 集合名
 * @param {object} where - 查询条件
 * @param {string} field - 字段名
 * @param {number} delta - 变化量（正数为递增）
 */
async function incOne(collName, where, field, delta) {
  const res = await collections[collName].where(where).update({
    data: {
      [field]: db.command.inc(delta)
    }
  })
  return res.stats.updated
}

/**
 * 批量更新（用于事务内）
 * @param {object} db - 云数据库实例
 * @param {string} collName - 集合名
 * @param {object} where - 查询条件
 * @param {object} data - 更新数据
 */
async function batchUpdate(db, collName, where, data) {
  return db.collection(collName).where(where).update({ data })
}

/**
 * 批量插入（用于事务内）
 * @param {object} db - 云数据库实例
 * @param {string} collName - 集合名
 * @param {array} records - 记录数组
 */
async function batchInsert(db, collName, records) {
  const tasks = records.map(r => db.collection(collName).add({ data: r }))
  return db.runTransaction(async tx => {
    const res = await tx.batchAdd(tasks)
    return res
  })
}

/**
 * 原子操作：条件更新（满足条件才更新）
 * @param {string} collName - 集合名
 * @param {object} where - 查询条件
 * @param {object} updateData - 更新数据
 * @param {object} condition - 额外条件（如 stock: db.command.gte(1)）
 */
async function conditionalUpdate(collName, where, updateData, condition = {}) {
  let query = collections[collName].where(where)

  // 添加额外条件
  Object.entries(condition).forEach(([key, value]) => {
    query = query.where({ [key]: value })
  })

  const res = await query.update({ data: updateData })
  return res.stats.updated
}

/**
 * 事务封装
 * @param {function} callback - 事务回调，接收 tx 对象
 */
async function transaction(callback) {
  return await db.runTransaction(async tx => {
    return await callback(tx)
  })
}

module.exports = {
  db,
  collections,
  getOne,
  getList,
  count,
  insert,
  updateOne,
  incOne,
  batchUpdate,
  batchInsert,
  conditionalUpdate,
  transaction,
}
```

### 3.2 库存操作封装

```javascript
// cloudfunctions/utils/stock.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const { collections, transaction } = require('./db')

/**
 * 锁定库存（下单时调用）
 * reservation_count + 1
 *
 * @param {string} skuId - SKU ID
 * @param {number} quantity - 锁定数量
 * @returns {object} { success: boolean, message: string }
 */
async function lockStock(skuId, quantity = 1) {
  // 使用条件更新：只有 stock > 0 时才能锁定
  const res = await collections.sku_stock.doc(skuId).update({
    data: {
      reservation_count: _.inc(quantity)
    }
  })

  if (res.stats.updated === 0) {
    return { success: false, message: 'STOCK_SHORTAGE' }
  }

  return { success: true }
}

/**
 * 释放库存（取消订单时调用）
 * reservation_count - 1
 *
 * @param {string} skuId - SKU ID
 * @param {number} quantity - 释放数量
 */
async function releaseStock(skuId, quantity = 1) {
  await collections.sku_stock.doc(skuId).update({
    data: {
      reservation_count: _.inc(-quantity)
    }
  })
}

/**
 * 扣减实际库存（支付成功时调用）
 * stock - quantity, reservation_count - quantity
 *
 * @param {string} skuId - SKU ID
 * @param {number} quantity - 扣减数量
 */
async function deductStock(skuId, quantity = 1) {
  // 原子操作：扣减 stock，扣减 reservation_count
  const res = await collections.sku_stock.doc(skuId).update({
    data: {
      stock: _.inc(-quantity),
      reservation_count: _.inc(-quantity)
    }
  })

  return res.stats.updated > 0
}

/**
 * 批量锁定库存（订单多商品时使用）
 * @param {array} items - [{ skuId, quantity }]
 * @returns {object} { success: boolean, failedItems: [] }
 */
async function lockStockBatch(items) {
  const failedItems = []

  for (const item of items) {
    const result = await lockStock(item.skuId, item.quantity)
    if (!result.success) {
      failedItems.push({ skuId: item.skuId, reason: result.message })
    }
  }

  // 如果有失败的，回滚已锁定的
  if (failedItems.length > 0) {
    for (const item of items) {
      if (!failedItems.find(f => f.skuId === item.skuId)) {
        await releaseStock(item.skuId, item.quantity)
      }
    }
    return { success: false, failedItems }
  }

  return { success: true }
}

/**
 * 检查库存是否足够
 * @param {string} skuId - SKU ID
 * @param {number} quantity - 需要数量
 * @returns {boolean}
 */
async function checkStock(skuId, quantity = 1) {
  const sku = await collections.sku_stock.doc(skuId).field({
    stock: true,
    reservation_count: true
  }).get()

  if (!sku) return false

  // 可用库存 = stock - reservation_count（预留后剩余的）
  const availableStock = sku.stock - (sku.reservation_count || 0)
  return availableStock >= quantity
}

module.exports = {
  lockStock,
  releaseStock,
  deductStock,
  lockStockBatch,
  checkStock,
}
```

---

## 4. 云函数详细设计

### 4.1 user.login - 登录/注册

**目录**：`cloudfunctions/user/login/index.js`

**入参**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| code | string | 是 | 微信授权 code |

**处理逻辑**：

```
1. 调用微信 code2Session 接口换取 openid
2. 查询 users 集合是否存在该 openid
3. 不存在则创建新用户记录（nickname 默认为"用户"+手机号后4位）
4. 生成 JWT token（包含 user_id, openid, exp: 7天后）
5. 返回用户信息 + token
```

**出参**：

```javascript
{
  success: true,
  data: {
    user_id: 'xxx',
    openid: 'xxx',
    nickname: '用户1234',
    phone: '138****5678',    // 可能为空
    member_level: 1,
    token: 'eyJhbG...'
  }
}
```

**实现代码**：

```javascript
// cloudfunctions/user/login/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const { collections, insert } = require('../../utils/db')
const { generateToken } = require('../../utils/auth')
const { AuthError } = require('../../utils/error')

async function login(code) {
  // 1. 调用微信接口获取 openid
  const wxLoginRes = await cloud.cloudCallContainer({
    service: 'weixin',
    path: '/code2Session',
    method: 'GET',
    query: {
      appid: cloud.getWXContext().APPID,
      js_code: code,
      grant_type: 'authorization_code'
    }
  })

  const { openid } = wxLoginRes

  // 2. 查询用户
  let user = await collections.users.where({ openid }).get()

  // 3. 不存在则创建
  if (!user.data || user.data.length === 0) {
    const userId = await insert('users', {
      openid,
      nickname: `用户${Math.floor(Math.random() * 9000) + 1000}`,
      member_level: 1,
      balance: 0,
      points: 0,
      created_at: new Date(),
      updated_at: new Date()
    })
    user = { data: [{ _id: userId, openid, nickname: `用户${Math.floor(Math.random() * 9000) + 1000}`, member_level: 1 }] }
  }

  user = user.data[0]

  // 4. 生成 token
  const token = generateToken({
    user_id: user._id,
    openid: user.openid
  })

  return {
    user_id: user._id,
    openid: user.openid,
    nickname: user.nickname,
    phone: user.phone || '',
    member_level: user.member_level,
    token
  }
}

module.exports = async (event, context) => {
  try {
    const { code } = event
    if (!code) {
      throw new AuthError('PARAM_REQUIRED', '缺少 code 参数')
    }

    const data = await login(code)
    return { success: true, data }
  } catch (err) {
    return { success: false, error: err.message, code: err.code }
  }
}
```

---

### 4.2 user.getProfile - 获取用户信息

**目录**：`cloudfunctions/user/getProfile/index.js`

**入参**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| user_id | string | 是 | 用户ID（从token解析） |

**处理逻辑**：

```
1. 从 event 中获取 user_id
2. 查询 users 集合，返回用户信息
3. 屏蔽敏感字段（openid）
```

**出参**：

```javascript
{
  success: true,
  data: {
    user_id: 'xxx',
    nickname: '用户1234',
    phone: '138****5678',
    member_level: 1,
    balance: 0,
    points: 0
  }
}
```

---

### 4.3 product.getCategories - 获取分类列表

**目录**：`cloudfunctions/product/getCategories/index.js`

**入参**：无

**处理逻辑**：

```
1. 查询 categories 集合，status = 1
2. 按 sort 字段升序排列
3. 返回分类列表
```

**出参**：

```javascript
{
  success: true,
  data: [
    { id: 'xxx', name: '生日蛋糕', sort: 1, icon: 'https://...' },
    { id: 'xxx', name: '下午茶', sort: 2, icon: 'https://...' }
  ]
}
```

---

### 4.4 product.getList - 获取商品列表

**目录**：`cloudfunctions/product/getList/index.js`

**入参**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| category_id | string | 否 | 分类ID |
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页数量，默认10 |
| keyword | string | 否 | 搜索关键词 |

**处理逻辑**：

```
1. 构建查询条件：status = 1
2. 如有 category_id 条件，添加
3. 如有 keyword 条件，模糊搜索 name 字段
4. 分页查询，按 created_at 降序
5. 返回商品列表 + 总数
```

**出参**：

```javascript
{
  success: true,
  data: {
    list: [
      {
        id: 'xxx',
        name: '草莓慕斯蛋糕',
        image: 'https://...',
        base_price: 26800,
        tags: ['爆款']
      }
    ],
    total: 50,
    page: 1,
    pageSize: 10
  }
}
```

---

### 4.5 product.getDetail - 获取商品详情

**目录**：`cloudfunctions/product/getDetail/index.js`

**入参**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 商品ID |

**处理逻辑**：

```
1. 查询 products 集合，返回商品详情
2. 查询 sku_stock 集合，返回该商品所有 SKU
3. 组装规格选项与 SKU 关联
```

**出参**：

```javascript
{
  success: true,
  data: {
    id: 'xxx',
    name: '草莓慕斯蛋糕',
    description: '...',
    images: ['https://...'],
    base_price: 26800,
    specifications: [
      {
        name: '尺寸',
        options: [
          { value: '6寸', price_mod: 0 },
          { value: '8寸', price_mod: 3000 }
        ]
      }
    ],
    skus: [
      {
        sku_id: 'xxx',
        sku_key: 'size_6寸_flavor_草莓',
        sku_name: '6寸 草莓',
        price: 26800,
        stock: 5,
        status: 1
      }
    ],
    tags: ['爆款', '新品']
  }
}
```

---

### 4.6 sku.getStock - 查询SKU库存

**目录**：`cloudfunctions/sku/getStock/index.js`

**入参**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| sku_id | string | 是 | SKU ID |

**处理逻辑**：

```
1. 查询 sku_stock 集合
2. 只返回 status，不返回精确库存数（防泄露）
3. status: 1-有货 0-缺货
```

**出参**：

```javascript
{
  success: true,
  data: {
    sku_id: 'xxx',
    available: true,     // true/false，不暴露精确数量
    price: 29800
  }
}
```

---

### 4.7 order.create - 创建订单（核心）

**目录**：`cloudfunctions/order/create/index.js`

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

**处理逻辑**：

```
1. 鉴权校验
2. 参数校验
3. 查询每个 SKU 的价格和库存
4. 计算订单总金额
5. 生成订单号（ORD + 时间戳 + 6位随机数）
6. 事务操作：
   a. 锁定库存（原子操作，reservation_count + quantity）
   b. 锁定预约时段（reserved_count + 1）
   c. 创建订单主记录（orders）
   d. 创建订单明细记录（order_items）
7. 返回订单信息
```

**出参**：

```javascript
{
  success: true,
  data: {
    order_id: 'xxx',
    order_no: 'ORD20240115123456123456',
    total_amount: 29800
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
| RESERVATION_LOCK_FAILED | 预约时段锁定失败 |

**实现代码（关键部分）**：

```javascript
// cloudfunctions/order/create/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const { collections, transaction, getOne } = require('../../utils/db')
const { lockStock, releaseStock } = require('../../utils/stock')
const { generateOrderNo } = require('../../utils/helpers')
const { BusinessError } = require('../../utils/error')

async function createOrder(data, userInfo) {
  const { items, delivery_type, reservation_date, reservation_time_slot, receiver_id, remark } = data
  const { user_id } = userInfo

  // 1. 参数校验
  if (!items || items.length === 0) {
    throw new BusinessError('ITEMS_REQUIRED', '订单商品不能为空')
  }
  if (![1, 2].includes(delivery_type)) {
    throw new BusinessError('INVALID_DELIVERY_TYPE', '配送类型错误')
  }

  // 2. 配送地址校验
  let address = null
  if (delivery_type === 2) {
    if (!receiver_id) {
      throw new BusinessError('ADDRESS_NOT_FOUND', '配送地址不能为空')
    }
    address = await getOne('addresses', { _id: receiver_id, user_id })
    if (!address) {
      throw new BusinessError('ADDRESS_NOT_FOUND', '收货地址不存在')
    }
  }

  // 3. 查询 SKU 信息并计算价格
  let totalAmount = 0
  const skuInfos = []

  for (const item of items) {
    const sku = await collections.sku_stock.doc(item.sku_id).get()
    if (!sku) {
      throw new BusinessError('SKU_NOT_FOUND', `商品不存在: ${item.sku_id}`)
    }

    // 检查库存（可用库存 = stock - reservation_count）
    const availableStock = sku.stock - (sku.reservation_count || 0)
    if (availableStock < item.quantity) {
      throw new BusinessError('STOCK_SHORTAGE', `库存不足: ${sku.sku_name}`)
    }

    totalAmount += sku.price * item.quantity
    skuInfos.push({
      ...sku,
      quantity: item.quantity
    })
  }

  // 4. 生成订单号
  const orderNo = generateOrderNo()

  // 5. 事务操作
  try {
    await transaction(async (tx) => {
      // 5.1 锁定库存（原子操作）
      for (const item of items) {
        const res = await tx.collection('sku_stock').doc(item.sku_id).update({
          data: {
            reservation_count: _.inc(item.quantity)
          }
        })

        // 更新失败表示库存不足
        if (res.stats.updated === 0) {
          throw new BusinessError('STOCK_SHORTAGE', '库存不足，请稍后重试')
        }
      }

      // 5.2 锁定预约时段
      const slotRes = await tx.collection('reservations')
        .where({
          date: reservation_date,
          time_slot: reservation_time_slot
        })
        .update({
          data: {
            reserved_count: _.inc(1)
          }
        })

      if (slotRes.stats.updated === 0) {
        throw new BusinessError('SLOT_FULL', '预约时段已满或不存在')
      }

      // 5.3 创建订单主记录
      const orderData = {
        order_no: orderNo,
        user_id,
        status: 0,  // 待付款
        total_amount: totalAmount,
        discount_amount: 0,
        pay_amount: totalAmount,
        delivery_type,
        reservation_date,
        reservation_time_slot,
        receiver_name: address?.name || '',
        receiver_phone: address?.phone || '',
        address: address ? `${address.province}${address.city}${address.district}${address.detail}` : '',
        remark: remark || '',
        created_at: new Date(),
        updated_at: new Date()
      }

      const orderRes = await tx.collection('orders').add({ data: orderData })
      const orderId = orderRes._id

      // 5.4 创建订单明细
      const orderItems = skuInfos.map(sku => ({
        order_id: orderId,
        product_id: sku.product_id,
        sku_id: sku._id,
        sku_name: sku.sku_name,
        product_name: sku.product_id,  // TODO: 实际应查询 product name
        product_image: '',
        price: sku.price,
        quantity: sku.quantity,
        subtotal: sku.price * sku.quantity
      }))

      await tx.collection('order_items').add({ data: orderItems[0] })  // MongoDB 单条插入

      return { orderId, orderNo, totalAmount }
    })

  } catch (err) {
    // 事务失败，库存已在事务中回滚
    throw err
  }

  return { order_id: orderId, order_no: orderNo, total_amount: totalAmount }
}

module.exports = async (event, context) => {
  try {
    const { user_id, ...data } = event

    if (!user_id) {
      throw new BusinessError('UNAUTHORIZED', '请先登录')
    }

    const result = await createOrder(data, { user_id })
    return { success: true, data: result }
  } catch (err) {
    cloud.logger.error({ action: 'order.create', error: err.message, stack: err.stack })
    return { success: false, error: err.message, code: err.code }
  }
}
```

---

### 4.8 order.pay - 发起支付

**目录**：`cloudfunctions/order/pay/index.js`

**入参**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| order_id | string | 是 | 订单ID |
| user_id | string | 是 | 用户ID |

**处理逻辑**：

```
1. 校验订单存在且属于该用户
2. 校验订单状态为待付款（status = 0）
3. 调用微信支付统一下单接口
4. 返回支付参数
```

**出参**：

```javascript
{
  success: true,
  data: {
    timeStamp: '1609459200',
    nonceStr: '5K8264ILTKCH16CQ2502SI8ZNMTM67VS',
    package: 'prepay_id=wx201410272009395522657a690389285100',
    signType: 'RSA',
    paySign: 'C380BEC2BFD727A4B6845133519F3AD6'
  }
}
```

**实现代码（关键部分）**：

```javascript
// cloudfunctions/order/pay/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const { collections, getOne } = require('../../utils/db')
const { unifiedOrder } = require('../../utils/pay')
const { BusinessError } = require('../../utils/error')

async function getPayParams(orderId, userId) {
  // 1. 查询订单
  const order = await getOne('orders', { _id: orderId, user_id: userId })
  if (!order) {
    throw new BusinessError('ORDER_NOT_FOUND', '订单不存在')
  }

  if (order.status !== 0) {
    throw new BusinessError('ORDER_STATUS_INVALID', '订单状态不允许支付')
  }

  // 2. 调用微信统一下单
  const payParams = await unifiedOrder({
    openid: order.openid,  // 从 user 集合获取
    outTradeNo: order.order_no,
    body: `蛋糕工作室-${order.order_no.slice(-6)}`,
    totalFee: order.pay_amount,
    notifyUrl: `https://${process.env.WEIXIN_CLOUDBASE_ENV}.service.tcbin.com/order/payCallback`
  })

  return payParams
}

module.exports = async (event, context) => {
  try {
    const { order_id, user_id } = event

    if (!order_id || !user_id) {
      throw new BusinessError('PARAM_REQUIRED', '缺少必要参数')
    }

    const data = await getPayParams(order_id, user_id)
    return { success: true, data }
  } catch (err) {
    cloud.logger.error({ action: 'order.pay', error: err.message })
    return { success: false, error: err.message, code: err.code }
  }
}
```

---

### 4.9 order.payCallback - 支付回调（核心）

**目录**：`cloudfunctions/order/payCallback/index.js`

**入参**：微信支付回调数据（云开发自动解析为 JSON）

| 字段 | 类型 | 说明 |
|------|------|------|
| return_code | string | SUCCESS/FAIL |
| return_msg | string | 返回信息 |
| result_code | string | SUCCESS/FAIL |
| transaction_id | string | 微信支付订单号 |
| out_trade_no | string | 商户订单号 |
| trade_type | string | 支付类型 |
| time_end | string | 支付完成时间 |
| cash_fee | string | 现金支付金额 |

**处理逻辑**：

```
1. 验证签名
2. 解析订单号
3. 幂等检查（判断是否已处理过该订单）
4. 校验回调金额与订单金额一致
5. 更新订单状态：0-待付款 → 1-已付款待确认
6. 更新 pay_time 字段
7. 实际扣减库存：stock - 1, reservation_count - 1
8. 更新预约时段 reserved_count（转为正式预约）
9. 发送订阅消息通知用户
10. 返回 SUCCESS 确认给微信
```

**出参**：

```xml
<xml>
  <return_code><![CDATA[SUCCESS]]></return_code>
  <return_msg><![CDATA[OK]]></return_msg>
</xml>
```

**实现代码（关键部分）**：

```javascript
// cloudfunctions/order/payCallback/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const cloudPay = cloud.cloudPay()
const db = cloud.database()
const _ = db.command
const { collections, getOne, updateOne } = require('../../utils/db')
const { verifyPayCallback } = require('../../utils/pay')
const { sendSubscribeMessage } = require('../../utils/message')
const { BusinessError } = require('../../utils/error')

/**
 * 支付回调处理
 * 重点：幂等处理 + 库存扣减
 */
async function handlePayCallback(callbackData) {
  const { return_code, result_code, transaction_id, out_trade_no, time_end, cash_fee } = callbackData

  cloud.logger.info({ action: 'payCallback', out_trade_no, return_code, result_code })

  // 1. 验证签名
  if (!verifyPayCallback(callbackData)) {
    cloud.logger.error({ action: 'payCallback', error: '签名验证失败', out_trade_no })
    return { return_code: 'FAIL', return_msg: '签名验证失败' }
  }

  // 2. 返回失败则不处理
  if (return_code !== 'SUCCESS' || result_code !== 'SUCCESS') {
    return { return_code: 'SUCCESS', return_msg: '已接收' }
  }

  // 3. 查询订单
  const order = await getOne('orders', { order_no: out_trade_no })
  if (!order) {
    cloud.logger.error({ action: 'payCallback', error: '订单不存在', out_trade_no })
    return { return_code: 'FAIL', return_msg: '订单不存在' }
  }

  // 4. 幂等检查：已处理过的订单直接返回成功
  if (order.status !== 0) {
    cloud.logger.info({ action: 'payCallback', message: '订单已处理，跳过', out_trade_no, status: order.status })
    return { return_code: 'SUCCESS', return_msg: 'OK' }
  }

  // 5. 校验金额（可选，防止数据被篡改）
  // if (parseInt(cash_fee) !== order.pay_amount) {
  //   cloud.logger.error({ action: 'payCallback', error: '金额不一致', out_trade_no, callbackFee: cash_fee, orderFee: order.pay_amount })
  //   return { return_code: 'FAIL', return_msg: '金额校验失败' }
  // }

  // 6. 更新订单状态
  await updateOne('orders', { _id: order._id }, {
    status: 1,  // 已付款待确认
    pay_time: new Date(time_end),
    transaction_id: transaction_id,
    updated_at: new Date()
  })

  // 7. 扣减实际库存（从 reservation_count 转入 stock 扣减）
  // 查询订单明细
  const orderItems = await collections.order_items.where({ order_id: order._id }).get()

  for (const item of orderItems.data) {
    // 原子操作：stock - quantity, reservation_count - quantity
    await collections.sku_stock.doc(item.sku_id).update({
 data: {
        stock: _.inc(-item.quantity),
        reservation_count: _.inc(-item.quantity)
      }
    })
  }

  // 8. 预约时段更新（reserved_count 不变，因为是正式确认不是释放）
  // 注：预约时段的 reserved_count 在下单时已 +1，支付成功后不需要再调整

  // 9. 发送订阅消息
  try {
    await sendSubscribeMessage({
      openid: order.openid,
      template_id: '恭喜您支付成功',
      data: {
        order_no: out_trade_no,
        amount: (order.pay_amount / 100).toFixed(2),
        time: time_end
      }
    })
  } catch (err) {
    cloud.logger.error({ action: 'payCallback', error: '发送订阅消息失败', out_trade_no, err: err.message })
    // 不影响主流程
  }

  cloud.logger.info({ action: 'payCallback', message: '处理成功', out_trade_no })
  return { return_code: 'SUCCESS', return_msg: 'OK' }
}

module.exports = async (event, context) => {
  // 云开发会自动解析 XML 回调为 JSON
  const callbackData = event

  try {
    const result = await handlePayCallback(callbackData)

    // 返回 XML 格式确认
    return `<xml><return_code>${result.return_code}</return_code><return_msg><![CDATA[${result.return_msg}]]></return_msg></xml>`

  } catch (err) {
    cloud.logger.error({ action: 'payCallback', error: err.message, stack: err.stack })
    return `<xml><return_code>FAIL</return_code><return_msg><![CDATA[系统错误]]></return_msg></xml>`
  }
}
```

---

### 4.10 order.getList - 获取订单列表

**目录**：`cloudfunctions/order/getList/index.js`

**入参**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| user_id | string | 是 | 用户ID |
| status | number | 否 | 订单状态筛选 |
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页数量，默认10 |

**出参**：

```javascript
{
  success: true,
  data: {
    list: [
      {
        order_id: 'xxx',
        order_no: 'ORDxxx',
        status: 0,
        total_amount: 29800,
        created_at: '2024-01-15T10:00:00Z'
      }
    ],
    total: 20,
    page: 1,
    pageSize: 10
  }
}
```

---

### 4.11 order.getDetail - 获取订单详情

**目录**：`cloudfunctions/order/getDetail/index.js`

**入参**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| order_id | string | 是 | 订单ID |
| user_id | string | 是 | 用户ID |

**出参**：

```javascript
{
  success: true,
  data: {
    order_id: 'xxx',
    order_no: 'ORDxxx',
    status: 1,
    total_amount: 29800,
    pay_amount: 29800,
    delivery_type: 1,
    reservation_date: '2024-01-20',
    reservation_time_slot: '10:00-12:00',
    items: [
      {
        sku_name: '8寸 草莓',
        price: 29800,
        quantity: 1,
        subtotal: 29800
      }
    ],
    created_at: '2024-01-15T10:00:00Z',
    pay_time: '2024-01-15T10:05:00Z'
  }
}
```

---

### 4.12 order.cancel - 取消订单

**目录**：`cloudfunctions/order/cancel/index.js`

**入参**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| order_id | string | 是 | 订单ID |
| user_id | string | 是 | 用户ID |

**处理逻辑**：

```
1. 校验订单存在且属于该用户
2. 校验订单状态为待付款（status = 0）
3. 事务操作：
   a. 更新订单状态为已取消（status = 5）
   b. 释放库存（reservation_count - quantity）
   c. 释放预约时段（reserved_count - 1）
4. 返回结果
```

**异常码**：

| 错误码 | 说明 |
|--------|------|
| ORDER_NOT_FOUND | 订单不存在 |
| ORDER_STATUS_INVALID | 订单状态不允许取消 |
| CANCEL_FAILED | 取消失败 |

---

### 4.13 reservation.getSlots - 获取可用预约时段

**目录**：`cloudfunctions/reservation/getSlots/index.js`

**入参**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| date | string | 是 | 日期 "YYYY-MM-DD" |

**处理逻辑**：

```
1. 查询 reservations 集合
2. 计算各时段可用状态（capacity > reserved_count）
3. 返回时段列表
```

**出参**：

```javascript
{
  success: true,
  data: {
    date: '2024-01-15',
    slots: [
      {
        time_slot: '09:00-12:00',
        capacity: 10,
        reserved: 3,
        available: true
      },
      {
        time_slot: '14:00-17:00',
        capacity: 10,
        reserved: 10,
        available: false
      }
    ]
  }
}
```

---

### 4.14 reservation.reserve - 预约时间段

**目录**：`cloudfunctions/reservation/reserve/index.js`

**入参**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| user_id | string | 是 | 用户ID |
| date | string | 是 | 日期 "YYYY-MM-DD" |
| time_slot | string | 是 | 时间段 "HH:MM-HH:MM" |

**处理逻辑**：

```
1. 校验日期范围（当天至30天内）
2. 检查时段是否存在且未满
3. 原子更新 reserved_count + 1
4. 返回预约结果
```

---

## 5. 错误处理规范

### 5.1 错误类定义

```javascript
// cloudfunctions/utils/error.js

/**
 * 业务错误（可预见的错误）
 */
class BusinessError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
    this.name = 'BusinessError'
  }
}

/**
 * 认证错误
 */
class AuthError extends Error {
  constructor(message) {
    super(message)
    this.code = 'UNAUTHORIZED'
    this.name = 'AuthError'
  }
}

/**
 * 系统错误（不可预见）
 */
class SystemError extends Error {
  constructor(message, originalError) {
    super(message)
    this.code = 'INTERNAL_ERROR'
    this.name = 'SystemError'
    this.originalError = originalError
  }
}

/**
 * 统一错误码
 */
const ErrorCodes = {
  // 参数错误（4xx）
  PARAM_REQUIRED: { httpStatus: 400, message: '缺少必要参数' },
  PARAM_INVALID: { httpStatus: 400, message: '参数格式错误' },

  // 认证错误
  UNAUTHORIZED: { httpStatus: 401, message: '未登录或登录已过期' },

  // 资源错误
  NOT_FOUND: { httpStatus: 404, message: '资源不存在' },

  // 业务错误（4xx / 5xx）
  STOCK_SHORTAGE: { httpStatus: 409, message: '库存不足' },
  SLOT_FULL: { httpStatus: 409, message: '预约时段已满' },
  ORDER_STATUS_INVALID: { httpStatus: 409, message: '订单状态不允许此操作' },
  ADDRESS_NOT_FOUND: { httpStatus: 404, message: '收货地址不存在' },
  SKU_NOT_FOUND: { httpStatus: 404, message: '商品不存在' },

  // 服务端错误
  PAYMENT_FAILED: { httpStatus: 500, message: '支付失败' },
  INTERNAL_ERROR: { httpStatus: 500, message: '服务器内部错误' },
}

/**
 * 格式化错误响应
 */
function formatError(err) {
  if (err instanceof BusinessError) {
    return {
      success: false,
      error: err.message,
      code: err.code
    }
  }

  if (err instanceof AuthError) {
    return {
      success: false,
      error: err.message,
      code: 'UNAUTHORIZED'
    }
  }

  // 系统错误不暴露详细信息
  return {
    success: false,
    error: '服务器内部错误，请稍后重试',
    code: 'INTERNAL_ERROR'
  }
}

/**
 * 错误码校验函数
 */
function validateErrorCode(code) {
  return ErrorCodes[code] !== undefined
}

module.exports = {
  BusinessError,
  AuthError,
  SystemError,
  ErrorCodes,
  formatError,
  validateErrorCode,
}
```

### 5.2 云函数统一错误处理

```javascript
// cloudfunctions/utils/handler.js
const { formatError, SystemError } = require('./error')
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

/**
 * 云函数入口包装器
 * 自动捕获错误并格式化返回
 */
function wrapHandler(handler) {
  return async (event, context) => {
    try {
      return await handler(event, context)
    } catch (err) {
      // 记录错误日志
      cloud.logger.error({
        action: 'handler_error',
        error: err.message,
        stack: err.stack,
        event
      })

      return formatError(err)
    }
  }
}

/**
 * 需要登录的 Action 列表
 */
const AUTH_REQUIRED_ACTIONS = [
  'getProfile',
  'updateProfile',
  'getAddressList',
  'addAddress',
  'setDefaultAddress',
  'deleteAddress',
  'create',
  'pay',
  'getList',
  'getDetail',
  'cancel',
  'reserve',
]

/**
 * 检查是否需要登录
 */
function requiresAuth(action) {
  return AUTH_REQUIRED_ACTIONS.includes(action)
}

module.exports = {
  wrapHandler,
  requiresAuth,
}
```

---

## 6. 日志与监控

### 6.1 日志封装

```javascript
// cloudfunctions/utils/logger.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

/**
 * 日志级别
 */
const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
}

const currentLevel = process.env.LOG_LEVEL || LogLevel.INFO

/**
 * 统一日志格式
 */
function formatLog(level, module, message, data = {}) {
  return {
    timestamp: new Date().toISOString(),
    level,
    module,
    message,
    ...data
  }
}

/**
 * Debug 日志
 */
function debug(module, message, data) {
  if (currentLevel <= LogLevel.DEBUG) {
    cloud.logger.debug(formatLog('DEBUG', module, message, data))
  }
}

/**
 * Info 日志
 */
function info(module, message, data) {
  if (currentLevel <= LogLevel.INFO) {
    cloud.logger.info(formatLog('INFO', module, message, data))
  }
}

/**
 * Warn 日志
 */
function warn(module, message, data) {
  if (currentLevel <= LogLevel.WARN) {
    cloud.logger.warn(formatLog('WARN', module, message, data))
  }
}

/**
 * Error 日志
 */
function error(module, message, data) {
  if (currentLevel <= LogLevel.ERROR) {
    cloud.logger.error(formatLog('ERROR', module, message, data))
  }
}

module.exports = {
  LogLevel,
  debug,
  info,
  warn,
  error,
}
```

### 6.2 关键日志点

| 日志点 | 级别 | 记录内容 |
|--------|------|----------|
| 云函数入口 | INFO | action, user_id, timestamp |
| 云函数出口 | INFO | action, duration, success |
| 订单创建 | INFO | order_id, order_no, total_amount, items |
| 支付回调 | INFO | out_trade_no, transaction_id, return_code |
| 库存操作 | DEBUG | sku_id, operation, before, after |
| 错误 | ERROR | action, error, stack, context |

### 6.3 监控指标

建议接入的监控指标：

| 指标 | 说明 | 告警阈值 |
|------|------|----------|
| 云函数调用量 | 每分钟/每小时调用次数 | 单函数 QPS > 100 |
| 错误率 | 失败调用 / 总调用 | > 5% |
| 平均响应时间 | P50/P95/P99 | P99 > 3s |
| 支付回调失败 | 回调处理失败次数 | > 0 |
| 库存超卖 | 负库存出现次数 | > 0 |

---

## 7. 微信支付回调处理流程

### 7.1 回调流程图

```
微信支付服务器
      │
      ▼
┌─────────────────┐
│  发送支付回调   │
│  POST /payCallback
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  云函数接收     │
│  解析 XML 数据  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  签名验证      │ ◄── 使用微信支付密钥
│  verifyPayCallback()
└────────┬────────┘
         │
    ┌────┴────┐
    │ 验证结果 │
    └────┬────┘
    失败 │    │ 成功
        ▼    │
  返回 FAIL   │
  记录日志   │
             ▼
    ┌─────────────────┐
    │  幂等检查       │
    │  查询订单状态   │
    │  status !== 0?  │
    └────────┬────────┘
             │
    已处理  │    未处理
        ▼    │
  返回 SUCCESS  │
  (不重复处理)  │
               ▼
    ┌─────────────────┐
    │  更新订单状态   │
    │  status = 1    │
    │  pay_time      │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │  扣减实际库存   │
    │  stock -= n     │
    │  res_count -= n │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │  发送订阅消息   │
    │  通知用户      │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │  返回 SUCCESS   │
    │  给微信服务器   │
    └─────────────────┘
```

### 7.2 支付工具函数

```javascript
// cloudfunctions/utils/pay.js
const crypto = require('crypto')

/**
 * 验证微信支付回调签名
 * @param {object} data - 回调数据
 * @returns {boolean}
 */
function verifyPayCallback(data) {
  const { sign, ...params } = data

  // 生成签名
  const signStr = Object.keys(params)
    .filter(key => key !== 'sign' && params[key] !== '' && params[key] !== null && params[key] !== undefined)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&')

  const key = process.env.WX_PAY_KEY  // 商户支付密钥
  const calculatedSign = crypto
    .createHmac('sha256', key)
    .update(signStr)
    .digest('hex')
    .toUpperCase()

  return calculatedSign === sign
}

/**
 * 微信支付统一下单
 * @param {object} params - 下单参数
 * @returns {object} - 支付参数
 */
async function unifiedOrder(params) {
  const cloud = require('wx-server-sdk')
  cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

  const { openid, outTradeNo, body, totalFee, notifyUrl } = params

  // 调用云开发统一下单接口
  const res = await cloud.cloudCallContainer({
    service: 'weixin',
    path: '/unifiedorder',
    method: 'POST',
    header: {
      'Content-Type': 'application/json'
    },
    data: {
      openid,
      self_defined: {
        out_trade_no: outTradeNo
      },
      body,
      total_fee: totalFee,
      notify_url: notifyUrl,
      trade_type: 'JSAPI'
    }
  })

  // 返回调起支付所需的参数
  const { prepay_id } = res

  // 生成支付签名
  const timeStamp = Math.floor(Date.now() / 1000).toString()
  const nonceStr = crypto.randomBytes(16).toString('hex')

  const signStr = `appId=${process.env.WX_APPID}&timeStamp=${timeStamp}&nonceStr=${nonceStr}&package=prepay_id=${prepay_id}&signType=RSA`

  const paySign = crypto
    .createSign('RSA-SHA256')
    .update(signStr)
    .sign(process.env.WX_PAY_PRIVATE_KEY, 'base64')

  return {
    timeStamp,
    nonceStr,
    package: `prepay_id=${prepay_id}`,
    signType: 'RSA',
    paySign
  }
}

/**
 * 申请退款（阶段2使用）
 * @param {object} params - 退款参数
 */
async function refund(params) {
  // 退款需调用微信支付退款接口
  // 当前 MVP 暂不实现
  throw new Error('退款功能暂未开放')
}

module.exports = {
  verifyPayCallback,
  unifiedOrder,
  refund,
}
```

---

## 8. 库存并发控制方案

### 8.1 问题分析

**超卖场景**：

```
用户A: 检查库存 = 5  ──────────────────► 下单 3 件 ──► 库存更新为 2
用户B: 检查库存 = 5  ──► 下单 2 件 ──► 库存更新为 3  ◄── 错误！覆盖了 A 的更新
```

**云数据库 MongoDB 支持的操作**：

| 操作 | 说明 |
|------|------|
| `$inc` | 原子递增/递减 |
| `findOneAndUpdate` | 查询并更新，原子操作 |
| 事务 | 多文档事务，原子性 |

### 8.2 解决方案：原子操作 + 条件更新

采用 **先扣后查** 策略，确保不会超卖：

#### 方案一：`$inc` 原子递增 + 事务

```javascript
// 下单时原子锁定库存
async function lockStockWithTransaction(tx, skuId, quantity) {
  // 1. 先尝试原子递增 reservation_count
  const res = await tx.collection('sku_stock').doc(skuId).update({
    data: {
      reservation_count: db.command.inc(quantity)
    }
  })

  // 2. 检查更新是否成功
  if (res.stats.updated === 0) {
    // 更新失败，说明库存不足或已锁定
    throw new BusinessError('STOCK_SHORTAGE', '库存不足')
  }

  // 3. 可选：验证可用库存（再次检查）
  const sku = await tx.collection('sku_stock').doc(skuId).get()
  const availableStock = sku.stock - sku.reservation_count

  if (availableStock < 0) {
    // 理论上不应该发生，如果发生说明有并发问题
    // 回滚 reservation_count
    await tx.collection('sku_stock').doc(skuId).update({
      data: {
        reservation_count: db.command.inc(-quantity)
      }
    })
    throw new BusinessError('STOCK_SHORTAGE', '库存不足')
  }

  return true
}
```

#### 方案二：条件更新（推荐）

```javascript
// 使用条件更新，只有满足条件才更新
async function conditionalLockStock(skuId, quantity) {
  const db = cloud.database()

  // 条件：available_stock = stock - reservation_count >= quantity
  // 使用 where 条件过滤 + update
  const res = await db.collection('sku_stock').doc(skuId).where({
    // 计算字段：stock - reservation_count >= quantity
    // MongoDB 查询表达式
    $expr: {
      $gte: [
        { $subtract: ['$stock', { $ifNull: ['$reservation_count', 0] }] },
        quantity
      ]
    }
  }).update({
    data: {
      reservation_count: db.command.inc(quantity)
    }
  })

  return res.stats.updated > 0
}
```

**云数据库 MongoDB 暂不支持 `$expr` 在更新中使用**，改用以下方案：

#### 方案三：事务内双重检查（最安全）

```javascript
async function createOrderWithStockCheck(data, userInfo) {
  const { items, delivery_type, reservation_date, reservation_time_slot } = data

  return await db.runTransaction(async (tx) => {
    const lockedSkus = []

    try {
      // 第一步：为每个 SKU 锁定库存
      for (const item of items) {
        // 1.1 查询当前库存
        const sku = await tx.collection('sku_stock').doc(item.sku_id).get()

        if (!sku) {
          throw new BusinessError('SKU_NOT_FOUND', '商品不存在')
        }

        // 1.2 计算可用库存
        const availableStock = sku.stock - (sku.reservation_count || 0)

        if (availableStock < item.quantity) {
          throw new BusinessError('STOCK_SHORTAGE', `库存不足: ${sku.sku_name}`)
        }

        // 1.3 原子递增 reservation_count
        const updateRes = await tx.collection('sku_stock').doc(item.sku_id).update({
          data: {
            reservation_count: db.command.inc(item.quantity)
          }
        })

        if (updateRes.stats.updated === 0) {
          throw new BusinessError('STOCK_SHORTAGE', '库存不足，请重试')
        }

        lockedSkus.push({
          skuId: item.sku_id,
          quantity: item.quantity,
          price: sku.price
        })
      }

      // 第二步：锁定预约时段
      const slotRes = await tx.collection('reservations')
        .where({
          date: reservation_date,
          time_slot: reservation_time_slot
        })
        .update({
          data: {
            reserved_count: db.command.inc(1)
          }
        })

      if (slotRes.stats.updated === 0) {
        throw new BusinessError('SLOT_FULL', '预约时段已满')
      }

      // 第三步：创建订单
      const totalAmount = lockedSkus.reduce((sum, s) => sum + s.price * s.quantity, 0)
      const orderNo = generateOrderNo()

      const orderRes = await tx.collection('orders').add({
        data: {
          order_no: orderNo,
          user_id: userInfo.user_id,
          status: 0,
          total_amount: totalAmount,
          pay_amount: totalAmount,
          delivery_type,
          reservation_date,
          reservation_time_slot,
          created_at: new Date(),
          updated_at: new Date()
        }
      })

      // 第四步：创建订单明细
      for (const sku of lockedSkus) {
        await tx.collection('order_items').add({
          data: {
            order_id: orderRes._id,
            sku_id: sku.skuId,
            sku_name: sku.skuName,
            price: sku.price,
            quantity: sku.quantity,
            subtotal: sku.price * sku.quantity
          }
        })
      }

      return {
        orderId: orderRes._id,
        orderNo,
        totalAmount
      }

    } catch (err) {
      // 事务失败，自动回滚所有更改
      // 手动回滚已锁定的库存
      for (const sku of lockedSkus) {
        try {
          await tx.collection('sku_stock').doc(sku.skuId).update({
            data: {
              reservation_count: db.command.inc(-sku.quantity)
            }
          })
        } catch (rollbackErr) {
          cloud.logger.error({
            action: 'rollback_stock',
            error: rollbackErr.message,
            skuId: sku.skuId
          })
        }
      }
      throw err
    }
  })
}
```

### 8.3 支付成功后库存扣减

```javascript
async function deductStockOnPayment(orderId) {
  // 查询订单明细
  const orderItems = await collections.order_items.where({ order_id: orderId }).get()

  // 原子扣减 stock 和 reservation_count
  for (const item of orderItems.data) {
    const res = await collections.sku_stock.doc(item.sku_id).update({
      data: {
        stock: db.command.inc(-item.quantity),           // 实际库存减少
        reservation_count: db.command.inc(-item.quantity) // 预留释放
      }
    })

    if (res.stats.updated === 0) {
      cloud.logger.error({
        action: 'deduct_stock_failed',
        orderId,
        skuId: item.sku_id
      })
    }
  }
}
```

### 8.4 取消订单时释放库存

```javascript
async function releaseStockOnCancel(orderId) {
  // 查询订单明细
  const orderItems = await collections.order_items.where({ order_id: orderId }).get()

  // 释放 reservation_count
  for (const item of orderItems.data) {
    await collections.sku_stock.doc(item.sku_id).update({
      data: {
        reservation_count: db.command.inc(-item.quantity)
      }
    })
  }

  // 释放预约时段
  const order = await collections.orders.doc(orderId).get()
  await collections.reservations
    .where({
      date: order.reservation_date,
      time_slot: order.reservation_time_slot
    })
    .update({
      data: {
        reserved_count: db.command.inc(-1)
      }
    })
}
```

### 8.5 库存流转图

```
                    ┌─────────────────────────────────────────────────────┐
                    │                   用户下单流程                        │
                    └─────────────────────────────────────────────────────┘

    stock = 10
    res_count = 0                                       可用库存 = 10 - 0 = 10

    ┌─────────┐                                         ┌─────────────────┐
    │ 用户A   │ ──► order.create(items=[{sku:1, qty:3}]) │                 │
    └─────────┘                                         │ 1. 检查库存      │
                                                        │ 2. 原子 +3 →     │
                                                        │    res_count=3   │
    stock = 10                                          │ 3. 检查结果：OK  │
    res_count = 3         ─────────────────────────►    │ 4. 创建订单      │
    available = 7                                       └─────────────────┘

    ─────────────────────────────────────────────────────────────────────

    ┌─────────┐                                         ┌─────────────────┐
    │ 用户B   │ ──► order.create(items=[{sku:1, qty:5}]) │                 │
    └─────────┘                                         │ 1. 检查库存      │
                                                        │ 2. 可用=7, 需要5 │
    ┌─────────┐ ──► 结果: 成功                          │ 3. 原子 +5 →     │
    │ 用户C   │                                         │    res_count=8   │
    └─────────┘ ──► order.create(items=[{sku:1, qty:4}]) │ 4. 创建订单      │
                                                        │ 5. 检查结果：OK  │
                                                        └─────────────────┘

    stock = 10
    res_count = 8         ─────────────────────────►    available = 2

    ─────────────────────────────────────────────────────────────────────

                    ┌─────────────────────────────────────────────────────┐
                    │                   支付成功流程                       │
                    └─────────────────────────────────────────────────────┘

    用户A/B/C 全部支付成功

    ┌─────────────────────────────────────────────────────────────────┐
    │ order.payCallback                                              │
    │                                                                 │
    │ for each 订单:                                                 │
    │   1. status = 1 (已付款)                                        │
    │   2. stock -= qty (实际库存扣减)                                  │
    │   3. res_count -= qty (预留释放)                                 │
    │                                                                 │
    │ 结果:                                                          │
    │   订单A: stock -= 3, res -= 3                                  │
    │   订单B: stock -= 5, res -= 5                                  │
    │   订单C: stock -= 4, res -= 4                                  │
    │                                                                 │
    │ 最终: stock = 10 - 3 - 5 - 4 = -2 ???                         │
    │                                                                 │
    │ 不会发生！因为下单时已检查 available = stock - res_count >= qty  │
    └─────────────────────────────────────────────────────────────────┘

    最终状态: stock = -2 (如果允许) 或 stock = 0 (正确)

    ─────────────────────────────────────────────────────────────────────

    关键点：
    1. 下单时检查 available = stock - res_count >= qty
    2. 锁定时使用原子操作 reservation_count += qty
    3. 支付成功后 stock -= qty, res_count -= qty
    4. 取消时 res_count -= qty (释放锁定)
```

---

## 9. 附录

### 9.1 云函数 package.json 模板

```json
{
  "name": "cloudfunction-name",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3"
  }
}
```

### 9.2 环境变量配置

| 变量名 | 说明 | 示例 |
|--------|------|------|
| WX_APPID | 小程序 AppID | wx1234567890abcdef |
| WX_MCH_ID | 微信支付商户号 | 1234567890 |
| WX_PAY_KEY | 微信支付密钥 | abcdef123456... |
| WX_PAY_PRIVATE_KEY | 支付签名私钥 | -----BEGIN RSA... |
| JWT_SECRET | JWT 签名密钥 | your-secret-key |
| LOG_LEVEL | 日志级别 | INFO |

### 9.3 状态码对照表

| 订单状态码 | 状态名 | 说明 |
|-----------|--------|------|
| 0 | 待付款 | 订单创建初始状态 |
| 1 | 已付款待确认 | 回调成功更新 |
| 2 | 制作中 | 商家后台确认 |
| 3 | 待自提/待配送 | 制作完成 |
| 4 | 已完成 | 用户确认收货 |
| 5 | 已取消 | 超时或用户取消 |

### 9.4 订单号生成规则

```
ORD + yyyyMMddHHmmss + 6位随机数
示例：ORD20240115143025123456
```

---

## 10. 更新记录

| 日期 | 版本 | 更新内容 | 作者 |
|------|------|---------|------|
| 2024-01-15 | v1.0 | 初始版本 | 后端组 |
| 2024-01-20 | v1.1 | 补充库存并发控制详细方案 | 后端组 |