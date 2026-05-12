/**
 * 模拟支付流程
 */
const api = require('./api')

/**
 * 发起支付
 */
function requestPayment(orderId, userId) {
  return new Promise((resolve, reject) => {
    // 1. 获取支付参数
    api.getPayParams({ order_id: orderId, user_id: userId })
      .then(data => {
        // 2. 模拟支付（显示加载中）
        wx.showLoading({ title: '支付中...' })

        // 3. 1.5秒后模拟支付成功
        setTimeout(() => {
          wx.hideLoading()

          // 4. 调用支付回调
          api.payCallback({ order_id: orderId, user_id: userId })
            .then(result => {
              wx.showToast({ title: '支付成功', icon: 'success' })
              resolve(result)
            })
            .catch(err => {
              wx.showToast({ title: err || '支付失败', icon: 'none' })
              reject(err)
            })
        }, 1500)
      })
      .catch(err => {
        wx.showToast({ title: err || '获取支付参数失败', icon: 'none' })
        reject(err)
      })
  })
}

module.exports = {
  requestPayment
}