import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal, Checkbox } from 'antd'
import { API } from '../AuthContext'

export default function MyGifts() {
  const navigate = useNavigate()
  const [gifts, setGifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPicker, setShowPicker] = useState(false)
  const [albums, setAlbums] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())

  const fetchGifts = () => {
    const token = localStorage.getItem('token')
    if (!token) { navigate('/'); return }
    setLoading(true)
    fetch(`${API}/api/gifts`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.gifts) setGifts(data.gifts)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchGifts() }, [])

  const openImagePicker = () => {
    const token = localStorage.getItem('token')
    setSelectedIds(new Set())
    fetch(`${API}/api/albums`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.albums) setAlbums(data.albums.filter(a => a.imageUrl).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)))
        setShowPicker(true)
      })
      .catch(() => {})
  }

  const toggleSelect = (albumId) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(albumId)) next.delete(albumId)
      else next.add(albumId)
      return next
    })
  }

  const confirmSelect = () => {
    setShowPicker(false)
    const images = []
    albums.filter(a => selectedIds.has(a.id)).forEach(a => {
      const urls = a.imageUrls && a.imageUrls.length ? a.imageUrls : (a.imageUrl ? [a.imageUrl] : [])
      urls.forEach(u => images.push(u))
    })
    navigate(`/gift-editor/new`, { state: { images } })
  }

  const handleDelete = (e, gift) => {
    e.stopPropagation()
    Modal.confirm({
      title: '删除礼品',
      content: '确定要删除这个礼品吗？',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        const token = localStorage.getItem('token')
        await fetch(`${API}/api/gifts/${gift.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
        setGifts(g => g.filter(x => x.id !== gift.id))
      },
    })
  }

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#94a3b8', fontSize: 14, gap: 10 }}>
      <div className="loading-spinner" style={{ width: 20, height: 20, borderWidth: 2, margin: 0 }} />
      加载中...
    </div>
  }

  return (
    <div style={{ maxWidth: 1060, margin: '0 auto', padding: '0 16px' }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 28, letterSpacing: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>我的礼品</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 22 }}>
        <div
          style={{ padding: 0, cursor: 'pointer', overflow: 'hidden', background: '#f8fafc', borderRadius: 16, border: '1px solid #f1f5f9', boxShadow: '0 6px 24px rgba(0,0,0,.12), 0 12px 40px rgba(0,0,0,.06)', transition: 'all .25s', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}
          onClick={() => navigate('/gift-editor/new')}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,.16), 0 16px 48px rgba(0,0,0,.08)'; e.currentTarget.style.borderColor = '#e2e8f0' }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,.12), 0 12px 40px rgba(0,0,0,.06)'; e.currentTarget.style.borderColor = '#f1f5f9' }}
        >
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: '#94a3b8', transition: 'all .25s' }}>+</div>
            <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500, marginTop: 6 }}>新建礼品</div>
        </div>
        {gifts.map(gift => (
          <div
            key={gift.id}
            style={{ padding: 0, cursor: 'pointer', overflow: 'hidden', background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', boxShadow: '0 6px 24px rgba(0,0,0,.12), 0 12px 40px rgba(0,0,0,.06)', transition: 'all .25s', position: 'relative' }}
            onClick={() => navigate(`/gift-editor/${gift.id}`)}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,.16), 0 16px 48px rgba(0,0,0,.08)'; e.currentTarget.style.borderColor = '#e2e8f0'; const d = e.currentTarget.querySelector('.del-btn'); if (d) d.style.opacity = '1' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,.12), 0 12px 40px rgba(0,0,0,.06)'; e.currentTarget.style.borderColor = '#f1f5f9'; const d = e.currentTarget.querySelector('.del-btn'); if (d) d.style.opacity = '0' }}
          >
            <div onClick={e => handleDelete(e, gift)} className="del-btn" style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%', background: 'rgba(15,23,42,.5)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 13, zIndex: 2, opacity: 0, transition: 'opacity .2s', backdropFilter: 'blur(4px)' }}>✕</div>
            {gift.imageUrls && gift.imageUrls.length > 0 ? (
              <div style={{ position: 'relative' }}>
                <img src={gift.imageUrls[0]} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                {gift.imageUrls.length > 1 && (
                  <div style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,.55)', color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 10, lineHeight: '20px' }}>{gift.imageUrls.length}张</div>
                )}
              </div>
            ) : gift.firstImageUrl ? (
              <img src={gift.firstImageUrl} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
            ) : (
              <div style={{ width: '100%', aspectRatio: '1', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: '#94a3b8' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>
                </div>
              </div>
            )}
            <div style={{ padding: '10px 14px 12px', borderTop: '1px solid #f8fafc' }}>
              <div style={{ fontSize: 13, color: '#334155', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {gift.name || '未命名礼品'}
              </div>

            </div>
          </div>
        ))}
      </div>

      <Modal
        title="选择礼品图"
        open={showPicker}
        onCancel={() => setShowPicker(false)}
        onOk={confirmSelect}
        okText="确定"
        width={720}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 16, maxHeight: 480, overflow: 'auto' }}>
          {albums.map(album => {
            const urls = album.imageUrls && album.imageUrls.length ? album.imageUrls : (album.imageUrl ? [album.imageUrl] : [])
            return (
            <div
              key={album.id}
              style={{ cursor: 'pointer', borderRadius: 8, overflow: 'hidden', border: selectedIds.has(album.id) ? '2px solid #1677FF' : '1px solid #e6e6e6', transition: 'all .2s', position: 'relative' }}
              onClick={() => toggleSelect(album.id)}
              onMouseEnter={e => { if (!selectedIds.has(album.id)) { e.currentTarget.style.borderColor = '#1677FF'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(22,119,255,.15)' }}}
              onMouseLeave={e => { if (!selectedIds.has(album.id)) { e.currentTarget.style.borderColor = '#e6e6e6'; e.currentTarget.style.boxShadow = 'none' }}}
            >
              <div style={{ position: 'absolute', top: 6, left: 6, zIndex: 1 }}>
                <Checkbox checked={selectedIds.has(album.id)} />
              </div>
              {urls.length > 1 && (
                <div style={{ position: 'absolute', top: 6, right: 6, zIndex: 1, background: '#1677FF', color: '#fff', fontSize: 11, padding: '1px 6px', borderRadius: 10, lineHeight: '18px' }}>
                  {urls.length}张
                </div>
              )}
              <img src={album.imageUrl} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
            </div>
            )
          })}
          {albums.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
              暂无可用图片，请先在创作中生成礼品图
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
