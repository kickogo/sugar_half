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

/**
 * 验证 token
 */
function verifyToken(token) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [headerB64, payloadB64, sign] = parts
    const expectedSign = require('crypto')
      .createHmac('sha256', JWT_SECRET)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64')
    if (sign !== expectedSign) return null
    return JSON.parse(Buffer.from(payloadB64, 'base64').toString())
  } catch (e) {
    return null
  }
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()

  try {
    const openid = wxContext.OPENID

    if (!openid) {
      return { success: false, error: '无法获取 openid' }
    }

    // 查询用户是否已存在
    const userRes = await db.collection('users').where({ openid }).get()

    let user = null

    if (userRes.data && userRes.data.length > 0) {
      // 用户已存在
      user = userRes.data[0]
    } else {
      // 创建新用户
      const nickname = `用户${Math.floor(Math.random() * 9000) + 1000}`
      const addRes = await db.collection('users').add({
        data: {
          openid,
          nickname,
          avatar: '',
          phone: '',
          is_admin: false,
          created_at: new Date(),
          updated_at: new Date()
        }
      })
      user = {
        _id: addRes._id,
        openid,
        nickname,
        is_admin: false
      }
    }

    // 生成 token
    const token = generateToken({
      user_id: user._id,
      openid: user.openid,
      is_admin: user.is_admin || false
    })

    // 返回用户信息
    return {
      success: true,
      data: {
        user_id: user._id,
        openid: user.openid,
        nickname: user.nickname,
        is_admin: user.is_admin || false,
        token
      }
    }

  } catch (err) {
    console.error({ action: 'user.login', error: err.message, stack: err.stack })
    return { success: false, error: '服务器内部错误' }
  }
}