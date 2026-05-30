// pages/index/index.js
Page({
  data: {
    // 顶部导航
    cartCount: 0,

    // 轮播Banner
    banners: [
      {
        id: 1,
        image: '/image/banners/cake_01.png',
        title: '人气TOP1 · 复古甜心蛋糕',
        subtitle: '动物奶油 当日现做',
        btnText: '立即抢购'
      },
      {
        id: 2,
        image: '/image/banners/cake_02.png',
        title: '夏日限定 · 时令鲜果系列',
        subtitle: '新鲜直采',
        btnText: '了解更多'
      },
      {
        id: 3,
        image: '/image/banners/cake_01.png',
        title: '新人专享 | 首单立减10元',
        subtitle: '免费配送',
        btnText: '立即领取'
      }
    ],

    // 快捷功能入口 2行×3列
    quickEntries: [
      { id: 1, icon: '🎂', name: '蛋糕定制', note: '支持改款/改字/改色' },
      { id: 2, icon: '👑', name: '热门款式', note: '爆款推荐，闭眼入不踩雷' },
      { id: 3, icon: '🎁', name: '场景蛋糕', note: '生日/祝寿/情侣款' },
      { id: 4, icon: '🎀', name: '礼盒套装', note: '伴手礼/下午茶/企业定制' },
      { id: 5, icon: '💬', name: '在线咨询', note: '定制/配送问题随时问' },
      { id: 6, icon: '⭐', name: '会员福利', note: '积分兑礼/会员折扣' }
    ],

    // 人气爆款
    hotProducts: [
      { id: 1, name: '芭乐布蕾', spec: '6寸', price: '298', image: '/image/goods/商品_01.png', tag: 'HOT' },
      { id: 2, name: '蓝莓多多', spec: '6寸', price: '328', image: '/image/goods/商品_02.png', tag: 'NEW' },
      { id: 3, name: '茉莉玫瑰', spec: '6寸', price: '288', image: '/image/goods/商品_03.png', tag: '热卖' },
      { id: 4, name: '芒果奶油', spec: '6寸', price: '318', image: '/image/goods/商品_04.png', tag: '热卖' }
    ],

    // 当季新品
    newProducts: [
      { id: 1, name: '荔枝玫瑰', spec: '6寸', price: '338', image: '/image/goods/商品_05.png', tag: 'NEW' },
      { id: 2, name: '水蜜桃奶油', spec: '6寸', price: '328', image: '/image/goods/商品_06.png', tag: 'NEW' },
      { id: 3, name: '车厘子双层', spec: '8英寸 · 1.5磅', price: '488', image: '/image/goods/商品_07.png', tag: 'NEW' }
    ],

    // 场景分类
    sceneItems: [
      { id: 1, icon: '💕', name: '情侣款' },
      { id: 2, icon: '👶', name: '亲子款' },
      { id: 3, icon: '🎀', name: '祝寿款' },
      { id: 4, icon: '🏢', name: '企业定制款' }
    ],

    // 用户评价
    reviews: [
      { id: 1, avatar: '🍰', nickname: '甜心小鹿', score: 5, text: '蛋糕超好吃！奶油很细腻，家人都说很棒！', product: '芭乐布蕾' },
      { id: 2, avatar: '🍓', nickname: '爱吃甜的琳琳', score: 5, text: '生日派对定了这家的蛋糕，小朋友超喜欢！', product: '蓝莓多多' },
      { id: 3, avatar: '🎂', nickname: '小熊维尼', score: 5, text: '样式好看味道也好，下次还会回购～', product: '茉莉玫瑰' },
      { id: 4, avatar: '🍰', nickname: '朵朵妈妈', score: 5, text: '同城冷链配送很及时，蛋糕完好无损！', product: '芒果奶油' }
    ],

    // 门店信息
    storeInfo: {
      name: 'Tosweet 甜讯蛋糕（花样城店）',
      address: '深圳市龙华区花样城购物中心1楼',
      hours: '10:00 - 22:00',
      service: '支持自提 / 到店试吃 / 同城配送'
    }
  },

  onLoad: function() {
    this.loadBanners();
  },

  loadBanners: function() {
    // 本地图片无需转换
  },

  // 跳转商品页
  goToGoods: function() {
    wx.switchTab({ url: '/pages/goods/goods' });
  },

  // 跳转购物车
  goToCart: function() {
    wx.switchTab({ url: '/pages/cart/cart' });
  },

  // 快捷入口统一跳转
  onQuickTap: function(e) {
    const id = e.currentTarget.dataset.id;
    switch (id) {
      case 1: // 蛋糕定制 → 全部商品
        wx.switchTab({ url: '/pages/goods/goods' });
        break;
      case 2: // 热门款式 → 全部商品
        wx.switchTab({ url: '/pages/goods/goods' });
        break;
      case 3: // 场景蛋糕 → 全部商品（分类）
        wx.switchTab({ url: '/pages/goods/goods' });
        break;
      case 4: // 礼盒套装 → 全部商品
        wx.switchTab({ url: '/pages/goods/goods' });
        break;
      case 5: // 在线咨询 → 客服（调起微信客服）
        wx.showToast({ title: '客服功能开发中', icon: 'none' });
        break;
      case 6: // 会员福利 → 我的页面
        wx.switchTab({ url: '/pages/my/my' });
        break;
    }
  },

  // 唤起地图导航
  goToMap: function() {
    wx.openLocation({
      latitude: 22.7205,
      longitude: 114.0579,
      name: 'Tosweet 甜讯蛋糕（花样城店）',
      address: '深圳市龙华区花样城购物中心1楼'
    });
  }
});