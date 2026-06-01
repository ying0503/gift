import { hashPassword, verifyPassword, generateToken } from './auth.js'
import { corsHeaders, handleOptions, json, error } from './utils.js'

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return handleOptions()

    const url = new URL(request.url)
    const path = url.pathname

    try {
      if (path === '/api/register' && request.method === 'POST') {
        return handleRegister(request, env)
      }
      if (path === '/api/login' && request.method === 'POST') {
        return handleLogin(request, env)
      }
      if (path === '/api/me' && request.method === 'GET') {
        return handleMe(request, env)
      }
      if (path === '/api/logout' && request.method === 'POST') {
        return handleLogout(request, env)
      }
      if (path === '/api/generate' && request.method === 'POST') {
        return handleGenerate(request, env)
      }
      if (path === '/api/generate/status' && request.method === 'GET') {
        return handleGenerateStatus(request, env)
      }
      if (path === '/api/albums' && request.method === 'GET') {
        return handleAlbums(request, env)
      }
      if (path === '/api/ping' && request.method === 'GET') {
        return json({ ok: true, hasMaiziaiKey: !!env.MAIZIAI_API_KEY })
      }
      return json({ error: 'Not found' }, 404)
    } catch (e) {
      return error(e.message || 'Internal error', 500)
    }
  },
}

async function handleRegister(request, env) {
  const { email, password } = await request.json()

  if (!email || !password) {
    return error('Email and password are required', 400)
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return error('Invalid email format', 400)
  }

  if (password.length < 6) {
    return error('Password must be at least 6 characters', 400)
  }

  const existing = await env.AUTH_KV.get(`user:${email}`)
  if (existing) {
    return error('Email already registered', 409)
  }

  const passwordHash = await hashPassword(password)
  const userId = crypto.randomUUID()

  const user = {
    id: userId,
    email,
    passwordHash,
    createdAt: Date.now(),
  }

  await env.AUTH_KV.put(`user:${email}`, JSON.stringify(user))

  const token = generateToken()
  await env.AUTH_KV.put(`token:${token}`, JSON.stringify({ userId, email, createdAt: Date.now() }), { expirationTtl: 86400 * 7 })

  return json({ success: true, token, user: { id: userId, email } })
}

async function handleLogin(request, env) {
  const { email, password } = await request.json()

  if (!email || !password) {
    return error('Email and password are required', 400)
  }

  const data = await env.AUTH_KV.get(`user:${email}`)
  if (!data) {
    return error('Invalid email or password', 401)
  }

  const user = JSON.parse(data)
  const valid = await verifyPassword(password, user.passwordHash)

  if (!valid) {
    return error('Invalid email or password', 401)
  }

  const token = generateToken()
  await env.AUTH_KV.put(`token:${token}`, JSON.stringify({ userId: user.id, email, createdAt: Date.now() }), { expirationTtl: 86400 * 7 })

  return json({ success: true, token, user: { id: user.id, email: user.email } })
}

async function handleMe(request, env) {
  const auth = request.headers.get('Authorization')
  if (!auth || !auth.startsWith('Bearer ')) {
    return error('Unauthorized', 401)
  }

  const token = auth.slice(7)
  const data = await env.AUTH_KV.get(`token:${token}`)
  if (!data) {
    return error('Invalid or expired token', 401)
  }

  const session = JSON.parse(data)
  return json({ user: { id: session.userId, email: session.email } })
}

async function handleLogout(request, env) {
  const auth = request.headers.get('Authorization')
  if (!auth || !auth.startsWith('Bearer ')) return json({ success: true })

  const token = auth.slice(7)
  await env.AUTH_KV.delete(`token:${token}`)
  return json({ success: true })
}

const WAN_API = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/image-generation/generation'

function buildPrompt(config, excel) {
  const rows = excel.slice(1)
  const total = rows.length
  const productList = rows.map((row, i) => {
    const name = row[1] || row[0] || ''
    const desc = row[2] ? String(row[2]).slice(0, 100) : ''
    return `${i + 1}. ${name}${desc ? ` - ${desc}` : ''}`
  }).join('\n')

  const bannerCount = Math.min(3, total)
  const gridCount = total - bannerCount

  return `设计一张完整的礼品画册，板式为"顶通+礼品列表"，色调：${config.color}。
顶部是通栏广告位区域（占画面约30%高度），展示前${bannerCount}个产品，生成对应的产品图片。
${gridCount > 0 ? `下方是产品列表网格区域（3列），展示剩余${gridCount}个产品，每个产品生成对应的产品图片。` : ''}
每个产品展示：产品图片 + 品名。
画面要精美有质感，适合商务送礼场景。
总共${total}个产品。
礼品列表：
${productList}`
}

async function handleGenerate(request, env) {
  const auth = request.headers.get('Authorization')
  if (!auth || !auth.startsWith('Bearer ')) return error('Unauthorized', 401)
  const token = auth.slice(7).trim()
  if (token.length < 10) return error('Invalid token format', 401)
  const raw = await env.AUTH_KV.get(`token:${token}`)
  if (!raw) return error('Invalid token', 401)
  const session = JSON.parse(raw)

  const { config, excel, images } = await request.json()
  if (!config || !excel) return error('Missing config or excel data', 400)

  const hasImages = images && images.length

  const prompt = config.prompt || buildPrompt(config, excel)

  const isMaiziai = config.model === 'maiziai-chatgpt-image-2' || config.model === 'gpt-image-2-official'

  const wanSizeMap = {
    'auto': '1024*1024',
    '1:1': '1024*1024',
    '16:9': '1920*1080',
    '9:16': '1080*1920',
    '4:3': '1024*768',
    '3:4': '768*1024',
  }
  const apiSize = wanSizeMap[config.size] || '1024*1024'

  if (isMaiziai) {
    const maiziaiKey = env.MAIZIAI_API_KEY
    if (!maiziaiKey) return error('MAIZIAI_API_KEY not configured', 500)

    const apiModel = config.model === 'maiziai-chatgpt-image-2' ? 'gpt-image-2' : config.model
    const body = JSON.stringify({
      model: apiModel,
      prompt,
      size: config.size === 'auto' ? undefined : config.size,
      image_size: config.image_size || '1K',
      images: hasImages ? images : undefined,
      n: 1,
    })
    const res = await fetch('https://www.maizitech.cn/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${maiziaiKey}`,
      },
      body,
    })
    const data = await res.json()
    if (!res.ok) return error(data.error?.message || 'MaiziAI API call failed', res.status)

    const maiziaiTaskId = data.data?.[0]?.task_id
    if (!maiziaiTaskId) return error('No task_id from MaiziAI', 500)

    const taskId = maiziaiTaskId
    await env.GIFT_KV.put(`task:${taskId}`, JSON.stringify({
      userId: session.userId, config, prompt,
      status: 'PENDING',
      createdAt: Date.now(),
      productCount: excel.length - 1,
      maiziaiTaskId,
    }), { expirationTtl: 86400 * 7 })

    return json({ taskId })
  }

  // WAN API
  const res = await fetch(WAN_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.DASHSCOPE_API_KEY}`,
      'X-DashScope-Async': 'enable',
    },
    body: JSON.stringify({
      model: config.model || 'wan2.7-image',
      input: {
        messages: [{ role: 'user', content: [{ text: prompt }] }],
      },
      parameters: { size: apiSize, n: 1, watermark: false },
    }),
  })
  const data = await res.json()
  if (!res.ok) return error(data.message || 'API call failed', res.status)

  const taskId = data.output?.task_id
  if (!taskId) return error('No task_id returned', 500)

  await env.GIFT_KV.put(`task:${taskId}`, JSON.stringify({
    userId: session.userId, config, prompt,
    status: 'PENDING',
    createdAt: Date.now(),
    productCount: excel.length - 1,
  }), { expirationTtl: 86400 * 7 })

  return json({ taskId })
}

async function handleGenerateStatus(request, env) {
  const taskId = new URL(request.url).searchParams.get('taskId')
  if (!taskId) return error('Missing taskId', 400)

  // Check KV first (for synchronous model)
  const taskData = await env.GIFT_KV.get(`task:${taskId}`)
  if (taskData) {
    const task = JSON.parse(taskData)
    if (task.status === 'SUCCEEDED') {
      return json({ taskStatus: 'SUCCEEDED', progress: 100, statusText: '生成完成', imageUrl: task.imageUrl })
    }
    if (task.status === 'FAILED') {
      return json({ taskStatus: 'FAILED', progress: -1, statusText: task.statusText || '生成失败', imageUrl: null })
    }
    if (task.status === 'PENDING' && task.maiziaiTaskId) {
      const maiziaiKey = env.MAIZIAI_API_KEY
      if (!maiziaiKey) return json({ taskStatus: 'PENDING', progress: 0, statusText: '等待生成...', imageUrl: null })

      const mRes = await fetch(`https://www.maizitech.cn/v1/tasks/${task.maiziaiTaskId}`, {
        headers: { Authorization: `Bearer ${maiziaiKey}` },
      })
      if (!mRes.ok) return json({ taskStatus: 'PENDING', progress: 0, statusText: '查询中...', imageUrl: null })

      const mData = await mRes.json()
      if (mData.status === 'completed') {
        const relativeUrl = mData.result_urls?.[0]
        const imageUrl = relativeUrl ? `https://www.maizitech.cn${relativeUrl}` : null
        if (imageUrl) {
          await env.GIFT_KV.put(`task:${taskId}`, JSON.stringify({ ...task, status: 'SUCCEEDED', imageUrl }), { expirationTtl: 86400 * 7 })
          const albumId = crypto.randomUUID().slice(0, 8)
          const album = { id: albumId, userId: task.userId, taskId, imageUrl, config: task.config, prompt: task.prompt, productCount: task.productCount, createdAt: task.createdAt }
          await env.GIFT_KV.put(`album:${albumId}`, JSON.stringify(album), { expirationTtl: 86400 * 30 })
          const listData = await env.GIFT_KV.get(`user_albums:${task.userId}`)
          const list = listData ? JSON.parse(listData) : []
          list.unshift(albumId)
          await env.GIFT_KV.put(`user_albums:${task.userId}`, JSON.stringify(list.slice(0, 50)), { expirationTtl: 86400 * 30 })
          return json({ taskStatus: 'SUCCEEDED', progress: 100, statusText: '生成完成', imageUrl })
        }
      } else if (mData.status === 'failed') {
        await env.GIFT_KV.put(`task:${taskId}`, JSON.stringify({ ...task, status: 'FAILED', statusText: mData.error_msg || '生成失败' }), { expirationTtl: 86400 * 7 })
        return json({ taskStatus: 'FAILED', progress: -1, statusText: mData.error_msg || '生成失败', imageUrl: null })
      }
      return json({ taskStatus: 'PENDING', progress: mData.progress || 0, statusText: '生成中...', imageUrl: null })
    }
  }

  // Fallback to WAN API query
  const res = await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
    headers: { Authorization: `Bearer ${env.DASHSCOPE_API_KEY}` },
  })
  const data = await res.json()
  if (!res.ok) return error(data.message || 'Query failed', res.status)

  const taskStatus = data.output?.task_status
  let progress = 0
  let imageUrl = null
  let statusText = '处理中...'

  if (taskStatus === 'PENDING') {
    progress = 10
    statusText = '任务已提交，排队中...'
  } else if (taskStatus === 'RUNNING') {
    progress = 40
    statusText = '正在生成图片...'
  } else if (taskStatus === 'SUCCEEDED') {
    progress = 100
    statusText = '生成完成'
    const choice = data.output?.choices?.[0]
    imageUrl = choice?.message?.content?.[0]?.image || choice?.message?.content?.[0]?.image_url || null

    if (imageUrl) {
      const taskData = await env.GIFT_KV.get(`task:${taskId}`)
      if (taskData) {
        const task = JSON.parse(taskData)
        const albumId = crypto.randomUUID().slice(0, 8)
        const album = {
          id: albumId,
          userId: task.userId,
          taskId,
          imageUrl,
          config: task.config,
          prompt: task.prompt,
          productCount: task.productCount,
          createdAt: task.createdAt,
        }
        await env.GIFT_KV.put(`album:${albumId}`, JSON.stringify(album), { expirationTtl: 86400 * 30 })
        const listData = await env.GIFT_KV.get(`user_albums:${task.userId}`)
        const list = listData ? JSON.parse(listData) : []
        list.unshift(albumId)
        await env.GIFT_KV.put(`user_albums:${task.userId}`, JSON.stringify(list.slice(0, 50)), { expirationTtl: 86400 * 30 })
      }
    }
  } else if (taskStatus === 'FAILED') {
    progress = -1
    statusText = data.output?.message || '生成失败'
  }

  return json({ taskStatus, progress, statusText, imageUrl })
}

async function handleAlbums(request, env) {
  const auth = request.headers.get('Authorization')
  if (!auth || !auth.startsWith('Bearer ')) return error('Unauthorized', 401)
  const token = auth.slice(7)
  const sessionData = await env.AUTH_KV.get(`token:${token}`)
  if (!sessionData) return error('Invalid token', 401)
  const session = JSON.parse(sessionData)
  const listData = await env.GIFT_KV.get(`user_albums:${session.userId}`)
  const ids = listData ? JSON.parse(listData) : []

  const albums = []
  for (const id of ids) {
    const data = await env.GIFT_KV.get(`album:${id}`)
    if (data) albums.push(JSON.parse(data))
  }
  return json({ albums })
}
