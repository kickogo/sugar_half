// pages/my/my.js
Page({
  data: {
    backgroundUrl: '/image/banners/背景.png',

    menuItems: [
      { id: 1, name: '订单中心', icon: '📋' },
      { id: 2, name: '购物车', icon: '🛒' },
      { id: 3, name: '收货地址', icon: '📍' },
      { id: 4, name: '个人信息', icon: '👤' },
      { id: 5, name: '账号设置', icon: '⚙️' },
      { id: 6, name: '联系客服', icon: '💬' },
      { id: 7, name: '下单须知', icon: '📖' },
      { id: 8, name: '经营证照公示', icon: '📄' }
    ]
  },

  onLoad: function() {
    this.loadBackground();
  },

  loadBackground: function() {
    this.setData({ backgroundUrl: '/image/banners/背景.png' });
  },

  onMenuTap: function(e) {
    const id = e.currentTarget.dataset.id;
    const item = this.data.menuItems.find(m => m.id === id);
    switch (id) {
      case 1: wx.showToast({ title: '订单中心开发中', icon: 'none' }); break;
      case 2: wx.switchTab({ url: '/pages/cart/cart' }); break;
      case 3: wx.showToast({ title: '收货地址开发中', icon: 'none' }); break;
      case 4: wx.showToast({ title: '个人信息开发中', icon: 'none' }); break;
      case 5: wx.showToast({ title: '账号设置开发中', icon: 'none' }); break;
      case 6: wx.showToast({ title: '客服功能开发中', icon: 'none' }); break;
      case 7: wx.showToast({ title: '下单须知开发中', icon: 'none' }); break;
      case 8: wx.showToast({ title: '证照公示开发中', icon: 'none' }); break;
    }
  },

  onVIPTap: function() {
    wx.showToast({ title: '会员权益开发中', icon: 'none' });
  }
});