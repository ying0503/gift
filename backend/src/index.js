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
      if (path === '/api/generate/batch' && request.method === 'POST') {
        return handleGenerateBatch(request, env)
      }
      if (path === '/api/generate/status' && request.method === 'GET') {
        return handleGenerateStatus(request, env)
      }
      if (path === '/api/generate/batch-status' && request.method === 'GET') {
        return handleGenerateBatchStatus(request, env)
      }
      if (path === '/api/generate/prompts' && request.method === 'POST') {
        return handleGeneratePrompts(request, env)
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
        return json({ ok: true, hasMaiziaiKey: !!env.MAIZIAI_API_KEY, hasAgnesKey: !!env.AGNES_API_KEY, hasGlmKey: !!env.GLM_API_KEY })
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
    const apiSize = agnesSizeMap[config.size] || (config.size?.includes('x') ? config.size : '1024x1024')
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
      banner: config.banner || false,
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

async function handleGenerateBatch(request, env) {
  const auth = request.headers.get('Authorization')
  if (!auth || !auth.startsWith('Bearer ')) return error('Unauthorized', 401)
  const token = auth.slice(7).trim()
  if (token.length < 10) return error('Invalid token format', 401)
  const raw = await env.AUTH_KV.get(`token:${token}`)
  if (!raw) return error('Invalid token', 401)
  const session = JSON.parse(raw)

  const { config, images, prompts } = await request.json()
  if (!config || !prompts || !prompts.length) return error('Missing config or prompts', 400)

  const hasImages = images && images.length
  const batchId = crypto.randomUUID().slice(0, 8)

  const isAgnes = config.model === 'agnes-image-2.1-flash'

  if (isAgnes) {
    const agnesKey = env.AGNES_API_KEY
    if (!agnesKey) return error('AGNES_API_KEY not configured', 500)
    const agnesSizeMap = { 'auto': '1024x1024', '1:1': '1024x1024', '16:9': '1920x1080', '9:16': '1080x1920', '4:3': '1024x768', '3:4': '768x1024' }
    const apiSize = agnesSizeMap[config.size] || (config.size?.includes('x') ? config.size : '1024x1024')

    const imageUrls = []
    for (const prompt of prompts) {
      const body = JSON.stringify({ model: 'agnes-image-2.1-flash', prompt, size: apiSize, n: 1 })
      const res = await fetch('https://apihub.agnes-ai.com/v1/images/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${agnesKey}` },
        body,
      })
      const data = await res.json()
      if (!res.ok) return error(data.error?.message || 'Agnes API call failed', res.status)
      const url = data.data?.[0]?.url
      if (url) imageUrls.push(url)
    }

    if (imageUrls.length === 0) return error('No images generated', 500)

    const albumId = crypto.randomUUID().slice(0, 8)
    const album = {
      id: albumId, userId: session.userId, batchId, imageUrls, imageUrl: imageUrls[0],
      config, prompts, prompt: prompts[0], productCount: 0, createdAt: Date.now(),
    }
    await env.GIFT_KV.put(`album:${albumId}`, JSON.stringify(album), { expirationTtl: 86400 * 30 })
    const listData = await env.GIFT_KV.get(`user_albums:${session.userId}`)
    const list = listData ? JSON.parse(listData) : []
    list.unshift(albumId)
    await env.GIFT_KV.put(`user_albums:${session.userId}`, JSON.stringify(list.slice(0, 50)), { expirationTtl: 86400 * 30 })
    await env.GIFT_KV.put(`batch:${batchId}`, JSON.stringify({ taskIds: [], userId: session.userId, config, prompts, createdAt: Date.now(), done: true }), { expirationTtl: 86400 * 7 })
    return json({ batchId })
  }

  const maiziaiKey = env.MAIZIAI_API_KEY
  if (!maiziaiKey) return error('MAIZIAI_API_KEY not configured', 500)

  const taskIds = []
  for (const prompt of prompts) {
    const body = JSON.stringify({
      model: 'gpt-image-2',
      prompt,
      size: config.size === 'auto' ? undefined : config.size,
      image_size: config.image_size || '1K',
      images: hasImages ? images : undefined,
      n: 1,
    })
    const res = await fetch('https://www.maizitech.cn/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${maiziaiKey}` },
      body,
    })
    const data = await res.json()
    if (!res.ok) return error(data.error?.message || 'MaiziAI API call failed', res.status)
    const maiziaiTaskId = data.data?.[0]?.task_id
    if (!maiziaiTaskId) return error('No task_id from MaiziAI', 500)

    const taskId = maiziaiTaskId
    taskIds.push(taskId)
    await env.GIFT_KV.put(`task:${taskId}`, JSON.stringify({
      userId: session.userId, config, prompt,
      status: 'PENDING',
      createdAt: Date.now(),
      productCount: 0,
      maiziaiTaskId,
    }), { expirationTtl: 86400 * 7 })
  }

  await env.GIFT_KV.put(`batch:${batchId}`, JSON.stringify({
    taskIds,
    userId: session.userId,
    config,
    prompts,
    createdAt: Date.now(),
  }), { expirationTtl: 86400 * 7 })

  return json({ batchId })
}

async function handleGenerateBatchStatus(request, env) {
  const batchId = new URL(request.url).searchParams.get('batchId')
  if (!batchId) return error('Missing batchId', 400)

  const batchData = await env.GIFT_KV.get(`batch:${batchId}`)
  if (!batchData) return error('Batch not found', 404)
  const batch = JSON.parse(batchData)

  if (batch.done) {
    const existingListData = await env.GIFT_KV.get(`user_albums:${batch.userId}`)
    const existingIds = existingListData ? JSON.parse(existingListData) : []
    for (const id of existingIds) {
      const data = await env.GIFT_KV.get(`album:${id}`)
      if (data) {
        const a = JSON.parse(data)
        if (a.batchId === batchId) {
          return json({ status: 'SUCCEEDED', progress: 100, statusText: '生成完成', imageUrl: a.imageUrl, imageUrls: a.imageUrls })
        }
      }
    }
  }

  const maiziaiKey = env.MAIZIAI_API_KEY
  if (!maiziaiKey) return json({ status: 'PENDING', progress: 0, statusText: '等待生成...' })
  const imageUrls = []
  let allDone = true
  let failed = false

  for (const taskId of batch.taskIds) {
    const taskData = await env.GIFT_KV.get(`task:${taskId}`)
    if (!taskData) { allDone = false; continue }
    const task = JSON.parse(taskData)
    if (task.status === 'SUCCEEDED') {
      if (task.imageUrl) imageUrls.push(task.imageUrl)
      continue
    }
    if (task.status === 'FAILED') { failed = true; continue }

    const mRes = await fetch(`https://www.maizitech.cn/v1/tasks/${task.maiziaiTaskId}`, {
      headers: { Authorization: `Bearer ${maiziaiKey}` },
    })
    if (!mRes.ok) { allDone = false; continue }
    const mData = await mRes.json()

    if (mData.status === 'completed') {
      const resultUrl = mData.result_urls?.[0]
      const imageUrl = resultUrl ? (resultUrl.startsWith('http') ? resultUrl : `https://www.maizitech.cn${resultUrl}`) : null
      if (imageUrl) {
        imageUrls.push(imageUrl)
        await env.GIFT_KV.put(`task:${taskId}`, JSON.stringify({ ...task, status: 'SUCCEEDED', imageUrl }), { expirationTtl: 86400 * 7 })
      } else {
        allDone = false
      }
    } else if (mData.status === 'failed') {
      failed = true
      await env.GIFT_KV.put(`task:${taskId}`, JSON.stringify({ ...task, status: 'FAILED', statusText: mData.error_msg || '生成失败' }), { expirationTtl: 86400 * 7 })
    } else {
      allDone = false
    }
  }

  if (failed) {
    return json({ status: 'FAILED', progress: -1, statusText: '部分生成失败' })
  }

  if (batch.done) {
    const existingListData = await env.GIFT_KV.get(`user_albums:${batch.userId}`)
    const existingIds = existingListData ? JSON.parse(existingListData) : []
    for (const id of existingIds) {
      const data = await env.GIFT_KV.get(`album:${id}`)
      if (data) {
        const a = JSON.parse(data)
        if (a.batchId === batchId) {
          return json({ status: 'SUCCEEDED', progress: 100, statusText: '生成完成', imageUrl: a.imageUrl, imageUrls: a.imageUrls })
        }
      }
    }
  }

  if (allDone && imageUrls.length === batch.taskIds.length) {
    const albumId = crypto.randomUUID().slice(0, 8)
    const album = {
      id: albumId,
      userId: batch.userId,
      batchId,
      imageUrls,
      imageUrl: imageUrls[0],
      config: batch.config,
      prompts: batch.prompts,
      prompt: batch.prompts[0],
      productCount: 0,
      createdAt: batch.createdAt,
    }
    await env.GIFT_KV.put(`album:${albumId}`, JSON.stringify(album), { expirationTtl: 86400 * 30 })
    const listData = await env.GIFT_KV.get(`user_albums:${batch.userId}`)
    const list = listData ? JSON.parse(listData) : []
    list.unshift(albumId)
    await env.GIFT_KV.put(`user_albums:${batch.userId}`, JSON.stringify(list.slice(0, 50)), { expirationTtl: 86400 * 30 })
    await env.GIFT_KV.put(`batch:${batchId}`, JSON.stringify({ ...batch, done: true }), { expirationTtl: 86400 * 7 })

    return json({ status: 'SUCCEEDED', progress: 100, statusText: '生成完成', imageUrl: imageUrls[0], imageUrls })
  }

  const doneCount = imageUrls.length
  return json({ status: 'PENDING', progress: Math.round(doneCount / batch.taskIds.length * 90), statusText: `生成中 ${doneCount}/${batch.taskIds.length}...` })
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
        const resultUrl = mData.result_urls?.[0]
        const imageUrl = resultUrl ? (resultUrl.startsWith('http') ? resultUrl : `https://www.maizitech.cn${resultUrl}`) : null
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
    if (data) {
      const album = JSON.parse(data)
      if (album.batchId) {
        if (album.imageUrl && album.imageUrl.startsWith('https://www.maizitech.cnhttps://')) album.imageUrl = album.imageUrl.replace('https://www.maizitech.cn', '')
        if (album.imageUrls) album.imageUrls = album.imageUrls.map(u => u.startsWith('https://www.maizitech.cnhttps://') ? u.replace('https://www.maizitech.cn', '') : u)
        albums.push(album)
      }
    }
  }
  return json({ albums })
}

async function handleGeneratePrompts(request, env) {
  const auth = request.headers.get('Authorization')
  if (!auth || !auth.startsWith('Bearer ')) return error('Unauthorized', 401)
  const token = auth.slice(7)
  const sessionData = await env.AUTH_KV.get(`token:${token}`)
  if (!sessionData) return error('Invalid token', 401)

  const { festival, count, refImage } = await request.json()
  if (!festival || !count) return error('Missing festival or count', 400)

  const glmKey = env.GLM_API_KEY
  if (!glmKey) return error('GLM_API_KEY not configured', 500)

  const systemPrompt = `你是一个礼品营销AI图像提示词生成器。根据用户提供的参考图片和指定的节日，生成中文AI图像生成提示词。每个提示词用于文生图模型（如MaiziAI GPT-image-2），描述礼品展示场景。参考图片中的产品作为商品主体，结合节日元素设计。要求：简洁直接，突出礼盒展示，带有节日氛围，适合电商营销。每句100字以内。`

  const userPrompt = `请基于参考图片中的产品，为"${festival}"节日生成${count}个中文图像生成提示词，用于礼品礼盒宣传图。每句一个独立的提示词，直接输出，不需要编号。`

  const userContent = refImage
    ? [{ type: 'image_url', image_url: { url: refImage } }, { type: 'text', text: userPrompt }]
    : [{ type: 'text', text: userPrompt }]

  const res = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${glmKey}` },
    body: JSON.stringify({
      model: 'glm-4.6v-flashx',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      max_tokens: 2000,
      temperature: 0.8,
    }),
  })
  const data = await res.json()
  if (!res.ok) return error(data.error?.message || 'GLM API error', 500)
  const content = data.choices?.[0]?.message?.content
  if (!content) return error('No response from GLM', 500)
  const prompts = content.split('\n').filter(s => s.trim()).map(s => s.replace(/^\d+[\.\)、]\s*/, '').trim())
  return json({ prompts: prompts.slice(0, count) })
}
