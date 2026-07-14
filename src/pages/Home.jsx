import { useState, useRef, useEffect, useCallback } from 'react'
import { API } from '../AuthContext'
import ImagePreviewModal from '../components/ImagePreviewModal'

function normalizeImgUrl(url) {
  return url?.replace('gift-bucket-0503.oss-cn-beijing.aliyuncs.com', 'static.liqihui.com') || url
}

function singleImageStageText(p) {
  if (p >= 80) return '最后微调一下'
  if (p >= 60) return '即将完成'
  if (p >= 40) return '正在润饰细节'
  if (p >= 20) return '生成初稿中'
  return null
}

function WipeText({ text }) {
  const [display, setDisplay] = useState(text)
  const [phase, setPhase] = useState('')
  useEffect(() => {
    if (text === display) return
    setPhase('out')
    const t = setTimeout(() => { setDisplay(text); setPhase('in') }, 240)
    return () => clearTimeout(t)
  }, [text, display])
  return <div className={phase ? `wipe-${phase}` : undefined} style={{ fontSize: 14, color: '#888' }}>{display}</div>
}

function ResultImageCell({ url, ratio, onClick }) {
  return (
    <div onClick={onClick} style={{ width: '100%', aspectRatio: ratio, borderRadius: 12, overflow: 'hidden', background: url ? '#fafaf8' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: url ? 'none' : '1px solid #e0dedc', cursor: onClick ? 'pointer' : undefined }}>
      {url ? (
        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#fafaf8', display: 'block' }} />
      ) : (
        <div style={{ fontSize: 13, color: '#888' }}>生成失败</div>
      )}
    </div>
  )
}

export default function Home() {
  const [image_size] = useState('1K')
  const [generating, setGenerating] = useState(false)
  const [generatingPrompts, setGeneratingPrompts] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const promptGenId = useRef(0)
  const templateCountRef = useRef(1)

  const getModel = () => {
    const saved = localStorage.getItem('defaultImageModel')
    return ['maiziai-chatgpt-image-2', 'maiziai-chatgpt-image-2-vip', 'doubao-seedream-5-0-pro-260628', 'agnes-image-2.1-flash'].includes(saved) ? saved : 'maiziai-chatgpt-image-2'
  }
  const getTextModel = () => {
    const saved = localStorage.getItem('textGenerationModel')
    return ['qwen3.5-flash', 'glm-4.6v-flashx', 'doubao-seed-2-0-mini-260428'].includes(saved) ? saved : 'qwen3.5-flash'
  }
  const getTemperature = () => parseFloat(localStorage.getItem('textTemperature') || '0.8')
  const getMaxTokens = () => parseInt(localStorage.getItem('textMaxTokens') || '2000', 10)

  async function generatePrompts(fest, count, refImageUrl, imgType, productInfo) {
    const token = localStorage.getItem('token')
    if (!token) return []
    const genId = ++promptGenId.current
    setGeneratingPrompts(true)
    const base = (imgType === '详情图' || imgType === '白底图')
      ? (() => { const p = Array.from({ length: count }, () => ''); p[0] = '生成白底图'; return p })()
      : Array.from({ length: count }, () => '')
    setPrompts(base)
    try {
      const apiCount = (imgType === '详情图' || imgType === '白底图') ? count - 1 : count
      const res = await fetch(`${API}/api/generate/prompts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ count: apiCount, refImage: refImageUrl, model: getTextModel(), temperature: getTemperature(), maxTokens: getMaxTokens(), imageType: imgType, productInfo }),
      })
      const data = await res.json()
      if (genId !== promptGenId.current) return null
      if (data.prompts) {
        const result = (imgType === '详情图' || imgType === '白底图')
          ? ['生成白底图', ...data.prompts.slice(0, count - 1)]
          : data.prompts.slice(0, count)
        setPrompts(result)
        return result
      }
      setPrompts(base)
      return base
    } catch {
      if (genId !== promptGenId.current) return null
      setPrompts(base)
      return base
    } finally {
      if (genId === promptGenId.current) setGeneratingPrompts(false)
    }
  }

  async function analyzeImage(imageUrl) {
    const token = localStorage.getItem('token')
    if (!token) return null
    setAnalyzing(true)
    try {
      const res = await fetch(`${API}/api/generate/prompts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mode: 'analyze', refImage: imageUrl, model: getTextModel(), temperature: getTemperature(), maxTokens: getMaxTokens() }),
      })
      const data = await res.json()
      if (data.analysis) {
        return data.analysis
      } else {
        console.error('分析失败:', data.error || res.statusText)
        return null
      }
    } catch (e) {
      console.error('analyzeImage error:', e)
      return null
    } finally {
      setAnalyzing(false)
    }
  }

  const [templateCount, setTemplateCount] = useState(1)
  const [productTitle, setProductTitle] = useState('')
  const [imageSize, setImageSize] = useState('3:4')
  const [ratioOpen, setRatioOpen] = useState(false)
  const ratioRef = useRef(null)
  useEffect(() => {
    if (!ratioOpen) return
    const onDown = e => { if (ratioRef.current && !ratioRef.current.contains(e.target)) setRatioOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [ratioOpen])
  const [prompts, setPrompts] = useState([''])
  const [imageType, setImageType] = useState('白底图')

  const [generations, setGenerations] = useState([])
  const pollTimers = useRef({})
  const [albums, setAlbums] = useState([])
  const [albumPage, setAlbumPage] = useState(0)
  const [previewUrls, setPreviewUrls] = useState(null)
  const [previewIndex, setPreviewIndex] = useState(0)
  const [uploadedRef, setUploadedRef] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [previewPos, setPreviewPos] = useState({ left: 0, top: 0 })
  const previewTimer = useRef(null)
  const refInputRef = useRef()
  const [dragOver, setDragOver] = useState(false)
  const PAGE_SIZE = 20

  const handleImageFile = (f) => {
    if (!f || !f.type?.startsWith('image/')) return
    const fr = new FileReader()
    fr.onload = () => {
      setUploadedRef({ url: fr.result, blob: f })
    }
    fr.readAsDataURL(f)
  }

  useEffect(() => {
    fetch(`${API}/api/global-config`)
      .then(r => r.json())
      .then(cfg => {
        if (cfg.defaultImageModel) localStorage.setItem('defaultImageModel', cfg.defaultImageModel)
        if (cfg.textGenerationModel) localStorage.setItem('textGenerationModel', cfg.textGenerationModel)
        if (cfg.textTemperature) localStorage.setItem('textTemperature', cfg.textTemperature)
        if (cfg.textMaxTokens) localStorage.setItem('textMaxTokens', cfg.textMaxTokens)
      })
      .catch(() => {})
  }, [])

  const PENDING_BATCHES_KEY = 'pendingBatches'

  function savePendingBatch(id, batchId, prompts) {
    const list = JSON.parse(localStorage.getItem(PENDING_BATCHES_KEY) || '[]')
    const idx = list.findIndex(b => b.id === id)
    const entry = { id, batchId, prompts }
    if (idx >= 0) list[idx] = entry
    else list.push(entry)
    localStorage.setItem(PENDING_BATCHES_KEY, JSON.stringify(list))
  }

  function removePendingBatch(id) {
    const list = JSON.parse(localStorage.getItem(PENDING_BATCHES_KEY) || '[]')
    localStorage.setItem(PENDING_BATCHES_KEY, JSON.stringify(list.filter(b => b.id !== id)))
  }

  const fetchAlbums = useCallback(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    fetch(`${API}/api/albums`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (data.albums) { setAlbums(data.albums); setAlbumPage(0) } })
      .catch(() => {})
  }, [])

  const textareaRefs = useRef([])

  useEffect(() => {
    textareaRefs.current.forEach(el => {
      if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px' }
    })
  }, [prompts])

  useEffect(() => {
    if (previewUrls) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [previewUrls])

  useEffect(() => {
    fetchAlbums()
    const token = localStorage.getItem('token')
    if (token) {
      const pending = JSON.parse(localStorage.getItem(PENDING_BATCHES_KEY) || '[]')
      for (const p of pending) {
        if (!p.batchId) {
          setGenerations(g => (g.some(x => x.id === p.id) ? g : [...g, { id: p.id, batchId: null, progress: 0, statusText: '已中断',         imageUrl: null, imageUrls: null, error: '生成未完成，页面刷新导致任务中断', prompt: p.prompts[0], promptCount: p.prompts.length }]))
          removePendingBatch(p.id)
          continue
        }
        setGenerations(g => (g.some(x => x.id === p.id) ? g : [...g, { id: p.id, batchId: p.batchId, progress: 0, statusText: '恢复中...',         imageUrl: null, imageUrls: null, error: null, restored: true, prompt: p.prompts[0], promptCount: p.prompts.length }]))
        startBatchPolling(p.id, p.batchId, token, p.prompts, () => { removePendingBatch(p.id) })
      }
    }
    return () => {
      for (const key of Object.keys(pollTimers.current)) {
        const t = pollTimers.current[key]
        if (t?.sim) clearInterval(t.sim)
        if (t?.poll) clearTimeout(t.poll)
      }
    }
  }, [fetchAlbums])

  const canGenerate = getModel() && productTitle.trim().length > 0

  const handleGenerate = async () => {
    if (!getModel()) return alert('请选择模型')

    setGenerating(true)

    const token = localStorage.getItem('token')
    if (!token) {
      alert('请先登录')
      setGenerating(false)
      return
    }

    let promptList = prompts.filter(p => p.trim())
    if (promptList.length === 0) {
      const c = imageType === '详情图' ? 5 : 1
      setTemplateCount(c); templateCountRef.current = c
      let generated
      if (imageType === '详情图' && uploadedRef?.url) {
        const analysis = await analyzeImage(uploadedRef.url)
        generated = await generatePrompts('', c, uploadedRef.url, imageType, analysis)
      } else {
        generated = await generatePrompts('', c, uploadedRef?.url, imageType)
      }
      promptList = (generated || []).filter(p => p.trim())
      if (promptList.length === 0) { setGenerating(false); return }
    }

    const imageTypePrefixes = {
      '场景图': '真实使用场景图，',
    }
    const prefixed = imageType === '详情图'
      ? promptList
      : promptList.map(p => (imageTypePrefixes[imageType] || '') + p)

    const id = Date.now() + Math.random().toString(36).slice(2, 6)
    setGenerations(g => [...g, { id, batchId: null, progress: 0, statusText: '准备中...',         imageUrl: null, imageUrls: null, error: null, prompt: prefixed[0], promptCount: prefixed.length, title: productTitle.trim() }])
    savePendingBatch(id, null, prefixed)

    try {
      const imgs = uploadedRef ? [uploadedRef.url] : []
      const sized = imgs.length ? await Promise.all(imgs.map(ensureMinSize)) : []
      const sendImages = sized.length > 4 ? await compositeToGrid(sized) : sized

      const res = await fetch(`${API}/api/generate/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          config: { size: imageSize, model: getModel(), image_size, n: 1 },
          prompts: prefixed,
          images: sendImages.length ? sendImages : undefined,
          name: productTitle.trim(),
        }),
      })

      const r = await res.json()
      if (!res.ok) throw new Error(r.error || '请求失败')

      setGenerations(g => g.map(item => item.id === id ? { ...item, batchId: r.batchId, statusText: '任务已提交' } : item))
      savePendingBatch(id, r.batchId, prefixed)
      startBatchPolling(id, r.batchId, token, prefixed, () => { setGenerating(false); removePendingBatch(id) })
    } catch (err) {
      setGenerations(g => g.map(item => item.id === id ? { ...item, error: err.message } : item))
      setGenerating(false)
    }
  }

  function startBatchPolling(id, batchId, token, prompts, onDone) {
    let cancelled = false

    const poll = async () => {
      try {
        const r = await fetch(`${API}/api/generate/batch-status?batchId=${batchId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!r.ok || cancelled) {
          if (!cancelled) {
            setGenerations(g => g.map(item => item.id === id ? { ...item, error: '生成任务不存在或已过期' } : item))
            fetchAlbums()
            onDone?.()
          }
          return
        }

        const res = await r.json()

        if (typeof res.progress === 'number' && res.progress > 0) {
          setGenerations(g => g.map(item => item.id === id ? (() => {
            const stage = item.promptCount === 1 ? singleImageStageText(res.progress) : null
            return { ...item, progress: res.progress, statusText: stage || res.statusText || item.statusText }
          })() : item))
        }
        if (res.status === 'FAILED') {
          cancelled = true
          setGenerations(g => g.map(item => item.id === id ? { ...item, error: res.statusText || '生成失败' } : item))
          fetchAlbums()
          onDone?.()
          return
        }
        if (res.status === 'SUCCEEDED' && res.imageUrl) {
          setGenerations(g => g.map(item => item.id === id ? { ...item, imageUrl: normalizeImgUrl(res.imageUrl), imageUrls: (res.imageUrls || [res.imageUrl]).map(normalizeImgUrl), progress: 100, statusText: '已完成' } : item))
          fetchAlbums()
          onDone?.()
          return
        }
        pollTimers.current[id] = setTimeout(poll, 2000)
    } catch (e) {
        if (!cancelled) {
          setGenerations(g => g.map(item => item.id === id ? { ...item, error: e.message } : item))
          fetchAlbums()
          onDone?.()
        }
      }
    }

    poll()
  }

  useEffect(() => {
    if (!generations.length) return
    const sim = setInterval(() => {
      setGenerations(g => g.map(item => {
        if (item.error || item.progress >= 95) return item
        const p = Math.min(item.progress + Math.floor(Math.random() * 2) + 1, 95)
        const stage = item.promptCount === 1 ? singleImageStageText(p) : null
        return { ...item, progress: p, statusText: stage || item.statusText }
      }))
    }, 800)
    return () => clearInterval(sim)
  }, [generations.length])

  function ensureMinSize(url) {
    return new Promise(resolve => {
      const img = new Image()
      img.onload = () => {
        const pad = 16
        const w = Math.max(img.naturalWidth, 240) + pad * 2
        const h = Math.max(img.naturalHeight, 240) + pad * 2
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        const ctx = canvas.getContext('2d')
        const hue = Math.random() * 360
        ctx.fillStyle = `hsl(${hue}, 30%, 92%)`
        ctx.fillRect(0, 0, w, h)
        ctx.drawImage(img, pad, pad, img.naturalWidth, img.naturalHeight)
        ctx.fillStyle = `hsla(${hue}, 20%, 85%, 0.12)`
        ctx.fillRect(0, 0, w, h)
        const d = ctx.getImageData(0, 0, w, h)
        for (let i = 0; i < d.data.length; i += 4) {
          d.data[i] = Math.max(0, Math.min(255, d.data[i] + ((Math.random() * 14 - 7) | 0)))
          d.data[i + 1] = Math.max(0, Math.min(255, d.data[i + 1] + ((Math.random() * 14 - 7) | 0)))
          d.data[i + 2] = Math.max(0, Math.min(255, d.data[i + 2] + ((Math.random() * 14 - 7) | 0)))
        }
        ctx.putImageData(d, 0, 0)
        resolve(canvas.toDataURL('image/jpeg', 0.5))
      }
      img.onerror = () => resolve(url)
      img.src = url
    })
  }

  function compositeToGrid(urls) {
    return new Promise(resolve => {
      const count = urls.length
      const cols = Math.min(count, 4)
      const rows = Math.ceil(count / cols)
      const cell = 200
      const c = document.createElement('canvas')
      c.width = cols * cell; c.height = rows * cell
      const ctx = c.getContext('2d')
      ctx.fillStyle = '#f5f5f5'; ctx.fillRect(0, 0, c.width, c.height)
      let loaded = 0
      for (let i = 0; i < count; i++) {
        const img = new Image()
        img.onload = () => {
          const x = (i % cols) * cell
          const y = Math.floor(i / cols) * cell
          const maxW = cell - 20, maxH = cell - 20
          const s = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight)
          ctx.drawImage(img, x + 10 + (maxW - img.naturalWidth * s) / 2, y + 10 + (maxH - img.naturalHeight * s) / 2, img.naturalWidth * s, img.naturalHeight * s)
          if (++loaded === count) {
            const d = ctx.getImageData(0, 0, c.width, c.height)
            for (let i = 0; i < d.data.length; i += 4) {
              d.data[i] = Math.max(0, Math.min(255, d.data[i] + ((Math.random() * 14 - 7) | 0)))
              d.data[i + 1] = Math.max(0, Math.min(255, d.data[i + 1] + ((Math.random() * 14 - 7) | 0)))
              d.data[i + 2] = Math.max(0, Math.min(255, d.data[i + 2] + ((Math.random() * 14 - 7) | 0)))
            }
            ctx.putImageData(d, 0, 0)
            resolve([c.toDataURL('image/jpeg', 0.5)])
          }
        }
        img.onerror = () => { if (++loaded === count) resolve([c.toDataURL('image/jpeg', 0.5)]) }
        img.src = urls[i]
      }
    })
  }

  return (
    <>
      <div className="home-layout">

      {/* Right: Preview */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="desktop-only">
        {/* Generate Panel */}
        <div style={{ marginBottom: 24, maxWidth: 1200, marginLeft: 'auto', marginRight: 'auto', marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <span style={{ fontSize: 20, fontWeight: 600, color: '#2a2a2e', letterSpacing: -0.1 }}>图片生成</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 3fr 4fr', gap: 24, alignItems: 'start' }}>
            <input ref={refInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); e.target.value = '' }} />

            {/* ========== LEFT COLUMN: Upload ========== */}
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#555', marginBottom: 10, letterSpacing: 0.3 }}>上传产品图</div>
              {uploadedRef ? (
                <div style={{ position: 'relative', width: '100%', height: 300, borderRadius: 12, overflow: 'hidden', border: '1.5px solid #ddd', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}
                  onMouseEnter={(e) => { clearTimeout(previewTimer.current); const r = e.currentTarget.getBoundingClientRect(); previewTimer.current = setTimeout(() => { setPreviewPos({ left: r.right + 8, top: Math.min(r.top, window.innerHeight * 0.5 - 24) }); setPreviewUrl(uploadedRef.url) }, 300) }}
                  onMouseLeave={() => { clearTimeout(previewTimer.current); setPreviewUrl(null) }}
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleImageFile(f) }}
                >
                  <img src={uploadedRef.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#fafaf8' }} />
                  {dragOver && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(139,92,246,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff', fontWeight: 600 }}>松开替换图片</div>
                  )}
                  <div onClick={() => setUploadedRef(null)} style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,.45)', color: '#fff', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all .2s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(190,70,60,.85)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,.45)' }}
                  >&#10005;</div>
                </div>
              ) : (
                <div onClick={() => refInputRef.current?.click()} style={{ width: '100%', height: 300, borderRadius: 12, border: '1.5px dashed #d0cecc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 13, color: '#999', transition: 'all .25s', gap: 16, background: '#fafaf8' }}
                  onMouseEnter={e => { if (!dragOver) { e.currentTarget.style.borderColor = '#8B5CF6'; e.currentTarget.style.color = '#8B5CF6'; e.currentTarget.style.background = '#f5f0ff' } }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#d0cecc'; e.currentTarget.style.color = '#999'; e.currentTarget.style.background = '#fafaf8' }}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); e.currentTarget.style.borderColor = '#8B5CF6'; e.currentTarget.style.color = '#8B5CF6'; e.currentTarget.style.background = '#f5f0ff' }}
                  onDragLeave={e => { setDragOver(false); e.currentTarget.style.borderColor = '#d0cecc'; e.currentTarget.style.color = '#999'; e.currentTarget.style.background = '#fafaf8' }}
                  onDrop={e => { e.preventDefault(); setDragOver(false); e.currentTarget.style.borderColor = '#d0cecc'; e.currentTarget.style.color = '#999'; e.currentTarget.style.background = '#fafaf8'; const f = e.dataTransfer.files?.[0]; if (f) handleImageFile(f) }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 32, height: 32 }} aria-hidden="true"><path d="M12 3v12"></path><path d="m17 8-5-5-5 5"></path><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path></svg>
                  <span style={{ fontSize: 15, color: '#1a1a1a' }}>点击上传或拖拽图片到此处</span>
                </div>
              )}

              {previewUrl === uploadedRef?.url && (
                <div style={{ position: 'fixed', zIndex: 1000, left: previewPos.left, top: previewPos.top, background: '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,.15)', padding: 6, pointerEvents: 'none', border: '1px solid #e8e6e4' }}>
                  <img src={uploadedRef.url} alt="" style={{ maxWidth: '30vw', maxHeight: '50vh', borderRadius: 6, display: 'block' }} />
                </div>
              )}

              <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: '#fafafa', border: '1px solid #eee', fontSize: 12, color: '#999', lineHeight: 1.8 }}>
                <div style={{ fontWeight: 500, marginBottom: 6, color: '#888' }}>上传建议</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 4, height: 4, borderRadius: '50%', background: '#bbb', flexShrink: 0 }} />使用光线充足、对焦清晰的产品图</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 4, height: 4, borderRadius: '50%', background: '#bbb', flexShrink: 0 }} />产品主体清晰、背景尽量简洁</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 4, height: 4, borderRadius: '50%', background: '#bbb', flexShrink: 0 }} />产品居中放置在画面中间</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 4, height: 4, borderRadius: '50%', background: '#bbb', flexShrink: 0 }} />建议分辨率 1024x1024 以上</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 4, height: 4, borderRadius: '50%', background: '#bbb', flexShrink: 0 }} />上传后 AI 将基于原图优化而非重绘</div>
              </div>
            </div>

            {/* ========== MIDDLE COLUMN: Parameters ========== */}
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#555', marginBottom: 6 }}>图片类型</div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {['白底图', '场景图', '详情图'].map(t => (
                    <div key={t}
                      onClick={() => {
                        const v = t; setImageType(v); const c = v === '详情图' ? 5 : 1; setTemplateCount(c); templateCountRef.current = c;
                        setPrompts(Array.from({ length: c }, () => ''))
                      }}
                      style={{
                        padding: '6px 16px', fontSize: 14, borderRadius: 8, cursor: 'pointer', userSelect: 'none',
                        background: imageType === t ? '#8B5CF6' : '#fafaf8',
                        color: imageType === t ? '#fff' : '#555',
                        border: imageType === t ? '1px solid #8B5CF6' : '1px solid #e0dedc',
                        transition: 'all .2s',
                      }}
                    >{t}</div>
                  ))}
                  </div>
                </div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#555', marginBottom: 6, marginTop: 2 }}>生成比例</div>
                  <div ref={ratioRef} style={{ position: 'relative' }}>
                    <div onClick={() => setRatioOpen(o => !o)} role="button" tabIndex={0}
                      style={{ height: 48, padding: '0 30px 0 10px', fontSize: 14, border: '1px solid #e0dedc', borderRadius: 8, background: '#fafaf8', cursor: 'pointer', outline: 'none', color: '#333', display: 'flex', alignItems: 'center',
                        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' fill='none' stroke='%23999' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
                        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 15px center' }}>
                      {imageSize}
                    </div>
                    {ratioOpen && (
                      <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: '#fff', border: '1px solid #e0dedc', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,.12)', padding: 4, zIndex: 50 }}>
                        {['3:4', '1:1', '16:9', '9:16', '2:3', '4:3'].map(v => (
                          <div key={v} onClick={() => { setImageSize(v); setRatioOpen(false) }}
                            style={{ padding: '9px 10px', fontSize: 14, borderRadius: 6, cursor: 'pointer', color: imageSize === v ? '#8B5CF6' : '#333', background: imageSize === v ? '#F5F3FF' : 'transparent', fontWeight: imageSize === v ? 600 : 400 }}
                            onMouseEnter={e => { if (imageSize !== v) e.currentTarget.style.background = '#f5f5f5' }}
                            onMouseLeave={e => { if (imageSize !== v) e.currentTarget.style.background = 'transparent' }}
                          >{v}</div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ fontSize: 14, fontWeight: 500, color: '#555', marginBottom: 6, marginTop: 2 }}>生成张数</div>
                  <input value={`${templateCount}张`} readOnly
                    style={{ height: 48, padding: '0 12px', fontSize: 14, border: '1px solid #e0dedc', borderRadius: 8, background: '#fafaf8', outline: 'none', color: '#333', width: '100%', boxSizing: 'border-box', cursor: 'default' }} />

                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#555', marginBottom: 6 }}>产品标题 <span style={{ color: '#FF4D4F' }}>*</span></div>
                  <input value={productTitle} onChange={e => setProductTitle(e.target.value)} placeholder="仅用于任务区分，不影响生图效果"
                    style={{ height: 48, padding: '0 12px', fontSize: 14, border: '1px solid #e0dedc', borderRadius: 8, background: '#fafaf8', outline: 'none', color: '#333', width: '100%', boxSizing: 'border-box' }} />
                </div>

                <button
                  disabled={!canGenerate || generating}
                  onClick={handleGenerate}
                  style={{
                    height: 54, padding: '0 20px', fontSize: 14, fontWeight: 600,
                    background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                    color: '#fff',
                    border: 'none', borderRadius: 8,
                    cursor: !canGenerate || generating ? 'not-allowed' : 'pointer',
                    boxShadow: !canGenerate || generating ? 'none' : '0 4px 20px rgba(139,92,246,.3)',
                    opacity: !canGenerate || generating ? 0.5 : 1,
                    transition: 'all .3s', letterSpacing: 0.5, whiteSpace: 'nowrap', width: '100%',
                  }}
                  onMouseEnter={e => { if (canGenerate && !generating) { e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = '0 8px 28px rgba(139,92,246,.4)' } }}
                  onMouseLeave={e => { if (canGenerate && !generating) { e.target.style.transform = 'none'; e.target.style.boxShadow = '0 4px 20px rgba(139,92,246,.3)' } }}
                >生成图片</button>
              </div>
            </div>

            {/* ========== RIGHT COLUMN: Current Image ========== */}
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#555', marginBottom: 10, letterSpacing: 0.3 }}>生成结果</div>
              <div style={{ border: '1px solid #e0dedc', borderRadius: 12, background: '#fafaf8', minHeight: 200 }}>
                {(() => {
                  const ratio = imageSize.replace(':', ' / ')
                  if (generations.filter(g => !g.restored).length > 0) {
                    const last = [...generations].filter(g => !g.restored).reverse()[0]
                    const urls = last.imageUrls && last.imageUrls.length ? last.imageUrls : (last.imageUrl ? [last.imageUrl] : [])
                    if (last.error) {
                      return <div style={{ width: '100%', aspectRatio: ratio, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF4D4F', fontSize: 13, padding: '0 12px', textAlign: 'center' }}>{last.error}</div>
                    }
                    if (urls.length === 0) {
                      const loadingText = analyzing ? 'AI 分析中' : (generatingPrompts ? 'AI 文案策划中' : last.statusText)
                      return <div style={{ width: '100%', aspectRatio: ratio, borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 13 }}><div className="loading-spinner" /><WipeText text={loadingText} /></div>
                    }
                    if (urls.length >= 5) {
                      const u = urls
                      return (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5, padding: 5 }}>
                          {u.slice(0, 6).map((url, i) => (
                            <ResultImageCell key={i} url={url} ratio={ratio} onClick={() => { setPreviewUrls(u.filter(Boolean)); setPreviewIndex(i) }} />
                          ))}
                        </div>
                      )
                    }
                    const cols = urls.length === 1 ? 1 : 2
                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 10 }}>
                        {urls.map((url, i) => <ResultImageCell key={i} url={url} ratio={ratio} onClick={() => { setPreviewUrls(urls.filter(Boolean)); setPreviewIndex(i) }} />)}
                      </div>
                    )
                  }
                  if (analyzing || generatingPrompts) {
                    return <div style={{ width: '100%', aspectRatio: ratio, borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 13 }}><div className="loading-spinner" /><WipeText text={analyzing ? 'AI 分析中' : 'AI 文案策划中'} /></div>
                  }
                  return <div style={{ width: '100%', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: 13 }}>暂无生成结果</div>
                })()}
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
    {previewUrls && (
      <ImagePreviewModal
        album={{ imageUrls: previewUrls }}
        index={previewIndex}
        onClose={() => setPreviewUrls(null)}
        onIndexChange={setPreviewIndex}
      />
    )}
    </>
  )
}
