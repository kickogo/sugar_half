const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { order_id, order_no } = event

    // 模拟支付回调，直接标记为已支付
    // 实际项目中应验证签名等

    if (!order_id && !order_no) {
      return { success: false, error: '缺少订单信息' }
    }

    // 根据 order_id 或 order_no 查询订单
    let orderRes
    if (order_id) {
      orderRes = await db.collection('orders').doc(order_id).get()
    } else {
      orderRes = await db.collection('orders').where({ order_no }).get()
    }

    if (!orderRes.data || orderRes.data.length === 0) {
      return { success: false, error: '订单不存在' }
    }

    const order = orderRes.data[0]

    // 如果已经是已支付状态，直接返回成功（幂等性）
    if (order.status === 1) {
      return {
        success: true,
        data: { message: '订单已支付' }
      }
    }

    // 更新订单状态为已支付
    await db.collection('orders').doc(order._id).update({
      data: {
        status: 1,  // 已支付
        pay_time: new Date(),
        updated_at: new Date()
      }
    })

    return {
      success: true,
      data: {
        message: '支付成功',
        order_id: order._id,
        order_no: order.order_no
      }
    }

  } catch (err) {
    console.error({ action: 'order.payCallback', error: err.message, stack: err.stack })
    return { success: false, error: '服务器内部错误' }
  }
}