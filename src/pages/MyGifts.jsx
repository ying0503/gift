import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal, Checkbox } from 'antd'
import { API } from '../AuthContext'
import WorkbenchSidebar from '../components/WorkbenchSidebar'

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
      title: '删除商品',
      content: '确定要删除这个商品吗？',
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
    <div style={{ display: 'flex', minHeight: '100vh', background: '#fff' }}>
      <WorkbenchSidebar />
      <div style={{ flex: 1, minWidth: 0, overflow: 'auto', padding: '40px 40px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
          <div style={{ width: 18, height: 18, borderRadius: 3, background: 'linear-gradient(0deg, #72D2FF, #7B52FF)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M13.3333 16H2.66667C1.17333 16 0 14.8267 0 13.3333V2.66667C0 1.17333 1.17333 0 2.66667 0H13.3333C14.8267 0 16 1.17333 16 2.66667V13.3333C16 14.8267 14.8267 16 13.3333 16ZM2.66667 1.06667C1.76 1.06667 1.06667 1.76 1.06667 2.66667V13.3333C1.06667 14.24 1.76 14.9333 2.66667 14.9333H13.3333C14.24 14.9333 14.9333 14.24 14.9333 13.3333V2.66667C14.9333 1.76 14.24 1.06667 13.3333 1.06667H2.66667Z" fill="white"/><path d="M4 5.49331C4 5.62639 4.02621 5.75816 4.07714 5.8811C4.12806 6.00404 4.2027 6.11575 4.2968 6.20985C4.39089 6.30395 4.5026 6.37859 4.62555 6.42951C4.74849 6.48044 4.88026 6.50665 5.01333 6.50665C5.14641 6.50665 5.27818 6.48044 5.40112 6.42951C5.52406 6.37859 5.63577 6.30395 5.72987 6.20985C5.82397 6.11575 5.89861 6.00404 5.94953 5.8811C6.00046 5.75816 6.02667 5.62639 6.02667 5.49331C6.02667 5.36024 6.00046 5.22847 5.94953 5.10553C5.89861 4.98258 5.82397 4.87088 5.72987 4.77678C5.63577 4.68268 5.52406 4.60804 5.40112 4.55712C5.27818 4.50619 5.14641 4.47998 5.01333 4.47998C4.88026 4.47998 4.74849 4.50619 4.62555 4.55712C4.5026 4.60804 4.39089 4.68268 4.2968 4.77678C4.2027 4.87088 4.12806 4.98258 4.07714 5.10553C4.02621 5.22847 4 5.36024 4 5.49331Z" fill="white"/><path d="M3.46671 13.3866L2.50671 12.96L2.72005 12.48C3.84005 9.86665 5.65338 8.53331 8.05338 8.37331C10.08 8.26665 11.5734 7.67998 12.48 6.61331L12.8534 6.18665L13.6534 6.87998L13.28 7.30665C12.16 8.58665 10.4 9.33331 8.10671 9.43998C6.13338 9.54665 4.69338 10.6666 3.73338 12.9066L3.46671 13.3866Z" fill="white"/></svg>
          </div>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#000' }}>商品列表</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 220px)', gap: '20px' }}>
          <div
            onClick={() => navigate('/gift-editor/new')}
            style={{ width: 220, height: 260, borderRadius: 10, border: '1px solid #E6E6E6', background: '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'border-color .2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#7B52FF' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#E6E6E6' }}
          >
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: '#000', lineHeight: 1 }}>+</div>
            <div style={{ fontSize: 14, color: '#000' }}>新建商品</div>
          </div>

          {gifts.map(gift => {
            const imgUrl = gift.imageUrls?.[0] || gift.firstImageUrl || ''
            return (
              <div
                key={gift.id}
                style={{ width: 220, height: 260, borderRadius: 10, border: '1px solid #E6E6E6', background: '#fff', cursor: 'pointer', position: 'relative', overflow: 'hidden', transition: 'border-color .2s' }}
                onClick={() => navigate(`/gift-editor/${gift.id}`)}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#7B52FF'; const d = e.currentTarget.querySelector('.del-btn'); if (d) d.style.opacity = '1' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#E6E6E6'; const d = e.currentTarget.querySelector('.del-btn'); if (d) d.style.opacity = '0' }}
              >
                <div onClick={e => handleDelete(e, gift)} className="del-btn" style={{ position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,0.4)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 12, zIndex: 2, opacity: 0, transition: 'opacity .2s', backdropFilter: 'blur(4px)' }}>✕</div>
                {imgUrl ? (
                  <div style={{ position: 'relative' }}>
                    <img src={imgUrl} alt="" style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block', borderBottom: '1px solid #E6E6E6' }} />
                    {gift.imageUrls && gift.imageUrls.length > 1 && (
                      <div style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 11, padding: '1px 8px', borderRadius: 10, lineHeight: '20px' }}>
                        {gift.imageUrls.length}张
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ width: '100%', height: 220, background: 'rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>
                  </div>
                )}
                <div style={{ padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 14, color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {gift.name || '未命名商品'}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {gifts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#ACACAC', fontSize: 14 }}>
            暂无商品，点击上方"新建商品"创建
          </div>
        )}
      </div>

      <Modal
        title="选择商品图"
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
              暂无可用图片，请先在创作中生成商品图
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
