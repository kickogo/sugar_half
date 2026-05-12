// pages/payment/index.js
const api = require('../../services/api')
const payment = require('../../services/payment')
const auth = require('../../services/auth')

Page({
  data: {
    orderId: '',
    amount: 0,
    status: 'pending' // pending, paying, success, fail
  },

  onLoad(options) {
    if (!options.order_id || !options.amount) {
      wx.showToast({ title: '参数错误', icon: 'none' })
      wx.navigateBack()
      return
    }
    this.setData({
      orderId: options.order_id,
      amount: options.amount
    })
  },

  onShow() {
    const userInfo = auth.getUserInfo()
    if (!userInfo) {
      wx.navigateTo({ url: '/pages/my/index?needLogin=1' })
      return
    }
    this.userId = userInfo.user_id
    this.startPayment()
  },

  async startPayment() {
    this.setData({ status: 'paying' })

    try {
      await payment.requestPayment(this.data.orderId, this.userId)
      this.setData({ status: 'success' })
    } catch (e) {
      this.setData({ status: 'fail' })
    }
  },

  onGoHome() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  onGoOrder() {
    wx.navigateTo({ url: '/pages/my/index' })
  },

  formatPrice(cent) {
    return (cent / 100).toFixed(2)
  }
})