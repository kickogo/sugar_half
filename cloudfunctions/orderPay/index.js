const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { order_id, user_id } = event

    if (!order_id || !user_id) {
      return { success: false, error: '缺少必要参数' }
    }

    // 查询订单
    const orderRes = await db.collection('orders').doc(order_id).get()

    if (!orderRes.data) {
      return { success: false, error: '订单不存在' }
    }

    const order = orderRes.data

    // 校验订单归属
    if (order.user_id !== user_id) {
      return { success: false, error: '无权操作此订单' }
    }

    // 校验订单状态
    if (order.status !== 0) {
      return { success: false, error: '订单状态不允许支付' }
    }

    // 返回模拟支付参数
    return {
      success: true,
      data: {
        mock: true,
        order_id,
        order_no: order.order_no,
        total_amount: order.pay_amount
      }
    }

  } catch (err) {
    console.error({ action: 'order.pay', error: err.message, stack: err.stack })
    return { success: false, error: '服务器内部错误' }
  }
}