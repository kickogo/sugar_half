// 云函数入口文件
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

/**
 * 同步购物车数据到云端
 * 同款同规格合并为一条记录，数量叠加
 * @param {object} event
 *   - items: 购物车完整列表（增量更新）
 *   - deleteId: 要删除的商品记录ID
 */
exports.main = async (event, context) => {
  console.log('[云函数] [syncCart] 调用参数:', JSON.stringify(event));

  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    if (!openid) {
      return { success: false, errMsg: '无法获取用户身份' };
    }

    const { items, deleteId } = event;

    // 处理删除
    if (deleteId) {
      await db.collection('cart').doc(deleteId).remove();
    }

    // 处理新增/更新
    if (items && Array.isArray(items)) {
      for (const item of items) {
        if (item._id) {
          // 已有_id，更新
          await db.collection('cart').doc(item._id).update({
            data: {
              quantity: item.quantity,
              spec: item.spec,
              updatedAt: Date.now()
            }
          });
        } else {
          // 无_id，为新增商品，先查同款同规格是否已存在
          const existRes = await db.collection('cart')
            .where({
              _openid: openid,
              goodsId: item.goodsId,
              spec: item.spec
            })
            .get();

          if (existRes.data && existRes.data.length > 0) {
            // 已存在则数量叠加
            await db.collection('cart').doc(existRes.data[0]._id).update({
              data: {
                quantity: existRes.data[0].quantity + item.quantity,
                updatedAt: Date.now()
              }
            });
          } else {
            // 不存在则新增
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
        }
      }
    }

    return { success: true };
  } catch (err) {
    console.error('[云函数] [syncCart] 失败:', err);
    return { success: false, errMsg: err.message || '服务器错误' };
  }
};