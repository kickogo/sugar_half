// pages/category/index.js
const api = require('../../services/api')

Page({
  data: {
    categories: [],
    products: [],
    selectedCategoryId: '',
    loading: true
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ selectedCategoryId: options.id })
    }
    this.loadCategories()
  },

  async loadCategories() {
    try {
      const res = await api.getCategories()
      if (res && res.length > 0) {
        this.setData({ categories: res })
        if (!this.data.selectedCategoryId) {
          this.setData({ selectedCategoryId: res[0]._id })
        }
        this.loadProducts()
      }
    } catch (e) {
      console.error('loadCategories error:', e)
    }
  },

  async loadProducts() {
    try {
      wx.showLoading({ title: '加载中...' })
      const res = await api.getProductList({
        category_id: this.data.selectedCategoryId
      })
      if (res) {
        this.setData({ products: res, loading: false })
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
    if (id !== this.data.selectedCategoryId) {
      this.setData({ selectedCategoryId: id, products: [], loading: true })
      this.loadProducts()
    }
  },

  onProductTap(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/product/index?id=${id}` })
  },

  formatPrice(cent) {
    return (cent / 100).toFixed(2)
  }
})