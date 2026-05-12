const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { id } = event

    if (!id) {
      return { success: false, error: '商品ID不能为空' }
    }

    // 查询商品详情
    const productRes = await db.collection('products').doc(id).get()

    if (!productRes.data) {
      return { success: false, error: '商品不存在' }
    }

    const product = productRes.data

    // 查询该商品的所有 SKU
    const skuRes = await db.collection('sku_items')
      .where({ product_id: id, status: 1 })
      .get()

    // 查询可选夹馅列表
    const fillsRes = await db.collection('fills')
      .where({ status: 1 })
      .orderBy('sort', 'asc')
      .get()

    // 格式化 SKU 数据
    const skus = (skuRes.data || []).map(sku => ({
      sku_id: sku._id,
      sku_key: sku.sku_key,
      sku_name: sku.sku_name,
      price: sku.price,
      stock: sku.stock,
      status: sku.status
    }))

    // 格式化夹馅数据
    const fills = (fillsRes.data || []).map(fill => ({
      id: fill._id,
      name: fill.name,
      price_mod: fill.price_mod
    }))

    // 返回商品详情
    return {
      success: true,
      data: {
        id: product._id,
        name: product.name,
        description: product.description || '',
        images: product.images || [],
        base_price: product.base_price,
        fills,
        skus
      }
    }

  } catch (err) {
    console.error({ action: 'product.getDetail', error: err.message, stack: err.stack })
    return { success: false, error: '服务器内部错误' }
  }
}