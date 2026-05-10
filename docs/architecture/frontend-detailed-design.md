# 前端软件详细设计文档

## 1. 概述

### 1.1 文档目的

本文档为蛋糕工作室微信小程序的前端详细设计文档，定义所有页面的数据结构、事件处理、组件接口、API调用及交互细节。

### 1.2 技术栈

| 技术 | 说明 |
|------|------|
| 渲染引擎 | Skyline（微信小程序新一代渲染器） |
| 组件框架 | glass-easel |
| 开发模式 | ES Module |
| 适配要求 | iOS 12+、Android 8+ |

### 1.3 项目结构

```
├── app.js                    # App 入口
├── app.json                 # 全局配置（页面路由、window配置、renderer设置）
├── app.wxss                 # 全局样式
├── components/              # 公共组件
│   └── navigation-bar/    # 自定义导航栏（已完成）
├── pages/                   # 页面组件
│   ├── index/              # 首页
│   ├── category/          # 分类页
│   ├── product/            # 商品详情页
│   ├── order/              # 订单确认页
│   ├── reservation/        # 预约页面
│   ├── payment/            # 支付页
│   └── my/                  # 个人中心（含子页面）
│       ├── orderList/      # 订单列表
│       ├── orderDetail/    # 订单详情
│       ├── address/        # 地址管理
│       └── member/        # 会员中心
├── services/               # 公共服务层
│   ├── api.js              # API 调用封装
│   ├── auth.js             # 鉴权逻辑
│   └── payment.js          # 支付封装
└── utils/                   # 工具函数
    ├── constants.js        # 常量定义
    └── helpers.js          # 辅助函数
```

---

## 2. API 调用层封装

### 2.1 services/api.js

统一封装云函数调用，处理请求拦截、错误处理、登录态校验。

```javascript
// services/api.js

/**
 * API 统一封装
 * 基础路径：wx.cloud.callFunction
 */

const API_BASE = ''; // 云函数直接调用，不需baseURL

// 请求计数器（用于 requestTask 中断）
let requestIndex = 0;

// 存储当前页面的请求任务
const pageRequests = new Map();

/**
 * 通用云函数调用
 * @param {string} name - 云函数名称
 * @param {object} data - 请求参数
 * @param {object} options - 配置项
 * @param {string} options.page - 页面标识，用于管理请求生命周期
 * @returns {Promise<object>}
 */
function callFunction(name, data = {}, options = {}) {
  const { page = 'default' } = options;

  return new Promise((resolve, reject) => {
    const requestId = ++requestIndex;

    // 将请求任务与页面关联，用于页面销毁时取消请求
    wx.cloud.callFunction({
      name,
      data,
      success: (res) => {
        // 业务错误处理
        if (res.result && res.result.success === false) {
          const error = new Error(res.result.message || '请求失败');
          error.code = res.result.code;
          error.data = res.result.data;
          reject(error);
          return;
        }
        resolve(res.result);
      },
      fail: (err) => {
        // 网络错误
        const error = new Error(err.message || '网络错误');
        error.code = 'NETWORK_ERROR';
        reject(error);
      },
      complete: () => {
        pageRequests.delete(requestId);
      }
    });

    // 关联请求到页面
    pageRequests.set(requestId, { page, requestId });
  });
}

/**
 * 取消页面所有请求
 * @param {string} page - 页面标识
 */
function cancelPageRequests(page) {
  for (const [id, task] of pageRequests) {
    if (task.page === page) {
      // 注意：wx.cloud.callFunction 不支持中断，此处仅做清理标记
      pageRequests.delete(id);
    }
  }
}

/**
 * 请求封装 - 带登录态检查
 * @param {string} name - 云函数名称
 * @param {object} data - 请求参数
 * @param {object} options - 配置项
 */
async function callFunctionWithAuth(name, data = {}, options = {}) {
  // 检查登录态
  const token = wx.getStorageSync('token');
  if (!token) {
    // 触发登录流程
    await triggerLogin();
  }

  // 注入 user_id
  const userId = wx.getStorageSync('user_id');
  if (userId) {
    data.user_id = userId;
  }

  return callFunction(name, data, options);
}

/**
 * 触发登录流程
 */
function triggerLogin() {
  return new Promise((resolve, reject) => {
    wx.navigateTo({ url: '/pages/login/index' });
    // 登录页完成后会通过 eventChannel 通知
    // 此处简单处理，实际项目中需要更完善的事件机制
  });
}

// ==================== API 方法 ====================

// 用户模块
export const userApi = {
  login: (code) => callFunction('user.login', { code }),
  getProfile: () => callFunctionWithAuth('user.getProfile'),
  updateProfile: (data) => callFunctionWithAuth('user.updateProfile', data),
  getAddressList: () => callFunctionWithAuth('user.getAddressList'),
  addAddress: (data) => callFunctionWithAuth('user.addAddress', data),
  setDefaultAddress: (id) => callFunctionWithAuth('user.setDefaultAddress', { id }),
  deleteAddress: (id) => callFunctionWithAuth('user.deleteAddress', { id }),
};

// 商品模块
export const productApi = {
  getCategories: () => callFunction('product.getCategories'),
  getList: (params) => callFunction('product.getList', params),
  getDetail: (id) => callFunction('product.getDetail', { id }),
};

// SKU 模块
export const skuApi = {
  getStock: (skuId) => callFunction('sku.getStock', { sku_id: skuId }),
};

// 订单模块
export const orderApi = {
  create: (data) => callFunctionWithAuth('order.create', data),
  getList: (params) => callFunctionWithAuth('order.getList', params),
  getDetail: (orderId) => callFunctionWithAuth('order.getDetail', { order_id: orderId }),
  cancel: (orderId) => callFunctionWithAuth('order.cancel', { order_id: orderId }),
};

// 预约模块
export const reservationApi = {
  getSlots: (date) => callFunction('reservation.getSlots', { date }),
  reserve: (data) => callFunctionWithAuth('reservation.reserve', data),
};

// 支付模块（前端部分，不含 actual payment）
export const paymentApi = {
  getPayParams: (orderId) => callFunctionWithAuth('order.pay', { order_id: orderId }),
};

export default {
  callFunction,
  callFunctionWithAuth,
  cancelPageRequests,
  userApi,
  productApi,
  skuApi,
  orderApi,
  reservationApi,
  paymentApi,
};
```

---

## 3. 状态管理方案

### 3.1 方案选型

**推荐方案：页面级 data + setData**

理由：
- 小程序内存有限，页面级状态管理足够应对当前业务复杂度
- Skyline 渲染器对 setData 有性能优化
- 若后续引入购物车等跨页面共享状态，再引入 glass-easel store

### 3.2 状态分类

| 状态类型 | 存储位置 | 示例 |
|---------|---------|------|
| 页面级状态 | 页面 data | 当前选中规格、预约时间 |
| 跨页面状态 | wx.getStorageSync | token、user_id、cart |
| 全局状态 | getApp().globalData | 是否有新订单 |

### 3.3 全局数据管理

```javascript
// app.js
App({
  globalData: {
    hasNewOrder: false,        // 是否有新订单
    selectedAddress: null,     // 订单确认页缓存地址
    pendingReservation: null,  // 待确认的预约信息
  },

  onShow() {
    // 检查是否有新订单
    const orders = wx.getStorageSync('new_orders') || [];
    if (orders.length > 0) {
      this.globalData.hasNewOrder = true;
    }
  }
});
```

---

## 4. 页面详细设计

### 4.1 首页 (pages/index/)

#### 4.1.1 数据结构

```javascript
// pages/index/index.js
Page({
  data: {
    // 轮播图
    banners: [
      { id: 1, image: 'https://...', link: '' },
      { id: 2, image: 'https://...', link: '' },
    ],
    bannerIndex: 0,              // 当前轮播索引

    // 分类入口
    categories: [
      { id: 1, name: '生日蛋糕', icon: 'https://...' },
      { id: 2, name: '下午茶', icon: 'https://...' },
    ],

    // 推荐商品
    products: [
      {
        id: 'product_001',
        name: '草莓慕斯蛋糕',
        image: 'https://...',
        price: 26800,             // 价格（分）
        tags: ['爆款', '新品'],
      }
    ],

    // 加载状态
    loading: true,
    loadingMore: false,          // 加载更多
    hasMore: true,
    page: 1,
    pageSize: 10,

    // 错误状态
    error: null,
    errorType: null,             // 'network' | 'empty' | null
  },

  // 滚动位置
  scrollTop: 0,
});

// pages/index/index.wxml 结构
/*
<template name="index">
  <navigation-bar title="首页" back="{{false}}" />

  <scroll-view scroll-y
    scroll-top="{{scrollTop}}"
    bindscroll="onScroll"
    class="page-container">

    <!-- 轮播图 -->
    <swiper class="banner-swiper"
      indicator-dots="{{true}}"
      autoplay="{{true}}"
      interval="3000"
      bindchange="onBannerChange">
      <block wx:for="{{banners}}" wx:key="id">
        <swiper-item>
          <image src="{{item.image}}" mode="aspectFill" />
        </swiper-item>
      </block>
    </swiper>

    <!-- 分类入口 -->
    <view class="category-section">
      <view class="category-grid">
        <block wx:for="{{categories}}" wx:key="id">
          <view class="category-item" bindtap="onCategoryTap" data-id="{{item.id}}">
            <image src="{{item.icon}}" />
            <text>{{item.name}}</text>
          </view>
        </block>
      </view>
    </view>

    <!-- 推荐商品 -->
    <view class="product-section">
      <view class="section-title">推荐商品</view>
      <view class="product-grid">
        <block wx:for="{{products}}" wx:key="id">
          <view class="product-card" bindtap="onProductTap" data-id="{{item.id}}">
            <image src="{{item.image}}" mode="aspectFill" />
            <view class="product-info">
              <text class="product-name">{{item.name}}</text>
              <text class="product-price">￥{{item.price / 100}}</text>
            </view>
          </view>
        </block>
      </view>
    </view>

    <!-- 加载状态 -->
    <view class="loading-more" wx:if="{{loadingMore}}">
      <text>加载中...</text>
    </view>
    <view class="no-more" wx:elif="{{!hasMore}}">
      <text>— 没有更多了 —</text>
    </view>
  </scroll-view>

  <!-- 底部导航 -->
  <tab-bar current="index" />
</template>
*/
```

#### 4.1.2 事件处理

| 事件 | 处理函数 | 说明 |
|------|---------|------|
| 页面加载 | `onLoad` | 初始化数据，调用 API |
| 下拉刷新 | `onPullDownRefresh` | 刷新 banner 和商品列表 |
| 上拉加载 | `onReachBottom` | 加载更多商品 |
| 轮播切换 | `onBannerChange` | 更新 bannerIndex |
| 分类点击 | `onCategoryTap` | 跳转分类页 |
| 商品点击 | `onProductTap` | 跳转商品详情页 |

```javascript
// pages/index/index.js
import { productApi } from '../../services/api.js';

Page({
  data: { /* 见上文 */ },

  onLoad() {
    this.initData();
  },

  async initData() {
    this.setData({ loading: true, error: null });
    try {
      // 并行请求 banner、分类、商品
      const [categoryRes, productRes] = await Promise.all([
        productApi.getCategories(),
        productApi.getList({ page: 1, pageSize: 10 }),
      ]);

      this.setData({
        categories: categoryRes.data || [],
        products: productRes.data || [],
        loading: false,
        hasMore: productRes.data?.length >= 10,
      });
    } catch (err) {
      this.setData({
        error: err.message,
        errorType: 'network',
        loading: false,
      });
    }
  },

  onPullDownRefresh() {
    this.setData({ page: 1, hasMore: true });
    this.initData().finally(() => wx.stopPullDownRefresh());
  },

  async onReachBottom() {
    if (this.data.loadingMore || !this.data.hasMore) return;

    this.setData({ loadingMore: true });
    try {
      const nextPage = this.data.page + 1;
      const res = await productApi.getList({
        page: nextPage,
        pageSize: this.data.pageSize,
      });

      const products = [...this.data.products, ...(res.data || [])];
      this.setData({
        products,
        page: nextPage,
        hasMore: res.data?.length >= this.data.pageSize,
      });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loadingMore: false });
    }
  },

  onBannerChange(e) {
    this.setData({ bannerIndex: e.detail.current });
  },

  onCategoryTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/category/index?id=${id}` });
  },

  onProductTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/product/index?id=${id}` });
  },
});
```

---

### 4.2 商品详情页 (pages/product/)

#### 4.2.1 数据结构

```javascript
Page({
  data: {
    // 商品基础信息
    product: {
      id: '',
      name: '',
      description: '',
      images: [],
      base_price: 0,
      specifications: [],       // 规格选项列表
    },

    // SKU 选择状态
    selectedSpecs: {},           // 已选择的规格 { size: '8寸', flavor: '草莓' }
    currentSku: null,            // 当前 SKU 信息

    // 数量
    quantity: 1,

    // 预约信息
    reservation: {
      date: '',                  // 预约日期 "2024-01-15"
      timeSlot: '',              // 预约时间段 "10:00-12:00"
    },

    // 选中规格的可用状态
    specOptions: [
      {
        name: '尺寸',
        options: [
          { value: '6寸', price_mod: 0, available: true },
          { value: '8寸', price_mod: 3000, available: true },
          { value: '10寸', price_mod: 6000, available: true },
        ]
      },
      {
        name: '口味',
        options: [
          { value: '草莓', price_mod: 0, available: true },
          { value: '巧克力', price_mod: 0, available: false }, // 库存不足
          { value: '芒果', price_mod: 0, available: true },
        ]
      },
    ],

    // 计算属性
    totalPrice: 0,              // 总价（分）

    // UI 状态
    showReservationPicker: false,
    loading: true,
    submitting: false,
  },
});
```

#### 4.2.2 SKU 规格联动选择器实现

**核心逻辑：**

1. **数据结构设计**：
   - `specifications`: 商品的规格维度定义（如尺寸、口味）
   - `selectedSpecs`: 用户已选择的规格值映射 `{尺寸: '8寸', 口味: '草莓'}`
   - `skuOptions`: 所有可能的 SKU 组合及其库存状态

2. **联动计算算法**：
   ```javascript
   /**
    * 根据已选规格，计算各选项的可用性
    * @param {object} selectedSpecs - 已选择的规格 {尺寸: '8寸'}
    * @param {string} specName - 当前操作的规格维度名称
    * @param {string} optionValue - 当前选择的选项值
    * @returns {object} - 更新后的 specOptions
    */
   calculateSpecAvailability(selectedSpecs, specName, optionValue) {
     const product = this.data.product;

     return product.specifications.map(spec => {
       if (spec.name !== specName) {
         // 非当前操作的规格，保持不变
         return spec;
       }

       return {
         ...spec,
         options: spec.options.map(opt => {
           // 模拟计算：假设选择某规格后，检查库存
           // 实际需调用后端 API 校验
           const mockAvailable = this.checkSkuAvailability({
             ...selectedSpecs,
             [specName]: opt.value
           });

           return {
             ...opt,
             available: mockAvailable,
           };
         })
       };
     });
   }

   /**
    * 检查特定规格组合是否有库存
    * @param {object} spec组合
    * @returns {boolean}
    */
   checkSkuAvailability(specMap) {
     // 实际项目中应调用 API：
     // skuApi.getStock(productId, specMap)

     // 此处为模拟逻辑
     const skuKey = Object.values(specMap).join('_');
     const mockSkus = {
       '6寸_草莓': { available: true },
       '6寸_巧克力': { available: false },
       '8寸_草莓': { available: true },
       '8寸_巧克力': { available: true },
       '10寸_草莓': { available: true },
       '10寸_巧克力': { available: false },
     };

     return mockSkus[skuKey]?.available ?? true;
   }

   /**
    * 计算当前选中 SKU 的价格
    */
   calculateSkuPrice() {
     const { selectedSpecs, product } = this.data;

     // 找到匹配的 SKU
     // 实际应调用 API 获取精确价格
     const skuKey = Object.values(selectedSpecs).join('_');
     const basePrice = product.base_price;

     // 计算加价（简化逻辑）
     let priceMod = 0;
     for (const spec of product.specifications) {
       const selected = selectedSpecs[spec.name];
       const opt = spec.options.find(o => o.value === selected);
       if (opt) {
         priceMod += opt.price_mod || 0;
       }
     }

     return basePrice + priceMod;
   }
   ```

3. **选择规格交互**：
   ```javascript
   /**
    * 点击规格选项
    */
   onSpecSelect(e) {
     const { specname, value } = e.currentTarget.dataset;

     // 检查是否可选
     const specOption = this.data.specOptions
       .find(s => s.name === specname)
       ?.options.find(o => o.value === value);

     if (!specOption?.available) {
       wx.showToast({ title: '该规格暂无库存', icon: 'none' });
       return;
     }

     // 更新已选规格
     const newSelectedSpecs = {
       ...this.data.selectedSpecs,
       [specname]: value,
     };

     // 重新计算所有规格的可用性
     const newSpecOptions = this.calculateSpecAvailability(
       newSelectedSpecs,
       specname,
       value
     );

     // 计算价格
     const totalPrice = this.calculateSkuPrice();

     this.setData({
       selectedSpecs: newSelectedSpecs,
       specOptions: newSpecOptions,
       totalPrice,
     });
   }
   ```

4. **WXML 结构**：
   ```xml
   <!-- 规格选择区 -->
   <view class="spec-section">
     <block wx:for="{{specOptions}}" wx:for-item="spec" wx:key="name">
       <view class="spec-row">
         <text class="spec-name">{{spec.name}}</text>
         <view class="spec-values">
           <block wx:for="{{spec.options}}" wx:key="value">
             <view
               class="spec-value {{item.available ? '' : 'disabled'}} {{selectedSpecs[spec.name] === item.value ? 'selected' : ''}}"
               bindtap="onSpecSelect"
               data-specname="{{spec.name}}"
               data-value="{{item.value}}"
             >
               <text>{{item.value}}</text>
               <text wx:if="{{item.price_mod > 0}}">+￥{{item.price_mod / 100}}</text>
             </view>
           </block>
         </view>
       </view>
     </block>
   </view>

   <!-- 价格展示 -->
   <view class="price-section">
     <text class="price-label">价格</text>
     <text class="price-value">￥{{totalPrice / 100}}</text>
   </view>

   <!-- 数量选择 -->
   <view class="quantity-section">
     <text class="quantity-label">数量</text>
     <view class="quantity-control">
       <text bindtap="onQuantityMinus">-</text>
       <input type="number" value="{{quantity}}" bindinput="onQuantityInput" />
       <text bindtap="onQuantityPlus">+</text>
     </view>
   </view>

   <!-- 预约时间 -->
   <view class="reservation-section" bindtap="onSelectReservation">
     <text>预约时间</text>
     <text wx:if="{{reservation.date && reservation.timeSlot}}">
       {{reservation.date}} {{reservation.timeSlot}}
     </text>
     <text wx:else>请选择</text>
   </view>

   <!-- 底部操作栏 -->
   <view class="bottom-bar">
     <button class="btn-add-order" bindtap="onAddToOrder" disabled="{{!canSubmit}}">
       加入订单
     </button>
   </view>
   ```

---

### 4.3 预约时间选择器 (components/time-slot-picker/)

#### 4.3.1 组件接口

```javascript
// components/time-slot-picker/time-slot-picker.js
Component({
  properties: {
    // 是否显示
    visible: {
      type: Boolean,
      value: false,
    },

    // 初始选中的日期
    defaultDate: {
      type: String,
      value: '',
    },

    // 初始选中的时间段
    defaultTimeSlot: {
      type: String,
      value: '',
    },

    // 最小日期（不早于此日期）
    minDate: {
      type: String,
      value: '', // 默认今天
    },

    // 最大日期（不超过此日期）
    maxDate: {
      type: String,
      value: '', // 默认 30 天后
    },
  },

  data: {
    // 当前查看的月份
    viewYear: new Date().getFullYear(),
    viewMonth: new Date().getMonth() + 1,

    // 可用的日期（用于标记有空闲时段的日期）
    availableDates: [],

    // 日期选择
    selectedDate: '',
    selectedTimeSlot: '',

    // 时间段列表
    timeSlots: [
      // { time_slot: '09:00-12:00', capacity: 10, reserved: 3, available: true }
    ],

    // 加载状态
    loading: false,
  },

  lifetimes: {
    attached() {
      const today = new Date();
      const minDateStr = this.properties.minDate || this.formatDate(today);

      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + 30);
      const maxDateStr = this.properties.maxDate || this.formatDate(maxDate);

      this.setData({
        minDate: minDateStr,
        maxDate: maxDateStr,
        selectedDate: this.properties.defaultDate || minDateStr,
        selectedTimeSlot: this.properties.defaultTimeSlot,
      });

      // 加载默认日期的时间段
      if (this.properties.defaultDate) {
        this.loadTimeSlots(this.properties.defaultDate);
      }
    },
  },

  methods: {
    /**
     * 格式化日期为 YYYY-MM-DD
     */
    formatDate(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    },

    /**
     * 解析日期字符串
     */
    parseDate(dateStr) {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    },

    /**
     * 切换月份
     */
    onPrevMonth() {
      let { viewYear, viewMonth } = this.data;
      if (viewMonth === 1) {
        viewYear--;
        viewMonth = 12;
      } else {
        viewMonth--;
      }
      this.setData({ viewYear, viewMonth });
    },

    onNextMonth() {
      let { viewYear, viewMonth } = this.data;
      if (viewMonth === 12) {
        viewYear++;
        viewMonth = 1;
      } else {
        viewMonth++;
      }
      this.setData({ viewYear, viewMonth });
    },

    /**
     * 选择日期
     */
    async onDateSelect(e) {
      const date = e.currentTarget.dataset.date;

      // 检查是否可选（不能早于今天）
      const selectedDate = this.parseDate(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        wx.showToast({ title: '不能选择过去的时间', icon: 'none' });
        return;
      }

      this.setData({
        selectedDate: date,
        selectedTimeSlot: '', // 重置时间段
        loading: true,
      });

      await this.loadTimeSlots(date);
    },

    /**
     * 加载时间段
     */
    async loadTimeSlots(date) {
      try {
        const res = await reservationApi.getSlots(date);

        this.setData({
          timeSlots: res.data.slots || [],
          loading: false,
        });
      } catch (err) {
        wx.showToast({ title: '加载时间段失败', icon: 'none' });
        this.setData({ loading: false });
      }
    },

    /**
     * 选择时间段
     */
    onTimeSlotSelect(e) {
      const { timeslot } = e.currentTarget.dataset;

      // 找到时间段信息
      const slotInfo = this.data.timeSlots.find(s => s.time_slot === timeslot);

      if (!slotInfo?.available) {
        wx.showToast({ title: '该时段已约满', icon: 'none' });
        return;
      }

      this.setData({ selectedTimeSlot: timeslot });
    },

    /**
     * 确认选择
     */
    onConfirm() {
      const { selectedDate, selectedTimeSlot } = this.data;

      if (!selectedDate) {
        wx.showToast({ title: '请选择日期', icon: 'none' });
        return;
      }

      if (!selectedTimeSlot) {
        wx.showToast({ title: '请选择时间段', icon: 'none' });
        return;
      }

      this.triggerEvent('select', {
        date: selectedDate,
        timeSlot: selectedTimeSlot,
      });
    },

    /**
     * 关闭
     */
    onClose() {
      this.triggerEvent('close');
    },
  },
});
```

#### 4.3.2 WXML 结构

```xml
<!-- components/time-slot-picker/time-slot-picker.wxml -->
<view class="picker-mask" wx:if="{{visible}}" bindtap="onClose">
  <view class="picker-container" catchtap="">

    <!-- 标题栏 -->
    <view class="picker-header">
      <text class="picker-title">选择预约时间</text>
      <view class="picker-close" bindtap="onClose">×</view>
    </view>

    <!-- 日历选择 -->
    <view class="calendar-section">
      <view class="calendar-header">
        <view class="month-nav" bindtap="onPrevMonth">
          <text>◀</text>
        </view>
        <text class="month-label">{{viewYear}}年{{viewMonth}}月</text>
        <view class="month-nav" bindtap="onNextMonth">
          <text>▶</text>
        </view>
      </view>

      <view class="calendar-weekdays">
        <text wx:for="{{['日','一','二','三','四','五','六']}}" wx:key="{{item}}">{{item}}</text>
      </view>

      <view class="calendar-days">
        <!-- 需要动态计算每月第一天是周几，填充空白 -->
        <block wx:for="{{daysInMonth}}" wx:key="date">
          <view
            class="day-cell {{item.disabled ? 'disabled' : ''}} {{item.selected ? 'selected' : ''}}"
            bindtap="onDateSelect"
            data-date="{{item.date}}"
          >
            <text>{{item.day}}</text>
          </view>
        </block>
      </view>
    </view>

    <!-- 时间段选择 -->
    <view class="time-slot-section">
      <view class="time-slot-title">选择时间段</view>

      <view class="loading" wx:if="{{loading}}">
        <text>加载中...</text>
      </view>

      <view class="time-slot-list" wx:else>
        <block wx:for="{{timeSlots}}" wx:key="time_slot">
          <view
            class="time-slot-item {{item.available ? '' : 'disabled'}} {{selectedTimeSlot === item.time_slot ? 'selected' : ''}}"
            bindtap="onTimeSlotSelect"
            data-timeslot="{{item.time_slot}}"
          >
            <text class="time-slot-text">{{item.time_slot}}</text>
            <text class="time-slot-status">
              {{item.available ? '可预约' : '已约满'}}
            </text>
            <text class="time-slot-count" wx:if="{{item.available}}">
              剩余{{item.capacity - item.reserved}}个时段
            </text>
          </view>
        </block>
      </view>
    </view>

    <!-- 底部按钮 -->
    <view class="picker-footer">
      <button class="btn-confirm" bindtap="onConfirm">确认</button>
    </view>
  </view>
</view>
```

---

### 4.4 订单确认页 (pages/order/)

#### 4.4.1 数据结构

```javascript
Page({
  data: {
    // 商品信息（从商品详情页传递）
    product: {
      id: '',
      name: '',
      image: '',
      skuId: '',
      skuName: '',
      price: 0,
    },

    // 数量
    quantity: 1,

    // 配送方式 1-自提 2-配送
    deliveryType: 1,

    // 收货地址（配送时必填）
    address: null,

    // 预约信息
    reservation: {
      date: '',
      timeSlot: '',
    },

    // 配送费用（分）
    deliveryFee: 0,

    // 订单备注
    remark: '',

    // 价格明细
    priceDetail: {
      goodsAmount: 0,     // 商品金额
      deliveryFee: 0,     // 配送费
      discount: 0,        // 优惠
      total: 0,          // 总计
    },

    // UI 状态
    loading: false,
    submitting: false,

    // 校验错误
    validationError: null,
  },
});
```

#### 4.4.2 事件处理

```javascript
// pages/order/order.js
import { orderApi } from '../../services/api.js';
import { paymentService } from '../../services/payment.js';

Page({
  data: { /* 见上文 */ },

  onLoad(options) {
    // 接收商品信息
    if (options.product) {
      const product = JSON.parse(decodeURIComponent(options.product));
      const reservation = JSON.parse(decodeURIComponent(options.reservation || '{}'));

      this.setData({
        product,
        reservation,
        quantity: parseInt(options.quantity) || 1,
      });
    }

    // 加载默认地址
    this.loadDefaultAddress();

    // 计算价格
    this.calculatePrice();
  },

  async loadDefaultAddress() {
    try {
      const res = await userApi.getAddressList();
      const defaultAddr = res.data?.find(a => a.is_default) || res.data?.[0];

      if (defaultAddr) {
        this.setData({ address: defaultAddr });
      }
    } catch (err) {
      console.error('获取地址失败', err);
    }
  },

  /**
   * 切换配送方式
   */
  onDeliveryTypeChange(e) {
    const type = parseInt(e.currentTarget.dataset.type);
    this.setData({
      deliveryType: type,
      validationError: null,
    });
    this.calculatePrice();
  },

 /**
   * 选择地址
   */
  onSelectAddress() {
    wx.navigateTo({ url: '/pages/my/address/select' });
  },

  /**
   * 修改预约时间
   */
  onModifyReservation() {
    wx.navigateTo({
      url: '/pages/reservation/index',
      events: {
        onReservationConfirm: (data) => {
          this.setData({ reservation: data });
          this.calculatePrice();
        }
      }
    });
  },

  /**
   * 计算价格
   */
  calculatePrice() {
    const { product, quantity, deliveryType } = this.data;
    const goodsAmount = product.price * quantity;

    // 配送费：自提免配送费，配送根据距离计算（此处简化）
    const deliveryFee = deliveryType === 2 ? 1000 : 0;

    const total = goodsAmount + deliveryFee;

    this.setData({
      priceDetail: {
        goodsAmount,
        deliveryFee,
        discount: 0,
        total,
      }
    });
  },

  /**
   * 校验表单
   */
  validate() {
    const { deliveryType, address, reservation } = this.data;

    if (deliveryType === 2 && !address) {
      this.setData({ validationError: '请选择收货地址' });
      return false;
    }

    if (!reservation.date || !reservation.timeSlot) {
      this.setData({ validationError: '请选择预约时间' });
      return false;
    }

    this.setData({ validationError: null });
    return true;
  },

  /**
   * 提交订单
   */
  async onSubmit() {
    if (!this.validate()) return;

    this.setData({ submitting: true });

    try {
      // 调用创建订单 API
      const res = await orderApi.create({
        items: [{
          sku_id: this.data.product.skuId,
          quantity: this.data.quantity,
        }],
        delivery_type: this.data.deliveryType,
        reservation_date: this.data.reservation.date,
        reservation_time_slot: this.data.reservation.timeSlot,
        receiver_id: this.data.address?._id,
        remark: this.data.remark,
      });

      // 跳转到支付页面
      wx.navigateTo({
        url: `/pages/payment/index?order_id=${res.data.order_id}&order_no=${res.data.order_no}&amount=${res.data.total_amount}`,
      });

    } catch (err) {
      wx.showModal({
        title: '下单失败',
        content: err.message || '请稍后重试',
        showCancel: false,
      });
    } finally {
      this.setData({ submitting: false });
    }
  },
});
```

---

### 4.5 支付页 (pages/payment/)

#### 4.5.1 数据结构

```javascript
Page({
  data: {
    orderId: '',
    orderNo: '',
    amount: 0,

    // 订单信息（从 API 获取）
    orderInfo: null,

    // 支付状态
    payStatus: 'pending',    // pending | paying | success | failed
    payError: null,

    // 倒计时（订单超时）
    countdown: 30 * 60,       // 30 分钟，秒为单位
    countdownText: '29:59',

    // UI
    loading: true,
  },

  timer: null,
}),
```

#### 4.5.2 wx.requestPayment 支付流程

**核心实现：**

```javascript
// services/payment.js
import { orderApi } from './api.js';

/**
 * 支付服务
 */
export const paymentService = {
  /**
   * 发起支付
   * @param {string} orderId - 订单 ID
   * @returns {Promise<object>} - 支付结果
   */
  async pay(orderId) {
    // 1. 获取支付参数（调用云函数）
    const res = await orderApi.getPayParams(orderId);

    if (!res.data) {
      throw new Error('获取支付参数失败');
    }

    const payParams = res.data;

    // 2. 调用微信支付
    return new Promise((resolve, reject) => {
      wx.requestPayment({
        ...payParams,
        success: (wxRes) => {
          // 支付成功
          resolve({
            success: true,
            errMsg: wxRes.errMsg,
          });
        },
        fail: (wxErr) => {
          // 支付失败或取消
          const errorMap = {
            'requestPayment:fail cancel': '用户取消支付',
            'requestPayment:fail': '支付失败',
          };

          reject(new Error(errorMap[wxErr.errMsg] || wxErr.errMsg));
        },
      });
    });
  },

  /**
   * 查询支付结果
   * @param {string} orderId - 订单 ID
   * @returns {Promise<object>}
   */
  async queryPayResult(orderId) {
    try {
      const res = await orderApi.getDetail(orderId);
      return {
        success: res.data.status !== 0, // 0=待付款，其他状态都已付款
        status: res.data.status,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
```

**支付页面实现：**

```javascript
// pages/payment/payment.js
import { paymentService } from '../../services/payment.js';

Page({
  data: { /* 见上文 */ },

  onLoad(options) {
    this.setData({
      orderId: options.order_id,
      orderNo: options.order_no,
      amount: parseInt(options.amount),
    });

    this.initOrderInfo();
    this.startCountdown();
  },

  onUnload() {
    this.stopCountdown();
  },

  /**
   * 初始化订单信息
   */
  async initOrderInfo() {
    try {
      const res = await orderApi.getDetail(this.data.orderId);
      this.setData({
        orderInfo: res.data,
        loading: false,
      });
    } catch (err) {
      wx.showToast({ title: '加载订单失败', icon: 'none' });
    }
  },

  /**
   * 启动倒计时
   */
  startCountdown() {
    this.timer = setInterval(() => {
      let { countdown } = this.data;
      countdown--;

      if (countdown <= 0) {
        this.stopCountdown();
        this.handlePayTimeout();
        return;
      }

      const minutes = Math.floor(countdown / 60);
      const seconds = countdown % 60;
      const countdownText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

      this.setData({ countdown, countdownText });
    }, 1000);
  },

  stopCountdown() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },

  /**
   * 支付超时处理
   */
  handlePayTimeout() {
    wx.showModal({
      title: '订单已超时',
      content: '订单支付时间已过，请重新下单',
      showCancel: false,
      success: () => {
        wx.redirectTo({ url: '/pages/index/index' });
      }
    });
  },

  /**
   * 点击支付按钮
   */
  async onPay() {
    if (this.data.payStatus === 'paying') return;

    this.setData({
      payStatus: 'paying',
      payError: null,
    });

    try {
      // 调用支付服务
      await paymentService.pay(this.data.orderId);

      // 支付成功
      this.setData({ payStatus: 'success' });

      // 跳转到订单详情页
      wx.redirectTo({
        url: `/pages/my/orderDetail/index?order_id=${this.data.orderId}&status=success`,
      });

    } catch (err) {
      this.setData({
        payStatus: 'failed',
        payError: err.message,
      });

      // 区分用户取消和支付失败
      if (err.message === '用户取消支付') {
        // 用户取消，不做处理，继续等待重试
      } else {
        wx.showToast({
          title: err.message,
          icon: 'none',
          duration: 2000,
        });
      }
    }
  },

  /**
   * 支付失败后重试
   */
  onRetry() {
    this.setData({ payStatus: 'pending' });
    this.onPay();
  },

  /**
   * 取消订单
   */
  async onCancelOrder() {
    const confirm = await wx.showModal({
      title: '确认取消',
      content: '确定要取消此订单吗？',
    });

    if (confirm.confirm) {
      try {
        await orderApi.cancel(this.data.orderId);
        wx.redirectTo({ url: '/pages/my/orderList/index' });
      } catch (err) {
        wx.showToast({ title: '取消失败', icon: 'none' });
      }
    }
  },
});
```

**支付页面 WXML：**

```xml
<!-- pages/payment/payment.wxml -->
<navigation-bar title="订单支付" />

<view class="payment-page">
  <!-- 订单信息 -->
  <view class="order-info">
    <view class="order-no">订单号：{{orderNo}}</view>
    <view class="order-amount">
      <text class="label">应付金额</text>
      <text class="amount">￥{{amount / 100}}</text>
    </view>
    <view class="countdown" wx:if="{{payStatus === 'pending'}}">
      <text>剩余支付时间：{{countdownText}}</text>
    </view>
  </view>

  <!-- 支付状态 -->
  <view class="pay-status">
    <!-- 待支付 -->
    <view wx:if="{{payStatus === 'pending'}}" class="status-pending">
      <button class="btn-pay" bindtap="onPay">微信支付</button>
      <button class="btn-cancel" bindtap="onCancelOrder">取消订单</button>
    </view>

    <!-- 支付中 -->
    <view wx:if="{{payStatus === 'paying'}}" class="status-paying">
      <view class="loading-icon"></view>
      <text>支付中，请稍候...</text>
    </view>

    <!-- 支付失败 -->
    <view wx:if="{{payStatus === 'failed'}}" class="status-failed">
      <text class="error-msg">{{payError}}</text>
      <button class="btn-retry" bindtap="onRetry">重新支付</button>
      <button class="btn-cancel" bindtap="onCancelOrder">取消订单</button>
    </view>
  </view>
</view>
```

---

## 5. 组件设计

### 5.1 导航栏组件 (navigation-bar)

#### 5.1.1 Properties

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| extClass | String | '' | 扩展样式类 |
| title | String | '' | 导航标题 |
| background | String | '' | 背景色 |
| color | String | '' | 文字颜色 |
| back | Boolean | true | 是否显示返回按钮 |
| homeButton | Boolean | false | 是否显示首页按钮 |
| loading | Boolean | false | 是否显示加载图标 |
| animated | Boolean | true | 是否启用显隐动画 |
| show | Boolean | true | 是否显示导航栏 |
| delta | Number | 1 | 返回页面深度 |

#### 5.1.2 Events

| 事件名 | 参数 | 说明 |
|--------|------|------|
| back | { delta } | 点击返回按钮时触发 |

#### 5.1.3 Slots

| 名称 | 说明 |
|------|------|
| left | 左侧自定义区域 |
| center | 中间自定义区域 |
| right | 右侧自定义区域 |

---

### 5.2 SKU 选择器组件 (components/sku-picker/)

作为可复用组件封装 SKU 选择逻辑。

```javascript
// components/sku-picker/sku-picker.js
Component({
  properties: {
    // 商品规格定义
    specifications: {
      type: Array,
      value: [],
    },

    // 当前已选规格
    selectedSpecs: {
      type: Object,
      value: {},
      observer: 'onSelectedSpecsChange',
    },

    // 是否显示
    visible: {
      type: Boolean,
      value: false,
    },
  },

  data: {
    // 处理后的规格选项（带可用性标记）
    processedSpecs: [],

    // 当前 SKU 信息
    currentSku: null,
  },

  methods: {
    /**
     * 规格选择变化
     */
    onSpecSelect(e) {
      const { specname, value } = e.currentTarget.dataset;

      // 检查可用性
      const spec = this.data.processedSpecs.find(s => s.name === specname);
      const option = spec?.options.find(o => o.value === value);

      if (!option?.available) return;

      // 更新已选规格
      const newSelectedSpecs = {
        ...this.data.selectedSpecs,
        [specname]: value,
      };

      this.triggerEvent('specchange', {
        selectedSpecs: newSelectedSpecs,
        sku: this.calculateSku(newSelectedSpecs),
      });
    },

    /**
     * 计算 SKU
     */
    calculateSku(selectedSpecs) {
      // 调用后端 API 或本地计算
      // 返回 { skuId, skuName, price, stock }
    },
  },
});
```

---

### 5.3 日期选择器组件 (components/date-picker/)

```javascript
// components/date-picker/date-picker.js
Component({
  properties: {
    // 最小日期
    minDate: {
      type: String,
      value: '',
    },

    // 最大日期
    maxDate: {
      type: String,
      value: '',
    },

    // 当前选中日期
    value: {
      type: String,
      value: '',
    },

    // 可用日期（有空闲时段的日期）
    availableDates: {
      type: Array,
      value: [],
    },
  },

  data: {
    viewYear: 0,
    viewMonth: 0,
    days: [],
  },

  lifetimes: {
    attached() {
      const now = new Date();
      this.setData({
        viewYear: now.getFullYear(),
        viewMonth: now.getMonth() + 1,
      });
      this.generateDays();
    },
  },

  methods: {
    generateDays() {
      // 生成当月日历数据
      const { viewYear, viewMonth } = this.data;

      const firstDay = new Date(viewYear, viewMonth - 1, 1).getDay();
      const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();

      const days = [];

      // 填充空白
      for (let i = 0; i < firstDay; i++) {
        days.push({ empty: true });
      }

      // 填充日期
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isAvailable = this.properties.availableDates.includes(dateStr);
        const isPast = new Date(dateStr) < new Date(new Date().toDateString());

        days.push({
          day: d,
          date: dateStr,
          disabled: isPast,
          available: isAvailable,
          selected: dateStr === this.properties.value,
        });
      }

      this.setData({ days });
    },
  },
});
```

---

### 5.4 时间段选择器组件 (components/time-slot-picker/)

见 4.3 节详细设计。

---

### 5.5 底部导航组件 (components/tab-bar/)

```javascript
// components/tab-bar/tab-bar.js
Component({
  properties: {
    // 当前页面
    current: {
      type: String,
      value: 'index',
    },

    // Tab 配置
    tabs: {
      type: Array,
      value: [
        { id: 'index', title: '首页', icon: 'home' },
        { id: 'category', title: '分类', icon: 'category' },
        { id: 'cart', title: '购物车', icon: 'cart' },
        { id: 'my', title: '我的', icon: 'my' },
      ],
    },
  },

  methods: {
    onTabTap(e) {
      const { id } = e.currentTarget.dataset;
      if (id === this.data.current) return;

      const tab = this.data.tabs.find(t => t.id === id);
      if (!tab) return;

      // 跳转到对应页面
      const pageMap = {
        index: '/pages/index/index',
        category: '/pages/category/index',
        cart: '/pages/cart/index',
        my: '/pages/my/index',
      };

      wx.switchTab({ url: pageMap[id] });
    },
  },
});
```

---

## 6. 关键交互细节

### 6.1 SKU 规格联动选择器

**交互流程：**

1. 用户点击规格选项
2. 检查选项是否可选（调用 `checkSkuAvailability`）
3. 更新 `selectedSpecs` 状态
4. 重新计算所有规格的可用性（联动逻辑）
5. 查找匹配的 SKU 并更新价格
6. 触发 `specchange` 事件通知父组件

**状态定义：**

```javascript
// 规格选项状态
{
  value: '8寸',           // 选项值
  price_mod: 3000,        // 加价（分）
  available: true,       // 是否可选
}

// SKU 选项状态
{
  sku_id: 'sku_001',
  sku_key: '8寸_草莓',
  sku_name: '8寸 草莓',
  price: 29800,           // 最终价格（分）
  stock: 5,               // 库存
  status: 1,              // 1-有货 0-缺货
}
```

### 6.2 预约时间选择器

**交互流程：**

1. 展开选择器，显示日历
2. 默认选中今天或最近的有空时段
3. 选择日期后，加载该日期的时间段
4. 时间段状态：`available`（可预约）、`full`（已满）、`past`（已过期）
5. 确认选择后，触发 `select` 事件

**日期限制：**

- 不能选择今天之前
- 不能选择超过 30 天后
- 仅显示有空闲时段的日期

### 6.3 wx.requestPayment 支付流程

**完整流程：**

```
[点击支付按钮]
       ↓
[调用 order.pay 获取支付参数]
       ↓
[调用 wx.requestPayment 唤起微信支付]
       ↓
    ┌───────┴───────┐
    ↓               ↓
[支付成功]      [支付失败/取消]
    ↓               ↓
[跳转成功页]   [停留在支付页，可重试]
```

**错误处理：**

| wx.requestPayment 错误 | 用户提示 | 处理方式 |
|----------------------|---------|---------|
| fail cancel | 用户取消支付 | 停留在支付页 |
| fail（其他） | 支付失败，请重试 | 可重试 |
| - | 断网 | 自动重试或提示检查网络 |

**安全注意事项：**

- `timeStamp`、`nonceStr`、`package`、`signType`、`paySign` 必须来自服务端
- 金额以后端计算为准，前端仅传 `order_id`
- 支付完成后需验证订单状态（防止客户端伪造）

---

## 7. 目录结构完整定义

```
├── app.js
├── app.json
├── app.wxss
│
├── components/
│   ├── navigation-bar/
│   │   ├── navigation-bar.js
│   │   ├── navigation-bar.json
│   │   ├── navigation-bar.wxml
│   │   └── navigation-bar.wxss
│   │
│   ├── sku-picker/
│   │   ├── sku-picker.js
│   │   ├── sku-picker.json
│   │   ├── sku-picker.wxml
│   │   └── sku-picker.wxss
│   │
│   ├── date-picker/
│   │   ├── date-picker.js
│   │   ├── date-picker.json
│   │   ├── date-picker.wxml
│   │   └── date-picker.wxss
│   │
│   ├── time-slot-picker/
│   │   ├── time-slot-picker.js
│   │   ├── time-slot-picker.json
│   │   ├── time-slot-picker.wxml
│   │   └── time-slot-picker.wxss
│   │
│   └── tab-bar/
│       ├── tab-bar.js
│       ├── tab-bar.json
│       ├── tab-bar.wxml
│       └── tab-bar.wxss
│
├── pages/
│   ├── index/
│   │   ├── index.js
│   │   ├── index.json
│   │   ├── index.wxml
│   │   └── index.wxss
│   │
│   ├── category/
│   │   ├── category.js
│   │   ├── category.json
│   │   ├── category.wxml
│   │   └── category.wxss
│   │
│   ├── product/
│   │   ├── product.js
│   │   ├── product.json
│   │   ├── product.wxml
│   │   └── product.wxss
│   │
│   ├── order/
│   │   ├── order.js
│   │   ├── order.json
│   │   ├── order.wxml
│   │   └── order.wxss
│   │
│   ├── reservation/
│   │   ├── reservation.js
│   │   ├── reservation.json
│   │   ├── reservation.wxml
│   │   └── reservation.wxss
│   │
│   ├── payment/
│   │   ├── payment.js
│   │   ├── payment.json
│   │   ├── payment.wxml
│   │   └── payment.wxss
│   │
│   └── my/
│       ├── my.js
│       ├── my.json
│       ├── my.wxml
│       ├── my.wxss
│       ├── orderList/
│       │   ├── orderList.js
│       │   ├── orderList.json
│       │   ├── orderList.wxml
│       │   └── orderList.wxss
│       ├── orderDetail/
│       │   ├── orderDetail.js
│       │   ├── orderDetail.json
│       │   ├── orderDetail.wxml
│       │   └── orderDetail.wxss
│       ├── address/
│       │   ├── address.js
│       │   ├── address.json
│       │   ├── address.wxml
│       │   └── address.wxss
│       └── member/
│           ├── member.js
│           ├── member.json
│           ├── member.wxml
│           └── member.wxss
│
├── services/
│   ├── api.js          # API 统一封装
│   ├── auth.js         # 鉴权逻辑
│   └── payment.js     # 支付服务
│
└── utils/
    ├── constants.js    # 常量定义
    └── helpers.js      # 辅助函数
```

---

## 8. 文件清单

| 文件路径 | 说明 |
|---------|------|
| `pages/index/index.js` | 首页逻辑 |
| `pages/index/index.wxml` | 首页模板 |
| `pages/category/category.js` | 分类页逻辑 |
| `pages/category/category.wxml` | 分类页模板 |
| `pages/product/product.js` | 商品详情页逻辑 |
| `pages/product/product.wxml` | 商品详情页模板 |
| `pages/order/order.js` | 订单确认页逻辑 |
| `pages/order/order.wxml` | 订单确认页模板 |
| `pages/reservation/reservation.js` | 预约页面逻辑 |
| `pages/reservation/reservation.wxml` | 预约页面模板 |
| `pages/payment/payment.js` | 支付页逻辑 |
| `pages/payment/payment.wxml` | 支付页模板 |
| `pages/my/my.js` | 个人中心逻辑 |
| `pages/my/orderList/orderList.js` | 订单列表逻辑 |
| `pages/my/orderDetail/orderDetail.js` | 订单详情逻辑 |
| `pages/my/address/address.js` | 地址管理逻辑 |
| `pages/my/member/member.js` | 会员中心逻辑 |
| `components/navigation-bar/navigation-bar.js` | 导航栏组件 |
| `components/sku-picker/sku-picker.js` | SKU选择器组件 |
| `components/date-picker/date-picker.js` | 日期选择器组件 |
| `components/time-slot-picker/time-slot-picker.js` | 时间段选择器组件 |
| `components/tab-bar/tab-bar.js` | 底部导航组件 |
| `services/api.js` | API调用封装 |
| `services/auth.js` | 鉴权服务 |
| `services/payment.js` | 支付服务 |
| `utils/constants.js` | 常量定义 |
| `utils/helpers.js` | 辅助函数 |