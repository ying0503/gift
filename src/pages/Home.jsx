import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { API, useAuth } from '../AuthContext'
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
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [userPop, setUserPop] = useState(false)
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

  const IMAGE_TYPES = ['白底图', '场景图', '样机图', '详情图']
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
          setGenerations(g => (g.some(x => x.id === p.id) ? g : [...g, { id: p.id, batchId: null, progress: 0, statusText: '已中断', imageUrl: null, imageUrls: null, error: '生成未完成，页面刷新导致任务中断', prompt: p.prompts[0], promptCount: p.prompts.length }]))
          removePendingBatch(p.id)
          continue
        }
        setGenerations(g => (g.some(x => x.id === p.id) ? g : [...g, { id: p.id, batchId: p.batchId, progress: 0, statusText: '恢复中...', imageUrl: null, imageUrls: null, error: null, restored: true, prompt: p.prompts[0], promptCount: p.prompts.length }]))
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

    const cleanPrompts = getModel() === 'agnes-image-2.1-flash'
      ? prefixed.map(p => {
          const match = p.match(/其他参考：(.+)/)
          if (match) return `${match[1]}，不要出现任何文字，出现在不同的场景`
          return p
        })
      : prefixed
    const id = Date.now() + Math.random().toString(36).slice(2, 6)
    setGenerations(g => [...g, { id, batchId: null, progress: 0, statusText: '准备中...', imageUrl: null, imageUrls: null, error: null, prompt: cleanPrompts[0], promptCount: cleanPrompts.length, title: productTitle.trim() }])
    savePendingBatch(id, null, cleanPrompts)

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
          prompts: cleanPrompts,
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

  function NavIcon({ type, active, disabled }) {
    const c = disabled ? '#D8D8D8' : (active ? '#000' : '#666')
    if (type === 'video') {
      return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}><path d="M14 16H2C0.821618 16 0 15.1784 0 14V2C0 0.821618 0.821618 0 2 0H14C15.1784 0 16 0.821618 16 2V14C16 15.1784 15.1784 16 14 16ZM0.666667 2.66667V4H3.33333L2.03808 0.762044C1.2093 1.00261 0.666667 1.71355 0.666667 2.66667ZM3.33333 0.666667L4.66668 4H6.66635L5.33333 0.666667H3.33333ZM6.66635 0.666667L8 4H10L8.66667 0.666667H6.66633H6.66635ZM10 0.666667L11.3333 4H13.3333L12 0.666667H10ZM15.3333 2.66667C15.3333 1.48828 14.5117 0.666667 13.3333 0.666667L14.6667 4H15.3333V2.66667ZM15.3333 4.66667H0.666684V13.3333C0.666684 14.5117 1.4883 15.3333 2.66668 15.3333H13.3334C14.5117 15.3333 15.3334 14.5117 15.3334 13.3333L15.3333 4.66667ZM5.33333 6.66667L11.3333 10L5.33333 13.3333V6.66668V6.66667Z" fill={c}/></svg>
    }
    if (type === 'product') {
      return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}><path d="M15.3151 3.74285L8.57849 0.152349C8.39079 0.0520347 8.18118 -0.000301439 7.96835 1.30601e-06C7.75552 0.000304052 7.54607 0.0532362 7.35865 0.154084L0.681626 3.73784C0.47621 3.84808 0.304417 4.0118 0.184428 4.21168C0.0644391 4.41156 0.000717255 4.64016 6.01973e-06 4.87328C-0.000705216 5.10641 0.0616206 5.33539 0.180388 5.536C0.299155 5.73661 0.469946 5.90138 0.674685 6.01287L7.3841 9.66757C7.57368 9.77131 7.78631 9.82568 8.00241 9.82568C8.21851 9.82568 8.43114 9.77131 8.62072 9.66757L15.3249 6.01962C15.53 5.90805 15.7011 5.74304 15.8199 5.54209C15.9388 5.34114 16.001 5.11176 16 4.8783C15.999 4.64483 15.9348 4.416 15.8142 4.21609C15.6936 4.01617 15.5211 3.85264 15.3151 3.74285Z" fill={c}/><path d="M14.8638 8.05678L8.16012 11.7047C8.11188 11.7311 8.05778 11.745 8.00279 11.745C7.94781 11.745 7.89371 11.7311 7.84547 11.7047L1.13644 8.04945C1.08085 8.01917 1.01984 8.00014 0.9569 7.99343C0.893956 7.98673 0.830308 7.99249 0.769589 8.01038C0.708871 8.02828 0.652272 8.05796 0.603023 8.09772C0.553775 8.13749 0.512841 8.18657 0.48256 8.24216C0.452279 8.29774 0.433243 8.35875 0.426539 8.4217C0.419835 8.48464 0.425595 8.54829 0.443489 8.60901C0.461383 8.66972 0.491061 8.72632 0.530829 8.77557C0.570597 8.82482 0.619676 8.86575 0.675263 8.89604L7.38468 12.5509C7.57428 12.6546 7.7869 12.7089 8.00299 12.7089C8.21907 12.7089 8.43169 12.6546 8.62129 12.5509L15.3249 8.90355C15.4372 8.8424 15.5206 8.73914 15.5568 8.6165C15.5929 8.49385 15.5789 8.36187 15.5177 8.24958C15.4566 8.13729 15.3533 8.05389 15.2307 8.01774C15.108 7.98158 14.976 7.99562 14.8638 8.05678Z" fill={c}/></svg>
    }
    if (type === 'ppt') {
      return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}><g clipPath="url(#pptClip)"><path d="M9 1.49995V1.18589C9 0.5562 8.42344 0.0827627 7.80625 0.204638L0.80625 1.59058C0.3375 1.68276 0 2.0937 0 2.57183V13.4265C0 13.9046 0.339062 14.3171 0.809375 14.4078L7.80937 15.7687C8.42656 15.889 9 15.4156 9 14.7875V14.5H15.5C15.7766 14.5 16 14.2765 16 14V1.99995C16 1.72339 15.7766 1.49995 15.5 1.49995H9Z" fill={c}/><path d="M3.43591 9.13281V10.5266C3.43591 10.6797 3.29998 10.7969 3.14841 10.7734L2.67185 10.7016C2.54998 10.6828 2.45935 10.5781 2.45935 10.4547V5.81406C2.45935 5.56719 2.6406 5.35625 2.88435 5.32031L4.09373 5.1375C5.4781 4.925 6.24998 5.4875 6.24998 6.84375C6.24998 7.50312 6.01091 8.03125 5.54841 8.41562C5.10623 8.78281 4.57966 8.93906 3.98279 8.89531L3.69685 8.88281C3.55466 8.87656 3.43591 8.99062 3.43591 9.13281ZM3.43591 6.38438V7.95937L3.89373 7.95781C4.5531 7.95469 4.89998 7.62656 4.89998 6.97031C4.89998 6.32969 4.55623 6.04375 3.9031 6.11094L3.65935 6.13594C3.53279 6.14844 3.43591 6.25625 3.43591 6.38438ZM10.75 5.29531C11.2937 5.39531 11.7953 5.65625 12.1953 6.05625C12.4687 6.32969 12.6781 6.65156 12.814 7.00156H10.75V5.29531ZM10.25 4.25H9.99998C9.86248 4.25 9.74998 4.3625 9.74998 4.5V7.5C9.74998 7.77656 9.97341 8 10.25 8H13.7406C13.8859 8 14 7.87656 13.9906 7.73125C13.8531 5.78594 12.2312 4.25 10.25 4.25Z" fill={c}/></g><defs><clipPath id="pptClip"><rect width="16" height="16" fill="white"/></clipPath></defs></svg>
    }
    return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}><rect x="0.5" y="0.5" width="15" height="15" rx="1.5" stroke={c} strokeWidth="0.66"/><circle cx="5.5" cy="5.5" r="1.17" fill={c}/><path d="M3.47 13.386L2.507 12.96l.213-.48c1.12-2.614 2.933-3.947 5.333-4.107 2.027-.106 3.52-.693 4.427-1.76l.373-.426.8.693-.373.427c-1.12 1.28-2.88 2.026-5.173 2.133-1.974.107-3.414 1.227-4.374 3.467l-.266.48z" fill={c}/></svg>
  }

  const sidebarSections = [
    {
      header: 'AI创作',
      items: [
        { label: 'AI 生图', active: true, route: '/workbench', icon: 'frame' },
        { label: 'AI 海报', route: null, icon: 'frame' },
        { label: 'AI 视频', route: null, icon: 'video' },
      ],
    },
    {
      header: '我的',
      items: [
        { label: '商品', route: '/my-gifts', icon: 'product' },
        { label: '画册', route: '/digital-album', icon: 'frame' },
        { label: '礼册', badge: true, route: null, icon: 'frame' },
        { label: 'PPT', badge: true, route: null, icon: 'ppt' },
      ],
    },
    {
      header: '资源',
      items: [
        { label: '礼品卡', route: null, icon: 'frame' },
        { label: '礼品册', route: null, icon: 'frame' },
        { label: '礼品券', route: null, icon: 'frame' },
        { label: '画册封面', route: null, icon: 'frame' },
        { label: '封套', route: null, icon: 'frame' },
      ],
    },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#fff' }}>
      {/* ========== Sidebar ========== */}
      <div style={{ width: 248, flexShrink: 0, background: '#F9FAFD', borderRight: '1px solid #E6E6E6', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '30px 16px 24px' }}>
          <img src="https://gift-bucket-0503.oss-cn-beijing.aliyuncs.com/static/site/logo-64.png" alt="" style={{ width: 32, height: 32, borderRadius: 4 }} />
          <span style={{ fontSize: 16, fontWeight: 900, color: '#000' }}>礼企汇</span>
        </div>

        {/* Nav Sections */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
          {sidebarSections.map((section, si) => (
            <div key={si} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#B1B1B1', marginBottom: 4 }}>{section.header}</div>
              {section.items.map((item, ii) => (
                <div key={ii}
                  onClick={() => { if (item.route) navigate(item.route) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, height: 40, padding: '0 12px', borderRadius: 5, cursor: item.route ? 'pointer' : 'default',
                    background: item.active ? 'rgba(123, 82, 255, 0.1)' : 'transparent',
                    color: item.active ? '#000' : (item.badge ? '#D8D8D8' : '#000'),
                    fontSize: 14, fontWeight: item.active ? 500 : 400,
                    marginBottom: 0, position: 'relative',
                  }}
                >
                  <NavIcon type={item.icon} active={item.active} disabled={!!item.badge} />
                  {item.label}
                  {item.badge && (
                    <span style={{ marginLeft: 'auto', fontSize: 12, padding: '1px 8px', borderRadius: 4, background: '#F4F4F4', color: '#D8D8D8', lineHeight: '18px' }}>敬请期待</span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Bottom - User hover panel */}
        <div style={{ padding: '0 16px 20px', position: 'relative' }}
          onMouseEnter={() => setUserPop(true)}
          onMouseLeave={() => setUserPop(false)}
        >
          <div style={{ height: 1, background: '#EBEBEB', marginBottom: 12 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(123,82,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: '#000', flexShrink: 0 }}>
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <span style={{ fontSize: 14, color: '#000' }}>{user?.email?.split('@')[0] || '用户'}</span>
          </div>
          {userPop && (
            <div style={{ position: 'absolute', bottom: '100%', left: 16, right: 16, paddingBottom: 12, zIndex: 1001 }}
              onMouseEnter={() => setUserPop(true)}
              onMouseLeave={() => setUserPop(false)}
            >
              <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', width: '100%', padding: '8px 0' }}>
                <div style={{ padding: '10px 16px 8px', fontSize: 13, color: '#999' }}>
                  <div>{user?.email}</div>
                  {user?.isAdmin ? (
                    <span style={{ display: 'inline-block', marginTop: 6, fontSize: 11, padding: '2px 10px', borderRadius: 4, background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 40%, #B91C1C 100%)', color: '#fff', fontWeight: 600, letterSpacing: 0.3, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)' }}>管理员</span>
                  ) : null}
                </div>
                {user?.isAdmin && (
                  <>
                    <div style={{ borderTop: '1px solid #f0f0f0' }} />
                    <div style={{ padding: '8px 16px 4px', fontSize: 11, color: '#bbb', fontWeight: 500, letterSpacing: 0.5 }}>后台管理</div>
                    <button style={{ display: 'block', width: '100%', padding: '6px 16px', border: 'none', background: 'none', fontSize: 14, color: '#555', cursor: 'pointer', textAlign: 'left' }}
                      onMouseEnter={e => e.target.style.background = '#f5f5f5'}
                      onMouseLeave={e => e.target.style.background = 'none'}
                      onClick={() => { navigate('/model-use'); setUserPop(false) }}
                    >AI模型管理</button>
                    <button style={{ display: 'block', width: '100%', padding: '6px 16px', border: 'none', background: 'none', fontSize: 14, color: '#555', cursor: 'pointer', textAlign: 'left' }}
                      onMouseEnter={e => e.target.style.background = '#f5f5f5'}
                      onMouseLeave={e => e.target.style.background = 'none'}
                      onClick={() => { navigate('/template-set'); setUserPop(false) }}
                    >画册模板</button>
                  </>
                )}
                <div style={{ borderTop: '1px solid #f0f0f0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', fontSize: 14, color: '#555' }}>
                  <span>图片消耗</span>
                  <span style={{ fontWeight: 600 }}>{user?.generatedCount ?? 0}/2500</span>
                </div>
                <button style={{ display: 'block', width: '100%', padding: '10px 16px', border: 'none', background: 'none', fontSize: 14, color: '#ff4d4f', cursor: 'pointer', textAlign: 'left' }}
                  onMouseEnter={e => e.target.style.background = '#fff2f0'}
                  onMouseLeave={e => e.target.style.background = 'none'}
                  onClick={() => { logout(); setUserPop(false) }}
                >退出登录</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========== Main Content ========== */}
      <div style={{ flex: 1, minWidth: 0, overflow: 'auto', padding: '40px 40px 40px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 48 }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}><path d="M8.859 5.338H1.789v-.685h7.07v.685z" fill="#ACACAC"/><path d="M4.526 1.75a.49.49 0 0 1 .39.16.54.54 0 0 1 .075.54.44.44 0 0 1-.094.175L2.106 4.996l2.661 2.661a.483.483 0 0 1-.483.792.36.36 0 0 1-.16-.109L1.139 4.996 4.284 1.85a.47.47 0 0 1 .242-.1z" fill="#ACACAC"/></svg>
          <span style={{ fontSize: 14, color: '#ACACAC' }}>返回首页</span>
          <div style={{ width: 0, height: 12, borderLeft: '1px solid #D5D5D5' }} />
          <div style={{ width: 18, height: 18, borderRadius: 3, background: 'linear-gradient(0deg, #72D2FF, #7B52FF)', flexShrink: 0 }} />
          <span style={{ fontSize: 18, fontWeight: 700, color: '#000' }}>AI 生图</span>
        </div>

        <input ref={refInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); e.target.value = '' }} />

        {/* 3-Column Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 30, maxWidth: 1400 }}>

          {/* ========== COL 1: Upload ========== */}
          <div>
            <div style={{ fontSize: 14, color: '#000', marginBottom: 14 }}>上传产品图</div>
            {uploadedRef ? (
              <div style={{ position: 'relative', width: '100%', height: 300, borderRadius: 10, overflow: 'hidden', border: '1px solid #D3D3D3', background: 'rgba(0,0,0,0.02)' }}
                onMouseEnter={(e) => { clearTimeout(previewTimer.current); const r = e.currentTarget.getBoundingClientRect(); previewTimer.current = setTimeout(() => { setPreviewPos({ left: r.right + 8, top: Math.min(r.top, window.innerHeight * 0.5 - 24) }); setPreviewUrl(uploadedRef.url) }, 300) }}
                onMouseLeave={() => { clearTimeout(previewTimer.current); setPreviewUrl(null) }}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleImageFile(f) }}
              >
                <img src={uploadedRef.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', background: 'rgba(0,0,0,0.02)' }} />
                {dragOver && <div style={{ position: 'absolute', inset: 0, background: 'rgba(123,82,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#7B52FF', fontWeight: 600 }}>松开替换图片</div>}
                <div onClick={() => setUploadedRef(null)} style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.35)', color: '#fff', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>&#10005;</div>
              </div>
            ) : (
              <div
                onClick={() => refInputRef.current?.click()}
                style={{ width: '100%', height: 300, borderRadius: 10, border: '1px dashed #D3D3D3', background: 'rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: 16, transition: 'all .25s' }}
                onMouseEnter={e => { if (!dragOver) { e.currentTarget.style.borderColor = '#7B52FF'; e.currentTarget.style.background = 'rgba(123,82,255,0.04)' } }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#D3D3D3'; e.currentTarget.style.background = 'rgba(0,0,0,0.02)' }}
                onDragOver={e => { e.preventDefault(); setDragOver(true); e.currentTarget.style.borderColor = '#7B52FF'; e.currentTarget.style.background = 'rgba(123,82,255,0.04)' }}
                onDragLeave={e => { setDragOver(false); e.currentTarget.style.borderColor = '#D3D3D3'; e.currentTarget.style.background = 'rgba(0,0,0,0.02)' }}
                onDrop={e => { e.preventDefault(); setDragOver(false); e.currentTarget.style.borderColor = '#D3D3D3'; e.currentTarget.style.background = 'rgba(0,0,0,0.02)'; const f = e.dataTransfer.files?.[0]; if (f) handleImageFile(f) }}
              >
                <div style={{ width: 56, height: 56, borderRadius: 10, background: 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M16 6v13.333M9.333 14.667L16 8l6.667 6.667" stroke="#ACACAC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 24h20" stroke="#ACACAC" strokeWidth="2" strokeLinecap="round"/></svg>
                </div>
                <span style={{ fontSize: 14, color: '#ACACAC' }}>拖拽图片到此处或点击上传</span>
              </div>
            )}

            {previewUrl === uploadedRef?.url && (
              <div style={{ position: 'fixed', zIndex: 1000, left: previewPos.left, top: previewPos.top, background: '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,.15)', padding: 6, pointerEvents: 'none', border: '1px solid #e8e6e4' }}>
                <img src={uploadedRef.url} alt="" style={{ maxWidth: '30vw', maxHeight: '50vh', borderRadius: 6, display: 'block' }} />
              </div>
            )}

            {/* Upload suggestions */}
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 14, color: '#999', marginBottom: 8 }}>上传建议</div>
              <div style={{ border: '1px dashed #D3D3D3', borderRadius: 10, padding: '12px 16px', background: 'rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
                  <span style={{ color: '#999', flexShrink: 0 }}>•</span>
                  <span style={{ fontSize: 12, color: '#999', lineHeight: 1.6 }}>使用光线充足、对焦清晰的产品图</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
                  <span style={{ color: '#999', flexShrink: 0 }}>•</span>
                  <span style={{ fontSize: 12, color: '#999', lineHeight: 1.6 }}>产品主体清晰、背景尽量简洁</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
                  <span style={{ color: '#999', flexShrink: 0 }}>•</span>
                  <span style={{ fontSize: 12, color: '#999', lineHeight: 1.6 }}>产品居中放置在画面中间</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
                  <span style={{ color: '#999', flexShrink: 0 }}>•</span>
                  <span style={{ fontSize: 12, color: '#999', lineHeight: 1.6 }}>建议分辨率 1024x1024 以上</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                  <span style={{ color: '#999', flexShrink: 0 }}>•</span>
                  <span style={{ fontSize: 12, color: '#999', lineHeight: 1.6 }}>上传后 AI 将基于原图优化而非重绘</span>
                </div>
              </div>
            </div>
          </div>

          {/* ========== COL 2: Parameters ========== */}
          <div>
            {/* Image Type */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 14, color: '#000', marginBottom: 10 }}>图片类型</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {IMAGE_TYPES.map(t => {
                  const isFirst = t === IMAGE_TYPES[0]
                  return (
                    <div key={t}
                      onClick={() => {
                        const v = t; setImageType(v); const c = v === '详情图' ? 5 : 1; setTemplateCount(c); templateCountRef.current = c;
                        setPrompts(Array.from({ length: c }, () => ''))
                      }}
                      style={{
                        padding: '6px 18px', fontSize: 14, borderRadius: 8, cursor: 'pointer', userSelect: 'none',
                        background: imageType === t ? 'linear-gradient(270deg, #72D2FF, #A083FF)' : 'transparent',
                        color: imageType === t ? '#fff' : '#000',
                        border: imageType === t ? 'none' : '1px solid transparent',
                        transition: 'all .2s',
                      }}
                    >{t}</div>
                  )
                })}
              </div>
            </div>

            {/* Ratio */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 14, color: '#000', marginBottom: 8 }}>生成比例</div>
              <div ref={ratioRef} style={{ position: 'relative' }}>
                <div onClick={() => setRatioOpen(o => !o)} role="button" tabIndex={0}
                  style={{ height: 42, padding: '0 32px 0 14px', fontSize: 14, border: '1px solid #D3D3D3', borderRadius: 8, background: 'rgba(0,0,0,0.02)', cursor: 'pointer', outline: 'none', color: '#000', display: 'flex', alignItems: 'center',
                    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' fill='none' stroke='%23999' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
                    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center' }}>
                  {imageSize}
                </div>
                {ratioOpen && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: '#fff', border: '1px solid #D3D3D3', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,.08)', padding: 4, zIndex: 50 }}>
                    {['3:4', '1:1', '16:9', '9:16', '2:3', '4:3'].map(v => (
                      <div key={v} onClick={() => { setImageSize(v); setRatioOpen(false) }}
                        style={{ padding: '8px 10px', fontSize: 14, borderRadius: 6, cursor: 'pointer', color: imageSize === v ? '#7B52FF' : '#000', background: imageSize === v ? 'rgba(123,82,255,0.06)' : 'transparent', fontWeight: imageSize === v ? 600 : 400 }}>
                        {v}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Count */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 14, color: '#000', marginBottom: 8 }}>生成张数</div>
              <input value={`${templateCount}张`} readOnly
                style={{ height: 42, padding: '0 14px', fontSize: 14, border: '1px solid #D3D3D3', borderRadius: 8, background: 'rgba(0,0,0,0.02)', outline: 'none', color: '#000', width: '100%', boxSizing: 'border-box', cursor: 'default' }} />
            </div>

            {/* Product Title */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 14, color: '#000', marginBottom: 8 }}>产品标题 <span style={{ color: '#FF4D4F' }}>*</span></div>
              <input value={productTitle} onChange={e => setProductTitle(e.target.value)} placeholder=""
                style={{ height: 42, padding: '0 14px', fontSize: 14, border: '1px solid #D3D3D3', borderRadius: 8, background: 'rgba(0,0,0,0.02)', outline: 'none', color: '#000', width: '100%', boxSizing: 'border-box' }} />
            </div>

            {/* Generate Button */}
            <button
              disabled={!canGenerate || generating}
              onClick={handleGenerate}
              style={{
                height: 48, fontSize: 15, fontWeight: 500,
                background: !canGenerate || generating ? '#ccc' : 'linear-gradient(90deg, #7B52FF, #72D2FF)',
                color: '#fff', border: 'none', borderRadius: 10,
                cursor: !canGenerate || generating ? 'not-allowed' : 'pointer',
                boxShadow: !canGenerate || generating ? 'none' : '0 4px 20px rgba(123,82,255,.25)',
                opacity: !canGenerate || generating ? 0.5 : 1,
                transition: 'all .3s', width: '100%',
              }}
              onMouseEnter={e => { if (canGenerate && !generating) { e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = '0 8px 28px rgba(123,82,255,.35)' } }}
              onMouseLeave={e => { if (canGenerate && !generating) { e.target.style.transform = 'none'; e.target.style.boxShadow = '0 4px 20px rgba(123,82,255,.25)' } }}
            >生成图片</button>
          </div>

          {/* ========== COL 3: Results ========== */}
          <div>
            <div style={{ fontSize: 14, color: '#000', marginBottom: 14 }}>生成结果</div>
            <div style={{ border: '1px solid #D3D3D3', borderRadius: 10, background: 'rgba(0,0,0,0.02)', minHeight: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              {(() => {
                const ratio = imageSize.replace(':', ' / ')
                if (generations.filter(g => !g.restored).length > 0) {
                  const last = [...generations].filter(g => !g.restored).reverse()[0]
                  const urls = last.imageUrls && last.imageUrls.length ? last.imageUrls : (last.imageUrl ? [last.imageUrl] : [])
                  if (last.error) {
                    return <div style={{ width: '100%', aspectRatio: ratio, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF4D4F', fontSize: 13, padding: '0 12px', textAlign: 'center' }}>{last.error}</div>
                  }
                  if (urls.length === 0) {
                    const loadingText = analyzing ? 'AI 分析中' : (generatingPrompts ? 'AI 文案策划中' : last.statusText)
                    return <div style={{ width: '100%', aspectRatio: ratio, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 13 }}><div className="loading-spinner" /><WipeText text={loadingText} /></div>
                  }
                  if (urls.length >= 5) {
                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5, padding: 5, width: '100%' }}>
                        {urls.slice(0, 6).map((url, i) => (
                          <ResultImageCell key={i} url={url} ratio={ratio} onClick={() => { setPreviewUrls(urls.filter(Boolean)); setPreviewIndex(i) }} />
                        ))}
                      </div>
                    )
                  }
                  const cols = urls.length === 1 ? 1 : 2
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 10, width: '100%' }}>
                      {urls.map((url, i) => <ResultImageCell key={i} url={url} ratio={ratio} onClick={() => { setPreviewUrls(urls.filter(Boolean)); setPreviewIndex(i) }} />)}
                    </div>
                  )
                }
                if (analyzing || generatingPrompts) {
                  return <div style={{ width: '100%', aspectRatio: ratio, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 13 }}><div className="loading-spinner" /><WipeText text={analyzing ? 'AI 分析中' : 'AI 文案策划中'} /></div>
                }
                return (
                  <>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginBottom: 8 }}><rect x="1" y="1" width="14" height="14" rx="2" stroke="#D8D8D8" strokeWidth="1.5"/><circle cx="5.5" cy="5.5" r="1.5" fill="#D8D8D8"/><path d="M15 11l-4-4-6 6" stroke="#D8D8D8" strokeWidth="1.5"/></svg>
                    <span style={{ fontSize: 14, color: '#000' }}>暂无生成结果</span>
                  </>
                )
              })()}
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
    </div>
  )
}
