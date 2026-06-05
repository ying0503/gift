import { useState, useRef, useEffect, useCallback } from 'react'
import { API } from '../AuthContext'

export default function Home() {
  const [image_size, setImageSize] = useState('1K')
  const [count, setCount] = useState(1)
  const [model, setModel] = useState('maiziai-chatgpt-image-2')
  const [generating, setGenerating] = useState(false)
  const [promptText, setPromptText] = useState('')

  const [generations, setGenerations] = useState([])
  const pollTimers = useRef({})
  const [albums, setAlbums] = useState([])
  const [albumPage, setAlbumPage] = useState(0)
  const [removedRefs, setRemovedRefs] = useState(new Set())
  const [uploadedRefs, setUploadedRefs] = useState([])
  const [previewUrl, setPreviewUrl] = useState(null)
  const [previewPos, setPreviewPos] = useState({ left: 0, top: 0 })
  const previewTimer = useRef(null)
  const refInputRef = useRef()
  const [toast, setToast] = useState(null)
  const showToast = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 1500)
  }, [])
  const copyText = useCallback(async (text) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      showToast('已复制')
    } catch {}
  }, [showToast])
  const PAGE_SIZE = 20

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    fetch(`${API}/api/albums`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (data.albums) { setAlbums(data.albums); setAlbumPage(0) } })
      .catch(() => {})
  }, [])

  const canGenerate = model && promptText.length > 10

  const handleGenerate = async () => {
    if (!model) return alert('请选择模型')

    setGenerating(true)

    const token = localStorage.getItem('token')
    if (!token) {
      alert('请先登录')
      setGenerating(false)
      return
    }

    const id = Date.now()
    setGenerations(g => [...g, { id, taskId: null, progress: 0, statusText: '准备中...', imageUrl: null, error: null, finished: false, prompt: promptText }])

    try {
      const imgs = uploadedRefs.map(i => i.url).filter(u => !removedRefs.has(u))
      const sized = imgs.length ? await Promise.all(imgs.map(ensureMinSize)) : []
      const sendImages = sized.length > 4 ? await compositeToGrid(sized) : sized

      const res = await fetch(`${API}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          config: { size: '3:4', model, image_size, n: count, prompt: promptText },
          images: sendImages.length ? sendImages : undefined,
        }),
      })

      const r = await res.json()
      if (!res.ok) throw new Error(r.error || '请求失败')

      setGenerations(g => g.map(item => item.id === id ? { ...item, taskId: r.taskId, statusText: '任务已提交' } : item))
      startPolling(id, r.taskId, token)
    } catch (err) {
      setGenerations(g => g.map(item => item.id === id ? { ...item, error: err.message } : item))
      setGenerating(false)
    }
  }

  function startPolling(id, taskId, token) {
    let cancelled = false, realDone = false

    const sim = setInterval(() => {
      if (cancelled || realDone) return
      setGenerations(g => g.map(item => {
        if (item.id !== id) return item
        const p = item.progress >= 95 ? item.progress : Math.min(item.progress + Math.floor(Math.random() * 2) + 1, 95)
        let s = item.statusText
        if (p < 20) s = '正在提交任务...'
        else if (p < 40) s = 'AI 模型加载中...'
        else if (p < 60) s = '正在生成画册...'
        else if (p < 80) s = '正在优化画面细节...'
        else s = '即将完成...'
        return { ...item, progress: p, statusText: s }
      }))
    }, 800)

    const poll = async () => {
      try {
        const r = await fetch(`${API}/api/generate/status?taskId=${taskId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const res = await r.json()
        if (!r.ok || cancelled) return

        if (res.progress === -1) {
          realDone = true; clearInterval(sim)
          setGenerations(g => g.map(item => item.id === id ? { ...item, error: res.statusText || '生成失败' } : item))
          setGenerating(false)
          return
        }
        if (res.imageUrl) {
          realDone = true; clearInterval(sim)
          setGenerations(g => g.map(item => item.id === id ? { ...item, progress: 100, imageUrl: res.imageUrl, statusText: '生成完成！', finished: true } : item))
          setGenerating(false)
          return
        }
        if (res.taskStatus === 'FAILED') {
          realDone = true; clearInterval(sim)
          setGenerations(g => g.map(item => item.id === id ? { ...item, error: res.statusText || '生成失败' } : item))
          setGenerating(false)
          return
        }
        pollTimers.current[id] = setTimeout(poll, 2000)
      } catch (e) {
        if (!cancelled) {
          setGenerations(g => g.map(item => item.id === id ? { ...item, error: e.message } : item))
          setGenerating(false)
        }
      }
    }

    poll()
    pollTimers.current[id] = { sim, poll: true }
  }

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
      {toast && <div style={{ position: 'fixed', top: 100, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'linear-gradient(135deg, #52c41a, #389e0d)', color: '#fff', padding: '10px 28px', fontSize: 14, boxShadow: '0 4px 16px rgba(82,196,26,.35)', borderRadius: 8, animation: 'slideDown 0.2s ease-out' }}>{toast}</div>}
      <div className="home-layout" style={{ display: 'flex', alignItems: 'flex-start' }}>
      <div className="home-sidebar" style={{ flex: 3, minWidth: 0, marginTop: -24, marginLeft: -32, marginBottom: -24 }}>
        {/* Prompt & Config */}
        <div className="card" style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#555' }}>提示词</span>
          </div>
          <div>
            <textarea
            style={{
              width: '100%',
              height: 300,
              padding: 10,
              fontSize: 12,
              color: '#333',
              border: '1px solid #d9d9d9',
              borderRadius: 6,
              background: '#fff',
              resize: 'vertical',
              lineHeight: 1.6,
              boxSizing: 'border-box',
            }}
            value={promptText}
            onChange={e => setPromptText(e.target.value)}
          />
          </div>

          <div style={{ marginTop: 8 }}>
            <div className="config-row">
              <div className="config-item">
                <label>分辨率</label>
                <select value={image_size} onChange={e => setImageSize(e.target.value)}>
                  <option value="1K">1K</option>
                  <option value="2K">2K</option>
                  <option value="4K">4K</option>
                </select>
              </div>
              <div className="config-item">
                <label>数量</label>
                <select value={count} onChange={e => setCount(Number(e.target.value))}>
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginTop: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 6 }}>参考图片</div>
              <input ref={refInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => { const files = Array.from(e.target.files || []); Promise.all(files.map(f => new Promise(r => { const fr = new FileReader(); fr.onload = () => r({ url: fr.result, blob: f }); fr.readAsDataURL(f) }))).then(results => setUploadedRefs(u => [...u, ...results])); e.target.value = '' }} />
              {uploadedRefs.length > 0 ? (() => {
                const allRefs = uploadedRefs.filter(img => !removedRefs.has(img.url))
                return allRefs.length > 0 ? (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {allRefs.slice(0, 9).map((img, i) => (
                      <div
                        key={i}
                        style={{ position: 'relative', width: 60, height: 60, flexShrink: 0 }}
                        onMouseEnter={(e) => { clearTimeout(previewTimer.current); const r = e.currentTarget.getBoundingClientRect(); previewTimer.current = setTimeout(() => { setPreviewPos({ left: r.right + 8, top: Math.min(r.top, window.innerHeight * 0.5 - 24) }); setPreviewUrl(img.url) }, 300) }}
                        onMouseLeave={() => { clearTimeout(previewTimer.current); setPreviewUrl(null) }}
                      >
                        <img src={img.url} alt="" style={{ width: 60, height: 60, borderRadius: 4, objectFit: 'cover', border: '1px solid #e0e0e0' }} />
                        <button
                          onClick={() => setRemovedRefs(new Set([...removedRefs, img.url]))}
                          style={{ position: 'absolute', top: -6, right: -6, width: 16, height: 16, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,.3)', color: '#fff', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                        >×</button>
                        {previewUrl === img.url && (
                          <div style={{ position: 'fixed', zIndex: 1000, left: previewPos.left, top: previewPos.top, background: '#fff', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,.25)', padding: 8, pointerEvents: 'none' }}>
                            <img src={img.url} alt="" style={{ maxWidth: '30vw', maxHeight: '50vh', borderRadius: 4, display: 'block' }} />
                          </div>
                        )}
                      </div>
                    ))}
                    {allRefs.length < 9 && (
                      <div
                        onClick={() => refInputRef.current?.click()}
                        style={{ width: 60, height: 60, borderRadius: 4, border: '2px dashed #d9d9d9', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 20, color: '#ccc', flexShrink: 0 }}
                      >+</div>
                    )}
                  </div>
                ) : (
                  <div onClick={() => refInputRef.current?.click()} style={{ width: 60, height: 60, borderRadius: 4, border: '2px dashed #d9d9d9', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 20, color: '#ccc' }}>+</div>
                )
              })() : (
                <div onClick={() => refInputRef.current?.click()} style={{ width: 60, height: 60, borderRadius: 4, border: '2px dashed #d9d9d9', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 20, color: '#ccc' }}>+</div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#555', display: 'block', marginBottom: 6 }}>选择模型 *</label>
                <select value={model} onChange={e => setModel(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: 6, fontSize: 14, background: '#fff' }}>
                <option value="maiziai-chatgpt-image-2">maiziai-chatgpt-image-2</option>
                <option value="agnes-image-2.1-flash">agnes-image-2.1-flash</option>
                </select>
              </div>
              <button
                className="btn btn-primary"
                disabled={!canGenerate || generating}
                onClick={handleGenerate}
                style={{ whiteSpace: 'nowrap' }}
              >
                生成画册
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mobile-only" style={{ width: '100%', marginTop: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#333', marginBottom: 8 }}>我的画册</div>
        {albums.length === 0 && generations.filter(g => g.finished).length === 0 ? (
          <div className="card" style={{ padding: 40, textAlign: 'center', color: '#999' }}>暂无画册</div>
        ) : (
          <>
            <div className="card-grid">
              {[...generations].filter(g => !g.finished).reverse().map(item => (
                <div key={item.id} className="card" style={{ padding: 32, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 180, minWidth: 0 }}>
                  {!item.error ? (
                    <div>
                      <div className="loading-spinner" />
                      <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1a2e', marginTop: 12 }}>{item.progress}%</div>
                    </div>
                  ) : (
                    <div style={{ color: '#e74c3c', fontSize: 13 }}>{item.error}</div>
                  )}
                </div>
              ))}
              {[...generations].filter(g => g.finished).reverse().map(item => (
                <div key={item.id} className="card" style={{ padding: 12, cursor: 'pointer', display: 'flex', flexDirection: 'column', minWidth: 0 }} onClick={() => window.open(item.imageUrl, '_blank')}>
                  <img src={item.imageUrl} alt="" style={{ width: '100%', aspectRatio: '1', borderRadius: 4, objectFit: 'cover' }} />
                  <div style={{ fontSize: 12, color: '#666', marginTop: 8, lineHeight: 1.6 }}>
                    <div style={{ color: '#999' }}>{new Date(item.id).toLocaleDateString('zh-CN')}</div>
                  </div>
                  {item.prompt && (
                    <div style={{ position: 'relative', marginTop: 6, paddingRight: 18 }}>
                      <div style={{ fontSize: 11, color: '#888', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word' }}>{item.prompt}</div>
                      <div style={{ position: 'absolute', right: 0, top: 0 }}>
                        <svg onClick={e => { e.stopPropagation(); copyText(item.prompt) }} style={{ cursor: 'pointer', flexShrink: 0, verticalAlign: 'middle' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {albums.slice(albumPage * PAGE_SIZE, (albumPage + 1) * PAGE_SIZE).map(album => (
                <div key={album.id} className="card" style={{ padding: 12, cursor: 'pointer', display: 'flex', flexDirection: 'column', minWidth: 0 }} onClick={() => window.open(album.imageUrl, '_blank')}>
                  <img src={album.imageUrl} alt="" style={{ width: '100%', aspectRatio: '1', borderRadius: 4, objectFit: 'cover' }} />
                  <div style={{ fontSize: 12, color: '#666', marginTop: 8, lineHeight: 1.6 }}>
                    <div style={{ color: '#999' }}>{new Date(album.createdAt).toLocaleDateString('zh-CN')}</div>
                  </div>
                  {album.prompt && (
                    <div style={{ position: 'relative', marginTop: 6, paddingRight: 18 }}>
                      <div style={{ fontSize: 11, color: '#888', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word' }}>{album.prompt}</div>
                      <div style={{ position: 'absolute', right: 0, top: 0 }}>
                        <svg onClick={e => { e.stopPropagation(); copyText(album.prompt) }} style={{ cursor: 'pointer', flexShrink: 0, verticalAlign: 'middle' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      </div>
                    </div>
                  )}
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
      <div style={{ flex: 7, minWidth: 0 }}>
        <div className="desktop-only">
        {/* My Albums */}
        <div style={{ fontSize: 15, fontWeight: 600, color: '#333', marginTop: -7, marginBottom: 8 }}>我的画册</div>
        {albums.length === 0 && generations.filter(g => g.finished).length === 0 && generations.filter(g => !g.finished).length === 0 ? (
          <div className="card" style={{ padding: 40, textAlign: 'center', color: '#999' }}>
            <div>配置完成后点击「生成画册」</div>
          </div>
        ) : (
          <>
            <div className="card-grid">
              {/* In-progress generations */}
              {[...generations].filter(g => !g.finished).reverse().map(item => (
                <div key={item.id} className="card" style={{ padding: 32, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 180, minWidth: 0 }}>
                  {!item.error ? (
                    <div>
                      <div className="loading-spinner" />
                      <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1a2e', marginTop: 12 }}>{item.progress}%</div>
                    </div>
                  ) : (
                    <div style={{ color: '#e74c3c', fontSize: 13 }}>{item.error}</div>
                  )}
                </div>
              ))}
              {/* Finished generations */}
              {[...generations].filter(g => g.finished).reverse().map(item => (
                <div key={item.id} className="card" style={{ padding: 12, cursor: 'pointer', display: 'flex', flexDirection: 'column', minWidth: 0 }} onClick={() => window.open(item.imageUrl, '_blank')}>
                  <img src={item.imageUrl} alt="" style={{ width: '100%', aspectRatio: '1', borderRadius: 4, objectFit: 'cover' }} />
                  <div style={{ fontSize: 12, color: '#666', marginTop: 8, lineHeight: 1.6 }}>
                    <div style={{ color: '#999' }}>{new Date(item.id).toLocaleDateString('zh-CN')}</div>
                  </div>
                  {item.prompt && (
                    <div style={{ position: 'relative', marginTop: 6, paddingRight: 18 }}>
                      <div style={{ fontSize: 11, color: '#888', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word' }}>{item.prompt}</div>
                      <div style={{ position: 'absolute', right: 0, top: 0 }}>
                        <svg onClick={e => { e.stopPropagation(); copyText(item.prompt) }} style={{ cursor: 'pointer', flexShrink: 0, verticalAlign: 'middle' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {/* Historical albums */}
              {albums.slice(albumPage * PAGE_SIZE, (albumPage + 1) * PAGE_SIZE).map(album => (
                <div
                  key={album.id}
                  className="card"
                  style={{ padding: 12, cursor: 'pointer', display: 'flex', flexDirection: 'column', minWidth: 0 }}
                  onClick={() => window.open(album.imageUrl, '_blank')}
                >
                  <img src={album.imageUrl} alt="" style={{ width: '100%', aspectRatio: '1', borderRadius: 4, objectFit: 'cover' }} />
                  <div style={{ fontSize: 12, color: '#666', marginTop: 8, lineHeight: 1.6 }}>
                    <div style={{ color: '#999' }}>{new Date(album.createdAt).toLocaleDateString('zh-CN')}</div>
                  </div>
                  {album.prompt && (
                    <div style={{ position: 'relative', marginTop: 6, paddingRight: 18 }}>
                      <div style={{ fontSize: 11, color: '#888', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word' }}>{album.prompt}</div>
                      <div style={{ position: 'absolute', right: 0, top: 0 }}>
                        <svg onClick={e => { e.stopPropagation(); copyText(album.prompt) }} style={{ cursor: 'pointer', flexShrink: 0, verticalAlign: 'middle' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      </div>
                    </div>
                  )}
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
    </>
  )
}
