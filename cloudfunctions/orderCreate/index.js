const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

/**
 * 生成订单号
 * 格式: ORD + yyyyMMddHHmmss + 6位随机数
 */
function generateOrderNo() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hour = String(now.getHours()).padStart(2, '0')
  const minute = String(now.getMinutes()).padStart(2, '0')
  const second = String(now.getSeconds()).padStart(2, '0')

  const dateStr = `${year}${month}${day}${hour}${minute}${second}`
  const random = Math.floor(Math.random() * 900000) + 100000

  return `ORD${dateStr}${random}`
}

exports.main = async (event, context) => {
  try {
    const { user_id, items, reservation_date, reservation_time, remark } = event

    // 参数校验
    if (!user_id) {
      return { success: false, error: '用户未登录' }
    }

    if (!items || items.length === 0) {
      return { success: false, error: '订单商品不能为空' }
    }

    if (!reservation_date || !reservation_time) {
      return { success: false, error: '请选择取货时间' }
    }

    // 计算订单总金额并校验 SKU
    let totalAmount = 0
    const orderItems = []

    for (const item of items) {
      const { sku_id, quantity } = item

      // 查询 SKU 信息
      const skuRes = await db.collection('sku_items').doc(sku_id).get()

      if (!skuRes.data) {
        return { success: false, error: `商品不存在: ${sku_id}` }
      }

      const sku = skuRes.data

      // 检查库存
      if (sku.stock < quantity || sku.status !== 1) {
        return { success: false, error: `库存不足: ${sku.sku_name}` }
      }

      // 查询商品信息用于快照
      const productRes = await db.collection('products').doc(sku.product_id).get()
      const product = productRes.data || {}

      totalAmount += sku.price * quantity

      orderItems.push({
        product_id: sku.product_id,
        product_name: product.name || '',
        sku_id: sku._id,
        sku_name: sku.sku_name,
        price: sku.price,
        quantity
      })
    }

    // 生成订单号
    const orderNo = generateOrderNo()

    // 创建订单
    const orderRes = await db.collection('orders').add({
      data: {
        order_no: orderNo,
        user_id,
        status: 0,  // 待付款
        total_amount: totalAmount,
        pay_amount: totalAmount,
        delivery_type: 1,  // 到店自提
        reservation_date,
        reservation_time,
        remark: remark || '',
        created_at: new Date(),
        updated_at: new Date()
      }
    })

    // 创建订单明细
    for (const item of orderItems) {
      await db.collection('order_items').add({
        data: {
          order_id: orderRes._id,
          ...item
        }
      })
    }

    return {
      success: true,
      data: {
        order_id: orderRes._id,
        order_no: orderNo,
        total_amount: totalAmount
      }
    }

  } catch (err) {
    console.error({ action: 'order.create', error: err.message, stack: err.stack })
    return { success: false, error: '服务器内部错误' }
  }
}