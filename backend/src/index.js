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
      if (path === '/api/digital-album' && request.method === 'GET') {
        return handleGetDigitalAlbum(request, env)
      }
      if (path === '/api/digital-album' && request.method === 'POST') {
        return handleSaveDigitalAlbum(request, env)
      }
      if (path === '/api/album' && request.method === 'GET') {
        return handleGetPublicAlbum(request, env)
      }
      if (path === '/api/album/publish' && request.method === 'POST') {
        return handlePublishAlbum(request, env)
      }
      if (path === '/api/ping' && request.method === 'GET') {
        return json({ ok: true, hasMaiziaiKey: !!env.MAIZIAI_API_KEY, hasAgnesKey: !!env.AGNES_API_KEY })
      }
      return json({ error: 'Not found' }, 404)
    } catch (e) {
      return error(e.message || 'Internal error', 500)
    }
  },
}

async function handleRegister(request, env) {
  const { email: rawEmail, password } = await request.json()
  const email = rawEmail.toLowerCase().trim()

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
  const { email: rawEmail, password } = await request.json()
  const email = rawEmail.toLowerCase().trim()

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

  const token = auth.slice(7).trim()
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

  const token = auth.slice(7).trim()
  await env.AUTH_KV.delete(`token:${token}`)
  return json({ success: true })
}

async function handleGenerate(request, env) {
  const auth = request.headers.get('Authorization')
  if (!auth || !auth.startsWith('Bearer ')) return error('Unauthorized', 401)
  const token = auth.slice(7).trim()
  if (token.length < 10) return error('Invalid token format', 401)
  const raw = await env.AUTH_KV.get(`token:${token}`)
  if (!raw) return error('Invalid token', 401)
  const session = JSON.parse(raw)

  const { config, images } = await request.json()
  if (!config) return error('Missing config', 400)

  const hasImages = images && images.length

  const prompt = config.prompt || ''

  const isMaiziai = config.model === 'maiziai-chatgpt-image-2'

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
      productCount: 0,
      maiziaiTaskId,
    }), { expirationTtl: 86400 * 7 })

    return json({ taskId })
  }

  // Agnes API (synchronous)
  const isAgnes = config.model === 'agnes-image-2.1-flash'
  if (isAgnes) {
    const agnesKey = env.AGNES_API_KEY
    if (!agnesKey) return error('AGNES_API_KEY not configured', 500)

    const agnesSizeMap = {
      'auto': '1024x1024',
      '1:1': '1024x1024',
      '16:9': '1920x1080',
      '9:16': '1080x1920',
      '4:3': '1024x768',
      '3:4': '768x1024',
    }
    const apiSize = agnesSizeMap[config.size] || '1024x1024'
    const prompt = config.prompt || ''

    const body = {
      model: 'agnes-image-2.1-flash',
      prompt,
      size: apiSize,
      n: 1,
    }
    if (hasImages) {
      body.extra_body = {
        image: images.slice(0, 1),
        response_format: 'url',
      }
    }

    const res = await fetch('https://apihub.agnes-ai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${agnesKey}`,
      },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) return error(data.error?.message || 'Agnes API call failed', res.status)

    const imageUrl = data.data?.[0]?.url
    if (!imageUrl) return error('No image URL from Agnes API', 500)

    const taskId = crypto.randomUUID()
    await env.GIFT_KV.put(`task:${taskId}`, JSON.stringify({
      userId: session.userId, config, prompt: prompt,
      status: 'SUCCEEDED',
      imageUrl,
      createdAt: Date.now(),
      productCount: 0,
    }), { expirationTtl: 86400 * 7 })

    const albumId = crypto.randomUUID().slice(0, 8)
    const album = {
      id: albumId,
      userId: session.userId,
      taskId,
      imageUrl,
      config,
      prompt,
      productCount: 0,
      createdAt: Date.now(),
    }
    await env.GIFT_KV.put(`album:${albumId}`, JSON.stringify(album), { expirationTtl: 86400 * 30 })
    const listData = await env.GIFT_KV.get(`user_albums:${session.userId}`)
    const list = listData ? JSON.parse(listData) : []
    list.unshift(albumId)
    await env.GIFT_KV.put(`user_albums:${session.userId}`, JSON.stringify(list.slice(0, 50)), { expirationTtl: 86400 * 30 })

    return json({ taskId })
  }

  return error('Unknown model: ' + config.model, 400)
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

  return json({ taskStatus: 'PENDING', progress: 0, statusText: '等待中...', imageUrl: null })
}

async function handleGetDigitalAlbum(request, env) {
  const auth = request.headers.get('Authorization')
  if (!auth || !auth.startsWith('Bearer ')) return error('Unauthorized', 401)
  const token = auth.slice(7)
  const sessionData = await env.AUTH_KV.get(`token:${token}`)
  if (!sessionData) return error('Invalid token', 401)
  const session = JSON.parse(sessionData)
  const data = await env.GIFT_KV.get(`digital_album:${session.userId}`)
  return json(data ? JSON.parse(data) : { categories: [], bannerUrl: null })
}

async function handleSaveDigitalAlbum(request, env) {
  const auth = request.headers.get('Authorization')
  if (!auth || !auth.startsWith('Bearer ')) return error('Unauthorized', 401)
  const token = auth.slice(7)
  const sessionData = await env.AUTH_KV.get(`token:${token}`)
  if (!sessionData) return error('Invalid token', 401)
  const session = JSON.parse(sessionData)
  const body = await request.json()
  if (!body || !Array.isArray(body.categories)) return error('Invalid data', 400)
  const existing = await env.GIFT_KV.get(`digital_album:${session.userId}`)
  const current = existing ? JSON.parse(existing) : {}
  await env.GIFT_KV.put(`digital_album:${session.userId}`, JSON.stringify({ ...current, categories: body.categories, bannerUrl: body.bannerUrl || current.bannerUrl || null }), { expirationTtl: 86400 * 30 })
  return json({ success: true })
}

async function handleGetPublicAlbum(request, env) {
  const data = await env.GIFT_KV.get('public_album_data')
  return json(data ? JSON.parse(data) : { categories: [], bannerUrl: null })
}

async function handlePublishAlbum(request, env) {
  const auth = request.headers.get('Authorization')
  if (!auth || !auth.startsWith('Bearer ')) return error('Unauthorized', 401)
  const token = auth.slice(7)
  const sessionData = await env.AUTH_KV.get(`token:${token}`)
  if (!sessionData) return error('Invalid token', 401)
  const session = JSON.parse(sessionData)
  const userData = await env.GIFT_KV.get(`digital_album:${session.userId}`)
  if (!userData) return error('No album data', 404)
  const parsed = JSON.parse(userData)
  await env.GIFT_KV.put('public_album_data', JSON.stringify(parsed), { expirationTtl: 86400 * 30 })
  return json({ success: true })
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
