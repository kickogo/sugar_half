const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

// 分类数据
const categories = [
  { name: '生日蛋糕', sort: 1, icon: '', status: 1 },
  { name: '下午茶', sort: 2, icon: '', status: 1 }
]

// 夹馅数据
const fills = [
  { name: '布丁', price_mod: 500, sort: 1, status: 1 },
  { name: '香芋/芋泥', price_mod: 800, sort: 2, status: 1 },
  { name: '麻薯', price_mod: 600, sort: 3, status: 1 },
  { name: '黑糖珍珠', price_mod: 800, sort: 4, status: 1 },
  { name: '巧克力脆麦片', price_mod: 1000, sort: 5, status: 1 },
  { name: '水果（罐装）', price_mod: 1200, sort: 6, status: 1 },
  { name: '草莓果酱', price_mod: 600, sort: 7, status: 1 }
]

// 商品数据
const products = [
  {
    name: '草莓慕斯',
    category_index: 0,
    description: '经典草莓慕斯蛋糕，选用新鲜草莓制作，口感细腻绵密，酸甜可口。适合生日派对、家庭聚会等场合。',
    images: [
      'https://img.yzcdn.cn/vant/cat.jpeg',
      'https://img.yzcdn.cn/vant/cat.jpeg'
    ],
    base_price: 26800,
    tags: ['爆款', '新品']
  },
  {
    name: '巧克力浓郁',
    category_index: 0,
    description: '浓郁巧克力风味蛋糕，选用比利时巧克力，口感醇厚，甜而不腻。适合巧克力爱好者。',
    images: [
      'https://img.yzcdn.cn/vant/cat.jpeg'
    ],
    base_price: 29800,
    tags: ['经典']
  }
]

// 尺寸和奶油配置
const sizes = ['4寸', '6寸', '8寸', '10寸']
const creams = ['动物', '植脂']

// 奶油加价（分）
const creamPriceMod = {
  '动物': 0,
  '植脂': -2000
}

// 尺寸加价（分）
const sizePriceMod = {
  '4寸': 0,
  '6寸': 6000,
  '8寸': 10000,
  '10寸': 16000
}

/**
 * 生成 SKU 组合
 */
function generateSkus(productId, basePrice, fillsList) {
  const skus = []

  for (const size of sizes) {
    for (const cream of creams) {
      // 无夹馅 SKU
      const price = basePrice + sizePriceMod[size] + creamPriceMod[cream]
      skus.push({
        product_id: productId,
        sku_key: `size_${size}_fill_无_cream_${cream}`,
        sku_name: `${size} | 无夹馅 | ${cream}奶油`,
        size,
        fills: ['无'],
        cream,
        price,
        stock: 10,
        status: 1
      })

      // 单夹馅 SKU
      for (const fill of fillsList) {
        skus.push({
          product_id: productId,
          sku_key: `size_${size}_fill_${fill.name}_cream_${cream}`,
          sku_name: `${size} | ${fill.name} | ${cream}奶油`,
          size,
          fills: [fill.name],
          cream,
          price: price + fill.price_mod,
          stock: 10,
          status: 1
        })
      }

      // 双夹馅 SKU
      for (let i = 0; i < fillsList.length; i++) {
        for (let j = i + 1; j < fillsList.length; j++) {
          const fill1 = fillsList[i]
          const fill2 = fillsList[j]
          skus.push({
            product_id: productId,
            sku_key: `size_${size}_fill_${fill1.name}-${fill2.name}_cream_${cream}`,
            sku_name: `${size} | ${fill1.name}+${fill2.name} | ${cream}奶油`,
            size,
            fills: [fill1.name, fill2.name].sort(),
            cream,
            price: price + fill1.price_mod + fill2.price_mod,
            stock: 10,
            status: 1
          })
        }
      }
    }
  }

  return skus
}

/**
 * 批量插入
 */
async function batchInsert(collectionName, dataList) {
  if (!dataList || dataList.length === 0) return

  // 每批最多 20 条（微信云开发限制）
  const batchSize = 20
  const batches = []

  for (let i = 0; i < dataList.length; i += batchSize) {
    batches.push(dataList.slice(i, i + batchSize))
  }

  // 并行执行每批插入
  await Promise.all(batches.map(batch =>
    Promise.all(batch.map(data =>
      db.collection(collectionName).add({ data: { ...data, created_at: new Date() } })
    ))
  ))
}

exports.main = async (event, context) => {
  try {
    // 检查分类是否已存在
    const catExist = await db.collection('categories').count()
    if (catExist.total > 0) {
      return { success: false, error: '数据已初始化，请勿重复运行' }
    }

    // 批量插入分类
    await batchInsert('categories', categories)

    // 批量插入夹馅
    await batchInsert('fills', fills)

    // 获取分类 ID
    const catsData = await db.collection('categories').get()
    const birthdayCakeId = catsData.data[0]._id
    const afternoonTeaId = catsData.data[1]._id

    // 准备商品数据
    const productsData = products.map(p => ({
      category_id: p.category_index === 0 ? birthdayCakeId : afternoonTeaId,
      name: p.name,
      description: p.description,
      images: p.images,
      base_price: p.base_price,
      tags: p.tags,
      status: 1
    }))

    // 批量插入商品
    await batchInsert('products', productsData)

    // 获取商品 ID
    const prodsData = await db.collection('products').get()
    const productIds = prodsData.data.map(p => p._id)

    // 生成并批量插入 SKU
    const allSkus = []
    for (let i = 0; i < products.length; i++) {
      const productSkus = generateSkus(productIds[i], products[i].base_price, fills)
      allSkus.push(...productSkus)
    }
    await batchInsert('sku_items', allSkus)

    return {
      success: true,
      data: {
        categories: `${categories.length} 个分类`,
        fills: `${fills.length} 个夹馅`,
        products: `${products.length} 个商品`,
        skus: `${allSkus.length} 个 SKU`
      }
    }

  } catch (err) {
    console.error({ action: 'initData', error: err.message, stack: err.stack })
    return { success: false, error: err.message }
  }
}