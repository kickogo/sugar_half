const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { user_id, page = 1, page_size = 20 } = event

    if (!user_id) {
      return { success: false, error: '用户未登录' }
    }

    const skip = (parseInt(page) - 1) * parseInt(page_size)

    // 查询用户的订单
    const orderRes = await db.collection('orders')
      .where({ user_id })
      .orderBy('created_at', 'desc')
      .skip(skip)
      .limit(parseInt(page_size))
      .get()

    // 格式化订单数据
    const list = (orderRes.data || []).map(order => ({
      order_id: order._id,
      order_no: order.order_no,
      status: order.status,
      total_amount: order.total_amount,
      pay_amount: order.pay_amount,
      reservation_date: order.reservation_date,
      reservation_time: order.reservation_time,
      created_at: order.created_at
    }))

    return {
      success: true,
      data: {
        list,
        total: orderRes.data.length,
        page: parseInt(page),
        page_size: parseInt(page_size)
      }
    }

  } catch (err) {
    console.error({ action: 'order.getList', error: err.message, stack: err.stack })
    return { success: false, error: '服务器内部错误' }
  }
}