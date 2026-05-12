// pages/product/index.js
const api = require('../../services/api')
const auth = require('../../services/auth')

Page({
  data: {
    product: null,
    skus: [],
    specifications: [],
    selectedSpecs: {},
    selectedSku: null,
    showSpecSelector: false,
    showTimePicker: false,
    reservationDate: '',
    reservationTime: '',
    quantity: 1,
    loading: true
  },

  onLoad(options) {
    if (!options.id) {
      wx.showToast({ title: '参数错误', icon: 'none' })
      wx.navigateBack()
      return
    }
    this.productId = options.id
    this.loadProductDetail()
  },

  onShow() {
    if (!auth.checkLogin()) {
      wx.navigateTo({ url: '/pages/my/index?needLogin=1' })
    }
  },

  async loadProductDetail() {
    try {
      wx.showLoading({ title: '加载中...' })
      const res = await api.getProductDetail(this.productId)
      if (res) {
        this.setData({
          product: res,
          skus: res.skus || [],
          specifications: res.specifications || [],
          loading: false
        })
      }
      wx.hideLoading()
    } catch (e) {
      wx.hideLoading()
      wx.showToast({ title: '加载失败', icon: 'none' })
      console.error('loadProductDetail error:', e)
    }
  },

  onSkuTap() {
    this.setData({ showSpecSelector: true })
  },

  onSpecChange(e) {
    const { selectedSpecs, sku } = e.detail
    this.setData({
      selectedSpecs,
      selectedSku: sku,
      showSpecSelector: false
    })
  },

  onSpecClose() {
    this.setData({ showSpecSelector: false })
  },

  onTimeTap() {
    this.setData({ showTimePicker: true })
  },

  onTimeChange(e) {
    const { date, time } = e.detail
    this.setData({
      reservationDate: date,
      reservationTime: time,
      showTimePicker: false
    })
  },

  onTimeClose() {
    this.setData({ showTimePicker: false })
  },

  onQuantityMinus() {
    if (this.data.quantity > 1) {
      this.setData({ quantity: this.data.quantity - 1 })
    }
  },

  onQuantityPlus() {
    this.setData({ quantity: this.data.quantity + 1 })
  },

  async onAddToCart() {
    if (!this.data.selectedSku) {
      wx.showToast({ title: '请选择规格', icon: 'none' })
      return
    }
    if (!this.data.reservationDate || !this.data.reservationTime) {
      wx.showToast({ title: '请选择取货时间', icon: 'none' })
      return
    }

    const userInfo = auth.getUserInfo()
    if (!userInfo) return

    try {
      wx.showLoading({ title: '下单中...' })
      const res = await api.createOrder({
        user_id: userInfo.user_id,
        items: [{
          sku_id: this.data.selectedSku.sku_id,
          quantity: this.data.quantity
        }],
        reservation_date: this.data.reservationDate,
        reservation_time: this.data.reservationTime
      })

      wx.hideLoading()

      if (res.success !== false) {
        wx.navigateTo({
          url: `/pages/payment/index?order_id=${res.order_id}&amount=${res.total_amount}`
        })
      } else {
        wx.showToast({ title: res.error || '下单失败', icon: 'none' })
      }
    } catch (e) {
      wx.hideLoading()
      wx.showToast({ title: '下单失败', icon: 'none' })
      console.error('onAddToCart error:', e)
    }
  },

  formatPrice(cent) {
    return (cent / 100).toFixed(2)
  }
})