// 云函数入口文件
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

/**
 * 获取当前用户信息
 */
exports.main = async (event, context) => {
  console.log('[云函数] [getUserInfo] 调用');

  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    if (!openid) {
      return { success: false, errMsg: '无法获取用户身份' };
    }

    // 查询用户信息
    const userRes = await db.collection('users').where({ _openid: openid }).get();

    if (userRes.data && userRes.data.length > 0) {
      return {
        success: true,
        data: userRes.data[0]
      };
    } else {
      // 用户不存在，返回空数据
      return {
        success: true,
        data: {
          _openid: openid,
          scores: 0,
          isVIP: false
        }
      };
    }
  } catch (err) {
    console.error('[云函数] [getUserInfo] 失败:', err);
    return { success: false, errMsg: err.message || '服务器错误' };
  }
};