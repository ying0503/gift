import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { DeleteOutlined } from '@ant-design/icons'
import { Modal } from 'antd'
import { API } from '../AuthContext'
import TemplatePicker from '../components/TemplatePicker'

export default function DigitalAlbumList() {
  const navigate = useNavigate()
  const location = useLocation()
  const [albums, setAlbums] = useState([])
  const [loading, setLoading] = useState(true)
  const [showTemplate, setShowTemplate] = useState(false)

  const fetchAlbums = () => {
    const token = localStorage.getItem('token')
    if (!token) { navigate('/'); return }
    setLoading(true)
    fetch(`${API}/api/album/list`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.albums) setAlbums(data.albums)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchAlbums() }, [location.pathname])

  const handleDelete = (e, album) => {
    e.stopPropagation()
    Modal.confirm({
      title: '删除画册',
      content: '确定要删除这个画册吗？',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        const token = localStorage.getItem('token')
        await fetch(`${API}/api/album/${album.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
        setAlbums(a => a.filter(x => x.id !== album.id))
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
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 16px' }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 28, letterSpacing: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>我的画册</span>
        <button className="btn btn-primary" style={{ fontSize: 13, height: 34, padding: '0 16px', borderRadius: 8, border: 'none', cursor: 'pointer' }} onClick={() => setShowTemplate(true)}>+ 新建画册</button>
      </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 22 }}>
          <div
            style={{ padding: 0, cursor: 'pointer', overflow: 'hidden', background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', boxShadow: '0 6px 24px rgba(0,0,0,.12), 0 12px 40px rgba(0,0,0,.06)', transition: 'all .25s' }}
            onClick={() => setShowTemplate(true)}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,.16), 0 16px 48px rgba(0,0,0,.08)'; e.currentTarget.style.borderColor = '#e2e8f0' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,.12), 0 12px 40px rgba(0,0,0,.06)'; e.currentTarget.style.borderColor = '#f1f5f9' }}
          >
            <div style={{ width: '100%', aspectRatio: '1', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: '#94a3b8', transition: 'all .25s' }} className="create-btn-icon">+</div>
              <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>创建画册</div>
            </div>
          </div>
          {albums.map(album => (
            <div
              key={album.id}
              style={{ padding: 0, cursor: 'pointer', overflow: 'hidden', background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', boxShadow: '0 6px 24px rgba(0,0,0,.12), 0 12px 40px rgba(0,0,0,.06)', transition: 'all .25s', position: 'relative' }}
              onClick={() => navigate(`/digital-album/${album.id}`)}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,.16), 0 16px 48px rgba(0,0,0,.08)'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.querySelector('.del-btn').style.opacity = '1' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,.12), 0 12px 40px rgba(0,0,0,.06)'; e.currentTarget.style.borderColor = '#f1f5f9'; e.currentTarget.querySelector('.del-btn').style.opacity = '0' }}
            >
              <div onClick={e => handleDelete(e, album)} className="del-btn" style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%', background: 'rgba(15,23,42,.5)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 13, zIndex: 2, opacity: 0, transition: 'opacity .2s', backdropFilter: 'blur(4px)' }}><DeleteOutlined /></div>
              {album.bannerUrl ? (
                <img src={album.bannerUrl} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
              ) : (
                <div style={{ width: '100%', aspectRatio: '1', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: '#94a3b8' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>
                  </div>
                </div>
              )}
              <div style={{ padding: '10px 14px 12px', borderTop: '1px solid #f8fafc' }}>
                <div style={{ fontSize: 13, color: '#334155', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {album.bannerTitle || '未命名画册'}
                </div>
              </div>
            </div>
          ))}
        </div>

      <TemplatePicker visible={showTemplate} onClose={() => setShowTemplate(false)} />
    </div>
  )
}
