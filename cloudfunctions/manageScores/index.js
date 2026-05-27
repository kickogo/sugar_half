// 云函数入口文件
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

/**
 * 积分兑换核心逻辑
 * @param {object} event - 前端传入参数
 *   - action: 'redeem' | 'add' | 'deduct'
 *   - scoreItemId: 积分商品ID（兑换时必传）
 *   - openid: 用户openid（可选，默认使用微信自动获取的）
 *   - scores: 积分变动数量（add/deduct时必传）
 */
exports.main = async (event, context) => {
  console.log('[云函数] [manageScores] 调用参数:', JSON.stringify(event));

  try {
    // 获取用户 openid
    const wxContext = cloud.getWXContext();
    const openid = event.openid || wxContext.OPENID;

    if (!openid) {
      return { success: false, errMsg: '无法获取用户身份' };
    }

    const { action, scoreItemId, scores } = event;

    switch (action) {
      case 'redeem':
        return await redeemScoreItem(openid, scoreItemId);
      case 'add':
        return await addScores(openid, scores);
      case 'deduct':
        return await deductScores(openid, scores);
      default:
        return { success: false, errMsg: '未知操作类型' };
    }
  } catch (err) {
    console.error('[云函数] [manageScores] 失败:', err);
    return { success: false, errMsg: err.message || '服务器错误' };
  }
};

/**
 * 积分兑换（原子性扣减库存 + 积分）
 */
async function redeemScoreItem(openid, scoreItemId) {
  if (!scoreItemId) {
    return { success: false, errMsg: '缺少兑换商品ID' };
  }

  // 1. 查询积分商品信息
  const scoreItem = await db.collection('scores_store').doc(scoreItemId).get();

  if (!scoreItem.data) {
    return { success: false, errMsg: '兑换商品不存在' };
  }

  if (scoreItem.data.status !== 1) {
    return { success: false, errMsg: '该商品已下架' };
  }

  if (scoreItem.data.stock <= 0) {
    return { success: false, errMsg: '库存不足' };
  }

  const requiredScores = scoreItem.data.requiredScores;
  const title = scoreItem.data.title;

  // 2. 查询用户当前积分（使用事务保证一致性）
  const transaction = await db.startTransaction();

  try {
    const userRes = await transaction.collection('users').where({ _openid: openid }).get();

    if (!userRes.data || userRes.data.length === 0) {
      await transaction.rollback();
      return { success: false, errMsg: '用户信息不存在' };
    }

    const user = userRes.data[0];
    const currentScores = user.scores || 0;

    // 3. 校验积分是否足够
    if (currentScores < requiredScores) {
      await transaction.rollback();
      return {
        success: false,
        errMsg: `积分不足，当前${currentScores}，需要${requiredScores}`
      };
    }

    // 4. 原子性扣减用户积分
    await transaction.collection('users').where({ _openid: openid })
      .update({
        data: {
          scores: _.inc(-requiredScores),
          updatedAt: Date.now()
        }
      });

    // 5. 原子性扣减商品库存
    await transaction.collection('scores_store').doc(scoreItemId)
      .update({
        data: {
          stock: _.inc(-1)
        }
      });

    // 6. 记录积分变动日志（可选）
    await transaction.collection('scores_log').add({
      data: {
        _openid: openid,
        type: 'redeem',
        title: title,
        scoreItemId: scoreItemId,
        scoresChange: -requiredScores,
        currentScores: currentScores - requiredScores,
        createdAt: Date.now()
      }
    });

    await transaction.commit();

    return {
      success: true,
      data: {
        remainingScores: currentScores - requiredScores,
        redeemedItem: title
      }
    };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

/**
 * 增加积分
 */
async function addScores(openid, scores) {
  if (!scores || scores <= 0) {
    return { success: false, errMsg: '积分数量必须大于0' };
  }

  const res = await db.collection('users').where({ _openid: openid })
    .update({
      data: {
        scores: _.inc(scores),
        updatedAt: Date.now()
      }
    });

  // 查询最新积分
  const userRes = await db.collection('users').where({ _openid: openid }).get();
  const currentScores = userRes.data[0]?.scores || 0;

  return {
    success: true,
    data: {
      currentScores: currentScores
    }
  };
}

/**
 * 扣除积分（管理员操作）
 */
async function deductScores(openid, scores) {
  if (!scores || scores <= 0) {
    return { success: false, errMsg: '积分数量必须大于0' };
  }

  const userRes = await db.collection('users').where({ _openid: openid }).get();

  if (!userRes.data || userRes.data.length === 0) {
    return { success: false, errMsg: '用户不存在' };
  }

  const currentScores = userRes.data[0].scores || 0;

  if (currentScores < scores) {
    return { success: false, errMsg: '用户积分不足' };
  }

  await db.collection('users').where({ _openid: openid })
    .update({
      data: {
        scores: _.inc(-scores),
        updatedAt: Date.now()
      }
    });

  return {
    success: true,
    data: {
      currentScores: currentScores - scores
    }
  };
}