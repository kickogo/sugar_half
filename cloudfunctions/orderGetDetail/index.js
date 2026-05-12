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
      return { success: false, error: '无权查看此订单' }
    }

    // 查询订单明细
    const itemsRes = await db.collection('order_items')
      .where({ order_id })
      .get()

    const items = (itemsRes.data || []).map(item => ({
      product_name: item.product_name,
      sku_name: item.sku_name,
      price: item.price,
      quantity: item.quantity,
      subtotal: item.price * item.quantity
    }))

    return {
      success: true,
      data: {
        order_id: order._id,
        order_no: order.order_no,
        status: order.status,
        total_amount: order.total_amount,
        pay_amount: order.pay_amount,
        delivery_type: order.delivery_type,
        reservation_date: order.reservation_date,
        reservation_time: order.reservation_time,
        remark: order.remark,
        pay_time: order.pay_time,
        created_at: order.created_at,
        items
      }
    }

  } catch (err) {
    console.error({ action: 'order.getDetail', error: err.message, stack: err.stack })
    return { success: false, error: '服务器内部错误' }
  }
}