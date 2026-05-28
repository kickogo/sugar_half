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

    allGoods: [
      { id: 1, name: '芭乐布蕾', desc: '5英寸 · 0.5磅', price: '298', image: '/image/goods/商品_01.png', stampText: 'HOT', category: 'birthday' },
      { id: 2, name: '蓝莓多多', desc: '5英寸 · 0.5磅', price: '328', image: '/image/goods/商品_02.png', stampText: 'NEW', category: 'couple' },
      { id: 3, name: '茉莉玫瑰', desc: '5英寸 · 0.5磅', price: '288', image: '/image/goods/商品_03.png', stampText: '热卖', category: 'celebration' },
      { id: 4, name: '芒果奶油', desc: '5英寸 · 0.5磅', price: '318', image: '/image/goods/商品_04.png', stampText: '热卖', category: 'birthday' },
      { id: 5, name: '草莓甜心', desc: '5英寸 · 0.5磅', price: '308', image: '/image/goods/商品_05.png', stampText: '新品', category: 'kids' },
      { id: 6, name: '巧克力浓郁', desc: '5英寸 · 0.5磅', price: '338', image: '/image/goods/商品_06.png', stampText: '热卖', category: 'couple' },
      { id: 7, name: '抹茶红豆', desc: '5英寸 · 0.5磅', price: '298', image: '/image/goods/商品_07.png', stampText: 'NEW', category: 'seasonal' },
      { id: 8, name: '柠檬清新', desc: '5英寸 · 0.5磅', price: '288', image: '/image/goods/商品_08.png', stampText: '热卖', category: 'giftbox' }
    ],

    filteredGoods: []
  },

  onLoad: function() {
    this.filterGoods();
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
  },

  // 添加到购物车
  onAddToCart: function(e) {
    const id = e.currentTarget.dataset.id;
    const item = this.data.allGoods.find(g => g.id === id);
    if (!item) return;

    wx.cloud.callFunction({
      name: 'syncCart',
      data: {
        items: [{
          goodsId: id,
          name: item.name,
          spec: item.desc,
          price: item.price,
          quantity: 1,
          imageUrl: item.image
        }]
      },
      success: res => {
        if (res.result.success) {
          wx.showToast({ title: '已加入购物车', icon: 'success' });
        } else {
          wx.showToast({ title: res.result.errMsg, icon: 'none' });
        }
      },
      fail: err => {
        console.error('[goods] [onAddToCart] 失败:', err);
        wx.showToast({ title: '添加失败', icon: 'none' });
      }
    });
  }
});