const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

// JWT 签名密钥（生产环境应从环境变量获取）
const JWT_SECRET = 'sugar-half-secret-key-2026'

/**
 * 生成 JWT token
 */
function generateToken(payload) {
  const header = { alg: 'HS256', typ: 'JWT' }
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64')
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64')
  const sign = require('crypto')
    .createHmac('sha256', JWT_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64')
  return `${headerB64}.${payloadB64}.${sign}`
}

exports.main = async (event, context) => {
  try {
    const { phone } = event

    if (!phone) {
      return { success: false, error: '手机号不能为空' }
    }

    // 简单手机号格式校验（11位数字）
    if (!/^1\d{10}$/.test(phone)) {
      return { success: false, error: '手机号格式不正确' }
    }

    // 查询商家账号（根据手机号查找 is_admin=true 的用户）
    const userRes = await db.collection('users').where({ phone, is_admin: true }).get()

    let user = null

    if (userRes.data && userRes.data.length > 0) {
      // 商家已存在
      user = userRes.data[0]
    } else {
      // 商家不存在，创建商家账号
      const addRes = await db.collection('users').add({
        data: {
          openid: '',
          nickname: `商家${phone.slice(-4)}`,
          avatar: '',
          phone,
          is_admin: true,
          created_at: new Date(),
          updated_at: new Date()
        }
      })
      user = {
        _id: addRes._id,
        phone,
        is_admin: true
      }
    }

    // 生成 token
    const token = generateToken({
      user_id: user._id,
      openid: user.openid || '',
      is_admin: true
    })

    // 返回商家信息
    return {
      success: true,
      data: {
        user_id: user._id,
        phone: user.phone,
        is_admin: true,
        token
      }
    }

  } catch (err) {
    console.error({ action: 'user.adminLogin', error: err.message, stack: err.stack })
    return { success: false, error: '服务器内部错误' }
  }
}