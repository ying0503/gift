import { useState, useRef, useEffect, useCallback } from 'react'
import { CloseOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons'
import { API } from '../AuthContext'

const TEMPLATES = [
  { id: 1, img: 'https://picsum.photos/seed/gift1/400/400', prompt: '高端商务礼品套装，深色皮质礼盒，金色logo压印，内衬丝绸，包含钢笔和名片夹，轻奢简约风格' },
  { id: 2, img: 'https://picsum.photos/seed/gift2/400/400', prompt: '精美鲜花礼盒，粉白色玫瑰搭配尤加利叶，韩式花艺包装，蝴蝶结丝带，自然光拍摄，温馨浪漫氛围' },
  { id: 3, img: 'https://picsum.photos/seed/gift3/400/400', prompt: '中式糕点礼盒，红色烫金包装，传统花纹图案，内含月饼蛋黄酥，古风韵味，喜庆节日风格' },
]

export default function Home() {
  const [image_size, setImageSize] = useState('1K')
  const [generating, setGenerating] = useState(false)
  const [generatingPrompts, setGeneratingPrompts] = useState(false)
  const promptGenId = useRef(0)
  const templateCountRef = useRef(1)
  const [showTemplates, setShowTemplates] = useState(false)
  const templateBtnRef = useRef(null)

  const getModel = () => {
    const saved = localStorage.getItem('defaultImageModel')
    return ['maiziai-chatgpt-image-2', 'agnes-image-2.1-flash'].includes(saved) ? saved : 'maiziai-chatgpt-image-2'
  }
  const getTextModel = () => {
    const saved = localStorage.getItem('textGenerationModel')
    return ['qwen3.5-flash', 'glm-4.6v-flashx', 'doubao-seed-2-0-mini-260428'].includes(saved) ? saved : 'qwen3.5-flash'
  }
  const getTemperature = () => parseFloat(localStorage.getItem('textTemperature') || '0.8')
  const getMaxTokens = () => parseInt(localStorage.getItem('textMaxTokens') || '2000', 10)

  async function generatePrompts(fest, count, refImageUrl) {
    if (!fest) { setPrompts(Array.from({ length: count }, () => '')); return }
    const token = localStorage.getItem('token')
    if (!token) return
    const genId = ++promptGenId.current
    setGeneratingPrompts(true)
    setPrompts(Array.from({ length: count }, () => ''))
    try {
      const res = await fetch(`${API}/api/generate/prompts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ festival: fest, count, refImage: refImageUrl, model: getTextModel(), temperature: getTemperature(), maxTokens: getMaxTokens() }),
      })
      const data = await res.json()
      if (genId !== promptGenId.current) return
      if (data.prompts) setPrompts(data.prompts)
    } catch (e) {
      if (genId !== promptGenId.current) return
      setPrompts(Array.from({ length: count }, () => ''))
    } finally {
      if (genId === promptGenId.current) setGeneratingPrompts(false)
    }
  }

  const [templateCount, setTemplateCount] = useState(1)
  const [prompts, setPrompts] = useState([''])
  const [festival, setFestival] = useState('')
  const [imageType, setImageType] = useState('白底图')

  const [generations, setGenerations] = useState([])
  const pollTimers = useRef({})
  const [albums, setAlbums] = useState([])
  const [albumPage, setAlbumPage] = useState(0)
  const [viewAlbum, setViewAlbum] = useState(null)
  const [uploadedRef, setUploadedRef] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [previewPos, setPreviewPos] = useState({ left: 0, top: 0 })
  const previewTimer = useRef(null)
  const refInputRef = useRef()
  const PAGE_SIZE = 20

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

  function handleDelete(e, albumId) {
    e.stopPropagation()
    Modal.confirm({
      title: '删除画册',
      content: '确定要删除这个画册吗？',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        const token = localStorage.getItem('token')
        if (!token) return
        const res = await fetch(`${API}/api/albums/${albumId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
        if (res.ok) fetchAlbums()
      },
    })
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
    if (viewAlbum) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [viewAlbum])

  useEffect(() => {
    fetchAlbums()
    const token = localStorage.getItem('token')
    if (!token) return
    const pending = JSON.parse(localStorage.getItem(PENDING_BATCHES_KEY) || '[]')
    for (const p of pending) {
      if (!p.batchId) {
        setGenerations(g => (g.some(x => x.id === p.id) ? g : [...g, { id: p.id, batchId: null, progress: 0, statusText: '已中断',         imageUrl: null, imageUrls: null, error: '生成未完成，页面刷新导致任务中断', prompt: p.prompts[0], promptCount: p.prompts.length }]))
        removePendingBatch(p.id)
        continue
      }
      setGenerations(g => (g.some(x => x.id === p.id) ? g : [...g, { id: p.id, batchId: p.batchId, progress: 0, statusText: '恢复中...',         imageUrl: null, imageUrls: null, error: null, prompt: p.prompts[0], promptCount: p.prompts.length }]))
      startBatchPolling(p.id, p.batchId, token, p.prompts, () => { removePendingBatch(p.id) })
    }
    return () => {
      for (const key of Object.keys(pollTimers.current)) {
        const t = pollTimers.current[key]
        if (t?.sim) clearInterval(t.sim)
        if (t?.poll) clearTimeout(t.poll)
      }
    }
  }, [fetchAlbums])

  const canGenerate = getModel() && prompts.every(p => p.length > 0)

  const handleGenerate = async () => {
    if (!getModel()) return alert('请选择模型')

    setGenerating(true)

    const token = localStorage.getItem('token')
    if (!token) {
      alert('请先登录')
      setGenerating(false)
      return
    }

    const promptList = prompts.filter(p => p.trim())
    if (promptList.length === 0) return

    const id = Date.now() + Math.random().toString(36).slice(2, 6)
    setGenerations(g => [...g, { id, batchId: null, progress: 0, statusText: '准备中...',         imageUrl: null, imageUrls: null, error: null, prompt: promptList[0], promptCount: promptList.length }])
    savePendingBatch(id, null, promptList)

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
          config: { size: '3:4', model: getModel(), image_size, n: 1, festival: festival || undefined },
          prompts: promptList,
          images: sendImages.length ? sendImages : undefined,
        }),
      })

      const r = await res.json()
      if (!res.ok) throw new Error(r.error || '请求失败')

      setGenerations(g => g.map(item => item.id === id ? { ...item, batchId: r.batchId, statusText: '任务已提交' } : item))
      savePendingBatch(id, r.batchId, promptList)
      startBatchPolling(id, r.batchId, token, promptList, () => { setGenerating(false); removePendingBatch(id) })
    } catch (err) {
      setGenerations(g => g.map(item => item.id === id ? { ...item, error: err.message } : item))
      setGenerating(false)
    }
  }

  function startBatchPolling(id, batchId, token, prompts, onDone) {
    let cancelled = false, realDone = false

    const poll = async () => {
      try {
        const r = await fetch(`${API}/api/generate/batch-status?batchId=${batchId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const res = await r.json()
        if (!r.ok || cancelled) return

        if (typeof res.progress === 'number' && res.progress > 0) {
          setGenerations(g => g.map(item => item.id === id ? { ...item, progress: res.progress, statusText: res.statusText || item.statusText } : item))
        }
        if (res.status === 'FAILED') {
          realDone = true
          setGenerations(g => g.map(item => item.id === id ? { ...item, error: res.statusText || '生成失败' } : item))
          fetchAlbums()
          onDone?.()
          return
        }
        if (res.status === 'SUCCEEDED' && res.imageUrl) {
          realDone = true
          setGenerations(g => g.filter(item => item.id !== id))
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
        return { ...item, progress: p }
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
      <div className="mobile-only" style={{ width: '100%', marginTop: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#333', marginBottom: 8 }}>我的礼品图</div>
        {viewAlbum ? (
          <div className="card" style={{ padding: 16, marginBottom: 0 }}>
            <button onClick={() => setViewAlbum(null)} className="btn btn-outline" style={{ marginBottom: 12, fontSize: 13, padding: '4px 12px' }}>← 返回</button>
            {(viewAlbum.imageUrls || [viewAlbum.imageUrl]).map((url, i) => (
              <img key={i} src={url} alt="" style={{ width: '100%', borderRadius: 6, display: 'block', marginBottom: i < (viewAlbum.imageUrls || [viewAlbum.imageUrl]).length - 1 ? 12 : 0 }} />
            ))}
          </div>
        ) : albums.length === 0 && generations.length === 0 ? (
          <div className="card" style={{ padding: 40, textAlign: 'center', color: '#999' }}>暂无画册</div>
        ) : (
          <>
            <div className="card-grid">
              {[...generations].reverse().map(item => (
                <div key={item.id} className="card" style={{ padding: 12, margin: 0, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: 0 }}>
                  {!item.error ? (
                    <div>
                      <div className="loading-spinner" />
                      <div style={{ fontSize: 28, fontWeight: 700, color: '#1677FF', marginTop: 12 }}>{item.progress}%</div>
                    </div>
                  ) : (
                    <div style={{ color: '#FF4D4F', fontSize: 13 }}>{item.error}</div>
                  )}
                </div>
              ))}
              {[...albums].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(albumPage * PAGE_SIZE, (albumPage + 1) * PAGE_SIZE).map(album => (
                <div key={album.id} className="card" style={{ padding: 12, margin: 0, cursor: 'pointer', display: 'flex', flexDirection: 'column', minWidth: 0 }} onClick={() => setViewAlbum(album)}>
                  <div style={{ position: 'relative' }}>
                    <img src={album.imageUrl} alt="" style={{ width: '100%', aspectRatio: '1', borderRadius: 4, objectFit: 'cover' }} />
                    {album.imageUrls?.length > 1 && (
                      <div style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,.55)', color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 10 }}>共{album.imageUrls.length}张</div>
                    )}
                    <div onClick={e => handleDelete(e, album.id)} style={{ position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,.4)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 12 }}><DeleteOutlined /></div>
                  </div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 8, lineHeight: 1.6 }}>
                    <div style={{ color: '#999' }}>{new Date(album.createdAt).toLocaleDateString('zh-CN')}</div>
                  </div>

                </div>
              ))}
            </div>
            {albums.length > PAGE_SIZE && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 }}>
                <button className="btn btn-outline" disabled={albumPage === 0} onClick={() => setAlbumPage(p => p - 1)}>上一页</button>
                <span style={{ fontSize: 13, color: '#666', alignSelf: 'center' }}>{albumPage + 1} / {Math.ceil(albums.length / PAGE_SIZE)}</span>
                <button className="btn btn-outline" disabled={(albumPage + 1) * PAGE_SIZE >= albums.length} onClick={() => setAlbumPage(p => p + 1)}>下一页</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Right: Preview */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="desktop-only">
        {/* Generate Panel */}
        <div className="card" style={{ marginBottom: 20, maxWidth: 800, marginLeft: 'auto', marginRight: 'auto', marginTop: 116, borderRadius: 16, border: '1px solid #f0f0f0', boxShadow: '0 2px 12px rgba(0,0,0,.06)' }}>
          <input ref={refInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) { const fr = new FileReader(); fr.onload = () => { setUploadedRef({ url: fr.result, blob: f }); if (prompts.some(p => p.trim()) && festival) generatePrompts(festival, templateCountRef.current, fr.result) }; fr.readAsDataURL(f) } e.target.value = '' }} />
          {previewUrl === uploadedRef?.url && (
            <div style={{ position: 'fixed', zIndex: 1000, left: previewPos.left, top: previewPos.top, background: '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,.2)', padding: 6, pointerEvents: 'none', border: '1px solid rgba(0,0,0,.06)' }}>
              <img src={uploadedRef.url} alt="" style={{ maxWidth: '30vw', maxHeight: '50vh', borderRadius: 6, display: 'block' }} />
            </div>
          )}
          <div style={{ display: 'flex', gap: 14 }}>
            {uploadedRef ? (
              <div style={{ position: 'relative', width: 80, height: 80, borderRadius: 10, overflow: 'hidden', border: '2px solid #e8e0ff', boxShadow: '0 2px 12px rgba(139,92,246,.12)', flexShrink: 0 }}
                onMouseEnter={(e) => { clearTimeout(previewTimer.current); const r = e.currentTarget.getBoundingClientRect(); previewTimer.current = setTimeout(() => { setPreviewPos({ left: r.right + 8, top: Math.min(r.top, window.innerHeight * 0.5 - 24) }); setPreviewUrl(uploadedRef.url) }, 300) }}
                onMouseLeave={() => { clearTimeout(previewTimer.current); setPreviewUrl(null) }}
              >
                <img src={uploadedRef.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div onClick={() => setUploadedRef(null)} style={{ position: 'absolute', top: 3, right: 3, width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,.45)', color: '#fff', fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all .2s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,.7)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,.45)' }}
                >&#10005;</div>
              </div>
            ) : (
              <div onClick={() => refInputRef.current?.click()} style={{ width: 80, height: 80, borderRadius: 10, border: '1.5px dashed #d9d9d9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 11, color: '#bbb', transition: 'all .25s', flexShrink: 0, gap: 2 }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#8B5CF6'; e.currentTarget.style.color = '#8B5CF6'; e.currentTarget.style.background = 'rgba(139,92,246,.04)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#d9d9d9'; e.currentTarget.style.color = '#bbb'; e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ fontSize: 20, lineHeight: 1 }}>+</span>
                <span style={{ letterSpacing: 0 }}>参考图</span>
              </div>
            )}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, position: 'relative' }}>
            {prompts.map((p, i) => (
              <div key={i} style={{ flex: 1 }}>
              <textarea
              ref={el => textareaRefs.current[i] = el}
              style={{
                width: '100%', minHeight: 78, padding: '14px 16px', fontSize: 15, color: '#1a1a1a',
                border: '1px solid #e8e8e8', borderRadius: 10, background: '#fafafa',
                resize: 'none', lineHeight: 1.7, boxSizing: 'border-box', outline: 'none', transition: 'all .25s',
                fontFamily: 'inherit', overflow: 'hidden',
              }}
              onFocus={e => { e.target.style.borderColor = '#8B5CF6'; e.target.style.boxShadow = '0 0 0 3px rgba(139,92,246,.08)'; e.target.style.background = '#fff' }}
              onBlur={e => { e.target.style.borderColor = '#e8e8e8'; e.target.style.boxShadow = 'none'; e.target.style.background = '#fafafa' }}
              value={p}
              onChange={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; const next = [...prompts]; next[i] = e.target.value; setPrompts(next) }}
              placeholder={''}
            />
              </div>
            ))}
            {generatingPrompts && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(250,250,250,.75)', backdropFilter: 'blur(3px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 2, borderRadius: 10, gap: 4 }}>
                <span style={{ fontSize: 15, color: '#777', letterSpacing: 0.5 }}>AI智能文案策划中<span className="loading-dots"><span>.</span><span>.</span><span>.</span></span></span>
              </div>
            )}
          </div>
          </div>
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select value={imageType} onChange={e => { const v = e.target.value; setImageType(v); const c = v === '详情图' ? 3 : 1; setTemplateCount(c); templateCountRef.current = c; if (festival) { generatePrompts(festival, c, uploadedRef?.url) } else { setPrompts(Array.from({ length: c }, (_, i) => prompts[i] || '')) } }}
                style={{ height: 34, padding: '0 12px', fontSize: 13, border: '1px solid #e8e8e8', borderRadius: 8, background: '#fff', cursor: 'pointer', outline: 'none', color: '#333', transition: 'border-color .2s' }}
                onFocus={e => e.target.style.borderColor = '#8B5CF6'}
                onBlur={e => e.target.style.borderColor = '#e8e8e8'}>
                <option value="白底图">白底图</option>
                <option value="场景图">场景图</option>
                <option value="详情图">详情图</option>
              </select>
              <select value={templateCount} disabled
                style={{ height: 34, padding: '0 12px', fontSize: 13, border: '1px solid #eee', borderRadius: 8, background: '#f8f8f8', cursor: 'not-allowed', outline: 'none', color: '#bbb' }}>
                {[1,2,3,4,5].map(v => <option key={v} value={v}>{v}张</option>)}
              </select>
              <select value={festival} onChange={e => { const v = e.target.value; setFestival(v); generatePrompts(v, templateCountRef.current, uploadedRef?.url) }}
                style={{ height: 34, padding: '0 12px 0 28px', fontSize: 13, border: '1px solid #e8e8e8', borderRadius: 8, background: '#fff', cursor: 'pointer', outline: 'none', color: '#333', transition: 'border-color .2s', backgroundImage: 'radial-gradient(circle at 12px 50%, #8B5CF6 3px, transparent 3px)' }}
                onFocus={e => e.target.style.borderColor = '#8B5CF6'}
                onBlur={e => e.target.style.borderColor = '#e8e8e8'}>
                <option value="">节日</option>
                <option value="端午">端午</option>
                <option value="中秋">中秋</option>
                <option value="国庆">国庆</option>
                <option value="春节">春节</option>
              </select>
              {imageType !== '详情图' ? (
                <div style={{ position: 'relative' }}>
                  <button ref={templateBtnRef} onClick={() => setShowTemplates(v => !v)}
                    style={{ height: 34, padding: '0 14px', fontSize: 13, border: '1px solid #e8e8e8', borderRadius: 8, background: showTemplates ? '#f5f0ff' : '#fff', cursor: 'pointer', outline: 'none', color: showTemplates ? '#8B5CF6' : '#333', transition: 'all .2s', whiteSpace: 'nowrap' }}
                    onMouseEnter={e => { if (!showTemplates) { e.currentTarget.style.borderColor = '#8B5CF6'; e.currentTarget.style.color = '#8B5CF6' } }}
                    onMouseLeave={e => { if (!showTemplates) { e.currentTarget.style.borderColor = '#e8e8e8'; e.currentTarget.style.color = '#333' } }}
                  >模板</button>
                  {showTemplates && (
                    <>
                      <div style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={() => setShowTemplates(false)} />
                      <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)', background: '#fff', borderRadius: 12, boxShadow: '0 8px 40px rgba(0,0,0,.18), 0 0 0 1px rgba(0,0,0,.04)', padding: 16, zIndex: 1000, display: 'flex', gap: 12 }}>
                        {TEMPLATES.map(t => (
                          <div key={t.id} style={{ width: 200, borderRadius: 8, overflow: 'hidden', border: '1px solid #f0f0f0', position: 'relative' }}>
                            <img src={t.img} alt="" style={{ width: '100%', height: 240, objectFit: 'cover', display: 'block' }} />
                            <button onClick={() => { setPrompts(prev => { const next = [...prev]; next[0] = t.prompt; return next }); setShowTemplates(false) }}
                              style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', padding: '6px 16px', fontSize: 12, color: '#fff', background: 'linear-gradient(135deg, #8B5CF6, #EC4899)', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500, transition: 'opacity .2s', whiteSpace: 'nowrap' }}
                              onMouseEnter={e => e.currentTarget.style.opacity = '.85'}
                              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                            >做同款</button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <button disabled
                  style={{ height: 34, padding: '0 14px', fontSize: 13, border: '1px solid #eee', borderRadius: 8, background: '#f8f8f8', cursor: 'not-allowed', outline: 'none', color: '#bbb', whiteSpace: 'nowrap' }}
                >模板</button>
              )}
            </div>
            <button
              disabled={!canGenerate || generating}
              onClick={handleGenerate}
              style={{
                height: 40, padding: '0 28px', fontSize: 14, fontWeight: 600,
                background: !canGenerate || generating ? '#e8e8e8' : 'linear-gradient(135deg, #8B5CF6, #EC4899)',
                color: !canGenerate || generating ? '#bbb' : '#fff',
                border: 'none', borderRadius: 10,
                cursor: !canGenerate || generating ? 'not-allowed' : 'pointer',
                boxShadow: !canGenerate || generating ? 'none' : '0 4px 20px rgba(139,92,246,.3)',
                transition: 'all .3s', letterSpacing: 1, whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { if (canGenerate && !generating) { e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = '0 8px 28px rgba(139,92,246,.4)' } }}
              onMouseLeave={e => { if (canGenerate && !generating) { e.target.style.transform = 'none'; e.target.style.boxShadow = '0 4px 20px rgba(139,92,246,.3)' } }}
            >生成画册</button>
          </div>
        </div>
        {/* My Albums */}
        <div style={{ fontSize: 15, fontWeight: 600, color: '#333', marginTop: 100, marginBottom: 8 }}>我的礼品图</div>
        {albums.length === 0 && generations.length === 0 ? (
          <div className="card" style={{ padding: 40, textAlign: 'center', color: '#999' }}>
            <div>配置完成后点击「生成画册」</div>
          </div>
        ) : (
          <>
            <div className="card-grid">
              {[...generations].reverse().map(item => (
                <div key={item.id} className="card" style={{ padding: 12, margin: 0, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: 0 }}>
                  {!item.error ? (
                    <div>
                      <div className="loading-spinner" />
                      <div style={{ fontSize: 28, fontWeight: 700, color: '#1677FF', marginTop: 12 }}>{item.progress}%</div>
                    </div>
                  ) : (
                    <div style={{ color: '#FF4D4F', fontSize: 13 }}>{item.error}</div>
                  )}
                </div>
              ))}
              {/* Historical albums */}
              {[...albums].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(albumPage * PAGE_SIZE, (albumPage + 1) * PAGE_SIZE).map(album => (
                <div
                  key={album.id}
                  className="card"
                  style={{ padding: 12, margin: 0, cursor: 'pointer', display: 'flex', flexDirection: 'column', minWidth: 0 }}
                  onClick={() => setViewAlbum(album)}
                >
                  <div style={{ position: 'relative' }}>
                    <img src={album.imageUrl} alt="" style={{ width: '100%', aspectRatio: '1', borderRadius: 4, objectFit: 'cover' }} />
                    {album.imageUrls?.length > 1 && (
                      <div style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,.55)', color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 10 }}>共{album.imageUrls.length}张</div>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 8, lineHeight: 1.6 }}>
                    <div style={{ color: '#999' }}>{new Date(album.createdAt).toLocaleDateString('zh-CN')}</div>
                  </div>

                </div>
              ))}
            </div>
            {albums.length > PAGE_SIZE && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 }}>
                <button className="btn btn-outline" disabled={albumPage === 0} onClick={() => setAlbumPage(p => p - 1)}>上一页</button>
                <span style={{ fontSize: 13, color: '#666', alignSelf: 'center' }}>{albumPage + 1} / {Math.ceil(albums.length / PAGE_SIZE)}</span>
                <button className="btn btn-outline" disabled={(albumPage + 1) * PAGE_SIZE >= albums.length} onClick={() => setAlbumPage(p => p + 1)}>下一页</button>
              </div>
            )}
          </>
        )}
        </div>
      </div>
    </div>
    {viewAlbum && (
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px) saturate(1.2)' }} onClick={() => setViewAlbum(null)}>
        <div className="preview-enter" style={{ position: 'relative', background: '#fff', padding: 6, borderRadius: 8, boxShadow: '0 8px 30px rgba(0,0,0,.35), 0 0 0 1px rgba(255,255,255,.12)', maxWidth: '96%', maxHeight: (viewAlbum?.imageUrls || [viewAlbum?.imageUrl]).length > 1 ? '94%' : 'none', overflowY: (viewAlbum?.imageUrls || [viewAlbum?.imageUrl]).length > 1 ? 'auto' : 'visible', overflowX: 'visible' }} onClick={e => e.stopPropagation()}>
          {(viewAlbum?.imageUrls || [viewAlbum?.imageUrl]).length > 1 && (
            <div style={{ position: 'sticky', top: 0, zIndex: 2, textAlign: 'center', padding: '6px 0 4px', fontSize: 12, color: '#999', letterSpacing: 1, background: 'rgba(255,255,255,.85)' }}>
              共 {(viewAlbum?.imageUrls || [viewAlbum?.imageUrl]).length} 张
            </div>
          )}
          {(viewAlbum?.imageUrls || [viewAlbum?.imageUrl]).map((url, i) => (
            <img key={i} src={url} alt="" style={{ width: '100%', display: 'block', maxHeight: (viewAlbum?.imageUrls || [viewAlbum?.imageUrl]).length > 1 ? 'none' : '94vh', objectFit: (viewAlbum?.imageUrls || [viewAlbum?.imageUrl]).length > 1 ? 'none' : 'contain', borderRadius: 4 }} />
          ))}
          <a href={viewAlbum?.imageUrls?.[0] || viewAlbum?.imageUrl || '#'} download style={{ position: 'absolute', bottom: 2, right: -68, zIndex: 3, width: 40, height: 40, borderRadius: '50%', background: '#fff', color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 18, boxShadow: '0 2px 12px rgba(0,0,0,.18)', textDecoration: 'none', transition: 'all .2s' }} onClick={e => e.stopPropagation()}><DownloadOutlined /></a>
        </div>
        <CloseOutlined
          onClick={() => setViewAlbum(null)}
          className="preview-close-btn"
          style={{ position: 'fixed', top: 24, right: 24, zIndex: 1001, width: 38, height: 38, borderRadius: '50%', background: 'rgba(0,0,0,.55)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 17, transition: 'all .25s', border: '1px solid rgba(255,255,255,.15)' }}
        />
      </div>
    )}
    </>
  )
}
