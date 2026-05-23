# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BakeBridge is a WeChat miniprogram (微信小程序) cake customization SaaS for bakeries. It consists of:

- **C端 (Consumer)**: Native WeChat miniprogram for customers to customize cakes, enter addresses, and pay
- **A端 (Merchant)**: CloudBase-powered admin for managing styles, pricing, and processing orders

Architecture: WeChat CloudBase (云开发) — no separate server/backend. All backend logic runs in cloud functions (云函数).

## Key Configuration

- **AppID**: `wxb837d64ee9008b93`
- **Cloud Environment ID**: `cloud1-d7gxxh0mz559ebcb3`
- **Miniprogram Root**: `miniprogram/`
- **Cloud Function Root**: `cloudfunctions/`
- **Brand Name**: JENNY & FRIENDS (蛋糕店小程序)

## Commands

### WeChat DevTools
- Use WeChat Developer Tools (微信开发者工具) to run, debug, and preview the miniprogram
- Open project with `project.config.json`

### Cloud Function Deployment
```bash
# In cloudfunctions/ directory, right-click → "Upload and Deploy (云端安装依赖)"
# Or use the upload script:
./uploadCloudFunction.sh
```

### Environment Configuration
Set the cloud environment ID in `miniprogram/app.js`:
```javascript
env: "cloud1-d7gxxh0mz559ebcb3"
```

## Architecture

```
miniprogram/
├── app.js           # App entry, wx.cloud.init() with env ID
├── app.json         # Pages registry, window config
├── app.wxss         # Global styles
├── envList.js       # Environment list (local dev)
├── pages/
│   ├── index/       # Home page (cloudbaserun demo)
│   └── example/     # Feature demo pages
├── components/       # Reusable components
└── images/          # Static assets

cloudfunctions/      # Cloud functions (currently empty)
```

### Database Collections (to be created)

| Collection | Purpose |
|------------|---------|
| `styles` | Cake style definitions (name, image, description, status) |
| `spec_matrix` | Size/price matrix (size, base price, max fillings, cream upgrade) |
| `orders` | Order records with status flow (PENDING_PAY → PAID → BAKING → SHIPPING → FINISHED) |

### Pricing Formula

```
Total = SizeBasePrice + CreamUpgradePrice(per size) + DeliveryFee
DeliveryFee: 0 if distance ≤ 3km, else 5 + (distance - 3) × 1.5
```

## Development Phases

1. **Data Foundation**: Database schemas + PriceCalculator cloud function
2. **A端 (Merchant)**: Style management API (manageCakeStyles)
3. **C端 (Consumer)**: Style selection UI (detail page with WXML/WXSS)
4. **WeChat Integration**: Address (wx.chooseAddress), payment (cloud.payment.unifiedOrder), subscribe messages

## Key Patterns

- Cloud functions: Node.js in `cloudfunctions/`, deployed via WeChat DevTools right-click menu
- Backend price calculation: Always recalculate prices server-side to prevent tampering
- Status management: Use WeChat subscription messages for order updates
- Payment: Use `cloud.payment.unifiedOrder` (no separate certificate required)

## UI Design System

"JENNY & FRIENDS" — 美式轻复古、千禧粉奶油风、带硬朗手绘线条（Neo-Brutalism）风格。

### Color Palette

| Variable | Value | Usage |
|----------|-------|-------|
| `--bg-main` | `#FFF2F5` | 全局极浅粉色背景底色 |
| `--primary-pink` | `#E27D9A` | 核心主视觉粉色（品牌色） |
| `--active-red` | `#7A2238` | 选中态、深红棕色文字、主价格色 |
| `--text-dark` | `#333333` | 核心正文与大标题黑 |
| `--text-grey` | `#666666` | 规格描述、副标题灰色 |
| `--white` | `#FFFFFF` | 卡片纯白背景 |
| `--vip-gold` | `#EAD1B3` | 会员卡浅金棕色背景 |

### Border, Radius & Shadow

- `--card-radius`: `24rpx` — 卡片、商品块的核心大圆角
- `--btn-radius`: `16rpx` — 按钮、标签的核心圆角
- `--border-thick`: `4rpx solid #7A2238` — 核心手绘复古风粗黑/粗红棕边框
- `--retro-shadow`: `6rpx 6rpx 0rpx #7A2238` — 硬块状偏移阴影（blur:0）

### Static Assets Structure

```
miniprogram/image/
├── icon/           # TabBar 图标 (128x128px PNG)
│   ├── home.png / home-active.png
│   ├── goods.png / goods-active.png
│   ├── score.png / score-active.png
│   ├── cart.png / cart-active.png
│   └── mine.png / mine-active.png
├── banners/
│   ├── checkerboard-bg.png  # 粉白相间棋盘格平铺图
│   ├── lychee-banner.png    # 全部商品页顶部荔枝海报
│   └── my-top-bg.png       # 我的页面顶部大桥插画
└── goods/           # 商品图 (1:1 正方形)
    ├── cake-baleibulie.png
    ├── cake-lanmeiduoduo.png
    ├── cake-moli.png
    └── item-glass.png
```

## Page Structure

| Page | Path | Description |
|------|------|-------------|
| 首页 | `pages/index/index` | Swiper 轮播、时令鲜果入口、客服小票 |
| 全部商品 | `pages/goods/goods` | 搜索框 + 双列商品网格 |
| 积分商城 | `pages/scores/scores` | 积分商品瀑布流 |
| 购物车 | `pages/cart/cart` | 配送信息、购物项、推荐商品、结算栏 |
| 我的 | `pages/my/my` | 大桥插画、VIP 卡、功能列表 |

### Key UI Implementation Notes

- 所有 `<image>` 必须声明 `mode="aspectFill"` 或 `mode="widthFix"`
- 布局单位统一使用 `rpx`（基准 750rpx 全屏）
- 结算栏使用 `padding-bottom: env(safe-area-inset-bottom)` 适配全面屏
- 购物车数量加减器为手绘风格 `- 1 +` 框线设计
- 商品卡片：英文印章贴纸效果叠加在图片上方
- 客服小票：使用 `transform: rotate(-2.5deg)` 倾斜 + 锯齿撕边效果