import { useState, useEffect, useRef } from 'react'
import { Modal } from 'antd'
import { API } from '../AuthContext'
import WorkbenchSidebar from '../components/WorkbenchSidebar'
import ImagePreviewModal from '../components/ImagePreviewModal'

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
    <div style={{ display: 'flex', minHeight: '100vh', background: '#fff' }}>
      <WorkbenchSidebar />
      <div style={{ flex: 1, minWidth: 0, overflow: 'auto', padding: '40px 40px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
          <div style={{ width: 18, height: 18, borderRadius: 3, background: 'linear-gradient(0deg, #72D2FF, #7B52FF)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M13.3333 16H2.66667C1.17333 16 0 14.8267 0 13.3333V2.66667C0 1.17333 1.17333 0 2.66667 0H13.3333C14.8267 0 16 1.17333 16 2.66667V13.3333C16 14.8267 14.8267 16 13.3333 16ZM2.66667 1.06667C1.76 1.06667 1.06667 1.76 1.06667 2.66667V13.3333C1.06667 14.24 1.76 14.9333 2.66667 14.9333H13.3333C14.24 14.9333 14.9333 14.24 14.9333 13.3333V2.66667C14.9333 1.76 14.24 1.06667 13.3333 1.06667H2.66667Z" fill="white"/><path d="M4 5.49331C4 5.62639 4.02621 5.75816 4.07714 5.8811C4.12806 6.00404 4.2027 6.11575 4.2968 6.20985C4.39089 6.30395 4.5026 6.37859 4.62555 6.42951C4.74849 6.48044 4.88026 6.50665 5.01333 6.50665C5.14641 6.50665 5.27818 6.48044 5.40112 6.42951C5.52406 6.37859 5.63577 6.30395 5.72987 6.20985C5.82397 6.11575 5.89861 6.00404 5.94953 5.8811C6.00046 5.75816 6.02667 5.62639 6.02667 5.49331C6.02667 5.36024 6.00046 5.22847 5.94953 5.10553C5.89861 4.98258 5.82397 4.87088 5.72987 4.77678C5.63577 4.68268 5.52406 4.60804 5.40112 4.55712C5.27818 4.50619 5.14641 4.47998 5.01333 4.47998C4.88026 4.47998 4.74849 4.50619 4.62555 4.55712C4.5026 4.60804 4.39089 4.68268 4.2968 4.77678C4.2027 4.87088 4.12806 4.98258 4.07714 5.10553C4.02621 5.22847 4 5.36024 4 5.49331Z" fill="white"/><path d="M3.46671 13.3866L2.50671 12.96L2.72005 12.48C3.84005 9.86665 5.65338 8.53331 8.05338 8.37331C10.08 8.26665 11.5734 7.67998 12.48 6.61331L12.8534 6.18665L13.6534 6.87998L13.28 7.30665C12.16 8.58665 10.4 9.33331 8.10671 9.43998C6.13338 9.54665 4.69338 10.6666 3.73338 12.9066L3.46671 13.3866Z" fill="white"/></svg>
          </div>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#000' }}>图片列表</span>
        </div>

        {viewAlbum ? (
          <ImagePreviewModal
            album={viewAlbum}
            index={viewIndex}
            onClose={() => setViewAlbum(null)}
            onIndexChange={setViewIndex}
          />
        ) : albums.length === 0 && inProgress.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#ACACAC', fontSize: 14 }}>
            暂无图片，请先在创作中生成
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 220px)', gap: '20px' }}>
              {[...inProgress].reverse().map(item => (
                <div key={item.id} style={{ width: 220, height: 260, borderRadius: 10, border: '1px solid #E6E6E6', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  {!item.error ? (
                    <div style={{ textAlign: 'center' }}>
                      <div className="loading-spinner" />
                    </div>
                  ) : (
                    <>
                      <div style={{ color: '#FF4D4F', fontSize: 13, textAlign: 'center', padding: '0 12px' }}>{item.error}</div>
                      <div onClick={() => { setGenerations(g => g.filter(x => x.id !== item.id)); removePendingBatch(item.id) }} style={{ position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,0.4)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 12, lineHeight: 1 }}>✕</div>
                    </>
                  )}
                </div>
              ))}
              {paged.map(album => (
                <div
                  key={album.id}
                  style={{ width: 220, height: 260, borderRadius: 10, border: '1px solid #E6E6E6', background: '#fff', cursor: 'pointer', position: 'relative', overflow: 'hidden', transition: 'border-color .2s' }}
                  onClick={() => { setViewAlbum(album); setViewIndex(0) }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#7B52FF'; const d = e.currentTarget.querySelector('.del-btn'); if (d) d.style.opacity = '1' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#E6E6E6'; const d = e.currentTarget.querySelector('.del-btn'); if (d) d.style.opacity = '0' }}
                >
                  <div onClick={e => handleDelete(e, album.id)} className="del-btn" style={{ position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,0.4)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 12, zIndex: 2, opacity: 0, transition: 'opacity .2s', backdropFilter: 'blur(4px)' }}>✕</div>
                  <div style={{ position: 'relative' }}>
                    <img src={album.imageUrl} alt="" style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block', borderBottom: '1px solid #E6E6E6' }} />
                    {album.imageUrls && album.imageUrls.filter(Boolean).length > 1 && (
                      <div style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 11, padding: '1px 8px', borderRadius: 10, lineHeight: '20px' }}>
                        {album.imageUrls.filter(Boolean).length}张
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 14, color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {album.name || new Date(album.createdAt).toLocaleDateString('zh-CN')}
                    </div>
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
    </div>
  )
}