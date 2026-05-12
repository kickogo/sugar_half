const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { category_id, page = 1, page_size = 20 } = event

    // 构建查询条件
    const where = { status: 1 }
    if (category_id) {
      where.category_id = category_id
    }

    // 计算跳过数量
    const skip = (page - 1) * page_size

    // 查询商品列表
    const res = await db.collection('products')
      .where(where)
      .orderBy('created_at', 'desc')
      .skip(skip)
      .limit(page_size)
      .get()

    // 格式化返回数据
    const list = (res.data || []).map(product => ({
      id: product._id,
      name: product.name,
      image: (product.images && product.images.length > 0) ? product.images[0] : '',
      price: product.base_price,
      tags: product.tags || []
    }))

    return {
      success: true,
      data: list
    }

  } catch (err) {
    console.error({ action: 'product.getList', error: err.message, stack: err.stack })
    return { success: false, error: '服务器内部错误' }
  }
}