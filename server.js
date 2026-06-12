import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'
import OSS from 'ali-oss'
import sharp from 'sharp'
import { hashPassword, verifyPassword, generateToken } from './backend/src/auth.js'
import * as db from './backend/src/db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000

const ossClient = new OSS({
  region: process.env.OSS_REGION,
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  bucket: process.env.OSS_BUCKET,
})

async function uploadToOSS(sourceUrl) {
  if (!sourceUrl || sourceUrl.includes('gift-bucket-0503.oss')) return sourceUrl
  try {
    const res = await fetch(sourceUrl, { signal: AbortSignal.timeout(30000) })
    if (!res.ok) throw new Error(`Fetch ${res.status}`)
    let buffer = Buffer.from(await res.arrayBuffer())
    const d = new Date()
    const base = `images/${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${Date.now()}`
    let key, webp
    try { webp = await sharp(buffer).webp({ quality: 85 }).toBuffer(); key = base + '.webp' } catch (_) { key = base + '.png' }
    if (webp) buffer = webp
    await ossClient.put(key, buffer)
    const ossUrl = `https://${process.env.OSS_BUCKET}.${process.env.OSS_REGION}.aliyuncs.com/${key}`
    console.log(`OSS upload OK: ${sourceUrl.slice(0, 50)}... -> ${ossUrl}`)
    return ossUrl
  } catch (e) {
    console.error(`OSS upload failed for ${sourceUrl.slice(0, 50)}...:`, e.message)
    return sourceUrl
  }
}

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.static(path.join(__dirname, 'dist')))

function uuid() { return crypto.randomUUID() }

async function auth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
  const token = authHeader.slice(7).trim()
  if (token.length < 10) return res.status(401).json({ error: 'Invalid token format' })
  const session = await db.getSession(token)
  if (!session) return res.status(401).json({ error: 'Invalid or expired token' })
  req.user = { userId: session.user_id, email: session.email }
  req.token = token
  next()
}

app.post('/api/register', async (req, res) => {
  try {
    const { email: rawEmail, password } = req.body
    const email = rawEmail?.toLowerCase().trim()
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' })
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email format' })
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })
    const existing = await db.getUser(email)
    if (existing) return res.status(409).json({ error: 'Email already registered' })
    const passwordHash = await hashPassword(password)
    const userId = uuid()
    await db.createUser(email, userId, passwordHash)
    const token = generateToken()
    await db.createSession(token, userId, email)
    res.json({ success: true, token, user: { id: userId, email } })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/login', async (req, res) => {
  try {
    const { email: rawEmail, password } = req.body
    const email = rawEmail?.toLowerCase().trim()
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' })
    const user = await db.getUser(email)
    if (!user) return res.status(401).json({ error: 'Invalid email or password' })
    const valid = await verifyPassword(password, user.password_hash)
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' })
    const token = generateToken()
    await db.createSession(token, user.user_id, email)
    res.json({ success: true, token, user: { id: user.user_id, email: user.email } })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/me', auth, (req, res) => res.json({ user: { id: req.user.userId, email: req.user.email } }))

app.post('/api/logout', auth, async (req, res) => {
  await db.deleteSession(req.token)
  res.json({ success: true })
})

app.get('/api/ping', (req, res) => {
  res.json({ ok: true, hasMaiziaiKey: !!process.env.MAIZIAI_API_KEY, hasAgnesKey: !!process.env.AGNES_API_KEY, hasGlmKey: !!process.env.GLM_API_KEY })
})

app.post('/api/generate', auth, async (req, res) => {
  try {
    const { config, images } = req.body
    if (!config) return res.status(400).json({ error: 'Missing config' })
    const hasImages = images && images.length
    const prompt = config.prompt || ''
    const isMaiziai = config.model === 'maiziai-chatgpt-image-2'

    if (isMaiziai) {
      const maiziaiKey = process.env.MAIZIAI_API_KEY
      if (!maiziaiKey) return res.status(500).json({ error: 'MAIZIAI_API_KEY not configured' })
      const apiRes = await fetch('https://www.maizitech.cn/v1/images/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${maiziaiKey}` },
        body: JSON.stringify({ model: 'gpt-image-2', prompt, size: config.size === 'auto' ? undefined : config.size, image_size: config.image_size || '1K', images: hasImages ? images : undefined, n: 1 }),
      })
      const data = await apiRes.json()
      if (!apiRes.ok) return res.status(apiRes.status).json({ error: data.error?.message || 'MaiziAI API call failed' })
      const maiziaiTaskId = data.data?.[0]?.task_id
      if (!maiziaiTaskId) return res.status(500).json({ error: 'No task_id from MaiziAI' })
      const taskId = maiziaiTaskId
      await db.createTask({ taskId, userId: req.user.userId, config, prompt, status: 'PENDING', createdAt: Date.now(), productCount: 0, maiziaiTaskId })
      return res.json({ taskId })
    }

    if (config.model === 'agnes-image-2.1-flash') {
      const agnesKey = process.env.AGNES_API_KEY
      if (!agnesKey) return res.status(500).json({ error: 'AGNES_API_KEY not configured' })
      const agnesSizeMap = { 'auto': '1024x1024', '1:1': '1024x1024', '16:9': '1920x1080', '9:16': '1080x1920', '4:3': '1024x768', '3:4': '768x1024' }
      const apiSize = agnesSizeMap[config.size] || config.size || '1024x1024'
      const body = { model: 'agnes-image-2.1-flash', prompt, size: apiSize, n: 1 }
      if (hasImages) body.extra_body = { image: images.slice(0, 1), response_format: 'url' }
      const apiRes = await fetch('https://apihub.agnes-ai.com/v1/images/generations', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${agnesKey}` }, body: JSON.stringify(body),
      })
      const data = await apiRes.json()
      if (!apiRes.ok) return res.status(apiRes.status).json({ error: data.error?.message || 'Agnes API call failed' })
      const imageUrl = data.data?.[0]?.url
      if (!imageUrl) return res.status(500).json({ error: 'No image URL from Agnes API' })
      const ossUrl = await uploadToOSS(imageUrl)
      const taskId = uuid()
      await db.createTask({ taskId, userId: req.user.userId, config, prompt, status: 'SUCCEEDED', imageUrl: ossUrl, createdAt: Date.now(), productCount: 0 })
      const albumId = uuid().slice(0, 8)
      await db.createAlbum({ id: albumId, userId: req.user.userId, taskId, imageUrl: ossUrl, config, prompt, productCount: 0, banner: config.banner || false, createdAt: Date.now() })
      await db.addUserAlbum(req.user.userId, albumId)
      return res.json({ taskId })
    }
    res.status(400).json({ error: 'Unknown model: ' + config.model })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/generate/batch', auth, async (req, res) => {
  try {
    const { config, images, prompts } = req.body
    if (!config || !prompts || !prompts.length) return res.status(400).json({ error: 'Missing config or prompts' })
    const hasImages = images && images.length
    const batchId = uuid().slice(0, 8)

    if (config.model === 'agnes-image-2.1-flash') {
      const agnesKey = process.env.AGNES_API_KEY
      if (!agnesKey) return res.status(500).json({ error: 'AGNES_API_KEY not configured' })
      const agnesSizeMap = { 'auto': '1024x1024', '1:1': '1024x1024', '16:9': '1920x1080', '9:16': '1080x1920', '4:3': '1024x768', '3:4': '768x1024' }
      const apiSize = agnesSizeMap[config.size] || config.size || '1024x1024'
      const imageUrls = []
      for (const prompt of prompts) {
        const apiRes = await fetch('https://apihub.agnes-ai.com/v1/images/generations', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${agnesKey}` }, body: JSON.stringify({ model: 'agnes-image-2.1-flash', prompt, size: apiSize, n: 1 }),
        })
        const data = await apiRes.json()
        if (!apiRes.ok) return res.status(apiRes.status).json({ error: data.error?.message || 'Agnes API call failed' })
        if (data.data?.[0]?.url) imageUrls.push(data.data[0].url)
      }
      if (!imageUrls.length) return res.status(500).json({ error: 'No images generated' })
      const ossUrls = await Promise.all(imageUrls.map(u => uploadToOSS(u)))
      const albumId = uuid().slice(0, 8)
      await db.createAlbum({ id: albumId, userId: req.user.userId, batchId, imageUrls: ossUrls, imageUrl: ossUrls[0], config, prompts, prompt: prompts[0], productCount: 0, createdAt: Date.now() })
      await db.addUserAlbum(req.user.userId, albumId)
      await db.createBatch({ batchId, userId: req.user.userId, taskIds: [], config, prompts, createdAt: Date.now(), done: true })
      return res.json({ batchId })
    }

    const maiziaiKey = process.env.MAIZIAI_API_KEY
    if (!maiziaiKey) return res.status(500).json({ error: 'MAIZIAI_API_KEY not configured' })
    const taskIds = []
    for (const prompt of prompts) {
      const apiRes = await fetch('https://www.maizitech.cn/v1/images/generations', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${maiziaiKey}` },
        body: JSON.stringify({ model: 'gpt-image-2', prompt, size: config.size === 'auto' ? undefined : config.size, image_size: config.image_size || '1K', images: hasImages ? images : undefined, n: 1 }),
      })
      const data = await apiRes.json()
      if (!apiRes.ok) return res.status(apiRes.status).json({ error: data.error?.message || 'MaiziAI API call failed' })
      const maiziaiTaskId = data.data?.[0]?.task_id
      if (!maiziaiTaskId) return res.status(500).json({ error: 'No task_id from MaiziAI' })
      taskIds.push(maiziaiTaskId)
      await db.createTask({ taskId: maiziaiTaskId, userId: req.user.userId, config, prompt, status: 'PENDING', createdAt: Date.now(), productCount: 0, maiziaiTaskId })
    }
    await db.createBatch({ batchId, userId: req.user.userId, taskIds, config, prompts, createdAt: Date.now(), done: false })
    res.json({ batchId })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/generate/status', auth, async (req, res) => {
  try {
    const taskId = req.query.taskId
    if (!taskId) return res.status(400).json({ error: 'Missing taskId' })
    const task = await db.getTask(taskId)
    if (task) {
      if (task.status === 'SUCCEEDED') return res.json({ taskStatus: 'SUCCEEDED', progress: 100, statusText: '生成完成', imageUrl: task.imageUrl })
      if (task.status === 'FAILED') return res.json({ taskStatus: 'FAILED', progress: -1, statusText: task.statusText || '生成失败', imageUrl: null })
      if (task.status === 'PENDING' && task.maiziaiTaskId) {
        const maiziaiKey = process.env.MAIZIAI_API_KEY
        if (!maiziaiKey) return res.json({ taskStatus: 'PENDING', progress: 0, statusText: '等待生成...', imageUrl: null })
        const mRes = await fetch(`https://www.maizitech.cn/v1/tasks/${task.maiziaiTaskId}`, { headers: { Authorization: `Bearer ${maiziaiKey}` } })
        if (!mRes.ok) return res.json({ taskStatus: 'PENDING', progress: 0, statusText: '查询中...', imageUrl: null })
        const mData = await mRes.json()
        if (mData.status === 'completed') {
          const resultUrl = mData.result_urls?.[0]
          const imageUrl = resultUrl ? (resultUrl.startsWith('http') ? resultUrl : `https://www.maizitech.cn${resultUrl}`) : null
          if (imageUrl) {
            const ossUrl = await uploadToOSS(imageUrl)
            await db.updateTask(taskId, { status: 'SUCCEEDED', imageUrl: ossUrl })
            const albumId = uuid().slice(0, 8)
            await db.createAlbum({ id: albumId, userId: task.userId, taskId, imageUrl: ossUrl, config: task.config, prompt: task.prompt, productCount: task.productCount || 0, createdAt: task.createdAt })
            await db.addUserAlbum(task.userId, albumId)
            return res.json({ taskStatus: 'SUCCEEDED', progress: 100, statusText: '生成完成', imageUrl: ossUrl })
          }
        } else if (mData.status === 'failed') {
          await db.updateTask(taskId, { status: 'FAILED', statusText: mData.error_msg || '生成失败' })
          return res.json({ taskStatus: 'FAILED', progress: -1, statusText: mData.error_msg || '生成失败', imageUrl: null })
        }
        return res.json({ taskStatus: 'PENDING', progress: mData.progress || 0, statusText: '生成中...', imageUrl: null })
      }
    }
    res.json({ taskStatus: 'PENDING', progress: 0, statusText: '等待中...', imageUrl: null })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/generate/batch-status', auth, async (req, res) => {
  try {
    const batchId = req.query.batchId
    if (!batchId) return res.status(400).json({ error: 'Missing batchId' })
    const batch = await db.getBatch(batchId)
    if (!batch) return res.status(404).json({ error: 'Batch not found' })

    if (batch.done) {
      const albums = await db.getUserAlbumsWithBatch(req.user.userId)
      for (const a of albums) { if (a.batchId === batchId) return res.json({ status: 'SUCCEEDED', progress: 100, statusText: '生成完成', imageUrl: a.imageUrl, imageUrls: a.imageUrls }) }
    }

    const maiziaiKey = process.env.MAIZIAI_API_KEY
    if (!maiziaiKey) return res.json({ status: 'PENDING', progress: 0, statusText: '等待生成...' })

    const imageUrls = []; let allDone = true; let failed = false
    for (const taskId of batch.taskIds) {
      const task = await db.getTask(taskId)
      if (!task) { allDone = false; continue }
      if (task.status === 'SUCCEEDED') { if (task.imageUrl) imageUrls.push(task.imageUrl); continue }
      if (task.status === 'FAILED') { failed = true; continue }
      const mRes = await fetch(`https://www.maizitech.cn/v1/tasks/${task.maiziaiTaskId}`, { headers: { Authorization: `Bearer ${maiziaiKey}` } })
      if (!mRes.ok) { allDone = false; continue }
      const mData = await mRes.json()
      if (mData.status === 'completed') {
        const url = mData.result_urls?.[0]; const imageUrl = url ? (url.startsWith('http') ? url : `https://www.maizitech.cn${url}`) : null
        if (imageUrl) { const ossUrl = await uploadToOSS(imageUrl); imageUrls.push(ossUrl); await db.updateTask(taskId, { status: 'SUCCEEDED', imageUrl: ossUrl }) } else { allDone = false }
      } else if (mData.status === 'failed') { failed = true; await db.updateTask(taskId, { status: 'FAILED', statusText: mData.error_msg || '生成失败' }) }
      else { allDone = false }
    }
    if (failed) return res.json({ status: 'FAILED', progress: -1, statusText: '部分生成失败' })
    if (batch.done) {
      const albums = await db.getUserAlbumsWithBatch(req.user.userId)
      for (const a of albums) { if (a.batchId === batchId) return res.json({ status: 'SUCCEEDED', progress: 100, statusText: '生成完成', imageUrl: a.imageUrl, imageUrls: a.imageUrls }) }
    }
    if (allDone && imageUrls.length === batch.taskIds.length) {
      const albumId = uuid().slice(0, 8)
      await db.createAlbum({ id: albumId, userId: batch.userId, batchId, imageUrls, imageUrl: imageUrls[0], config: batch.config, prompts: batch.prompts, prompt: batch.prompts[0], productCount: 0, createdAt: batch.createdAt })
      await db.addUserAlbum(batch.userId, albumId)
      await db.updateBatch(batchId, { done: true })
      return res.json({ status: 'SUCCEEDED', progress: 100, statusText: '生成完成', imageUrl: imageUrls[0], imageUrls })
    }
    const doneCount = imageUrls.length
    res.json({ status: 'PENDING', progress: Math.round(doneCount / batch.taskIds.length * 90), statusText: `生成中 ${doneCount}/${batch.taskIds.length}...` })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/generate/prompts', auth, async (req, res) => {
  try {
    const { festival, count, refImage } = req.body
    if (!festival || !count) return res.status(400).json({ error: 'Missing festival or count' })
    const glmKey = process.env.GLM_API_KEY
    if (!glmKey) return res.status(500).json({ error: 'GLM_API_KEY not configured' })
    const content = refImage
      ? [{ type: 'image_url', image_url: { url: refImage } }, { type: 'text', text: `请基于参考图片中的产品，为"${festival}"节日生成${count}个中文图像生成提示词，用于礼品礼盒宣传图。每句一个独立的提示词，直接输出，不需要编号。` }]
      : [{ type: 'text', text: `请基于参考图片中的产品，为"${festival}"节日生成${count}个中文图像生成提示词，用于礼品礼盒宣传图。每句一个独立的提示词，直接输出，不需要编号。` }]
    const apiRes = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${glmKey}` },
      body: JSON.stringify({ model: 'glm-4.6v-flashx', messages: [{ role: 'system', content: '你是一个礼品营销AI图像提示词生成器。根据用户提供的参考图片和指定的节日，生成中文AI图像生成提示词。每个提示词用于文生图模型（如MaiziAI GPT-image-2），描述礼品展示场景。' }, { role: 'user', content }], max_tokens: 2000, temperature: 0.8 }),
    })
    const data = await apiRes.json()
    if (!apiRes.ok) return res.status(500).json({ error: data.error?.message || 'GLM API error' })
    const text = data.choices?.[0]?.message?.content
    if (!text) return res.status(500).json({ error: 'No response from GLM' })
    const prompts = text.split('\n').filter(s => s.trim()).map(s => s.replace(/^\d+[\.\)、]\s*/, '').trim())
    res.json({ prompts: prompts.slice(0, count) })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/albums/:id', auth, async (req, res) => {
  try {
    await db.deleteAlbum(req.params.id, req.user.userId)
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/albums', auth, async (req, res) => {
  try {
    const albums = await db.getUserAlbumsWithBatch(req.user.userId)
    res.json({ albums: albums.map(a => {
      if (a.imageUrl?.startsWith('https://www.maizitech.cnhttps://')) a.imageUrl = a.imageUrl.replace('https://www.maizitech.cn', '')
      if (a.imageUrls) a.imageUrls = a.imageUrls.map(u => u.startsWith('https://www.maizitech.cnhttps://') ? u.replace('https://www.maizitech.cn', '') : u)
      return a
    }) })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/digital-album', auth, async (req, res) => {
  try {
    const data = await db.getDigitalAlbum(req.user.userId)
    res.json(data ? { categories: typeof data.categories === 'string' ? JSON.parse(data.categories) : data.categories, bannerUrl: data.banner_url } : { categories: [], bannerUrl: null })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/digital-album', auth, async (req, res) => {
  try {
    const body = req.body
    if (!body || !Array.isArray(body.categories)) return res.status(400).json({ error: 'Invalid data' })
    await db.saveDigitalAlbum(req.user.userId, { categories: body.categories, bannerUrl: body.bannerUrl })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/album', async (req, res) => {
  try {
    const data = await db.getPublicAlbum()
    res.json(data ? { categories: typeof data.categories === 'string' ? JSON.parse(data.categories) : data.categories, bannerUrl: data.banner_url } : { categories: [], bannerUrl: null })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/album/publish', auth, async (req, res) => {
  try {
    const data = await db.getDigitalAlbum(req.user.userId)
    if (!data) return res.status(404).json({ error: 'No album data' })
    const parsed = { categories: typeof data.categories === 'string' ? JSON.parse(data.categories) : data.categories, bannerUrl: data.banner_url }
    await db.savePublicAlbum(parsed)
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('{*path}', (req, res) => { res.sendFile(path.join(__dirname, 'dist/index.html')) })

async function start() {
  try { await db.initSchema(); console.log('Database schema ready') } catch (e) { console.error('Database init failed:', e.message); process.exit(1) }
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
}
start()
