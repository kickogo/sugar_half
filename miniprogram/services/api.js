/**
 * API 统一封装
 */

/**
 * 调用云函数
 */
function callFunction(name, data = {}) {
  return wx.cloud.callFunction({
    name,
    data
  }).then(res => {
    if (res.result && res.result.success === false) {
      return Promise.reject(res.result.error)
    }
    return res.result
  })
}

/**
 * 获取用户信息
 */
function getUserInfo() {
  return wx.getStorageSync('userInfo') || null
}

/**
 * API 方法
 */
module.exports = {
  // 用户
  login: () => callFunction('login'),

  adminLogin: (phone) => callFunction('adminLogin', { phone }),

  // 商品
  getCategories: () => callFunction('productGetCategories'),

  getProductList: (params = {}) => callFunction('productGetList', params),

  getProductDetail: (id) => callFunction('productGetDetail', { id }),

  // 订单
  createOrder: (data) => callFunction('orderCreate', data),

  getPayParams: (data) => callFunction('orderPay', data),

  payCallback: (data) => callFunction('orderPayCallback', data),

  getOrderList: (params = {}) => callFunction('orderGetList', params),

  getOrderDetail: (orderId) => callFunction('orderGetDetail', { order_id: orderId }),

  // 商家
  confirmOrder: (orderId) => callFunction('orderConfirm', { order_id: orderId }),

  adminGetOrders: (params = {}) => callFunction('adminGetOrders', params),

  // 工具
  getUserInfo,

  formatPrice: (cent) => (cent / 100).toFixed(2)
}