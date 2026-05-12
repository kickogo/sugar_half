const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { order_id, user_id } = event

    if (!order_id) {
      return { success: false, error: '缺少必要参数' }
    }

    // 查询订单
    const orderRes = await db.collection('orders').doc(order_id).get()

    if (!orderRes.data) {
      return { success: false, error: '订单不存在' }
    }

    const order = orderRes.data

    // 校验订单状态（只有已支付的订单才能确认）
    if (order.status !== 1) {
      return { success: false, error: '订单状态不允许确认' }
    }

    // 更新订单状态为制作中
    await db.collection('orders').doc(order_id).update({
      data: {
        status: 2,  // 制作中
        updated_at: new Date()
      }
    })

    return {
      success: true,
      data: {
        message: '订单已确认，开始制作',
        order_id,
        status: 2
      }
    }

  } catch (err) {
    console.error({ action: 'order.confirm', error: err.message, stack: err.stack })
    return { success: false, error: '服务器内部错误' }
  }
}