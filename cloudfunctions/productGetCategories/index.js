const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    // 查询启用的分类，按 sort 字段升序排列
    const res = await db.collection('categories')
      .where({ status: 1 })
      .orderBy('sort', 'asc')
      .get()

    // 格式化返回数据
    const categories = (res.data || []).map(cat => ({
      id: cat._id,
      name: cat.name,
      sort: cat.sort,
      icon: cat.icon || ''
    }))

    return {
      success: true,
      data: categories
    }

  } catch (err) {
    console.error({ action: 'product.getCategories', error: err.message, stack: err.stack })
    return { success: false, error: '服务器内部错误' }
  }
}