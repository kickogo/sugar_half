# user.login 云函数实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 创建微信登录云函数，返回用户 openid + token + is_admin 标志

**Architecture:** 微信云函数，通过 wxContext.OPENID 获取用户身份，查询 users 集合判断是否商家，生成 JWT token 返回

**Tech Stack:** Node.js, wx-server-sdk, jsonwebtoken

---

## 文件结构

```
cloudfunctions/user/login/
├── index.js           # 云函数入口
└── package.json        # 依赖配置
```

---

## Task 1: 创建 user.login 云函数

**Files:**
- Create: `cloudfunctions/user/login/index.js`
- Create: `cloudfunctions/user/login/package.json`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "user-login",
  "version": "1.0.0",
  "description": "微信登录云函数",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.4.0"
  }
}
```

- [ ] **Step 2: 创建 index.js**

```javascript
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

// JWT 签名密钥（生产环境应从环境变量获取）
const JWT_SECRET = 'sugar-half-secret-key-2026'

/**
 * 生成 JWT token
 */
function generateToken(payload) {
  // 简化的 token 生成，不使用外部库
  // payload: { user_id, openid, is_admin }
  // 格式: base64(header).base64(payload).base64(signature)
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
    let isNewUser = false

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
      isNewUser = true
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
    cloud.logger.error({ action: 'user.login', error: err.message, stack: err.stack })
    return { success: false, error: '服务器内部错误' }
  }
}
```

- [ ] **Step 3: 提交代码**

```bash
cd /c/Users/91675/WeChatProjects/sugar_half
git add cloudfunctions/user/login/
git commit -m "feat: add user.login cloud function"
```

---

## 任务更新

执行完成后，更新 `docs/superpowers/plans/tasks.json` 中 task `1.1.1` 状态为 `completed`

---

## 验证方法

部署后可通过微信开发者工具或 curl 测试：
1. 调用云函数，传入空 event
2. 检查返回的 openid、token、is_admin 字段
3. 第二次调用同一用户，应返回相同的 user_id（不创建新用户）

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-10-user-login-plan.md`.**

**Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?