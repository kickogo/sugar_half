const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { user_id, status, page = 1, page_size = 20 } = event

    if (!user_id) {
      return { success: false, error: '用户未登录' }
    }

    // 校验商家身份
    const userRes = await db.collection('users').doc(user_id).get()
    if (!userRes.data || !userRes.data.is_admin) {
      return { success: false, error: '无权访问' }
    }

    const skip = (parseInt(page) - 1) * parseInt(page_size)

    // 构建查询条件
    const where = {}
    if (status !== undefined && status !== null && status !== '') {
      where.status = parseInt(status)
    }

    // 查询所有订单（不限用户）
    let query = db.collection('orders').where(where)

    const orderRes = await query
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
      data: list
    }

  } catch (err) {
    console.error({ action: 'admin.getOrders', error: err.message, stack: err.stack })
    return { success: false, error: '服务器内部错误' }
  }
}