# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cake Studio WeChat Mini Program - an online sales and reservation management platform for bakeries.

- **Frontend**: WeChat Mini Program with Skyline renderer + glass-easel component framework
- **Backend**: WeChat Cloud Development (云开发)
- **Database**: MongoDB via CloudBase
- **Cloud Functions**: WeChat cloud functions for server-side logic
- **Payment**: WeChat Pay integration

## Development Commands

### WeChat DevTools
Use WeChat Developer Tools to run and debug the mini program. No CLI commands available.

### Cloud Function Deployment
```bash
./uploadCloudFunction.sh
```
Deploys cloud functions from `cloudfunctions/` directory.

## Architecture

### Directory Structure
```
miniprogram/          # Frontend (pages, components, services)
cloudfunctions/       # Backend cloud functions
docs/                  # Architecture and planning documents
```

### Frontend Structure
- `pages/` - Page components (index, example, etc.)
- `components/` - Reusable components (cloudTipModal, etc.)
- `services/` - API calls, auth, payment utilities
- `app.js/json/wxss` - App-level configuration

### Backend (Cloud Functions)
Currently only `quickstartFunctions/` exists - a template function demonstrating basic operations (CRUD on "sales" collection, openid retrieval, QR code generation).

Planned cloud functions (per architecture docs):
- `user/` - login, getProfile, updateProfile, address management
- `product/` - getCategories, getList, getDetail
- `sku/` - getStock
- `order/` - create, pay, payCallback, getList, getDetail, cancel
- `reservation/` - getSlots, reserve

### Database Collections (Planned)
- `users` - User accounts (openid, phone, nickname, member_level, balance, points)
- `categories` - Cake categories
- `products` - Cake products with specifications
- `specs` - Specification options (size/flavor/etc.)
- `sku_stock` - SKU inventory (product_id + sku_key = unique)
- `orders` - Order master record
- `order_items` - Order line items
- `reservations` - Reservation time slots
- `addresses` - User delivery addresses

### Order Status Flow
0 (待付款) → 1 (已付款待确认) → 2 (制作中) → 3 (待自提/待配送) → 4 (已完成)
                              ↓
                         5 (已取消)

## Key Configuration

### project.config.json
- **AppID**: `wxb837d64ee9008b93`
- **Project Name**: `quickstart-wx-cloud`

### Cloud Environment
- **Environment ID**: `cloud1-d7gxxh0mz559ebcb3`

### miniprogram/app.js
Cloud initialization uses environment ID `cloud1-d7gxxh0mz559ebcb3` (configured in `env` parameter).

### miniprogram/app.json
Pages: `pages/index/index` and `pages/example/index`

## MVP Scope

### P0 Features
- Shop info display
- Cake gallery (product list + detail)
- Specification selection (size/flavor/accessories) with SKU联动
- Time reservation system with per-SKU inventory
- WeChat Pay
- User account system
- Pickup / City delivery

### SKU Inventory Logic
- `[有库存] ──用户下单锁定──→ [reservation_count + 1]`
- `[有库存] ──支付成功──→ [stock - 1, reservation_count - 1]`
- `[有库存] ──超时取消──→ [reservation_count - 1]` (release lock)

## Technical Notes

- All cloud function calls require user_id + token for authentication
- Token validity: 7 days
- Payment amount calculated server-side, frontend only passes order_id
- Order creation uses atomic database operations to prevent overselling
-下单频率限制：同一用户60秒内最多1单