/**
 * 鉴权逻辑
 */
const app = getApp()

/**
 * 检查登录状态
 */
function checkLogin() {
  const userInfo = wx.getStorageSync('userInfo')
  if (!userInfo || !userInfo.token) {
    return false
  }
  return true
}

/**
 * 确保已登录
 */
function ensureLogin() {
  if (!checkLogin()) {
    wx.navigateTo({ url: '/pages/my/index?needLogin=1' })
    return false
  }
  return true
}

/**
 * 获取当前用户信息
 */
function getUserInfo() {
  return wx.getStorageSync('userInfo') || null
}

/**
 * 保存用户信息
 */
function saveUserInfo(userInfo) {
  wx.setStorageSync('userInfo', userInfo)
  if (app.globalData) {
    app.globalData.userInfo = userInfo
  }
}

/**
 * 清除用户信息（退出登录）
 */
function clearUserInfo() {
  wx.removeStorageSync('userInfo')
  if (app.globalData) {
    app.globalData.userInfo = null
  }
}

/**
 * 检查是否为管理员
 */
function isAdmin() {
  const userInfo = getUserInfo()
  return userInfo && userInfo.is_admin === true
}

module.exports = {
  checkLogin,
  ensureLogin,
  getUserInfo,
  saveUserInfo,
  clearUserInfo,
  isAdmin
}