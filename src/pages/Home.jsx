import { useState, useRef, useEffect, useCallback } from 'react'
import { Modal } from 'antd'
import { CloseOutlined, DownloadOutlined } from '@ant-design/icons'
import { API } from '../AuthContext'

export default function Home() {
  const [image_size] = useState('1K')
  const [generating, setGenerating] = useState(false)
  const [generatingPrompts, setGeneratingPrompts] = useState(false)
  const promptGenId = useRef(0)
  const templateCountRef = useRef(1)

  const getModel = () => {
    const saved = localStorage.getItem('defaultImageModel')
    return ['maiziai-chatgpt-image-2', 'ithinkai-gpt-image-2', 'agnes-image-2.1-flash'].includes(saved) ? saved : 'maiziai-chatgpt-image-2'
  }
  const getTextModel = () => {
    const saved = localStorage.getItem('textGenerationModel')
    return ['qwen3.5-flash', 'glm-4.6v-flashx', 'doubao-seed-2-0-mini-260428'].includes(saved) ? saved : 'qwen3.5-flash'
  }
  const getTemperature = () => parseFloat(localStorage.getItem('textTemperature') || '0.8')
  const getMaxTokens = () => parseInt(localStorage.getItem('textMaxTokens') || '2000', 10)

  async function generatePrompts(fest, count, refImageUrl, imgType) {
    if (!fest) { setPrompts(Array.from({ length: count }, () => '')); return }
    const token = localStorage.getItem('token')
    if (!token) return
    const genId = ++promptGenId.current
    setGeneratingPrompts(true)
    if (imgType === '详情图') {
      const p = Array.from({ length: count }, () => '')
      p[0] = '生成白底图'
      setPrompts(p)
    } else {
      setPrompts(Array.from({ length: count }, () => ''))
    }
    try {
      const res = await fetch(`${API}/api/generate/prompts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ festival: fest, count, refImage: refImageUrl, model: getTextModel(), temperature: getTemperature(), maxTokens: getMaxTokens(), imageType: imgType }),
      })
      const data = await res.json()
      if (genId !== promptGenId.current) return
      if (data.prompts) {
        const result = data.prompts.slice(0, count)
        if (imgType === '详情图' && result.length > 0) result[0] = '生成白底图'
        setPrompts(result)
      }
    } catch {
      if (genId !== promptGenId.current) return
      const empty = Array.from({ length: count }, () => '')
      if (imgType === '详情图' && empty.length > 0) empty[0] = '生成白底图'
      setPrompts(empty)
    } finally {
      if (genId === promptGenId.current) setGeneratingPrompts(false)
    }
  }

  const [templateCount, setTemplateCount] = useState(1)
  const [imageSize, setImageSize] = useState('3:4')
  const [prompts, setPrompts] = useState([''])
  const [festival, setFestival] = useState('')
  const [imageType, setImageType] = useState('图类型')

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
    if (imageType !== '图类型' && imageType !== '白底图') {
      const c = imageType === '详情图' ? 3 : 1
      generatePrompts(festival || '通用礼品', c, undefined, imageType)
    }
  }, [])

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

    const imageTypePrefixes = {
      '白底图': '白底图，把主图抠出来，',
      '场景图': '场景图，使用场景图，',
    }
    const prefixed = imageType === '详情图'
      ? promptList
      : promptList.map(p => (imageTypePrefixes[imageType] || '') + p)

    const id = Date.now() + Math.random().toString(36).slice(2, 6)
    setGenerations(g => [...g, { id, batchId: null, progress: 0, statusText: '准备中...',         imageUrl: null, imageUrls: null, error: null, prompt: prefixed[0], promptCount: prefixed.length }])
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
          config: { size: imageSize, model: getModel(), image_size, n: 1, festival: festival || undefined },
          prompts: prefixed,
          images: sendImages.length ? sendImages : undefined,
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
        const res = await r.json()
        if (!r.ok || cancelled) return

        if (typeof res.progress === 'number' && res.progress > 0) {
          setGenerations(g => g.map(item => item.id === id ? { ...item, progress: res.progress, statusText: res.statusText || item.statusText } : item))
        }
        if (res.status === 'FAILED') {
          cancelled = true
          setGenerations(g => g.map(item => item.id === id ? { ...item, error: res.statusText || '生成失败' } : item))
          fetchAlbums()
          onDone?.()
          return
        }
        if (res.status === 'SUCCEEDED' && res.imageUrl) {
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
        <div style={{ fontSize: 24, fontWeight: 600, color: '#333', marginBottom: 16 }}>我的礼品图</div>
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
                  <div key={album.id} className="card album-card" style={{ padding: 0, margin: 0, cursor: 'pointer', display: 'flex', flexDirection: 'column', minWidth: 0 }} onClick={() => setViewAlbum(album)}>
                  <div style={{ position: 'relative', borderRadius: '6px', overflow: 'hidden' }}>
                    <img src={album.imageUrl} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                    {album.imageUrls?.length > 1 && (
                      <div style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,.55)', color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 10 }}>共{album.imageUrls.length}张</div>
                    )}
                    <div onClick={e => handleDelete(e, album.id)} className="card-del-btn">×</div>
                  </div>
                  <div style={{ background: '#f5f5f5', fontSize: 12, color: '#666', padding: '10px 12px 12px', lineHeight: 1.6, borderRadius: '0 0 6px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div style={{ color: '#888' }}>{new Date(album.createdAt).toLocaleDateString('zh-CN')}</div>
                    {album.prompts && (
                      <button onClick={e => { e.stopPropagation(); setPrompts(album.prompts); setTemplateCount(album.prompts.length); templateCountRef.current = album.prompts.length; setImageSize(album.config?.size || '3:4'); setFestival(album.config?.festival || ''); setImageType(album.prompts[0] === '生成白底图' ? (album.prompts.length > 1 ? '详情图' : '白底图') : '场景图') }} style={{ fontSize: 11, color: '#8B5CF6', background: 'none', border: '1px solid #8B5CF6', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', lineHeight: '20px', whiteSpace: 'nowrap' }}>做同款</button>
                    )}
                  </div>

                </div>
              ))}
            </div>
            {albums.length > PAGE_SIZE && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 32 }}>
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
        {/* Generate Panel -- Premium Neutral */}
        <div style={{ marginBottom: 24, maxWidth: 820, marginLeft: 'auto', marginRight: 'auto', marginTop: 100, borderRadius: 12, background: '#fcfcfd', boxShadow: '0 0 0 1px rgba(139,92,246,.06), 0 2px 4px rgba(0,0,0,.02), 0 8px 24px -4px rgba(0,0,0,.04), 0 24px 48px -12px rgba(0,0,0,.08)', overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(139,92,246,.25), #8B5CF6, rgba(139,92,246,.25), transparent)' }} />
          <div style={{ padding: '32px 32px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 3, height: 22, borderRadius: 2, background: 'linear-gradient(180deg, #8B5CF6, #A78BFA)' }} />
            <span style={{ fontSize: 15, fontWeight: 600, color: '#2a2a2e', letterSpacing: -0.1 }}>礼品图生成</span>
          </div>
          <div style={{ padding: '20px 32px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <input ref={refInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) { const fr = new FileReader(); fr.onload = () => { setUploadedRef({ url: fr.result, blob: f }); if (imageType === '白底图') { setPrompts(['生成白底图']) } else if (prompts.some(p => p.trim()) || festival) { generatePrompts(festival || '通用礼品', templateCountRef.current, fr.result, imageType) } }; fr.readAsDataURL(f) } e.target.value = '' }} />

            {previewUrl === uploadedRef?.url && (
              <div style={{ position: 'fixed', zIndex: 1000, left: previewPos.left, top: previewPos.top, background: '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,.15)', padding: 6, pointerEvents: 'none', border: '1px solid #e8e6e4' }}>
                <img src={uploadedRef.url} alt="" style={{ maxWidth: '30vw', maxHeight: '50vh', borderRadius: 6, display: 'block' }} />
              </div>
            )}

            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              {uploadedRef ? (
                <div style={{ position: 'relative', width: 80, height: 80, borderRadius: 10, overflow: 'hidden', border: '1.5px solid #ddd', boxShadow: '0 2px 8px rgba(0,0,0,.06)', flexShrink: 0 }}
                  onMouseEnter={(e) => { clearTimeout(previewTimer.current); const r = e.currentTarget.getBoundingClientRect(); previewTimer.current = setTimeout(() => { setPreviewPos({ left: r.right + 8, top: Math.min(r.top, window.innerHeight * 0.5 - 24) }); setPreviewUrl(uploadedRef.url) }, 300) }}
                  onMouseLeave={() => { clearTimeout(previewTimer.current); setPreviewUrl(null) }}
                >
                  <img src={uploadedRef.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div onClick={() => setUploadedRef(null)} style={{ position: 'absolute', top: 3, right: 3, width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,.45)', color: '#fff', fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all .2s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(190,70,60,.85)'; e.currentTarget.style.color = '#fff' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,.45)'; e.currentTarget.style.color = '#fff' }}
                  >&#10005;</div>
                </div>
              ) : (
                <div onClick={() => refInputRef.current?.click()} style={{ width: 80, height: 80, borderRadius: 10, border: '1.5px dashed #d0cecc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 11, color: '#999', transition: 'all .25s', flexShrink: 0, gap: 2, background: '#fafaf8' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#8B5CF6'; e.currentTarget.style.color = '#8B5CF6'; e.currentTarget.style.background = '#f5f0ff' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#d0cecc'; e.currentTarget.style.color = '#999'; e.currentTarget.style.background = '#fafaf8' }}
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
                        width: '100%', minHeight: 72, padding: '12px 14px', fontSize: 14, color: '#333',
                        border: '1px solid #e0dedc', borderRadius: 10, background: '#fafaf8',
                        resize: 'none', lineHeight: 1.7, boxSizing: 'border-box', outline: 'none', transition: 'border-color .25s, box-shadow .25s',
                        fontFamily: 'inherit', overflow: 'hidden',
                      }}
                      onFocus={e => { e.target.style.borderColor = '#8B5CF6'; e.target.style.boxShadow = '0 0 0 3px rgba(139,92,246,.1)'; e.target.style.background = '#fff' }}
                      onBlur={e => { e.target.style.borderColor = '#e0dedc'; e.target.style.boxShadow = 'none'; e.target.style.background = '#fafaf8' }}
                      value={p}
                      onChange={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; const next = [...prompts]; next[i] = e.target.value; setPrompts(next) }}
                      placeholder={''}
                    />
                  </div>
                ))}
                {generatingPrompts && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,.85)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 2, borderRadius: 10, gap: 6 }}>
                    <div style={{ width: 22, height: 22, border: '2px solid #e0dedc', borderTopColor: '#8B5CF6', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                    <span style={{ fontSize: 13, color: '#888', letterSpacing: 0.3 }}>AI 文案策划中<span className="loading-dots"><span>.</span><span>.</span><span>.</span></span></span>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select value={imageType} onChange={e => { const v = e.target.value; setImageType(v); const c = v === '详情图' ? 3 : 1; setTemplateCount(c); templateCountRef.current = c; if (v === '图类型') { setPrompts(Array.from({ length: c }, (_, i) => prompts[i] || '')) } else if (v === '白底图') { setPrompts([`生成${v}`]) } else { generatePrompts(festival || '通用礼品', c, uploadedRef?.url, v) } }}
                  style={{ height: 34, padding: '0 12px', fontSize: 13, border: '1px solid #e0dedc', borderRadius: 8, background: '#fafaf8', cursor: 'pointer', outline: 'none', color: '#333', transition: 'border-color .25s, box-shadow .25s' }}
                  onFocus={e => { e.target.style.borderColor = '#8B5CF6'; e.target.style.boxShadow = '0 0 0 3px rgba(139,92,246,.1)' }}
                  onBlur={e => { e.target.style.borderColor = '#e0dedc'; e.target.style.boxShadow = 'none' }}>
                  <option value="图类型">图类型</option>
                  <option value="白底图">白底图</option>
                  <option value="场景图">场景图</option>
                  <option value="详情图">详情图</option>
                </select>
                <select value={templateCount} disabled
                  style={{ height: 34, padding: '0 12px', fontSize: 13, border: '1px solid #e8e6e4', borderRadius: 8, background: '#f5f5f2', cursor: 'not-allowed', outline: 'none', color: '#aaa' }}>
                  {[1,2,3,4,5].map(v => <option key={v} value={v}>{v}张</option>)}
                </select>
                <select value={festival} disabled={imageType === '白底图'} onChange={e => { const v = e.target.value; setFestival(v); if (imageType !== '图类型' && imageType !== '白底图') generatePrompts(v, templateCountRef.current, uploadedRef?.url, imageType) }}
                  style={{ height: 34, padding: '0 12px 0 28px', fontSize: 13, border: `1px solid ${imageType === '白底图' ? '#e8e6e4' : '#e0dedc'}`, borderRadius: 8, background: imageType === '白底图' ? '#f5f5f2' : '#fafaf8', cursor: imageType === '白底图' ? 'not-allowed' : 'pointer', outline: 'none', color: imageType === '白底图' ? '#aaa' : '#333', transition: 'border-color .25s, box-shadow .25s', backgroundImage: 'radial-gradient(circle at 14px 50%, #8B5CF6 3px, transparent 3px)', backgroundRepeat: 'no-repeat' }}
                  onFocus={e => { if (imageType !== '白底图') { e.target.style.borderColor = '#8B5CF6'; e.target.style.boxShadow = '0 0 0 3px rgba(139,92,246,.1)' } }}
                  onBlur={e => { if (imageType !== '白底图') { e.target.style.borderColor = '#e0dedc'; e.target.style.boxShadow = 'none' } }}>
                  <option value="">节日</option>
                  <option value="端午">端午</option>
                  <option value="中秋">中秋</option>
                  <option value="国庆">国庆</option>
                  <option value="春节">春节</option>
                </select>
                <select value={imageSize} onChange={e => setImageSize(e.target.value)}
                  style={{ height: 34, padding: '0 12px', fontSize: 13, border: '1px solid #e0dedc', borderRadius: 8, background: '#fafaf8', cursor: 'pointer', outline: 'none', color: '#333' }}>
                  <option value="3:4">3:4</option>
                  <option value="1:1">1:1</option>
                  <option value="16:9">16:9</option>
                  <option value="9:16">9:16</option>
                  <option value="4:3">4:3</option>
                </select>
              </div>
              <button
                disabled={!canGenerate || generating}
                onClick={handleGenerate}
                style={{
                  height: 40, padding: '0 28px', fontSize: 14, fontWeight: 600,
                  background: !canGenerate || generating ? '#e8e6e4' : 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                  color: !canGenerate || generating ? '#bbb' : '#fff',
                  border: 'none', borderRadius: 10,
                  cursor: !canGenerate || generating ? 'not-allowed' : 'pointer',
                  boxShadow: !canGenerate || generating ? 'none' : '0 4px 20px rgba(139,92,246,.3)',
                  transition: 'all .3s', letterSpacing: 0.5, whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => { if (canGenerate && !generating) { e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = '0 8px 28px rgba(139,92,246,.4)' } }}
                onMouseLeave={e => { if (canGenerate && !generating) { e.target.style.transform = 'none'; e.target.style.boxShadow = '0 4px 20px rgba(139,92,246,.3)' } }}
              >生成礼品图</button>
            </div>
          </div>
        </div>
        {/* My Albums */}
        <div style={{ fontSize: 24, fontWeight: 600, color: '#333', marginTop: 100, marginBottom: 16 }}>我的礼品图</div>
        {albums.length === 0 && generations.length === 0 ? (
          <div className="card" style={{ padding: 40, textAlign: 'center', color: '#999' }}>
            <div>配置完成后点击「生成礼品图」</div>
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
                  className="card album-card"
                  style={{ padding: 0, margin: 0, cursor: 'pointer', display: 'flex', flexDirection: 'column', minWidth: 0 }}
                  onClick={() => setViewAlbum(album)}
                >
                  <div style={{ position: 'relative', borderRadius: '6px', overflow: 'hidden' }}>
                    <img src={album.imageUrl} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                    {album.imageUrls?.length > 1 && (
                      <div style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,.55)', color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 10 }}>共{album.imageUrls.length}张</div>
                    )}
                    <div onClick={e => handleDelete(e, album.id)} className="card-del-btn">×</div>
                  </div>
                  <div style={{ background: '#f5f5f5', fontSize: 12, color: '#666', padding: '10px 12px 12px', lineHeight: 1.6, borderRadius: '0 0 6px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div style={{ color: '#888' }}>{new Date(album.createdAt).toLocaleDateString('zh-CN')}</div>
                    {album.prompts && (
                      <button onClick={e => { e.stopPropagation(); setPrompts(album.prompts); setTemplateCount(album.prompts.length); templateCountRef.current = album.prompts.length; setImageSize(album.config?.size || '3:4'); setFestival(album.config?.festival || ''); setImageType(album.prompts[0] === '生成白底图' ? (album.prompts.length > 1 ? '详情图' : '白底图') : '场景图') }} style={{ fontSize: 11, color: '#8B5CF6', background: 'none', border: '1px solid #8B5CF6', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', lineHeight: '20px', whiteSpace: 'nowrap' }}>做同款</button>
                    )}
                  </div>

                </div>
              ))}
            </div>
            {albums.length > PAGE_SIZE && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 32 }}>
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
            <div style={{ position: 'sticky', top: 0, zIndex: 2, textAlign: 'center', padding: '10px 6px 8px', fontSize: 12, color: '#999', letterSpacing: 1, background: 'rgba(255,255,255,.85)', margin: '-6px -6px 6px', borderRadius: '8px 8px 0 0' }}>
              共 {(viewAlbum?.imageUrls || [viewAlbum?.imageUrl]).length} 张
            </div>
          )}
          {(viewAlbum?.imageUrls || [viewAlbum?.imageUrl]).map((url, i) => (
            <img key={i} src={url} alt="" style={{ width: '100%', display: 'block', maxHeight: '94vh', objectFit: 'contain', borderRadius: 4, marginBottom: i < (viewAlbum?.imageUrls || [viewAlbum?.imageUrl]).length - 1 ? 5 : 0 }} />
          ))}
          {(viewAlbum?.imageUrls || [viewAlbum?.imageUrl]).length > 1 && (
            <div style={{ position: 'sticky', bottom: 0, textAlign: 'center', padding: '12px 0 8px', pointerEvents: 'none' }}>
              <svg viewBox="0 0 24 24" width="24" height="24" style={{ animation: 'scrollDown 1.6s ease-in-out infinite', display: 'block', margin: '0 auto' }}><path d="M6 6l6 6 6-6M6 12l6 6 6-6" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          )}
        </div>
        {(viewAlbum?.imageUrls?.length || (viewAlbum?.imageUrl ? 1 : 0)) <= 1 && (
          <a href={viewAlbum?.imageUrl || viewAlbum?.imageUrls?.[0] || '#'} download style={{ position: 'fixed', bottom: 30, left: '50%', transform: 'translateX(-50%)', zIndex: 1001, width: 44, height: 44, borderRadius: '50%', background: '#fff', color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 20, boxShadow: '0 2px 12px rgba(0,0,0,.2)', textDecoration: 'none', transition: 'all .2s' }} onClick={e => e.stopPropagation()}><DownloadOutlined /></a>
        )}
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
