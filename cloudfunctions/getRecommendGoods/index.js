// 云函数入口文件
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

/**
 * 获取推荐商品列表
 * 规则：isRecommend=true 排前面，剩余按 buyCount 降序
 * 固定返回4个商品
 */
exports.main = async (event, context) => {
  console.log('[云函数] [getRecommendGoods] 调用');

  try {
    const limit = 4;

    // 一次性查询所有状态为1的商品，按 isRecommend 降序、buyCount 降序排序
    const allRes = await db.collection('goods')
      .where({ status: 1 })
      .orderBy('isRecommend', 'desc')
      .orderBy('buyCount', 'desc')
      .limit(limit)
      .get();

    const recommendItems = allRes.data || [];

    // 按规范返回：小驼峰字段，_id 映射为 goodsId
    const result = recommendItems.slice(0, limit).map(item => ({
      goodsId: item._id,
      name: item.name,
      price: item.price,
      imageUrl: item.imageUrl,
      desc: item.desc || item.tag || '',
      stampText: item.stampText || '',
      category: item.category || '',
      specConfig: item.specConfig || null,
      isRecommend: item.isRecommend || false
    }));

    return {
      success: true,
      data: result
    };
  } catch (err) {
    console.error('[云函数] [getRecommendGoods] 失败:', err);
    return { success: false, errMsg: err.message || '服务器错误' };
  }
};