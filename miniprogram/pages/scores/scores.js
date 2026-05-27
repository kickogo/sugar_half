// pages/scores/scores.js
Page({
  data: {
    couponList: [
      {
        id: 1,
        title: '代金券 10 元',
        requiredScores: 300,
        image: '/image/points_mall/代金券_10_300积分.png'
      },
      {
        id: 2,
        title: '代金券 20 元',
        requiredScores: 600,
        image: '/image/points_mall/代金券_20_600积分.png'
      },
      {
        id: 3,
        title: '代金券 30 元',
        requiredScores: 900,
        image: '/image/points_mall/代金券_30_900积分.png'
      },
      {
        id: 4,
        title: '代金券 50 元',
        requiredScores: 1200,
        image: '/image/points_mall/代金券_50_1200积分.png'
      },
      {
        id: 5,
        title: '8寸蛋糕 8.8折',
        requiredScores: 1500,
        image: '/image/points_mall/8寸蛋糕8.8折代金券_1500积分.png'
      },
      {
        id: 6,
        title: '8折代金券',
        requiredScores: 2000,
        image: '/image/points_mall/8折代金券_2000积分.png'
      }
    ],
    userScores: 0,
    loading: false
  },

  onLoad: function() {
    this.getUserScores();
  },

  onShow: function() {
    this.getUserScores();
  },

  // 获取用户当前积分
  getUserScores: function() {
    wx.cloud.callFunction({
      name: 'getUserInfo',
      data: {},
      success: res => {
        if (res.result.success && res.result.data) {
          this.setData({ userScores: res.result.data.scores || 0 });
        }
      },
      fail: err => {
        console.error('[scores] [getUserScores] 失败:', err);
      }
    });
  },

  // 兑换代金券
  redeemCoupon: function(e) {
    const couponId = e.currentTarget.dataset.id;
    const coupon = this.data.couponList.find(item => item.id === couponId);

    if (!coupon) return;

    if (this.data.userScores < coupon.requiredScores) {
      wx.showToast({ title: '积分不足', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '确认兑换',
      content: `确定要兑换「${coupon.title}」吗？需消耗 ${coupon.requiredScores} 积分`,
      success: res => {
        if (res.confirm) {
          wx.showToast({ title: '兑换成功', icon: 'success' });
        }
      }
    });
  }
});