// 云函数入口文件
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

/**
 * 获取当前用户的购物车列表
 */
exports.main = async (event, context) => {
  console.log('[云函数] [getCartList] 调用');

  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    if (!openid) {
      return { success: false, errMsg: '无法获取用户身份' };
    }

    // 查询用户购物车
    const cartRes = await db.collection('cart')
      .where({ _openid: openid })
      .get();

    // 直接返回购物车商品，不查询goods集合
    const validItems = cartRes.data.map(item => ({
      _id: item._id,
      goodsId: item.goodsId,
      name: item.name,
      spec: item.spec,
      price: item.price,
      quantity: item.quantity,
      imageUrl: item.imageUrl,
      checked: false
    }));

    return {
      success: true,
      data: validItems
    };
  } catch (err) {
    console.error('[云函数] [getCartList] 失败:', err);
    return { success: false, errMsg: err.message || '服务器错误' };
  }
};