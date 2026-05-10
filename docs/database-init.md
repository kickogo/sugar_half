# 数据库初始化说明

本文档说明蛋糕工作室小程序 MVP 阶段数据库的初始化操作。

## 需要创建的集合

| 集合名 | 说明 |
|--------|------|
| `users` | 用户账号 |
| `categories` | 蛋糕分类 |
| `products` | 蛋糕商品 |
| `sku_stock` | SKU库存管理 |
| `orders` | 订单主表 |
| `order_items` | 订单明细 |
| `reservations` | 预约时间表 |
| `addresses` | 收货地址 |

## 集合索引

| 集合 | 索引字段 | 类型 |
|------|----------|------|
| `users` | openid | 唯一索引 |
| `sku_stock` | sku_key | 唯一索引 |
| `orders` | order_no | 唯一索引 |
| `reservations` | date + time_slot | 复合唯一索引 |

## 测试数据

### 分类数据 (categories)

```json
[
  { "name": "生日蛋糕", "sort": 1, "icon": "", "status": 1 },
  { "name": "下午茶", "sort": 2, "icon": "", "status": 1 },
  { "name": "节日限定", "sort": 3, "icon": "", "status": 1 }
]
```

### 商品数据 (products)

至少插入 3-5 个测试商品，包含：
- 名称、描述、图片
- 基准价格（base_price，单位：分）
- 规格选项（specifications）
- 标签（tags）

### SKU 数据 (sku_stock)

为每个商品创建多个 SKU：
- sku_key: 规格组合唯一键（如 `size_8寸_flavor_草莓`）
- sku_name: 展示名称
- price: SKU 价格（分）
- stock: 库存数量
- reservation_count: 已锁定数量

### 预约时段数据 (reservations)

未来 7 天，每天 3 个时段：
- `09:00-12:00`
- `14:00-17:00`
- `18:00-21:00`

每个时段 capacity 设为 10。

## 操作步骤

1. 打开微信开发者工具
2. 进入云开发控制台
3. 创建上述 8 个集合
4. 为集合创建索引
5. 插入测试数据

## 注意事项

- sku_stock 中的 sku_key 必须唯一
- reservations 中的 date + time_slot 组合必须唯一
- 测试数据仅用于开发测试，生产环境需重新配置