// pages/my/index.js
const api = require('../../services/api')
const auth = require('../../services/auth')

Page({
  data: {
    userInfo: null,
    orders: [],
    loading: true,
    needLogin: false,
    activeTab: 'all', // all, pending, completed
    statusMap: {
      0: { text: '待付款', color: '#ff6b6b' },
      1: { text: '已付款', color: '#1890ff' },
      2: { text: '制作中', color: '#faad14' },
      3: { text: '待自提', color: '#52c41a' },
      4: { text: '已完成', color: '#999' },
      5: { text: '已取消', color: '#999' }
    }
  },

  onLoad(options) {
    if (options.needLogin) {
      this.setData({ needLogin: true })
    }
  },

  onShow() {
    const userInfo = auth.getUserInfo()
    this.setData({ userInfo })

    if (!userInfo) {
      this.setData({ needLogin: true, loading: false })
      return
    }

    this.setData({ needLogin: false })
    this.loadOrders()
  },

  onPullDownRefresh() {
    this.loadOrders().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  async handleLogin() {
    try {
      wx.showLoading({ title: '登录中...' })
      const res = await api.login()
      wx.hideLoading()

      if (res.data) {
        auth.saveUserInfo(res.data)
        this.setData({
          userInfo: res.data,
          needLogin: false
        })
        this.loadOrders()
      }
    } catch (e) {
      wx.hideLoading()
      wx.showToast({ title: '登录失败', icon: 'none' })
    }
  },

  async loadOrders() {
    const userInfo = auth.getUserInfo()
    if (!userInfo) return

    this.setData({ loading: true })
    try {
      const res = await api.getOrderList({ user_id: userInfo.user_id })
      this.setData({
        orders: res || [],
        loading: false
      })
    } catch (e) {
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab })
  },

  getFilteredOrders() {
    const { orders, activeTab } = this.data
    if (activeTab === 'all') return orders
    if (activeTab === 'pending') {
      return orders.filter(o => o.status === 0 || o.status === 1 || o.status === 2 || o.status === 3)
    }
    if (activeTab === 'completed') {
      return orders.filter(o => o.status === 4 || o.status === 5)
    }
    return orders
  },

  onOrderTap(e) {
    const { orderid } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/order/index?id=${orderid}` })
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