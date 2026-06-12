import { useState, useRef, useEffect, useCallback } from 'react'
import { CloseOutlined, DeleteOutlined } from '@ant-design/icons'
import { Modal } from 'antd'
import { API } from '../AuthContext'

export default function Home() {
  const [image_size, setImageSize] = useState('1K')
  const [model, setModel] = useState('maiziai-chatgpt-image-2')
  const [generating, setGenerating] = useState(false)
  const [generatingPrompts, setGeneratingPrompts] = useState(false)

  async function generatePrompts(fest, count, refImageUrl) {
    if (!fest) { setPrompts(Array.from({ length: count }, () => '')); return }
    const token = localStorage.getItem('token')
    if (!token) return
    setGeneratingPrompts(true)
    try {
      const res = await fetch(`${API}/api/generate/prompts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ festival: fest, count, refImage: refImageUrl }),
      })
      const data = await res.json()
      if (data.prompts) setPrompts(data.prompts)
    } catch (e) {
      setPrompts(Array.from({ length: count }, () => ''))
    } finally {
      setGeneratingPrompts(false)
    }
  }

  const [templateCount, setTemplateCount] = useState(1)
  const [prompts, setPrompts] = useState([''])
  const [festival, setFestival] = useState('')

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
    list.push({ id, batchId, prompts, createdAt: Date.now() })
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

  useEffect(() => {
    fetchAlbums()
    const token = localStorage.getItem('token')
    if (!token) return
    const pending = JSON.parse(localStorage.getItem(PENDING_BATCHES_KEY) || '[]')
    for (const p of pending) {
      setGenerations(g => [...g, { id: p.id, batchId: p.batchId, progress: 0, statusText: '恢复中...',         imageUrl: null, imageUrls: null, error: null, prompt: p.prompts[0], promptCount: p.prompts.length }])
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

  const canGenerate = model && prompts.every(p => p.length > 10)

  const handleGenerate = async () => {
    if (!model) return alert('请选择模型')

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
          config: { size: '3:4', model, image_size, n: 1, festival: festival || undefined },
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
        const r = await fetch(`${API}/api/generate/batch-status?batchId=${batchId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const res = await r.json()
        if (!r.ok || cancelled) return

        if (res.status === 'FAILED') {
          realDone = true; clearInterval(sim)
          setGenerations(g => g.map(item => item.id === id ? { ...item, error: res.statusText || '生成失败' } : item))
          fetchAlbums()
          onDone?.()
          return
        }
        if (res.status === 'SUCCEEDED' && res.imageUrl) {
          realDone = true; clearInterval(sim)
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
      <div className="home-layout" style={{ display: 'flex', alignItems: 'flex-start' }}>
      <div className="home-sidebar" style={{ flex: 3, minWidth: 0, marginTop: -24, marginLeft: -32, marginBottom: -24 }}>
        {/* Prompt & Config */}
        <div className="card" style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginBottom: 0 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 6 }}>参考图片</div>
            <input ref={refInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) { const fr = new FileReader(); fr.onload = () => setUploadedRef({ url: fr.result, blob: f }); fr.readAsDataURL(f) } e.target.value = '' }} />
            {uploadedRef ? (
              <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}
                onMouseEnter={(e) => { clearTimeout(previewTimer.current); const r = e.currentTarget.getBoundingClientRect(); previewTimer.current = setTimeout(() => { setPreviewPos({ left: r.right + 8, top: Math.min(r.top, window.innerHeight * 0.5 - 24) }); setPreviewUrl(uploadedRef.url) }, 300) }}
                onMouseLeave={() => { clearTimeout(previewTimer.current); setPreviewUrl(null) }}
              >
                <img src={uploadedRef.url} alt="" style={{ width: 120, height: 120, borderRadius: 4, objectFit: 'cover', border: '1px solid #e0e0e0' }} />
                <div
                  onClick={() => setUploadedRef(null)}
                  style={{ position: 'absolute', top: -6, right: -6, width: 16, height: 16, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,.3)', color: '#fff', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                ><CloseOutlined /></div>
                {previewUrl === uploadedRef.url && (
                  <div style={{ position: 'fixed', zIndex: 1000, left: previewPos.left, top: previewPos.top, background: '#fff', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,.25)', padding: 8, pointerEvents: 'none' }}>
                    <img src={uploadedRef.url} alt="" style={{ maxWidth: '30vw', maxHeight: '50vh', borderRadius: 4, display: 'block' }} />
                  </div>
                )}
              </div>
            ) : (
              <div onClick={() => refInputRef.current?.click()} style={{ width: 120, height: 120, borderRadius: 4, border: '2px dashed #d9d9d9', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 20, color: '#ccc' }}>+</div>
            )}
          </div>
          <div className="config-row" style={{ marginBottom: 12 }}>
            <div className="config-item">
              <label>礼品图模板</label>
              <select value={templateCount} onChange={e => { const v = Number(e.target.value); setTemplateCount(v); if (festival) { generatePrompts(festival, v, uploadedRef?.url) } else { setPrompts(Array.from({ length: v }, (_, i) => prompts[i] || '')) } }}>
                <option value={1}>1张图</option>
                <option value={2}>2张图</option>
                <option value={3}>3张图</option>
              </select>
            </div>
            <div className="config-item">
              <label>选节日</label>
              <select value={festival} onChange={e => { const v = e.target.value; setFestival(v); generatePrompts(v, templateCount, uploadedRef?.url) }}>
                <option value="">不选择</option>
                <option value="端午">端午</option>
                <option value="中秋">中秋</option>
                <option value="国庆">国庆</option>
                <option value="春节">春节</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#555' }}>提示词{generatingPrompts ? ' (生成中...)' : ''}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {prompts.map((p, i) => (
              <textarea key={i}
              style={{
                width: '100%',
                height: 120,
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
              value={p}
              onChange={e => { const next = [...prompts]; next[i] = e.target.value; setPrompts(next) }}
              placeholder={`提示词 ${i + 1}`}
            />
            ))}
          </div>

          <div style={{ marginTop: 8 }}>

            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#555', display: 'block', marginBottom: 6 }}>选择模型 *</label>
                <select value={model} onChange={e => setModel(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: 6, fontSize: 14, background: '#fff', cursor: 'pointer', transition: 'border-color .3s' }}>
                <option value="maiziai-chatgpt-image-2">GPT-Image-2</option>
                <option value="agnes-image-2.1-flash">Agnes-Image-2.1-Flash</option>
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
                <div key={item.id} className="card" style={{ padding: 32, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 180, minWidth: 0 }}>
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
              {albums.slice(albumPage * PAGE_SIZE, (albumPage + 1) * PAGE_SIZE).map(album => (
                <div key={album.id} className="card" style={{ padding: 12, cursor: 'pointer', display: 'flex', flexDirection: 'column', minWidth: 0 }} onClick={() => setViewAlbum(album)}>
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
      <div style={{ flex: 7, minWidth: 0 }}>
        <div className="desktop-only">
        {/* My Albums */}
        <div style={{ fontSize: 15, fontWeight: 600, color: '#333', marginTop: -7, marginBottom: 8 }}>我的画册</div>
        {viewAlbum ? (
          <div className="card" style={{ padding: 16, marginBottom: 0 }}>
            <button onClick={() => setViewAlbum(null)} className="btn btn-outline" style={{ marginBottom: 12, fontSize: 13, padding: '4px 12px' }}>← 返回</button>
            {(viewAlbum.imageUrls || [viewAlbum.imageUrl]).map((url, i) => (
              <img key={i} src={url} alt="" style={{ width: '100%', borderRadius: 6, display: 'block', marginBottom: i < (viewAlbum.imageUrls || [viewAlbum.imageUrl]).length - 1 ? 12 : 0 }} />
            ))}
          </div>
        ) : albums.length === 0 && generations.length === 0 ? (
          <div className="card" style={{ padding: 40, textAlign: 'center', color: '#999' }}>
            <div>配置完成后点击「生成画册」</div>
          </div>
        ) : (
          <>
            <div className="card-grid">
              {[...generations].reverse().map(item => (
                <div key={item.id} className="card" style={{ padding: 32, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 180, minWidth: 0 }}>
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
              {albums.slice(albumPage * PAGE_SIZE, (albumPage + 1) * PAGE_SIZE).map(album => (
                <div
                  key={album.id}
                  className="card"
                  style={{ padding: 12, cursor: 'pointer', display: 'flex', flexDirection: 'column', minWidth: 0 }}
                  onClick={() => setViewAlbum(album)}
                >
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
      </div>
    </div>
    </>
  )
}
