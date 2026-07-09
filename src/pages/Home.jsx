import { useState, useRef, useEffect, useCallback } from 'react'
import { Modal } from 'antd'
import { CloseOutlined, DownloadOutlined } from '@ant-design/icons'
import { API } from '../AuthContext'

export default function Home() {
  const [image_size] = useState('1K')
  const [generating, setGenerating] = useState(false)
  const [generatingPrompts, setGeneratingPrompts] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
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

  async function generatePrompts(fest, count, refImageUrl, imgType, productInfo) {
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
      const apiCount = imgType === '详情图' ? count - 1 : count
      const res = await fetch(`${API}/api/generate/prompts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ festival: fest, count: apiCount, refImage: refImageUrl, model: getTextModel(), temperature: getTemperature(), maxTokens: getMaxTokens(), imageType: imgType, productInfo }),
      })
      const data = await res.json()
      if (genId !== promptGenId.current) return
      if (data.prompts) {
        if (imgType === '详情图') {
          const result = ['生成白底图', ...data.prompts.slice(0, count - 1)]
          setPrompts(result)
        } else {
          setPrompts(data.prompts.slice(0, count))
        }
      }
    } catch {
      if (genId !== promptGenId.current) return
if (imgType === '详情图') {
          const empty = ['生成白底图', ...Array.from({ length: count - 1 }, () => '')]
        setPrompts(empty)
      } else {
        setPrompts(Array.from({ length: count }, () => ''))
      }
    } finally {
      if (genId === promptGenId.current) setGeneratingPrompts(false)
    }
  }

  async function analyzeImage(imageUrl) {
    const token = localStorage.getItem('token')
    if (!token) return
    setAnalyzing(true)
    try {
      const res = await fetch(`${API}/api/generate/prompts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mode: 'analyze', refImage: imageUrl, model: getTextModel(), temperature: getTemperature(), maxTokens: getMaxTokens() }),
      })
      const data = await res.json()
      if (data.analysis) {
        generatePrompts('通用礼品', templateCountRef.current, imageUrl, '详情图', data.analysis)
      } else {
        console.error('分析失败:', data.error || res.statusText)
      }
    } catch (e) {
      console.error('analyzeImage error:', e)
    } finally {
      setAnalyzing(false)
    }
  }

  const [templateCount, setTemplateCount] = useState(1)
  const [imageSize, setImageSize] = useState('3:4')
  const [prompts, setPrompts] = useState([''])
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
    if (imageType !== '图类型') {
      const c = imageType === '详情图' ? 5 : 1
      generatePrompts('通用礼品', c, undefined, imageType)
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
    if (token) {
      fetch(`${API}/api/generate/active-tasks`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => {
          if (!data.batches) return
          for (const b of data.batches) {
            const id = b.batchId
            setGenerations(g => g.some(x => x.id === id) ? g : [...g, { id, batchId: id, progress: 0, statusText: '恢复中...', imageUrl: null, imageUrls: null, error: null, prompt: b.prompts?.[0] || '', promptCount: b.prompts?.length || 0, restored: true }])
            startBatchPolling(id, id, token, b.prompts || [], () => {})
          }
        })
        .catch(() => {})
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
      '场景图': '场景图，使用场景图，',
    }
    const prefixed = imageType === '详情图'
      ? promptList
      : promptList.map(p => (imageTypePrefixes[imageType] || '') + p)

    const id = Date.now() + Math.random().toString(36).slice(2, 6)
    setGenerations(g => [...g, { id, batchId: null, progress: 0, statusText: '准备中...',         imageUrl: null, imageUrls: null, error: null, prompt: prefixed[0], promptCount: prefixed.length }])

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
          config: { size: imageSize, model: getModel(), image_size, n: 1, festival: '通用礼品' },
          prompts: prefixed,
          images: sendImages.length ? sendImages : undefined,
        }),
      })

      const r = await res.json()
      if (!res.ok) throw new Error(r.error || '请求失败')

      setGenerations(g => g.map(item => item.id === id ? { ...item, batchId: r.batchId, statusText: '任务已提交' } : item))
      startBatchPolling(id, r.batchId, token, prefixed, () => { setGenerating(false) })
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
          setGenerations(g => g.map(item => item.id === id ? { ...item, imageUrl: res.imageUrl, imageUrls: res.imageUrls || [res.imageUrl], progress: 100, statusText: '已完成' } : item))
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
              url ? (
                <img key={i} src={url} alt="" style={{ width: '100%', borderRadius: 6, display: 'block', marginBottom: i < (viewAlbum.imageUrls || [viewAlbum.imageUrl]).length - 1 ? 12 : 0 }} />
              ) : (
                <div key={i} style={{ width: '100%', aspectRatio: 1, background: '#f5f5f5', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: 14, marginBottom: 12 }}>生成失败</div>
              )
            ))}
          </div>
        ) : albums.length === 0 && generations.filter(g => !g.imageUrl).length === 0 ? (
          <div className="card" style={{ padding: 40, textAlign: 'center', color: '#999' }}>暂无画册</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 22 }}>
              {[...generations].filter(g => !g.imageUrl).reverse().map(item => (
                <div key={item.id} style={{ padding: 0, margin: 0, overflow: 'hidden', background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', boxShadow: '0 6px 24px rgba(0,0,0,.12), 0 12px 40px rgba(0,0,0,.06)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 200 }}>
                  {!item.error ? (
                    <div style={{ textAlign: 'center' }}>
                      <div className="loading-spinner" />
                      <div style={{ fontSize: 28, fontWeight: 700, color: '#1677FF', marginTop: 12 }}>{item.progress}%</div>
                    </div>
                  ) : (
                    <div style={{ color: '#FF4D4F', fontSize: 13 }}>{item.error}</div>
                  )}
                </div>
              ))}
              {[...albums].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(albumPage * PAGE_SIZE, (albumPage + 1) * PAGE_SIZE).map(album => (
                 <div
                   key={album.id}
                   style={{ padding: 0, cursor: 'pointer', overflow: 'hidden', background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', boxShadow: '0 6px 24px rgba(0,0,0,.12), 0 12px 40px rgba(0,0,0,.06)', transition: 'all .25s', position: 'relative', display: 'flex', flexDirection: 'column' }}
                   onClick={() => setViewAlbum(album)}
                   onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,.16), 0 16px 48px rgba(0,0,0,.08)'; e.currentTarget.style.borderColor = '#e2e8f0'; const d = e.currentTarget.querySelector('.del-btn'); if (d) d.style.opacity = '1' }}
                   onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,.12), 0 12px 40px rgba(0,0,0,.06)'; e.currentTarget.style.borderColor = '#f1f5f9'; const d = e.currentTarget.querySelector('.del-btn'); if (d) d.style.opacity = '0' }}
                 >
                  <div onClick={e => handleDelete(e, album.id)} className="del-btn" style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%', background: 'rgba(15,23,42,.5)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 13, zIndex: 2, opacity: 0, transition: 'opacity .2s', backdropFilter: 'blur(4px)' }}>✕</div>
                  <div style={{ position: 'relative' }}>
                    <img src={album.imageUrl} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                    {album.imageUrls && album.imageUrls.filter(u => u).length > 1 && (
                      <div style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,.55)', color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 10 }}>共{album.imageUrls.filter(u => u).length}张</div>
                    )}
                  </div>
                  <div style={{ padding: '10px 14px 12px', borderTop: '1px solid #f8fafc' }}>
                    <div style={{ color: '#94a3b8', fontSize: 12 }}>{new Date(album.createdAt).toLocaleDateString('zh-CN')}</div>
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
        {/* Generate Panel */}
        <div style={{ marginBottom: 24, maxWidth: 1200, marginLeft: 'auto', marginRight: 'auto', marginTop: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: '#2a2a2e', letterSpacing: -0.1 }}>礼品图生成</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, alignItems: 'start' }}>
            <input ref={refInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) { const fr = new FileReader(); fr.onload = () => { setUploadedRef({ url: fr.result, blob: f }); if (prompts.some(p => p.trim())) { generatePrompts('通用礼品', templateCountRef.current, fr.result, imageType) } }; fr.readAsDataURL(f) } e.target.value = '' }} />

            {/* ========== LEFT COLUMN: Upload ========== */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 10, letterSpacing: 0.3 }}>上传参考图</div>
              {uploadedRef ? (
                <div style={{ position: 'relative', width: '100%', aspectRatio: '1', borderRadius: 12, overflow: 'hidden', border: '1.5px solid #ddd', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}
                  onMouseEnter={(e) => { clearTimeout(previewTimer.current); const r = e.currentTarget.getBoundingClientRect(); previewTimer.current = setTimeout(() => { setPreviewPos({ left: r.right + 8, top: Math.min(r.top, window.innerHeight * 0.5 - 24) }); setPreviewUrl(uploadedRef.url) }, 300) }}
                  onMouseLeave={() => { clearTimeout(previewTimer.current); setPreviewUrl(null) }}
                >
                  <img src={uploadedRef.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div onClick={() => setUploadedRef(null)} style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,.45)', color: '#fff', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all .2s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(190,70,60,.85)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,.45)' }}
                  >&#10005;</div>
                </div>
              ) : (
                <div onClick={() => refInputRef.current?.click()} style={{ width: '100%', aspectRatio: '1', borderRadius: 12, border: '1.5px dashed #d0cecc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 13, color: '#999', transition: 'all .25s', gap: 6, background: '#fafaf8' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#8B5CF6'; e.currentTarget.style.color = '#8B5CF6'; e.currentTarget.style.background = '#f5f0ff' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#d0cecc'; e.currentTarget.style.color = '#999'; e.currentTarget.style.background = '#fafaf8' }}
                >
                  <span style={{ fontSize: 28, lineHeight: 1 }}>+</span>
                  <span>上传图片</span>
                </div>
              )}
              {analyzing && (
                <div style={{ marginTop: 10, fontSize: 12, color: '#8B5CF6', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                  <div style={{ width: 14, height: 14, border: '2px solid #e0dedc', borderTopColor: '#8B5CF6', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                  AI 分析中...
                </div>
              )}

              {previewUrl === uploadedRef?.url && (
                <div style={{ position: 'fixed', zIndex: 1000, left: previewPos.left, top: previewPos.top, background: '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,.15)', padding: 6, pointerEvents: 'none', border: '1px solid #e8e6e4' }}>
                  <img src={uploadedRef.url} alt="" style={{ maxWidth: '30vw', maxHeight: '50vh', borderRadius: 6, display: 'block' }} />
                </div>
              )}

              <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: '#f5f0ff', border: '1px solid #e8dfff', fontSize: 12, color: '#6d4fc7', lineHeight: 1.8 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>上传建议</div>
                <div>使用光线充足、对焦清晰的产品图</div>
                <div>产品主体清晰、背景尽量简洁</div>
                <div>产品居中放置在画面中间</div>
                <div>建议分辨率 1024x1024 以上</div>
                <div>上传后 AI 将基于原图优化而非重绘</div>
              </div>
            </div>

            {/* ========== MIDDLE COLUMN: Parameters ========== */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 10, letterSpacing: 0.3 }}>参数配置</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#555', marginBottom: 6 }}>图类型</div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {['场景图', '详情图'].map(t => (
                    <div key={t}
                      onClick={() => {
                        const v = t; setImageType(v); const c = v === '详情图' ? 5 : 1; setTemplateCount(c); templateCountRef.current = c;
                        if (v === '详情图') {
                          const p = Array.from({ length: c }, () => '')
                          p[0] = '生成白底图'
                          setPrompts(p)
                          if (uploadedRef?.url) {
                            analyzeImage(uploadedRef.url)
                          } else {
                            generatePrompts('通用礼品', c, undefined, v)
                          }
                        } else { generatePrompts('通用礼品', c, uploadedRef?.url, v) }
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
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#555', marginBottom: 6, marginTop: 2 }}>比例</div>
                  <select value={imageSize} onChange={e => setImageSize(e.target.value)}
                    style={{ height: 48, padding: '0 10px', fontSize: 14, border: '1px solid #e0dedc', borderRadius: 8, background: '#fafaf8', cursor: 'pointer', outline: 'none', color: '#333' }}>
                    <option value="3:4">3:4</option>
                    <option value="1:1">1:1</option>
                    <option value="16:9">16:9</option>
                    <option value="9:16">9:16</option>
                    <option value="2:3">2:3</option>
                    <option value="4:3">4:3</option>
                  </select>

                <div style={{ position: 'relative' }}>
                  {prompts.map((p, i) => (
                    <div key={i} style={{ marginBottom: i < prompts.length - 1 ? 8 : 0 }}>
                      <textarea
                        ref={el => textareaRefs.current[i] = el}
                        style={{
                          width: '100%', minHeight: 56, padding: '10px 12px', fontSize: 14, color: '#333',
                          border: '1px solid #e0dedc', borderRadius: 8, background: '#fafaf8',
                          resize: 'none', lineHeight: 1.6, boxSizing: 'border-box', outline: 'none', transition: 'border-color .25s, box-shadow .25s',
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
                      <div style={{ width: 20, height: 20, border: '2px solid #e0dedc', borderTopColor: '#8B5CF6', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                      <span style={{ fontSize: 12, color: '#888', letterSpacing: 0.3 }}>AI 文案策划中<span className="loading-dots"><span>.</span><span>.</span><span>.</span></span></span>
                    </div>
                  )}
                </div>

                  <div style={{ fontSize: 14, fontWeight: 500, color: '#555', marginBottom: 6, marginTop: 2 }}>张数</div>
                  <select value={templateCount} disabled
                    style={{ height: 48, padding: '0 10px', fontSize: 14, border: '1px solid #e8e6e4', borderRadius: 8, background: '#f5f5f2', cursor: 'not-allowed', outline: 'none', color: '#aaa', width: '100%' }}>
                    {[1,2,3,4,5].map(v => <option key={v} value={v}>{v}张</option>)}
                  </select>

                <button
                  disabled={!canGenerate || generating}
                  onClick={handleGenerate}
                  style={{
                    height: 54, padding: '0 20px', fontSize: 14, fontWeight: 600,
                    background: !canGenerate || generating ? '#e8e6e4' : 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                    color: !canGenerate || generating ? '#bbb' : '#fff',
                    border: 'none', borderRadius: 8,
                    cursor: !canGenerate || generating ? 'not-allowed' : 'pointer',
                    boxShadow: !canGenerate || generating ? 'none' : '0 4px 20px rgba(139,92,246,.3)',
                    transition: 'all .3s', letterSpacing: 0.5, whiteSpace: 'nowrap', width: '100%',
                  }}
                  onMouseEnter={e => { if (canGenerate && !generating) { e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = '0 8px 28px rgba(139,92,246,.4)' } }}
                  onMouseLeave={e => { if (canGenerate && !generating) { e.target.style.transform = 'none'; e.target.style.boxShadow = '0 4px 20px rgba(139,92,246,.3)' } }}
                >生成礼品图</button>
              </div>
            </div>

            {/* ========== RIGHT COLUMN: Current Image ========== */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 10, letterSpacing: 0.3 }}>当前生成的图片</div>
              {generations.length > 0 ? (
                (() => {
                  const last = [...generations].reverse()[0]
                  if (last.error) {
                    return <div style={{ width: '100%', aspectRatio: '1', borderRadius: 12, border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF4D4F', fontSize: 13, background: '#fafaf8' }}>{last.error}</div>
                  }
                  if (last.imageUrl) {
                    return (
                      <div style={{ width: '100%', aspectRatio: '1', borderRadius: 12, border: '1px solid #f1f5f9', overflow: 'hidden', background: '#fafaf8' }}>
                        <img src={last.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      </div>
                    )
                  }
                  return (
                    <div style={{ width: '100%', aspectRatio: '1', borderRadius: 12, border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#fafaf8' }}>
                      <div className="loading-spinner" />
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#1677FF' }}>{last.progress}%</div>
                      <div style={{ fontSize: 12, color: '#888' }}>{last.statusText}</div>
                    </div>
                  )
                })()
              ) : (
                <div style={{ width: '100%', aspectRatio: '1', borderRadius: 12, border: '1px dashed #e0dedc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: 13, background: '#fafaf8' }}>
                  暂无生成结果
                </div>
              )}
            </div>
          </div>
        </div>
        {/* My Albums */}
        <div style={{ maxWidth: 1060, margin: '0 auto', padding: '0 16px' }}>
        <div style={{ fontSize: 24, fontWeight: 600, color: '#333', marginTop: 100, marginBottom: 16 }}>我的礼品图</div>
         {albums.length === 0 && generations.filter(g => !g.imageUrl).length === 0 ? (
           <div className="card" style={{ padding: 40, textAlign: 'center', color: '#999' }}>
             <div>配置完成后点击「生成礼品图」</div>
           </div>
         ) : (
           <>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 22 }}>
               {[...generations].filter(g => !g.imageUrl).reverse().map(item => (
                 <div key={item.id} style={{ padding: 0, margin: 0, overflow: 'hidden', background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', boxShadow: '0 6px 24px rgba(0,0,0,.12), 0 12px 40px rgba(0,0,0,.06)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 200 }}>
                   {!item.error ? (
                     <div style={{ textAlign: 'center' }}>
                       <div className="loading-spinner" />
                       <div style={{ fontSize: 28, fontWeight: 700, color: '#1677FF', marginTop: 12 }}>{item.progress}%</div>
                     </div>
                   ) : (
                     <div style={{ color: '#FF4D4F', fontSize: 13 }}>{item.error}</div>
                   )}
                 </div>
               ))}
               {[...albums].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(albumPage * PAGE_SIZE, (albumPage + 1) * PAGE_SIZE).map(album => (
                <div
                  key={album.id}
                  style={{ padding: 0, cursor: 'pointer', overflow: 'hidden', background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', boxShadow: '0 6px 24px rgba(0,0,0,.12), 0 12px 40px rgba(0,0,0,.06)', transition: 'all .25s', position: 'relative', display: 'flex', flexDirection: 'column' }}
                  onClick={() => setViewAlbum(album)}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,.16), 0 16px 48px rgba(0,0,0,.08)'; e.currentTarget.style.borderColor = '#e2e8f0'; const d = e.currentTarget.querySelector('.del-btn'); if (d) d.style.opacity = '1' }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,.12), 0 12px 40px rgba(0,0,0,.06)'; e.currentTarget.style.borderColor = '#f1f5f9'; const d = e.currentTarget.querySelector('.del-btn'); if (d) d.style.opacity = '0' }}
                >
                  <div onClick={e => handleDelete(e, album.id)} className="del-btn" style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%', background: 'rgba(15,23,42,.5)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 13, zIndex: 2, opacity: 0, transition: 'opacity .2s', backdropFilter: 'blur(4px)' }}>✕</div>
                  <div style={{ position: 'relative' }}>
                    <img src={album.imageUrl} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                    {album.imageUrls && album.imageUrls.filter(u => u).length > 1 && (
                      <div style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,.55)', color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 10 }}>共{album.imageUrls.filter(u => u).length}张</div>
                    )}
                  </div>
                  <div style={{ padding: '10px 14px 12px', borderTop: '1px solid #f8fafc' }}>
                    <div style={{ color: '#94a3b8', fontSize: 12 }}>{new Date(album.createdAt).toLocaleDateString('zh-CN')}</div>
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
    </div>
    {viewAlbum && (
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px) saturate(1.2)' }} onClick={() => setViewAlbum(null)}>
        <div className="preview-enter" style={{ position: 'relative', background: '#fff', padding: 6, borderRadius: 8, boxShadow: '0 8px 30px rgba(0,0,0,.35), 0 0 0 1px rgba(255,255,255,.12)', maxWidth: '96%', maxHeight: (viewAlbum?.imageUrls || [viewAlbum?.imageUrl]).length > 1 ? '94%' : 'none', overflowY: (viewAlbum?.imageUrls || [viewAlbum?.imageUrl]).length > 1 ? 'auto' : 'visible', overflowX: 'visible' }} onClick={e => e.stopPropagation()}>
          {(viewAlbum?.imageUrls || [viewAlbum?.imageUrl]).filter(u => u).length > 1 && (
            <div style={{ position: 'sticky', top: 0, zIndex: 2, textAlign: 'center', padding: '10px 6px 8px', fontSize: 12, color: '#999', letterSpacing: 1, background: 'rgba(255,255,255,.85)', margin: '-6px -6px 6px', borderRadius: '8px 8px 0 0' }}>
              共 {(viewAlbum?.imageUrls || [viewAlbum?.imageUrl]).filter(u => u).length} 张
            </div>
          )}
          {(viewAlbum?.imageUrls || [viewAlbum?.imageUrl]).map((url, i) => (
            url ? (
              <img key={i} src={url} alt="" style={{ width: '100%', display: 'block', maxHeight: '94vh', objectFit: 'contain', borderRadius: 4, marginBottom: i < (viewAlbum?.imageUrls || [viewAlbum?.imageUrl]).length - 1 ? 5 : 0 }} />
            ) : (
              <div key={i} style={{ width: '100%', aspectRatio: 1, background: '#f5f5f5', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: 14, marginBottom: 5 }}>生成失败</div>
            )
          ))}
          {(viewAlbum?.imageUrls || [viewAlbum?.imageUrl]).length > 1 && (
            <div style={{ position: 'sticky', bottom: 0, textAlign: 'center', padding: '12px 0 8px', pointerEvents: 'none' }}>
              <svg viewBox="0 0 24 24" width="24" height="24" style={{ animation: 'scrollDown 1.6s ease-in-out infinite', display: 'block', margin: '0 auto' }}><path d="M6 6l6 6 6-6M6 12l6 6 6-6" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          )}
        </div>
        {((viewAlbum?.imageUrls && viewAlbum.imageUrls.filter(u => u).length) || (viewAlbum?.imageUrl ? 1 : 0)) <= 1 && (
          <a href={viewAlbum?.imageUrl || viewAlbum?.imageUrls?.find(u => u) || '#'} download style={{ position: 'fixed', bottom: 30, left: '50%', transform: 'translateX(-50%)', zIndex: 1001, width: 44, height: 44, borderRadius: '50%', background: '#fff', color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 20, boxShadow: '0 2px 12px rgba(0,0,0,.2)', textDecoration: 'none', transition: 'all .2s' }} onClick={e => e.stopPropagation()}><DownloadOutlined /></a>
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
