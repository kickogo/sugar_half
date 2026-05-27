// 云函数入口文件
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

/**
 * 同步购物车数据到云端
 * @param {object} event
 *   - items: 购物车完整列表（增量更新）
 */
exports.main = async (event, context) => {
  console.log('[云函数] [syncCart] 调用参数:', JSON.stringify(event));

  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    if (!openid) {
      return { success: false, errMsg: '无法获取用户身份' };
    }

    const { items } = event;

    if (!items || !Array.isArray(items)) {
      return { success: false, errMsg: '参数错误' };
    }

    // 遍历更新每个商品
    const promises = items.map(async (item) => {
      if (item._id) {
        // 已有ID，更新
        await db.collection('cart').doc(item._id).update({
          data: {
            quantity: item.quantity,
            spec: item.spec,
            updatedAt: Date.now()
          }
        });
      } else {
        // 无ID，新增
        await db.collection('cart').add({
          data: {
            _openid: openid,
            goodsId: item.goodsId,
            name: item.name,
            spec: item.spec,
            price: item.price,
            quantity: item.quantity,
            imageUrl: item.imageUrl,
            updatedAt: Date.now()
          }
        });
      }
    });

    await Promise.all(promises);

    return { success: true };
  } catch (err) {
    console.error('[云函数] [syncCart] 失败:', err);
    return { success: false, errMsg: err.message || '服务器错误' };
  }
};