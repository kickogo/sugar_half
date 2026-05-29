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

    // 查询 isRecommend=true 的手动推荐商品
    const recommendRes = await db.collection('goods')
      .where({ status: 1, isRecommend: true })
      .limit(limit)
      .get();

    const recommendItems = recommendRes.data;

    // 如果推荐商品不足4个，补充销量商品
    if (recommendItems.length < limit) {
      const remainCount = limit - recommendItems.length;
      const recommendedIds = recommendItems.map(item => item._id);

      const salesRes = await db.collection('goods')
        .where({
          status: 1,
          isRecommend: false,
          _id: _.nin(recommendedIds)
        })
        .orderBy('buyCount', 'desc')
        .limit(remainCount)
        .get();

      recommendItems.push(...salesRes.data);
    }

    // 返回结果带上推荐类型标识，确保有 id 字段供前端查找
    const result = recommendItems.slice(0, limit).map(item => ({
      ...item,
      id: item.id || item._id,
      _recommendType: item.isRecommend ? 'manual' : 'sales'
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