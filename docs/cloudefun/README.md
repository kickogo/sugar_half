# 云函数功能说明

本文档介绍蛋糕工作室小程序所有云函数的功能、参数及返回值。

---

## 目录结构

```
cloudfunctions/
├── login/                  # 用户登录
├── adminLogin/              # 商家登录
├── productGetCategories/    # 获取分类列表
├── productGetList/          # 获取商品列表
├── productGetDetail/        # 获取商品详情
├── orderCreate/            # 创建订单
├── orderPay/               # 获取支付参数
├── orderPayCallback/       # 支付回调
├── orderGetList/           # 获取订单列表
├── orderGetDetail/         # 获取订单详情
├── orderConfirm/           # 商家确认订单
├── adminGetOrders/         # 商家获取订单
├── initData/               # 初始化模拟数据
├── quickstartFunctions/    # 微信云开发示例函数
└── utils/                  # 工具函数
```

---

## 1. login - 用户登录

**功能**：微信登录，通过 openid 自动关联或创建用户，返回 JWT token。

**请求参数**：
```javascript
{
  // 无需参数，自动获取 openid
}
```

**返回格式**：
```javascript
{
  success: true,
  data: {
    user_id: "用户ID",
    openid: "微信openid",
    token: "JWT token",
    is_admin: false,
    phone: "",
    nickname: "",
    member_level: 1,
    balance: 0,
    points: 0
  }
}
```

---

## 2. adminLogin - 商家登录

**功能**：商家通过手机号登录（验证码模式预留）。

**请求参数**：
```javascript
{
  phone: "13800138000"  // 手机号
}
```

**返回格式**：
```javascript
{
  success: true,
  data: {
    user_id: "用户ID",
    openid: "",
    token: "JWT token",
    is_admin: true,
    phone: "13800138000",
    nickname: "商家",
    member_level: 99,
    balance: 0,
    points: 0
  }
}
```

---

## 3. productGetCategories - 获取分类列表

**功能**：查询所有启用的商品分类，按 sort 字段升序排列。

**请求参数**：
```javascript
{
  // 无需参数
}
```

**返回格式**：
```javascript
{
  success: true,
  data: [
    {
      id: "分类ID",
      name: "生日蛋糕",
      sort: 1,
      icon: ""
    },
    {
      id: "分类ID",
      name: "下午茶",
      sort: 2,
      icon: ""
    }
  ]
}
```

---

## 4. productGetList - 获取商品列表

**功能**：查询商品列表，支持分类筛选和分页。

**请求参数**：
```javascript
{
  category_id: "可选，分类ID",
  page: 1,           // 页码，默认1
  page_size: 20       // 每页数量，默认20
}
```

**返回格式**：
```javascript
{
  success: true,
  data: [
    {
      id: "商品ID",
      name: "草莓慕斯",
      description: "经典草莓慕斯蛋糕...",
      coverImage: "封面图URL",
      basePrice: 19800,  // 单位：分
      category_id: "分类ID"
    }
  ]
}
```

---

## 5. productGetDetail - 获取商品详情

**功能**：查询商品详细信息，包含 SKU 列表和可选夹馅。

**请求参数**：
```javascript
{
  id: "商品ID"
}
```

**返回格式**：
```javascript
{
  success: true,
  data: {
    id: "商品ID",
    name: "草莓慕斯",
    description: "经典草莓慕斯蛋糕...",
    images: ["图片URL1", "图片URL2"],
    basePrice: 19800,
    specifications: [
      {
        name: "尺寸",
        options: [
          { value: "4寸", label: "4寸", price_mod: 0 },
          { value: "6寸", label: "6寸", price_mod: 5000 },
          { value: "8寸", label: "8寸", price_mod: 10000 }
        ]
      },
      {
        name: "夹馅",
        options: [
          { value: "布丁", label: "布丁", price_mod: 500 },
          { value: "香芋", label: "香芋/芋泥", price_mod: 800 }
        ]
      }
    ],
    skus: [
      {
        sku_id: "SKU_ID",
        specs: "{\"尺寸\":\"6寸\",\"夹馅\":\"布丁\",\"奶油\":\"动物奶油\"}",
        price: 24800,
        stock: 10
      }
    ]
  }
}
```

---

## 6. orderCreate - 创建订单

**功能**：创建新订单，校验 SKU 库存，生成订单号。

**请求参数**：
```javascript
{
  user_id: "用户ID",
  items: [
    {
      sku_id: "SKU_ID",
      quantity: 1
    }
  ],
  reservation_date: "2026-05-15",  // 取货日期
  reservation_time: "14:00",        // 取货时间
  remark: "备注信息"                 // 可选
}
```

**返回格式**：
```javascript
{
  success: true,
  data: {
    order_id: "订单ID",
    order_no: "ORD20260511143000123456",
    total_amount: 24800  // 单位：分
  }
}
```

**错误码**：
- `用户未登录`
- `订单商品不能为空`
- `请选择取货时间`
- `商品不存在`
- `库存不足`

---

## 7. orderPay - 获取支付参数

**功能**：获取模拟支付参数，验证订单状态和归属。

**请求参数**：
```javascript
{
  order_id: "订单ID",
  user_id: "用户ID"
}
```

**返回格式**：
```javascript
{
  success: true,
  data: {
    order_id: "订单ID",
    pay_amount: 24800,  // 支付金额（分）
    mock_payment: true  // 模拟支付标记
  }
}
```

**错误码**：
- `缺少必要参数`
- `订单不存在`
- `无权操作此订单`
- `订单状态不允许支付`

---

## 8. orderPayCallback - 支付回调

**功能**：模拟支付回调，验证订单后标记为已支付。

**请求参数**：
```javascript
{
  order_id: "订单ID",   // 二选一
  order_no: "ORD2026..." // 二选一
}
```

**返回格式**：
```javascript
{
  success: true,
  data: {
    order_id: "订单ID",
    order_no: "ORD20260511143000123456",
    status: 1  // 已支付
  }
}
```

---

## 9. orderGetList - 获取订单列表

**功能**：查询当前用户的订单列表，支持分页。

**请求参数**：
```javascript
{
  user_id: "用户ID",
  page: 1,           // 页码，默认1
  page_size: 20      // 每页数量，默认20
}
```

**返回格式**：
```javascript
{
  success: true,
  data: [
    {
      order_id: "订单ID",
      order_no: "ORD20260511143000123456",
      status: 0,           // 订单状态
      total_amount: 24800,
      pay_amount: 24800,
      reservation_date: "2026-05-15",
      reservation_time: "14:00",
      created_at: "2026-05-11T14:30:00.000Z"
    }
  ]
}
```

**订单状态说明**：
| status | 状态 | 说明 |
|--------|------|------|
| 0 | 待付款 | 等待用户支付 |
| 1 | 已付款 | 已支付，等待商家确认 |
| 2 | 制作中 | 商家已确认，开始制作 |
| 3 | 待自提 | 制作完成，等待用户取货 |
| 4 | 已完成 | 交易完成 |
| 5 | 已取消 | 订单已取消 |

---

## 10. orderGetDetail - 获取订单详情

**功能**：查询订单详细信息，包含订单明细商品列表。

**请求参数**：
```javascript
{
  order_id: "订单ID",
  user_id: "用户ID"
}
```

**返回格式**：
```javascript
{
  success: true,
  data: {
    order_id: "订单ID",
    order_no: "ORD20260511143000123456",
    status: 0,
    total_amount: 24800,
    pay_amount: 24800,
    delivery_type: 1,           // 1=到店自提
    reservation_date: "2026-05-15",
    reservation_time: "14:00",
    remark: "",
    created_at: "2026-05-11T14:30:00.000Z",
    items: [
      {
        product_id: "商品ID",
        product_name: "草莓慕斯",
        sku_id: "SKU_ID",
        sku_name: "6寸/布丁/动物奶油",
        price: 24800,
        quantity: 1
      }
    ]
  }
}
```

---

## 11. orderConfirm - 商家确认订单

**功能**：商家确认订单，将状态从"已付款"更新为"制作中"。

**请求参数**：
```javascript
{
  order_id: "订单ID",
  user_id: "商家用户ID"
}
```

**返回格式**：
```javascript
{
  success: true,
  data: {
    order_id: "订单ID",
    status: 2  // 制作中
  }
}
```

**错误码**：
- `缺少必要参数`
- `订单不存在`
- `无权操作此订单`
- `订单状态不允许确认`（只有 status=1 时可确认）

---

## 12. adminGetOrders - 商家获取订单

**功能**：商家查询所有订单，支持按状态筛选和分页。

**请求参数**：
```javascript
{
  user_id: "商家用户ID",
  status: 0,           // 可选，订单状态筛选
  page: 1,             // 页码，默认1
  page_size: 20        // 每页数量，默认20
}
```

**返回格式**：
```javascript
{
  success: true,
  data: [
    {
      order_id: "订单ID",
      order_no: "ORD20260511143000123456",
      user_id: "用户ID",
      status: 0,
      total_amount: 24800,
      pay_amount: 24800,
      reservation_date: "2026-05-15",
      reservation_time: "14:00",
      remark: "",
      created_at: "2026-05-11T14:30:00.000Z"
    }
  ]
}
```

---

## 13. initData - 初始化模拟数据

**功能**：初始化数据库集合，包括分类、商品、夹馅和 SKU 数据。用于开发和测试。

**请求参数**：
```javascript
{
  // 无需参数
}
```

**返回格式**：
```javascript
{
  success: true,
  message: "初始化成功",
  data: {
    categories: 2,    // 插入的分类数量
    products: 2,       // 插入的商品数量
    fills: 7,          // 插入的夹馅数量
    skus: 12           // 插入的SKU数量
  }
}
```

**初始化数据**：

**分类**：
| 名称 | sort |
|------|------|
| 生日蛋糕 | 1 |
| 下午茶 | 2 |

**夹馅**（单位：分，价格加项）：
| 名称 | price_mod |
|------|-----------|
| 布丁 | 500 |
| 香芋/芋泥 | 800 |
| 麻薯 | 600 |
| 黑糖珍珠 | 800 |
| 巧克力脆麦片 | 1000 |
| 水果（罐装） | 1200 |
| 草莓果酱 | 600 |

**商品**：草莓慕斯、巧克力浓郁（各含 6 个 SKU）

---

## 数据库集合

| 集合名 | 说明 |
|--------|------|
| `users` | 用户/商家账号 |
| `categories` | 商品分类 |
| `products` | 商品主数据 |
| `fills` | 夹馅选项 |
| `sku_items` | SKU 库存 |
| `orders` | 订单主表 |
| `order_items` | 订单明细 |

---

## 通用返回格式

所有云函数遵循统一的返回格式：

**成功**：
```javascript
{
  success: true,
  data: { ... }
}
```

**失败**：
```javascript
{
  success: false,
  error: "错误信息"
}
```

---

## 调用示例

```javascript
// 调用云函数
wx.cloud.callFunction({
  name: 'productGetList',
  data: {
    category_id: '',
    page: 1,
    page_size: 20
  }
}).then(res => {
  if (res.result.success) {
    console.log(res.result.data)
  } else {
    wx.showToast({ title: res.result.error, icon: 'none' })
  }
})
```
