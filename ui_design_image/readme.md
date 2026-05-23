既然你决定把这份规划作为发给 Claude Code 的终极输入，那我们就必须抛弃一切客套和碎碎念，把它打造成一份高度结构化、机器可读性极强、甚至可以直接当成“系统 Prompt（System Prompt）”的硬核开发文档。

你可以直接**一键复制**以下全部内容发给 Claude Code。这份文档已经帮你修正了之前 AI 的品牌错误（纠正为 `JENNY & FRIENDS`），拆清了文件目录，并用专业的 CSS/小程序的术语（如 `safe-area`、`Grid`、`rpx`、`aspectFill` 等）规范了所有的视觉细节，能最大程度榨干 Claude Code 的像素级还原能力。

---

```markdown
# 🚀 SYSTEM INSTRUCTION: "JENNY & FRIENDS" 小程序像素级前端重构指南

你是一个顶级的前端开发专家与 UI/UX 视觉设计师。接下来你需要为我“像素级还原”一个美式轻复古、千禧粉奶油风、带硬朗手绘线条（Neo-Brutalism）风格的蛋糕店微信小程序。

## 一、 全局设计系统 (Global Design System)

请严格按照以下视觉规范，在 `miniprogram/app.wxss` 中定义全局变量，并在后续的所有页面中强制调用，禁止使用任何 AI 默认的现代化扁平或渐变样式。

### 1. 调色盘 (Color Palette)
- `--bg-main`: #FFF2F5;       /* 全局极浅粉色背景底色 */
- `--primary-pink`: #E27D9A;  /* 核心主视觉粉色（品牌色） */
- `--active-red`: #7A2238;    /* 选中态、深红棕色文字、主价格色（高对比度） */
- `--text-dark`: #333333;     /* 核心正文与大标题黑 */
- `--text-grey`: #666666;     /* 规格描述、副标题灰色 */
- `--white`: #FFFFFF;         /* 卡片纯白背景 */
- `--vip-gold`: #EAD1B3;      /* 会员卡浅金棕色背景 */

### 2. 边框、圆角与核心投影 (Border & Shadow)
- `--card-radius`: 24rpx;     /* 卡片、商品块的核心大圆角 */
- `--btn-radius`: 16rpx;      /* 按钮、标签的核心圆角 */
- `--border-thick`: 4rpx solid #7A2238; /* 核心手绘复古风粗黑/粗红棕边框 */
- `--retro-shadow`: 6rpx 6rpx 0rpx #7A2238; /* 核心灵魂：绝对不要模糊（blur:0），使用硬块状偏移阴影 */

---

## 二、 目录与静态素材结构约束

项目采用标准的微信小程序云开发结构，所有前端资源已就位。在代码中引用图片、图标时，请严格遵守以下路径，不得私自创建、拼写错误的路径：


```

miniprogram/
├── image/
│   ├── icon/
│   │   /* 包含 5 个 TabBar 按钮的 PNG (128x128px) 或内嵌 SVG */
│   │   ├── home.png / home-active.png (首页)
│   │   ├── goods.png / goods-active.png (全部商品)
│   │   ├── score.png / score-active.png (积分商城)
│   │   ├── cart.png / cart-active.png (购物车)
│   │   └── mine.png / mine-active.png (我的)
│   ├── banners/
│   │   ├── checkerboard-bg.png (粉白相间棋盘格平铺图)
│   │   ├── lychee-banner.png (全部商品页顶部的荔枝海报)
│   │   └── my-top-bg.png (我的页面顶部风景插画)
│   └── goods/
│       /* 严格 1:1 正方形的蛋糕/周边商品图 */
│       ├── cake-baleibulie.png (芭乐布蕾)
│       ├── cake-lanmeiduoduo.png (蓝莓多多)
│       ├── cake-moli.png (茉莉玫瑰)
│       ├── item-glass.png (生日快乐眼镜)
│       └── coupon-10.png ~ coupon-30.png (积分商城手绘代金券)

```

---

## 三、 分页面精细化开发要求

请依次或批量初始化以下 5 个页面的 WXML、WXSS、JS（提供纯静态 Mock 数据即可，优先保障 1:1 视觉重现）：

### 🛠️ 页面 1：首页 (`pages/index/index`)
1. **顶部 Swiper 轮播区：**
   - 高度固定为 `480rpx`。必须以 `image/banners/checkerboard-bg.png` 为背景进行 X 和 Y 轴双向平铺。
   - 内部轮播图采用 `circular="true"`。中心蛋糕图居中，外层套一个带白色圆形波浪花边（Scalloped Border）的容器。
   - 轮播图下方的椭圆形 `Jenny` 品牌标签需用 `position: absolute;` 悬浮在轮播区与下部卡片的交界中心。
2. **复古撕边客服小票（ONLINE SERVICE）：**
   - 卡片整体背景为粉色，整体使用 `transform: rotate(-2.5deg);` 进行轻微逆时针倾斜。
   - 必须使用 WXSS 伪元素或 CSS 线性渐变（`linear-gradient`）拼接出上下两端**细密的三角形锯齿状撕边效果**。
   - 卡片需带有 `--retro-shadow`（右下角硬重叠投影）。
3. **时令鲜果金刚位：**
   - 页面底部入口。使用不规则圆角气泡框，必须加上 `--border-thick` 和偏色投影，文字加粗，右侧带手绘风格小箭头。

### 🛠️ 页面 2：全部商品 (`pages/goods/goods`)
1. **顶部搜索与 Banner：**
   - 顶部提供圆角、白底的轻复古搜索框，内嵌放大镜图标。
   - Banner 区域引入 `image/banners/lychee-banner.png`，宽度 `690rpx`，左右居中留白，边缘圆角 `16rpx`。
2. **“以爱为名·即刻入夏”分割线：**
   - 标题居中，深红棕色（`--active-red`），下方带有一条短而粗的波浪线或粉色实线作为装饰。
3. **双列商品网格：**
   - 采用 `display: grid; grid-template-columns: 1fr 1fr; grid-gap: 24rpx;` 布局。
   - **商品卡片细节：** - 图片容器包裹 `<image>`，必须赋予 `mode="aspectFill"`，防止蛋糕图片拉伸变形。
     - 图片上方要绝对定位叠加圆环英文印章贴纸效果。
     - 卡片内文本左对齐，价格（`--active-red`）大字号加粗。右下角固定定位一个粉色圆角矩形线条的购物车小图标。

### 🛠️ 页面 3：积分商城 (`pages/scores/scores`)
1. **顶部 Rewards 装饰背景：**
   - 页面上半部分有淡淡的手绘餐具和英文环形暗纹，背景为柔和粉。
2. **积分商品瀑布流/网格：**
   - 同样采用 2 列网格布局。卡片背景为纯白，圆角 `24rpx`。
   - 商品图展示 `image/goods/coupon-10.png` 等手绘黑线条框风格的代金券卡片。
   - 底部文字显示“10元代金券”，所需积分（如 `300积分`）醒目，右下角为一个圆形的、带有白色加号（+）的深粉色按钮。

### 🛠️ 页面 4：购物车 (`pages/cart/cart`)
1. **顶部配送与门店信息：**
   - 顶吸一行浅粉色通知栏：“预计 05-24 11:00 开始配送”，深粉色字。
   - 门店选择卡片显示“静宜和她的朋友（龙湖金街店）”，右侧带手绘风格的“编辑”按钮。
2. **购物车列表项：**
   - 左侧为自定义圆形 Checkbox（选中态为 `--primary-pink` 填满带白勾，未选中态为空心深红棕色圆圈）。
   - 中间为 1:1 商品缩略图，右侧纵向排列商品名、规格下拉标签（5英寸、0.5磅）、价格。
   - 右下角内嵌手绘风格的数量加减器（`- 1 +`），带有极简的框线分割。
3. **推荐商品（横向滑动）：**
   - “推荐商品”标题左右带细实线分割。
   - 采用 `scroll-view scroll-x="true" white-space: nowrap;` 实现横向无缝滚动，展示生日眼镜、小猪举牌等周边卡片。
4. **吸底结算栏与安全区适配：**
   - 结算栏固定在屏幕最底部。必须在 WXSS 中使用 `padding-bottom: env(safe-area-inset-bottom);` 完美兼容各类全面屏（iPhone 底部黑条不遮挡文字）。
   - 右侧“去结算(2)”按钮为高饱和度红棕色背景，白字，大圆角。

### 🛠️ 页面 5：我的 (`pages/my/my`)
1. **头部大桥插画与卡片溢出堆叠：**
   - 顶部容器背景图为 `image/banners/my-top-bg.png`（带粉色 JENNY & FRIENDS 大桥结构）。
   - 下方的“静宜朋友卡 VIP”粉色卡片，必须通过 `margin-top: -80rpx; position: relative; z-index: 10;` 产生向上溢出并压在顶部背景图上方的“层级堆叠感”。
2. **极简清爽功能列表：**
   - 下方卡片内包含：订单中心、购物车、收货地址、个人信息等。
   - 每一行（List Item）高度 `100rpx`，Flex 两端对齐。文字为深灰色，右侧带浅灰色细线箭头（`>`）。
   - 每行之间带有 `1rpx solid #F5F5F5` 的清爽分割线。

---

## 四、 技术实现与输出约束

1. **零外部框架依赖：** 必须使用微信小程序原生原生语法编写（WXML / WXSS / JSON / JS），禁止引入第三方组件库（如 Vant Weapp）。
2. **图片防变形规范：** 所有的 `<image>` 标签必须显式声明 `mode` 属性（如 `mode="aspectFill"` 或 `mode="widthFix"`）。
3. **单位规范：** 布局、间距、字体大小统一采用微信官方响应式单位 `rpx`（以 `750rpx` 为全屏标准基准）。
4. **代码输出格式：** 请逐步输出每个页面的核心代码段。先输出 WXML 结构与 WXSS 样式。让我们从第一步：配置 `app.json` 的 `tabBar` 以及全局 `app.wxss` 开始！

```

---

### 💡 如何用它开展开发：

直接把上面这段代码**整合成一个大文本**投喂给你的 Claude Code。它在读取这段高度规范、黑白分明的指令后，会立刻在终端开始有条不紊地生成你的小程序前端架构。你可以搬好小板凳，在微信开发者工具里静静欣赏视觉图被 1:1 还原的动态过程了！