// pages/admin/orders/index.js
const api = require('../../../services/api')
const auth = require('../../../services/auth')

Page({
  data: {
    orders: [],
    filteredOrders: [],
    activeTab: 'all',
    loading: true,
    statusMap: {
      0: { text: '待付款', color: '#ff6b6b' },
      1: { text: '待确认', color: '#faad14' },
      2: { text: '制作中', color: '#1890ff' },
      3: { text: '待取货', color: '#52c41a' },
      4: { text: '已完成', color: '#52c41a' },
      5: { text: '已取消', color: '#999' }
    }
  },

  onLoad() {
    if (!auth.isAdmin()) {
      wx.navigateBack()
      return
    }
    this.loadOrders()
  },

  onShow() {
    if (!auth.isAdmin()) return
    this.loadOrders()
  },

  async loadOrders() {
    try {
      wx.showLoading({ title: '加载中...' })
      const res = await api.adminGetOrders({})
      if (res) {
        this.setData({
          orders: res,
          filteredOrders: res,
          loading: false
        })
      }
      wx.hideLoading()
    } catch (e) {
      wx.hideLoading()
      this.setData({ loading: false })
      console.error('loadOrders error:', e)
    }
  },

  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab })
    this.filterOrders()
  },

  filterOrders() {
    const { orders, activeTab } = this.data
    if (activeTab === 'all') {
      this.setData({ filteredOrders: orders })
    } else if (activeTab === 'pending') {
      this.setData({ filteredOrders: orders.filter(o => [0, 1].includes(o.status)) })
    } else if (activeTab === 'completed') {
      this.setData({ filteredOrders: orders.filter(o => [2, 3, 4].includes(o.status)) })
    }
  },

  onOrderTap(e) {
    const { orderid } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/admin/order?id=${orderid}` })
  },

  async onConfirmOrder(e) {
    const { orderid } = e.currentTarget.dataset
    const userInfo = auth.getUserInfo()
    if (!userInfo) return

    try {
      wx.showLoading({ title: '确认中...' })
      await api.confirmOrder(orderid, userInfo.user_id)
      wx.hideLoading()
      wx.showToast({ title: '确认成功', icon: 'success' })
      this.loadOrders()
    } catch (e) {
      wx.hideLoading()
      wx.showToast({ title: '确认失败', icon: 'none' })
    }
  },

  formatPrice(cent) {
    return (cent / 100).toFixed(2)
  },

  formatDate(dateStr) {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }
})