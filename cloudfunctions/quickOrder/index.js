// 云函数入口文件
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

/**
 * 订单结算核心逻辑
 * @param {object} event - 前端传入参数
 *   - cartItems: 购物车商品列表 [{goodsId, spec, quantity}]
 *   - address: 收货地址信息
 */
exports.main = async (event, context) => {
  console.log('[云函数] [quickOrder] 调用参数:', JSON.stringify(event));

  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    if (!openid) {
      return { success: false, errMsg: '无法获取用户身份' };
    }

    const { cartItems, address } = event;

    if (!cartItems || cartItems.length === 0) {
      return { success: false, errMsg: '购物车为空' };
    }

    // 1. 服务端重新计算价格（不信任前端传来的总价）
    const { items, totalPrice } = await recalculatePrice(openid, cartItems);

    if (items.length === 0) {
      return { success: false, errMsg: '无可购买的商品（可能已下架）' };
    }

    // 2. 生成订单
    const orderId = await createOrder(openid, items, totalPrice, address);

    // 3. 更新商品购买次数
    await updateBuyCount(items);

    // 4. 清除已购买的购物车项
    await cleanCart(openid, cartItems);

    return {
      success: true,
      data: {
        orderId: orderId,
        items: items,
        totalPrice: totalPrice,
        message: '订单创建成功'
      }
    };
  } catch (err) {
    console.error('[云函数] [quickOrder] 失败:', err);
    return { success: false, errMsg: err.message || '服务器错误' };
  }
};

/**
 * 服务端重新计算价格
 * 从数据库拉取最新价格，不信任前端数据
 */
async function recalculatePrice(openid, cartItems) {
  const validItems = [];
  let totalPrice = 0;

  for (const cartItem of cartItems) {
    const { goodsId, spec, quantity } = cartItem;

    // 查询商品最新信息
    const goodsRes = await db.collection('goods').doc(goodsId).get();

    if (!goodsRes.data) {
      console.warn(`[quickOrder] 商品已下架或不存在: ${goodsId}`);
      continue;
    }

    const goods = goodsRes.data;

    // 检查商品状态
    if (goods.status !== 1) {
      console.warn(`[quickOrder] 商品已下架: ${goods.name}`);
      continue;
    }

    const itemTotal = goods.price * quantity;
    totalPrice += itemTotal;

    validItems.push({
      goodsId: goodsId,
      name: goods.name,
      spec: spec,
      unitPrice: goods.price,
      quantity: quantity,
      imageUrl: goods.imageUrl
    });
  }

  return { items: validItems, totalPrice };
}

/**
 * 创建订单
 */
async function createOrder(openid, items, totalPrice, address) {
  const order = {
    _openid: openid,
    items: items,
    totalPrice: totalPrice,
    address: address,
    status: 'PENDING_PAY',
    createdAt: Date.now(),
    paidAt: null
  };

  const res = await db.collection('orders').add({ data: order });
  return res._id;
}

/**
 * 清除已购买的购物车项
 */
async function cleanCart(openid, cartItems) {
  const goodsIds = cartItems.map(item => item.goodsId);

  await db.collection('cart').where({
    _openid: openid,
    goodsId: _.in(goodsIds)
  }).remove();
}

/**
 * 更新商品购买次数
 */
async function updateBuyCount(items) {
  const promises = items.map(item => {
    return db.collection('goods').doc(item.goodsId).update({
      data: {
        buyCount: _.inc(item.quantity)
      }
    });
  });
  await Promise.all(promises);
}

/**
 * 模拟支付回调（实际项目需接入微信支付）
 */
async function mockPaymentCallback(orderId) {
  await db.collection('orders').doc(orderId).update({
    data: {
      status: 'PAID',
      paidAt: Date.now()
    }
  });
}