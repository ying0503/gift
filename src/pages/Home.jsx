import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { API, useAuth } from '../AuthContext'
import ImagePreviewModal from '../components/ImagePreviewModal'
import WorkbenchSidebar from '../components/WorkbenchSidebar'

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
    const base = (imgType === '详情图' || imgType === '白底图' || imgType === '样机图' || imgType === '场景图')
      ? (() => { const p = Array.from({ length: count }, () => ''); p[0] = imgType === '样机图' ? '生成一个3d效果图，真实立体包装' : imgType === '场景图' ? '锁定原始产品主体，保持产品100%真实一致：严格保留产品原有的外观设计、产品结构、尺寸比例、颜色、材质纹理、零部件组合方式、品牌标识位置（如原图存在）。禁止改变产品形态，不重新设计，不增加或删除任何部件，不改变产品功能结构。将产品自然融入真实生活使用场景中，打造高级商业产品摄影效果。根据产品属性匹配合理环境：家居用品→温馨现代家庭空间，小家电→干净整洁的厨房客厅办公空间，电子产品→桌面办公居家娱乐科技生活场景，家具→高端室内空间自然光环境，日用品→日常生活使用环境。场景需要真实自然，符合产品实际使用逻辑，空间比例合理，光线符合真实摄影效果，产品与环境自然融合。生成超写实商业产品摄影图：2K高清分辨率，细节锐利清晰，专业摄影棚级画质，真实镜头景深效果，柔和自然光照，高级但真实的色彩表现，材质纹理清晰可见，产品边缘清晰立体，保留真实阴影和空间层次。产品作为画面视觉中心，保持居中或黄金比例构图，占据主要视觉区域，突出产品质感和功能特点，保持真实大小比例，不被环境遮挡。打造高端品牌广告摄影风格：干净自然的生活环境，简洁高级背景，温暖真实氛围，无杂乱物品，无过度装饰，无夸张特效。禁止：不改变产品颜色、结构、组合方式，不增加不存在的功能，不添加文字水印广告语，不生成虚假材质，不改变品牌Logo，不让场景抢占产品主体视觉。最终生成一张真实、高端、自然的商业产品场景摄影照片，类似品牌官网和电商详情页展示图' : '生成白底图'; return p })()
      : Array.from({ length: count }, () => '')
    setPrompts(base)
    try {
      const apiCount = (imgType === '详情图' || imgType === '白底图' || imgType === '样机图' || imgType === '场景图') ? count - 1 : count
      const res = await fetch(`${API}/api/generate/prompts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ count: apiCount, refImage: refImageUrl, model: getTextModel(), temperature: getTemperature(), maxTokens: getMaxTokens(), imageType: imgType, productInfo }),
      })
      const data = await res.json()
      if (genId !== promptGenId.current) return null
      if (data.prompts) {
        const result = (imgType === '详情图' || imgType === '白底图' || imgType === '样机图')
          ? [imgType === '样机图' ? '生成一个3d效果图，真实立体包装' : '生成白底图', ...data.prompts.slice(0, count - 1)]
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
    if (f.size > 10 * 1024 * 1024) {
      alert('图片大小不能超过 10MB')
      return
    }
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

            const imageTypePrefixes = {}
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

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#fff' }}>
      <WorkbenchSidebar />

      {/* ========== Main Content ========== */}
      <div style={{ flex: 1, minWidth: 0, overflow: 'auto', padding: '40px 40px 40px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 48 }}>

          <div style={{ width: 18, height: 18, borderRadius: 3, background: 'linear-gradient(0deg, #72D2FF, #7B52FF)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" style={{ display: 'block' }}><path d="M13.3333 16H2.66667C1.17333 16 0 14.8267 0 13.3333V2.66667C0 1.17333 1.17333 0 2.66667 0H13.3333C14.8267 0 16 1.17333 16 2.66667V13.3333C16 14.8267 14.8267 16 13.3333 16ZM2.66667 1.06667C1.76 1.06667 1.06667 1.76 1.06667 2.66667V13.3333C1.06667 14.24 1.76 14.9333 2.66667 14.9333H13.3333C14.24 14.9333 14.9333 14.24 14.9333 13.3333V2.66667C14.9333 1.76 14.24 1.06667 13.3333 1.06667H2.66667Z" fill="white"/><path d="M4 5.49331C4 5.62639 4.02621 5.75816 4.07714 5.8811C4.12806 6.00404 4.2027 6.11575 4.2968 6.20985C4.39089 6.30395 4.5026 6.37859 4.62555 6.42951C4.74849 6.48044 4.88026 6.50665 5.01333 6.50665C5.14641 6.50665 5.27818 6.48044 5.40112 6.42951C5.52406 6.37859 5.63577 6.30395 5.72987 6.20985C5.82397 6.11575 5.89861 6.00404 5.94953 5.8811C6.00046 5.75816 6.02667 5.62639 6.02667 5.49331C6.02667 5.36024 6.00046 5.22847 5.94953 5.10553C5.89861 4.98258 5.82397 4.87088 5.72987 4.77678C5.63577 4.68268 5.52406 4.60804 5.40112 4.55712C5.27818 4.50619 5.14641 4.47998 5.01333 4.47998C4.88026 4.47998 4.74849 4.50619 4.62555 4.55712C4.5026 4.60804 4.39089 4.68268 4.2968 4.77678C4.2027 4.87088 4.12806 4.98258 4.07714 5.10553C4.02621 5.22847 4 5.36024 4 5.49331Z" fill="white"/><path d="M3.46671 13.3866L2.50671 12.96L2.72005 12.48C3.84005 9.86665 5.65338 8.53331 8.05338 8.37331C10.08 8.26665 11.5734 7.67998 12.48 6.61331L12.8534 6.18665L13.6534 6.87998L13.28 7.30665C12.16 8.58665 10.4 9.33331 8.10671 9.43998C6.13338 9.54665 4.69338 10.6666 3.73338 12.9066L3.46671 13.3866Z" fill="white"/></svg>
          </div>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#000' }}>AI 生图</span>
        </div>

        <input ref={refInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); e.target.value = '' }} />

        {/* 3-Column Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 3fr 4fr', gap: 30, maxWidth: 1400 }}>

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
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M24.8654 12.3636C24.464 10.3071 23.3602 8.45401 21.7428 7.12182C20.1255 5.78963 18.0953 5.06116 16 5.06116C13.9046 5.06116 11.8744 5.78963 10.2571 7.12182C8.63976 8.45401 7.53588 10.3071 7.1345 12.3636C5.49498 12.4398 3.95288 13.1642 2.84743 14.3773C1.74199 15.5905 1.16376 17.1932 1.23995 18.8327C1.31614 20.4722 2.04051 22.0143 3.2537 23.1198C4.46689 24.2252 6.06952 24.8034 7.70904 24.7272H8.67632C8.8692 24.7272 9.05419 24.6506 9.19058 24.5142C9.32697 24.3778 9.40359 24.1929 9.40359 24C9.40359 23.8071 9.32697 23.6221 9.19058 23.4857C9.05419 23.3493 8.8692 23.2727 8.67632 23.2727H7.70904C7.08825 23.2775 6.47259 23.1599 5.89723 22.9268C5.32186 22.6936 4.79805 22.3494 4.35571 21.9138C3.91336 21.4782 3.56115 20.9598 3.31917 20.3881C3.07719 19.8164 2.95018 19.2026 2.94541 18.5818C2.94063 17.961 3.05818 17.3453 3.29134 16.77C3.52449 16.1946 3.86869 15.6708 4.30428 15.2284C4.73987 14.7861 5.25833 14.4339 5.83004 14.1919C6.40175 13.9499 7.01552 13.8229 7.63632 13.8181L8.36359 13.9854L8.45814 13.1854C8.68652 11.3539 9.57607 9.66892 10.9596 8.44723C12.3431 7.22554 14.1252 6.55131 15.9709 6.55131C17.8166 6.55131 19.5987 7.22554 20.9822 8.44723C22.3657 9.66892 23.2552 11.3539 23.4836 13.1854L23.629 13.9709L24.3563 13.8181C24.9771 13.8229 25.5909 13.9499 26.1626 14.1919C26.7343 14.4339 27.2528 14.7861 27.6884 15.2284C28.1239 15.6708 28.4681 16.1946 28.7013 16.77C28.9345 17.3453 29.052 17.961 29.0472 18.5818C29.0425 19.2026 28.9154 19.8164 28.6735 20.3881C28.4315 20.9598 28.0793 21.4782 27.6369 21.9138C27.1946 22.3494 26.6708 22.6936 26.0954 22.9268C25.52 23.1599 24.9044 23.2775 24.2836 23.2727H23.1927C22.9998 23.2727 22.8148 23.3493 22.6784 23.4857C22.542 23.6221 22.4654 23.8071 22.4654 24C22.4654 24.1929 22.542 24.3778 22.6784 24.5142C22.8148 24.6506 22.9998 24.7272 23.1927 24.7272H24.2909C25.9304 24.8034 27.533 24.2252 28.7462 23.1198C29.9594 22.0143 30.6838 20.4722 30.76 18.8327C30.8361 17.1932 30.2579 15.5905 29.1525 14.3773C28.047 13.1642 26.5049 12.4398 24.8654 12.3636Z" fill="black"/><path d="M16.5164 15.0109C16.4488 14.9427 16.3683 14.8886 16.2797 14.8517C16.1911 14.8148 16.096 14.7958 16 14.7958C15.904 14.7958 15.8089 14.8148 15.7203 14.8517C15.6317 14.8886 15.5512 14.9427 15.4836 15.0109L11.3745 19.12C11.3064 19.1876 11.2523 19.268 11.2154 19.3567C11.1784 19.4453 11.1594 19.5403 11.1594 19.6364C11.1594 19.7324 11.1784 19.8274 11.2154 19.916C11.2523 20.0047 11.3064 20.0851 11.3745 20.1527C11.5108 20.2882 11.6951 20.3642 11.8873 20.3642C12.0794 20.3642 12.2637 20.2882 12.4 20.1527L15.2727 17.28V26.1818C15.2727 26.3747 15.3494 26.5597 15.4857 26.6961C15.6221 26.8325 15.8071 26.9091 16 26.9091C16.1929 26.9091 16.3779 26.8325 16.5143 26.6961C16.6507 26.5597 16.7273 26.3747 16.7273 26.1818V17.28L19.6364 20.1527C19.7043 20.2201 19.7849 20.2735 19.8735 20.3096C19.9621 20.3458 20.057 20.3642 20.1527 20.3636C20.2966 20.363 20.437 20.3198 20.5563 20.2394C20.6755 20.159 20.7683 20.045 20.8227 19.9119C20.8772 19.7788 20.891 19.6325 20.8624 19.4915C20.8337 19.3506 20.7639 19.2213 20.6618 19.12L16.5164 15.0109Z" fill="black"/></svg>
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
              <div style={{ border: '1px dashed #D3D3D3', borderRadius: 10, padding: '12px 16px', background: 'rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: 14, color: '#999', marginBottom: 8 }}>上传建议</div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                  <span style={{ color: '#999', flexShrink: 0 }}>•</span>
                  <span style={{ fontSize: 12, color: '#999', lineHeight: 1.6 }}>使用光线充足、对焦清晰的产品图</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                  <span style={{ color: '#999', flexShrink: 0 }}>•</span>
                  <span style={{ fontSize: 12, color: '#999', lineHeight: 1.6 }}>产品主体清晰、背景尽量简洁</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                  <span style={{ color: '#999', flexShrink: 0 }}>•</span>
                  <span style={{ fontSize: 12, color: '#999', lineHeight: 1.6 }}>产品居中放置在画面中间</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {IMAGE_TYPES.map(t => {
                  const isFirst = t === IMAGE_TYPES[0]
                  return (
                    <div key={t}
                      onClick={() => {
                        const v = t; setImageType(v); const c = v === '详情图' ? 5 : 1; setTemplateCount(c); templateCountRef.current = c;
                        setPrompts(Array.from({ length: c }, () => ''))
                      }}
                      style={{
                        padding: '6px 4px', fontSize: 14, borderRadius: 8, cursor: 'pointer', userSelect: 'none', textAlign: 'center', whiteSpace: 'nowrap',
                        background: imageType === t ? 'linear-gradient(270deg, #72D2FF, #A083FF)' : 'transparent',
                        color: imageType === t ? '#fff' : '#000',
                        border: imageType === t ? '1px solid transparent' : '1px solid #EBEBEB',
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
            <div style={{ border: '1px dashed #D3D3D3', borderRadius: 10, background: 'rgba(0,0,0,0.02)', minHeight: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
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
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                    <div style={{ width: 56, height: 56, borderRadius: 10, background: 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><g clipPath="url(#resClip)"><path d="M13.3333 16H2.66667C1.17333 16 0 14.8267 0 13.3333V2.66667C0 1.17333 1.17333 0 2.66667 0H13.3333C14.8267 0 16 1.17333 16 2.66667V13.3333C16 14.8267 14.8267 16 13.3333 16ZM2.66667 1.06667C1.76 1.06667 1.06667 1.76 1.06667 2.66667V13.3333C1.06667 14.24 1.76 14.9333 2.66667 14.9333H13.3333C14.24 14.9333 14.9333 14.24 14.9333 13.3333V2.66667C14.9333 1.76 14.24 1.06667 13.3333 1.06667H2.66667Z" fill="#666666"/><path d="M4 5.49331C4 5.62639 4.02621 5.75816 4.07714 5.8811C4.12806 6.00404 4.2027 6.11575 4.2968 6.20985C4.39089 6.30395 4.5026 6.37859 4.62555 6.42951C4.74849 6.48044 4.88026 6.50665 5.01333 6.50665C5.14641 6.50665 5.27818 6.48044 5.40112 6.42951C5.52406 6.37859 5.63577 6.30395 5.72987 6.20985C5.82397 6.11575 5.89861 6.00404 5.94953 5.8811C6.00046 5.75816 6.02667 5.62639 6.02667 5.49331C6.02667 5.36024 6.00046 5.22847 5.94953 5.10553C5.89861 4.98258 5.82397 4.87088 5.72987 4.77678C5.63577 4.68268 5.52406 4.60804 5.40112 4.55712C5.27818 4.50619 5.14641 4.47998 5.01333 4.47998C4.88026 4.47998 4.74849 4.50619 4.62555 4.55712C4.5026 4.60804 4.39089 4.68268 4.2968 4.77678C4.2027 4.87088 4.12806 4.98258 4.07714 5.10553C4.02621 5.22847 4 5.36024 4 5.49331Z" fill="#666666"/><path d="M3.46667 13.3866L2.50667 12.96L2.72 12.48C3.84 9.86665 5.65333 8.53331 8.05333 8.37331C10.08 8.26665 11.5733 7.67998 12.48 6.61331L12.8533 6.18665L13.6533 6.87998L13.28 7.30665C12.16 8.58665 10.4 9.33331 8.10667 9.43998C6.13333 9.54665 4.69333 10.6666 3.73333 12.9066L3.46667 13.3866Z" fill="#666666"/></g><defs><clipPath id="resClip"><rect width="16" height="16" fill="white"/></clipPath></defs></svg>
                    </div>
                    <span style={{ fontSize: 14, color: '#ACACAC' }}>暂无生成结果</span>
                  </div>
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
