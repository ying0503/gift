import { useState, useEffect, useRef } from 'react'
import { Modal } from 'antd'
import { API } from '../AuthContext'

function normalizeUrls(album) {
  const replace = (url) => url?.replace('gift-bucket-0503.oss-cn-beijing.aliyuncs.com', 'static.liqihui.com') || url
  return { ...album, imageUrl: replace(album.imageUrl), imageUrls: album.imageUrls?.map(replace) }
}

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

export default function ImageList() {
  const [albums, setAlbums] = useState([])
  const [generations, setGenerations] = useState([])
  const [viewAlbum, setViewAlbum] = useState(null)
  const [viewIndex, setViewIndex] = useState(0)
  const [page, setPage] = useState(0)
  const pollTimers = useRef({})

  useEffect(() => {
    if (!viewAlbum) return
    const urls = viewAlbum.imageUrls || (viewAlbum.imageUrl ? [viewAlbum.imageUrl] : [])
    if (urls.length <= 1) return
    const onKey = e => {
      if (e.key === 'ArrowLeft') setViewIndex(i => (i - 1 + urls.length) % urls.length)
      if (e.key === 'ArrowRight') setViewIndex(i => (i + 1) % urls.length)
      if (e.key === 'Escape') setViewAlbum(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [viewAlbum])

  const fetchAlbums = () => {
    const token = localStorage.getItem('token')
    if (!token) return
    fetch(`${API}/api/albums`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (data.albums) { setAlbums(data.albums.map(normalizeUrls)); setPage(0) } })
      .catch(() => {})
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
          const url = normalizeUrls({ imageUrl: res.imageUrl, imageUrls: res.imageUrls || [res.imageUrl] })
          setGenerations(g => g.map(item => item.id === id ? { ...item, imageUrl: url.imageUrl, imageUrls: url.imageUrls, progress: 100, statusText: '已完成' } : item))
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
  }, [])

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

  const handleDelete = (e, albumId) => {
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

  const sorted = [...albums].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  const paged = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const inProgress = generations.filter(g => !g.imageUrl)

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
      <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', marginBottom: 28, letterSpacing: 0.5 }}>
        图片列表
      </div>

      {viewAlbum ? (
        <div
          onClick={() => setViewAlbum(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
        >
          {(() => {
            const urls = viewAlbum.imageUrls || (viewAlbum.imageUrl ? [viewAlbum.imageUrl] : [])
            const total = urls.length
            const url = urls[viewIndex]
            return (
              <>
                {total > 1 && (
                  <button onClick={e => { e.stopPropagation(); setViewIndex(i => (i - 1 + total) % total) }} style={{ position: 'absolute', left: 24, top: '50%', transform: 'translateY(-50%)', width: 46, height: 46, borderRadius: '50%', background: 'rgba(255,255,255,.14)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 26, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.28)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.14)'}>‹</button>
                )}
                {url ? (
                  <img
                    src={url}
                    onClick={e => e.stopPropagation()}
                    alt=""
                    style={{ maxWidth: '90vw', maxHeight: '86vh', borderRadius: 8, objectFit: 'contain', display: 'block', boxShadow: '0 12px 48px rgba(0,0,0,.5)' }}
                  />
                ) : (
                  <div onClick={e => e.stopPropagation()} style={{ width: 'min(86vw, 78vh)', aspectRatio: viewAlbum.ratio || '1', background: '#fff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: 15, boxShadow: '0 12px 48px rgba(0,0,0,.5)' }}>生成失败</div>
                )}
                {total > 1 && (
                  <button onClick={e => { e.stopPropagation(); setViewIndex(i => (i + 1) % total) }} style={{ position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)', width: 46, height: 46, borderRadius: '50%', background: 'rgba(255,255,255,.14)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 26, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.28)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.14)'}>›</button>
                )}
                <div onClick={e => { e.stopPropagation(); setViewAlbum(null) }} style={{ position: 'absolute', top: 22, right: 22, width: 42, height: 42, borderRadius: '50%', background: 'rgba(255,255,255,.14)', color: '#fff', cursor: 'pointer', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.28)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.14)'}>✕</div>
                {total > 1 && (
                  <div style={{ position: 'absolute', bottom: 22, left: '50%', transform: 'translateX(-50%)', color: '#fff', fontSize: 13, letterSpacing: 1 }}>{viewIndex + 1} / {total}</div>
                )}
              </>
            )
          })()}
        </div>
      ) : albums.length === 0 && inProgress.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8', fontSize: 14 }}>
          暂无图片，请先在创作中生成
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 22 }}>
            {[...inProgress].reverse().map(item => (
              <div key={item.id} style={{ padding: 0, margin: 0, overflow: 'hidden', background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', boxShadow: '0 6px 24px rgba(0,0,0,.12), 0 12px 40px rgba(0,0,0,.06)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 200, position: 'relative' }}>
                {!item.error ? (
                  <div style={{ textAlign: 'center' }}>
                    <div className="loading-spinner" />
                  </div>
                ) : (
                  <>
                    <div style={{ color: '#FF4D4F', fontSize: 13 }}>{item.error}</div>
                    <div onClick={() => { setGenerations(g => g.filter(x => x.id !== item.id)); removePendingBatch(item.id) }} style={{ position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,.35)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 12, lineHeight: 1 }}>✕</div>
                  </>
                )}
              </div>
            ))}
            {paged.map(album => (
              <div
                key={album.id}
                style={{ padding: 0, cursor: 'pointer', overflow: 'hidden', background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', boxShadow: '0 6px 24px rgba(0,0,0,.12), 0 12px 40px rgba(0,0,0,.06)', transition: 'all .25s', position: 'relative', display: 'flex', flexDirection: 'column' }}
                onClick={() => { setViewAlbum(album); setViewIndex(0) }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,.16), 0 16px 48px rgba(0,0,0,.08)'; e.currentTarget.style.borderColor = '#e2e8f0'; const d = e.currentTarget.querySelector('.del-btn'); if (d) d.style.opacity = '1' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,.12), 0 12px 40px rgba(0,0,0,.06)'; e.currentTarget.style.borderColor = '#f1f5f9'; const d = e.currentTarget.querySelector('.del-btn'); if (d) d.style.opacity = '0' }}
              >
                <div onClick={e => handleDelete(e, album.id)} className="del-btn" style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%', background: 'rgba(15,23,42,.5)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 13, zIndex: 2, opacity: 0, transition: 'opacity .2s', backdropFilter: 'blur(4px)' }}>✕</div>
                <div style={{ position: 'relative' }}>
                  <img src={album.imageUrl} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                   {album.imageUrls && album.imageUrls.length > 1 && (
                     <div style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,.55)', color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 10 }}>共{album.imageUrls.filter(Boolean).length}张</div>
                   )}
                </div>
                <div style={{ padding: '10px 14px 12px', borderTop: '1px solid #f8fafc' }}>
                  <div style={{ color: '#0f172a', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{album.name || new Date(album.createdAt).toLocaleDateString('zh-CN')}</div>
                </div>
              </div>
            ))}
          </div>
          {albums.length > PAGE_SIZE && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 32 }}>
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)} style={{ padding: '6px 16px', fontSize: 13, border: '1px solid #e2e8f0', borderRadius: 8, cursor: page === 0 ? 'not-allowed' : 'pointer', background: '#fff', color: page === 0 ? '#ccc' : '#64748b' }}>上一页</button>
              <span style={{ fontSize: 13, color: '#666', alignSelf: 'center' }}>{page + 1} / {Math.ceil(albums.length / PAGE_SIZE)}</span>
              <button disabled={(page + 1) * PAGE_SIZE >= albums.length} onClick={() => setPage(p => p + 1)} style={{ padding: '6px 16px', fontSize: 13, border: '1px solid #e2e8f0', borderRadius: 8, cursor: (page + 1) * PAGE_SIZE >= albums.length ? 'not-allowed' : 'pointer', background: '#fff', color: (page + 1) * PAGE_SIZE >= albums.length ? '#ccc' : '#64748b' }}>下一页</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}