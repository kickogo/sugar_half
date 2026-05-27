// pages/my/my.js
const db = wx.cloud.database();

const BG_URL = '/image/banners/背景.png';

Page({
  data: {
    menuItems: [
      { id: 1, name: '订单中心', icon: '📋' },
      { id: 2, name: '购物车', icon: '🛒' },
      { id: 3, name: '收货地址', icon: '📍' },
      { id: 4, name: '个人信息', icon: '👤' },
      { id: 5, name: '关于我们', icon: '💬' }
    ],
    backgroundUrl: ''
  },

  onLoad: function() {
    this.loadUserInfo();
    this.loadBackground();
  },

  // 加载用户信息
  loadUserInfo: function() {
    wx.cloud.callFunction({
      name: 'getUserInfo',
      data: {},
      success: res => {
        if (res.result.success) {
          this.setData({ userInfo: res.result.data });
        }
      },
      fail: err => {
        console.error('[my] [loadUserInfo] 失败:', err);
      }
    });
  },

  // 加载背景图
  loadBackground: function() {
    this.setData({ backgroundUrl: BG_URL });
  }
});