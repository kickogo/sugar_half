# 云数据库 Schema 设计

## 1. users（用户与会员卡集合）

```json
{
  "_id": "auto",
  "_openid": "用户唯一标识（自动生成）",
  "nickName": "用户昵称",
  "avatarUrl": "头像URL",
  "isVIP": false,
  "vipCardNo": "VIP-000001",
  "scores": 0,
  "createdAt": 1716500000000
}
```

**说明：**
- `_id` 由云数据库自动生成
- `_openid` 是微信用户唯一标识，通过云调用获取
- `isVIP` 布尔值判断是否会员
- `scores` 整数类型，存储当前积分

---

## 2. goods（蛋糕与商品集合）

```json
{
  "_id": "auto",
  "name": "草莓慕斯",
  "category": "蛋糕",
  "tag": "荔枝季回归",
  "imageUrl": "cloud://xxx/goods/商品_01.png",
  "status": 1,
  "price": 281,
  "specMatrix": {
    "size": ["6寸", "8寸"],
    "fills": ["布丁", "香芋", "芒果", "奥利奥"],
    "cream": ["动物奶油", "意式奶油霜", "抹茶奶油"]
  }
}
```

**说明：**
- `price` 老板一口价，单位为**元**，前后端一致
- `specMatrix` 仅定义可选规格选项，用户选择后总价不变

---

## 3. scores_store（积分商城商品集合）

```json
{
  "_id": "auto",
  "title": "10元代金券",
  "amount": 10,
  "requiredScores": 300,
  "imageUrl": "/image/goods/代金券_10.png",
  "stock": 100,
  "status": 1
}
```

**说明：**
- `imageUrl` 指向手绘代金券图案（本地路径或云存储路径）
- `amount` 面额，用于显示和业务统计
- `requiredScores` 为兑换所需积分（整数）
- `stock` 库存数量，兑换时原子性扣减
- `status` 1=可用 0=已抢完

---

## 4. orders（订单集合）

```json
{
  "_id": "auto",
  "_openid": "用户唯一标识",
  "items": [
    {
      "goodsId": "商品ID",
      "name": "草莓慕斯",
      "spec": {
        "size": "6寸",
        "fills": ["布丁", "香芋"],
        "cream": "动物奶油"
      },
      "unitPrice": 28100,
      "quantity": 1
    }
  ],
  "totalPrice": 281,
  "status": "PENDING_PAY",
  "createdAt": 1716500000000,
  "paidAt": null
}
```

**状态流转：**
- `PENDING_PAY` 待支付
- `PAID` 已支付
- `BAKING` 制作中
- `SHIPPING` 配送中
- `FINISHED` 已完成

---

## 5. cart（购物车同步集合）

```json
{
  "_id": "auto",
  "_openid": "用户唯一标识",
  "goodsId": "商品ID",
  "name": "草莓慕斯",
  "spec": {
    "size": "6寸",
    "fills": ["布丁", "香芋"],
    "cream": "动物奶油"
  },
  "unitPrice": 28100,
  "quantity": 1,
  "imageUrl": "cloud://xxx/goods/商品_01.png",
  "updatedAt": 1716500000000
}
```

---

## 约束与索引建议

| 集合 | 建议索引字段 |
|------|-------------|
| `users` | `_openid`（唯一索引） |
| `goods` | `category`, `status` |
| `scores_store` | `status` |
| `orders` | `_openid`, `status`, `createdAt` |
| `cart` | `_openid`（按用户查询） |

---

请确认 Schema 设计是否符合你的业务需求，确认后我们再依次开发云函数和前端调用。