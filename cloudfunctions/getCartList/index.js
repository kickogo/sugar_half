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

    // 过滤已下架的商品
    const validItems = [];
    for (const item of cartRes.data) {
      try {
        const goodsRes = await db.collection('goods').where({ id: Number(item.goodsId) }).get();
        if (goodsRes.data && goodsRes.data.length > 0 && goodsRes.data[0].status === 1) {
          validItems.push({
            _id: item._id,
            goodsId: item.goodsId,
            name: goodsRes.data[0].name,
            spec: item.spec,
            price: goodsRes.data[0].price,
            quantity: item.quantity,
            imageUrl: goodsRes.data[0].imageUrl,
            checked: false
          });
        }
      } catch (err) {
        console.warn(`[getCartList] 商品不存在或已下架: ${item.goodsId}`);
      }
    }

    return {
      success: true,
      data: validItems
    };
  } catch (err) {
    console.error('[云函数] [getCartList] 失败:', err);
    return { success: false, errMsg: err.message || '服务器错误' };
  }
};