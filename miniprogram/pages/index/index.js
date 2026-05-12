// index.js
const app = getApp()

Page({
  data: {
    categories: [],
    products: [],
    banners: [
      { id: 1, image: '/images/banner-cake1.png', link: '' },
      { id: 2, image: '/images/banner-cake2.png', link: '' }
    ],
    loading: true
  },

  onLoad() {
    this.loadCategories()
    this.loadProducts()
  },

  onShow() {
    this.checkLoginStatus()
  },

  checkLoginStatus() {
    const userInfo = app.globalData.userInfo
    if (!userInfo || !userInfo.token) {
      wx.navigateTo({ url: '/pages/my/index?needLogin=1' })
    }
  },

  async loadCategories() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'productGetCategories'
      })
      if (res.result && res.result.success) {
        this.setData({ categories: res.result.data })
      }
    } catch (e) {
      console.error('loadCategories error:', e)
    }
  },

  async loadProducts() {
    try {
      wx.showLoading({ title: '加载中...' })
      const res = await wx.cloud.callFunction({
        name: 'productGetList',
        data: {}
      })
      if (res.result && res.result.success) {
        this.setData({ products: res.result.data, loading: false })
      }
      wx.hideLoading()
    } catch (e) {
      wx.hideLoading()
      console.error('loadProducts error:', e)
      this.setData({ loading: false })
    }
  },

  onCategoryTap(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/category/index?id=${id}` })
  },

  onProductTap(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/product/index?id=${id}` })
  },

  onBannerTap(e) {
    const { link } = e.currentTarget.dataset
    if (link) {
      wx.navigateTo({ url: link })
    }
  },

  onSearchTap() {
    wx.navigateTo({ url: '/pages/category/index' })
  }
})