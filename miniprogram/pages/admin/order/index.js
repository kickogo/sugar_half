// pages/admin/order/index.js
const api = require('../../../services/api')
const auth = require('../../../services/auth')

Page({
  data: {
    orderId: '',
    orderDetail: null,
    loading: true,
    error: '',
    statusMap: {
      0: { text: '待付款', color: '#ff6b6b' },
      1: { text: '待确认', color: '#faad14' },
      2: { text: '制作中', color: '#1890ff' },
      3: { text: '待取货', color: '#52c41a' },
      4: { text: '已完成', color: '#52c41a' },
      5: { text: '已取消', color: '#999' }
    }
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ orderId: options.id })
      this.loadOrderDetail()
    } else {
      this.setData({ error: '缺少订单ID', loading: false })
    }
  },

  onShow() {
    if (!auth.isAdmin()) {
      wx.navigateBack()
    }
  },

  async loadOrderDetail() {
    try {
      wx.showLoading({ title: '加载中...' })
      const res = await api.getOrderDetail(this.data.orderId)
      if (res) {
        this.setData({ orderDetail: res, loading: false })
      }
      wx.hideLoading()
    } catch (e) {
      wx.hideLoading()
      this.setData({ error: '加载失败', loading: false })
      console.error('loadOrderDetail error:', e)
    }
  },

  async onConfirmOrder() {
    try {
      wx.showLoading({ title: '确认中...' })
      await api.confirmOrder(this.data.orderId)
      wx.hideLoading()
      wx.showToast({ title: '确认成功', icon: 'success' })
      setTimeout(() => {
        wx.navigateBack()
      }, 1000)
    } catch (e) {
      wx.hideLoading()
      wx.showToast({ title: '确认失败', icon: 'none' })
    }
  },

  formatPrice(cent) {
    return (cent / 100).toFixed(2)
  }
})