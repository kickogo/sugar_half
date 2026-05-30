// pages/goods/goods.js
Page({
  data: {
    searchText: '',
    activeCategory: 'all',
    bannerUrl: '/image/banners/背景.png',

    categories: [
      { id: 'all', name: '全部商品' },
      { id: 'birthday', name: '生日蛋糕' },
      { id: 'celebration', name: '祝寿蛋糕' },
      { id: 'couple', name: '情侣蛋糕' },
      { id: 'kids', name: '儿童蛋糕' },
      { id: 'giftbox', name: '礼盒套装' },
      { id: 'seasonal', name: '时令鲜果' }
    ],

    // 商品规格选项（所有商品共用，可按商品独立扩展）
    specOptions: {
      size: [
        { name: '6寸 2-3人份', price: 0 },
        { name: '8寸 4-6人份', price: 40 },
        { name: '10寸 8-10人份', price: 80 }
      ],
      filling: ['桑椹莓莓', '芋泥啵啵', '布丁燕麦脆'],
      card: ['需要', '不需要'],
      candle: ['数字蜡烛', '长条蜡烛', '无需蜡烛'],
      mention: ['需要', '不需要'],
      packaging: [
        { name: '礼盒', price: 0 },
        { name: '保冷包', price: 5 }
      ],
      cream: [
        { name: '无需增量', price: 0 },
        { name: '加奶油1份', price: 8 }
      ]
    },

    allGoods: [
      { id: 1, name: '芭乐布蕾', desc: '6寸', price: 298, image: '/image/goods/商品_01.png', stampText: 'HOT', category: 'birthday' },
      { id: 2, name: '蓝莓多多', desc: '6寸', price: 328, image: '/image/goods/商品_02.png', stampText: 'NEW', category: 'couple' },
      { id: 3, name: '茉莉玫瑰', desc: '6寸', price: 288, image: '/image/goods/商品_03.png', stampText: '热卖', category: 'celebration' },
      { id: 4, name: '芒果奶油', desc: '6寸', price: 318, image: '/image/goods/商品_04.png', stampText: '热卖', category: 'birthday' },
      { id: 5, name: '草莓甜心', desc: '6寸', price: 308, image: '/image/goods/商品_05.png', stampText: '新品', category: 'kids' },
      { id: 6, name: '巧克力浓郁', desc: '6寸', price: 338, image: '/image/goods/商品_06.png', stampText: '热卖', category: 'couple' },
      { id: 7, name: '抹茶红豆', desc: '6寸', price: 298, image: '/image/goods/商品_07.png', stampText: 'NEW', category: 'seasonal' },
      { id: 8, name: '柠檬清新', desc: '6寸', price: 288, image: '/image/goods/商品_08.png', stampText: '热卖', category: 'giftbox' }
    ],

    filteredGoods: [],

    // 弹窗状态
    showSpecPopup: false,
    currentItem: null,
    selectedSpec: {
      size: '6寸 2-3人份',
      filling: '桑椹莓莓',
      card: '不需要',
      candle: '数字蜡烛',
      mention: '不需要',
      packaging: '礼盒',
      cream: '无需增量'
    },
    totalPrice: 0,
    currentSpecCore: '',
    currentSpecExtra: ''
  },

  onLoad: function() {
    this.filterGoods();
  },

  // 点击购物车图标 → 打开弹窗
  onCartIconTap: function(e) {
    const id = e.currentTarget.dataset.id;
    const item = this.data.allGoods.find(g => g.id === id);
    if (!item) return;

    this.setData({
      showSpecPopup: true,
      currentItem: item,
      totalPrice: item.price,
      selectedSpec: {
        size: '6寸 2-3人份',
        filling: '桑椹莓莓',
        card: '不需要',
        candle: '数字蜡烛',
        mention: '不需要',
        packaging: '礼盒',
        cream: '无需增量'
      },
      currentSpecCore: '6寸 2-3人份 · 桑椹莓莓',
      currentSpecExtra: '不需要 · 数字蜡烛 · 不需要 · 礼盒 · 无需增量'
    });
  },

  // 点击规格选项
  onSpecOptionTap: function(e) {
    const { spec, name, price } = e.currentTarget.dataset;
    const selectedSpec = { ...this.data.selectedSpec, [spec]: name };
    const coreSpec = `${selectedSpec.size} · ${selectedSpec.filling}`;
    const extraSpec = `${selectedSpec.card} · ${selectedSpec.candle} · ${selectedSpec.mention} · ${selectedSpec.packaging} · ${selectedSpec.cream}`;
    this.setData({ selectedSpec, currentSpecCore: coreSpec, currentSpecExtra: extraSpec });
    this.calcTotalPrice();
  },

  // 计算总价
  calcTotalPrice: function() {
    const item = this.data.currentItem;
    if (!item) return;

    const { selectedSpec, specOptions } = this.data;
    let total = item.price;

    // 加上尺寸加价
    const sizeOpt = specOptions.size.find(s => s.name === selectedSpec.size);
    if (sizeOpt) total += sizeOpt.price;

    // 加上包装加价
    const packOpt = specOptions.packaging.find(p => p.name === selectedSpec.packaging);
    if (packOpt) total += packOpt.price;

    // 加上奶油加价
    const creamOpt = specOptions.cream.find(c => c.name === selectedSpec.cream);
    if (creamOpt) total += creamOpt.price;

    this.setData({ totalPrice: total });
  },

  // 关闭弹窗
  onCloseSpecPopup: function() {
    this.setData({ showSpecPopup: false });
  },

  // 确认加入购物车
  onConfirmAddToCart: function() {
    const { currentItem, selectedSpec, totalPrice } = this.data;
    if (!currentItem) return;

    // 拼接规格描述
    const specStr = `${selectedSpec.size} · ${selectedSpec.filling} · ${selectedSpec.card} · ${selectedSpec.candle} · ${selectedSpec.mention} · ${selectedSpec.packaging} · ${selectedSpec.cream}`;

    wx.cloud.callFunction({
      name: 'syncCart',
      data: {
        items: [{
          goodsId: currentItem.id,
          name: currentItem.name,
          spec: specStr,
          price: totalPrice,
          quantity: 1,
          imageUrl: currentItem.image
        }]
      },
      success: res => {
        if (res.result.success) {
          wx.showToast({ title: '已加入购物车', icon: 'success' });
          this.setData({ showSpecPopup: false });
        } else {
          wx.showToast({ title: res.result.errMsg, icon: 'none' });
        }
      },
      fail: err => {
        console.error('[goods] [onConfirmAddToCart] 失败:', err);
        wx.showToast({ title: '添加失败', icon: 'none' });
      }
    });
  },

  // 点击分类项
  onCategoryTap: function(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ activeCategory: id });
    this.filterGoods();
  },

  // 搜索输入
  onSearchInput: function(e) {
    this.setData({ searchText: e.detail.value });
    this.filterGoods();
  },

  // 过滤商品
  filterGoods: function() {
    const { allGoods, activeCategory, searchText } = this.data;
    let list = allGoods;

    if (activeCategory !== 'all') {
      list = list.filter(item => item.category === activeCategory);
    }

    if (searchText) {
      list = list.filter(item =>
        item.name.includes(searchText) || item.desc.includes(searchText)
      );
    }

    this.setData({ filteredGoods: list });
  }
});