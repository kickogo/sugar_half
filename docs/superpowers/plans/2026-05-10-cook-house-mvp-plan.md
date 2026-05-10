# 蛋糕工作室小程序 - 项目开发计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成蛋糕工作室微信小程序 MVP 阶段的全部开发任务，实现商品浏览、预约下单、微信支付的核心功能

**Architecture:** 小程序前端使用 Skyline + glass-easel 渲染，后端使用微信云开发（CloudBase）提供云函数和数据库，微信支付集成实现交易闭环

**Tech Stack:** 微信小程序 | Skyline | glass-easel | 云开发 | MongoDB | 微信支付

---

## 项目结构

```
cook_house/
├── app.js                          # App 入口
├── app.json                        # 全局配置
├── app.wxss                        # 全局样式
├── components/                     # 公共组件
│   └── navigation-bar/            # 自定义导航栏（已完成）
├── pages/                          # 页面
│   ├── index/                     # 首页
│   ├── category/                  # 分类页
│   ├── product/                   # 商品详情页
│   ├── order/                     # 订单确认页
│   ├── reservation/               # 预约页面
│   ├── payment/                   # 支付页
│   └── my/                        # 个人中心
│       ├── orderList/            # 订单列表
│       ├── orderDetail/          # 订单详情
│       └── address/              # 地址管理
├── services/                      # 公共服务
│   ├── api.js                    # API 调用封装
│   ├── auth.js                   # 鉴权逻辑
│   └── payment.js                # 支付服务
├── utils/                         # 工具函数
│   └── helpers.js                # 辅助函数
└── cloudfunctions/               # 云函数目录
    ├── user/                     # 用户模块
    ├── product/                  # 商品模块
    ├── sku/                      # SKU模块
    ├── order/                    # 订单模块
    ├── reservation/              # 预约模块
    └── utils/                    # 公共工具
```

---

## 开发阶段

### 阶段一：后端基础服务搭建（P0）

| 任务 | 说明 |
|------|------|
| Task 1.1 | 云开发环境初始化（如果未完成） |
| Task 1.2 | 数据库集合创建 + 初始化数据 |
| Task 1.3 | 云函数公共模块（db.js, error.js, logger.js, auth.js） |

### 阶段二：前端项目框架（P0）

| 任务 | 说明 |
|------|------|
| Task 2.1 | 项目配置（app.json 配置页面路由、renderer） |
| Task 2.2 | 全局样式（app.wxss 配色、字体规范） |
| Task 2.3 | services 层（api.js, auth.js, payment.js） |
| Task 2.4 | 页面模板（各页面框架代码） |

### 阶段三：后端核心业务（P0）

| 任务 | 说明 |
|------|------|
| Task 3.1 | user.login 用户登录云函数 |
| Task 3.2 | product.* 商品查询云函数（categories/list/detail） |
| Task 3.3 | sku.getStock SKU库存查询 |
| Task 3.4 | order.create 订单创建（核心，含库存原子锁定） |
| Task 3.5 | order.pay / order.payCallback 微信支付 |
| Task 3.6 | reservation.getSlots/reserve 预约时段 |

### 阶段四：前端核心页面（P0）

| 任务 | 说明 |
|------|------|
| Task 4.1 | 首页（banner + 分类 + 商品列表） |
| Task 4.2 | 商品详情页（SKU选择器 + 预约选择） |
| Task 4.3 | 订单确认页（地址选择 + 预约确认 + 提交） |
| Task 4.4 | 支付页（倒计时 + wx.requestPayment） |

### 阶段五：前端个人中心（P1）

| 任务 | 说明 |
|------|------|
| Task 5.1 | 个人中心页面框架 |
| Task 5.2 | 订单列表页 |
| Task 5.3 | 订单详情页 |
| Task 5.4 | 地址管理页 |

### 阶段六：后端补充功能（P1）

| 任务 | 说明 |
|------|------|
| Task 6.1 | user.* 地址管理云函数 |
| Task 6.2 | order.getList / order.getDetail 订单查询 |
| Task 6.3 | order.cancel 订单取消 |

---

## 详细任务定义

### Task 1.1: 云开发环境初始化

**前置条件**: 微信开发者工具已打开项目

**Files:**
- Modify: `project.config.json`
- Check: 云开发控制台开通状态

- [ ] **Step 1: 检查项目配置**

确认 `project.config.json` 中 appid 为 `touristappid`，确认云开发控制台已开通

- [ ] **Step 2: 记录云环境 ID**

在微信开发者工具中，查看云开发控制台，获取环境 ID（形如 `cloudbase-xxx`）

- [ ] **Step 3: 更新 project.config.json**

如有需要，补充云环境配置

---

### Task 1.2: 数据库集合创建

**Files:**
- Create: `docs/database-init.md` (初始化数据脚本说明)
- 操作: 云开发控制台手动创建集合

**集合列表:**
| 集合名 | 说明 |
|--------|------|
| `users` | 用户账号 |
| `categories` | 分类 |
| `products` | 商品 |
| `sku_stock` | SKU库存 |
| `orders` | 订单主表 |
| `order_items` | 订单明细 |
| `reservations` | 预约时段 |
| `addresses` | 收货地址 |

- [ ] **Step 1: 在云开发控制台创建 8 个集合**

参考 system-architecture.md 第3节的数据结构

- [ ] **Step 2: 创建测试数据**

在 categories 集合中插入测试分类（生日蛋糕、下午茶、节日限定）
在 products 集合中插入 3-5 个测试商品
在 sku_stock 集合中为每个商品创建 SKU 记录
在 reservations 集合中插入未来 7 天的时段数据（每天 3 个时段）

- [ ] **Step 3: 创建索引**

`users`: openid（唯一）
`sku_stock`: sku_key（唯一）
`orders`: order_no（唯一）
`reservations`: date + time_slot（复合唯一）

---

### Task 1.3: 云函数公共模块

**Files:**
- Create: `cloudfunctions/utils/db.js`
- Create: `cloudfunctions/utils/error.js`
- Create: `cloudfunctions/utils/logger.js`
- Create: `cloudfunctions/utils/auth.js`
- Create: `cloudfunctions/utils/helpers.js`

- [ ] **Step 1: 创建目录结构**

在本地创建 `cloudfunctions/utils/` 目录

- [ ] **Step 2: 创建 db.js**

参考 backend-detailed-design.md 3.1 节，实现：
- `getOne(collName, where, options)` - 查询单条
- `getList(collName, where, options)` - 查询列表
- `insert(collName, data)` - 插入
- `updateOne(collName, where, data)` - 更新
- `incOne(collName, where, field, delta)` - 原子递增
- `transaction(callback)` - 事务封装

- [ ] **Step 3: 创建 error.js**

实现 BusinessError、AuthError、SystemError 类，以及 formatError 函数

- [ ] **Step 4: 创建 logger.js**

封装 info/error/warn/debug 日志方法

- [ ] **Step 5: 创建 auth.js**

实现 generateToken / verifyToken 函数（JWT）

- [ ] **Step 6: 创建 helpers.js**

实现 generateOrderNo 函数（格式：`ORD + yyyyMMddHHmmss + 6位随机数`）

- [ ] **Step 7: 在云开发控制台创建 utils 云函数**

上传公共模块，确保每个云函数都能 require 这些工具

---

### Task 2.1: 项目配置

**Files:**
- Modify: `app.json`
- Modify: `pages/index/index.json` (新建)
- Modify: `pages/category/index.json` (新建)
- Modify: `pages/product/index.json` (新建)

- [ ] **Step 1: 更新 app.json**

```json
{
  "pages": [
    "pages/index/index",
    "pages/category/index",
    "pages/product/index",
    "pages/order/index",
    "pages/reservation/index",
    "pages/payment/index",
    "pages/my/index",
    "pages/my/orderList/index",
    "pages/my/orderDetail/index",
    "pages/my/address/index"
  ],
  "window": {
    "navigationStyle": "custom"
  },
  "renderer": "skyline",
  "rendererOptions": {
    "skyline": {
      "defaultDisplayBlock": true
    }
  },
  "componentFramework": "glass-easel"
}
```

- [ ] **Step 2: 创建页面目录和基础 json 配置**

每个页面目录创建 `index.json`，内容：
```json
{
  "usingComponents": {
    "navigation-bar": "/components/navigation-bar/navigation-bar"
  }
}
```

---

### Task 2.2: 全局样式

**Files:**
- Modify: `app.wxss`

- [ ] **Step 1: 定义全局变量（CSS Custom Properties）**

```css
/* 颜色系统 */
page {
  --color-primary: #F5DCC3;
  --color-accent: #E8A0A0;
  --color-text: #333333;
  --color-text-light: #666666;
  --color-text-muted: #999999;
  --color-bg: #FAF9F7;
  --color-white: #FFFFFF;
  --color-border: #E8E8E8;
  --color-success: #4CAF50;
  --color-error: #E57373;
}

/* 字体 */
page {
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif;
}

/* 间距 */
page {
  --spacing-xs: 8rpx;
  --spacing-sm: 16rpx;
  --spacing-md: 24rpx;
  --spacing-lg: 32rpx;
  --spacing-xl: 48rpx;
}
```

- [ ] **Step 2: 定义通用样式类**

```css
/* 页面容器 */
.page-container {
  min-height: 100vh;
  background: var(--color-bg);
}

/* 卡片 */
.card {
  background: var(--color-white);
  border-radius: 16rpx;
  padding: var(--spacing-md);
}

/* 按钮 */
.btn-primary {
  background: var(--color-primary);
  color: #333;
  border-radius: 12rpx;
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  font-size: 32rpx;
}

.btn-primary:active {
  opacity: 0.8;
}

.btn-primary[disabled] {
  background: #ccc;
  color: #999;
}
```

---

### Task 2.3: Services 层

**Files:**
- Create: `services/api.js`
- Create: `services/auth.js`
- Create: `services/payment.js`

- [ ] **Step 1: 创建 services 目录**

创建 `services/` 目录

- [ ] **Step 2: 创建 api.js**

参考 frontend-detailed-design.md 2.1 节，实现：
- `callFunction(name, data, options)` - 云函数调用封装
- `callFunctionWithAuth(name, data, options)` - 带登录态的调用
- `cancelPageRequests(page)` - 取消页面请求

API 方法：
```javascript
export const userApi = { login, getProfile, updateProfile, getAddressList, addAddress, setDefaultAddress }
export const productApi = { getCategories, getList, getDetail }
export const skuApi = { getStock }
export const orderApi = { create, getList, getDetail, cancel }
export const reservationApi = { getSlots, reserve }
export const paymentApi = { getPayParams }
```

- [ ] **Step 3: 创建 auth.js**

实现：
- `checkLogin()` - 检查登录态
- `getToken()` - 获取 token
- `setToken(token)` - 存储 token
- `clearToken()` - 清除 token

- [ ] **Step 4: 创建 payment.js**

实现：
- `pay(orderId)` - 发起支付，返回 Promise
- `queryPayResult(orderId)` - 查询支付结果

---

### Task 2.4: 页面模板

**Files:**
- Create: `pages/index/index.js` (空页面框架)
- Create: `pages/category/index.js` (空页面框架)
- Create: `pages/product/index.js` (空页面框架)
- Create: `pages/order/index.js` (空页面框架)
- Create: `pages/reservation/index.js` (空页面框架)
- Create: `pages/payment/index.js` (空页面框架)
- Create: `pages/my/index.js` (空页面框架)
- Create: `pages/my/orderList/index.js` (空页面框架)
- Create: `pages/my/orderDetail/index.js` (空页面框架)
- Create: `pages/my/address/index.js` (空页面框架)

每个页面的 js 文件基础结构：
```javascript
Page({
  data: {
    loading: false,
  },

  onLoad(options) {
    // 页面加载
  },
})
```

- [ ] **Step 1: 创建所有页面目录**

按照目录结构创建所有页面文件夹

- [ ] **Step 2: 创建 index.js 页面框架**

每个页面创建基础 Page 框架

- [ ] **Step 3: 创建 index.json 配置**

每个页面配置 usingComponents

---

### Task 3.1: user.login 云函数

**Files:**
- Create: `cloudfunctions/user/login/index.js`
- Create: `cloudfunctions/user/login/package.json`

- [ ] **Step 1: 创建目录结构**

创建 `cloudfunctions/user/login/` 目录

- [ ] **Step 2: 创建 index.js**

参考 backend-detailed-design.md 4.1 节，实现：
- 接收微信 code
- 调用微信 code2Session 获取 openid
- 查询/创建用户记录
- 生成 JWT token
- 返回用户信息 + token

- [ ] **Step 3: 创建 package.json**

```json
{
  "name": "user-login",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3"
  }
}
```

- [ ] **Step 4: 上传云函数**

在微信开发者工具中右键上传

---

### Task 3.2: product.* 云函数

**Files:**
- Create: `cloudfunctions/product/getCategories/index.js`
- Create: `cloudfunctions/product/getList/index.js`
- Create: `cloudfunctions/product/getDetail/index.js`

- [ ] **Step 1: 创建 getCategories**

参考 backend-detailed-design.md 4.3 节

- [ ] **Step 2: 创建 getList**

参考 backend-detailed-design.md 4.4 节，支持分页和分类筛选

- [ ] **Step 3: 创建 getDetail**

参考 backend-detailed-design.md 4.5 节，返回商品详情 + SKU列表

---

### Task 3.3: sku.getStock 云函数

**Files:**
- Create: `cloudfunctions/sku/getStock/index.js`

- [ ] **Step 1: 创建 getStock**

参考 backend-detailed-design.md 4.6 节

---

### Task 3.4: order.create 云函数

**Files:**
- Create: `cloudfunctions/order/create/index.js`

**重点**: 这是核心云函数，涉及库存原子锁定

- [ ] **Step 1: 创建 order/create 云函数**

参考 backend-detailed-design.md 4.7 节，实现：
- 参数校验
- SKU 库存检查（available = stock - reservation_count >= quantity）
- 事务内锁定库存（`reservation_count: _.inc(quantity)`）
- 锁定预约时段（`reserved_count: _.inc(1)`）
- 创建订单主记录 + 订单明细

- [ ] **Step 2: 上传并测试**

使用微信开发者工具云函数本地调试功能测试

---

### Task 3.5: order.pay / order.payCallback 云函数

**Files:**
- Create: `cloudfunctions/order/pay/index.js`
- Create: `cloudfunctions/order/payCallback/index.js`
- Create: `cloudfunctions/utils/pay.js`

- [ ] **Step 1: 创建 pay.js 工具**

实现 `verifyPayCallback()` 和 `unifiedOrder()` 函数

- [ ] **Step 2: 创建 order.pay**

参考 backend-detailed-design.md 4.8 节，实现：
- 校验订单状态
- 调用统一下单接口
- 返回支付参数

- [ ] **Step 3: 创建 order.payCallback**

参考 backend-detailed-design.md 4.9 节，实现：
- 签名验证
- 幂等检查
- 更新订单状态
- 扣减实际库存（`stock: _.inc(-qty), reservation_count: _.inc(-qty)`）
- 发送订阅消息

---

### Task 3.6: reservation.* 云函数

**Files:**
- Create: `cloudfunctions/reservation/getSlots/index.js`
- Create: `cloudfunctions/reservation/reserve/index.js`

- [ ] **Step 1: 创建 getSlots**

参考 backend-detailed-design.md 4.13 节，返回日期的可用时段列表

- [ ] **Step 2: 创建 reserve**

参考 backend-detailed-design.md 4.14 节，原子更新 reserved_count

---

### Task 4.1: 首页

**Files:**
- Modify: `pages/index/index.js`
- Create: `pages/index/index.wxml`
- Create: `pages/index/index.wxss`

- [ ] **Step 1: 实现 index.js**

参考 frontend-detailed-design.md 4.1 节，实现：
- `onLoad`: 调用 getCategories + getList 并行加载
- `onPullDownRefresh`: 下拉刷新
- `onReachBottom`: 上拉加载更多
- `onCategoryTap`: 跳转分类页
- `onProductTap`: 跳转商品详情页

- [ ] **Step 2: 创建 index.wxml**

实现轮播图 + 分类入口 + 商品网格布局

- [ ] **Step 3: 创建 index.wxss**

实现布局样式

---

### Task 4.2: 商品详情页

**Files:**
- Modify: `pages/product/index.js`
- Create: `pages/product/index.wxml`
- Create: `pages/product/index.wxss`

- [ ] **Step 1: 实现 index.js**

参考 frontend-detailed-design.md 4.2 节，实现：
- `onLoad`: 调用 getDetail 获取商品详情
- SKU 选择逻辑：`calculateSpecAvailability`, `checkSkuAvailability`, `calculateSkuPrice`
- `onSpecSelect`: 规格选项点击
- `onQuantityChange`: 数量修改
- `onAddToOrder`: 加入订单并跳转

- [ ] **Step 2: 实现 SKU 选择器 WXML**

实现规格选项的展示和选中状态

- [ ] **Step 3: 实现预约选择**

点击预约时间时跳转 reservation 页面，结果通过 events 传递

---

### Task 4.3: 订单确认页

**Files:**
- Modify: `pages/order/index.js`
- Create: `pages/order/index.wxml`
- Create: `pages/order/index.wxss`

- [ ] **Step 1: 实现 index.js**

参考 frontend-detailed-design.md 4.4 节，实现：
- `onLoad`: 接收商品信息、预约信息
- `onDeliveryTypeChange`: 切换配送方式
- `onSelectAddress`: 选择收货地址
- `onModifyReservation`: 修改预约时间
- `validate`: 表单校验
- `onSubmit`: 调用 order.create 并跳转支付页

---

### Task 4.4: 支付页

**Files:**
- Modify: `pages/payment/index.js`
- Create: `pages/payment/index.wxml`
- Create: `pages/payment/index.wxss`

- [ ] **Step 1: 实现 index.js**

参考 frontend-detailed-design.md 4.5 节，实现：
- `onLoad`: 初始化订单信息，启动倒计时
- `startCountdown`: 30分钟倒计时
- `onPay`: 调用 paymentService.pay 发起支付
- `handlePayTimeout`: 超时处理
- `onCancelOrder`: 取消订单

---

### Task 5.1-5.4: 个人中心模块

**Files:**
- Modify: `pages/my/index.js`
- Create: `pages/my/index.wxml`
- Create: `pages/my/index.wxss`
- (类似创建 orderList, orderDetail, address 子页面)

- [ ] **Step 1: 实现个人中心主页**

用户信息展示 + 功能入口列表（我的订单、收货地址、会员中心）

- [ ] **Step 2: 实现订单列表页**

状态 Tab 筛选 + 订单卡片列表

- [ ] **Step 3: 实现订单详情页**

订单状态展示 + 商品信息 + 价格明细

- [ ] **Step 4: 实现地址管理页**

地址列表 + 新增/编辑/删除功能

---

### Task 6.1-6.3: 后端补充功能

**Files:**
- Create: `cloudfunctions/user/getAddressList/index.js`
- Create: `cloudfunctions/user/addAddress/index.js`
- Create: `cloudfunctions/user/setDefaultAddress/index.js`
- Create: `cloudfunctions/order/getList/index.js`
- Create: `cloudfunctions/order/getDetail/index.js`
- Create: `cloudfunctions/order/cancel/index.js`

- [ ] **Step 1: 创建 user 地址管理云函数**

- [ ] **Step 2: 创建 order 查询和取消云函数**

- [ ] **Step 3: 上传所有云函数并测试**

---

## 验收标准

### 功能验收

| 功能 | 验收条件 |
|------|----------|
| 用户登录 | 微信授权后能创建/获取用户，返回 token |
| 商品列表 | 能看到分类和商品列表，能分页加载 |
| 商品详情 | 能看到商品图片、规格选项、价格 |
| SKU 选择 | 选中规格后正确计算价格，显示库存状态 |
| 预约选择 | 日历选择日期 + 时间段选择 |
| 订单创建 | 库存足够时创建成功，库存锁定 |
| 微信支付 | 能调起微信支付，输入密码后回调成功 |
| 订单列表 | 能看到历史订单，状态正确显示 |

### 技术验收

| 检查项 | 标准 |
|--------|------|
| 库存不超卖 | 并发下单不超过实际库存 |
| 支付回调幂等 | 同一订单多次回调只处理一次 |
| 页面切换流畅 | 无白屏，无明显卡顿 |
| 错误处理 | 异常情况有 toast 提示 |

---

## 执行方式选择

Plan complete and saved to `docs/superpowers/plans/2026-05-10-cook-house-mvp-plan.md`.

**Two execution options:**

**1. Subagent-Driven (recommended)** - Dispatch fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**