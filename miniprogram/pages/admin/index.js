// pages/admin/index.js
const api = require('../../services/api')
const auth = require('../../services/auth')

Page({
  data: {
    phone: '',
    loading: false,
    error: ''
  },

  onLoad(options) {
    const userInfo = auth.getUserInfo()
    if (userInfo && userInfo.is_admin) {
      wx.navigateTo({ url: '/pages/admin/orders' })
    }
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value })
  },

  async onLogin() {
    const { phone } = this.data

    if (!phone || phone.length !== 11) {
      this.setData({ error: '请输入正确的手机号' })
      return
    }

    try {
      this.setData({ loading: true, error: '' })
      const res = await api.adminLogin(phone)
      if (res) {
        auth.saveUserInfo(res)
        wx.showToast({ title: '登录成功', icon: 'success' })
        setTimeout(() => {
          wx.navigateTo({ url: '/pages/admin/orders' })
        }, 1000)
      }
      this.setData({ loading: false })
    } catch (e) {
      this.setData({ loading: false, error: e.message || '登录失败' })
    }
  }
})