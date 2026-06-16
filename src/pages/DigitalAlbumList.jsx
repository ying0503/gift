import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DeleteOutlined } from '@ant-design/icons'
import { Modal } from 'antd'
import { API } from '../AuthContext'

export default function DigitalAlbumList() {
  const navigate = useNavigate()
  const [albums, setAlbums] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAlbums = () => {
    const token = localStorage.getItem('token')
    if (!token) { navigate('/'); return }
    fetch(`${API}/api/album/list`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.albums) setAlbums(data.albums)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchAlbums() }, [navigate])

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
    return <div style={{ textAlign: 'center', padding: 80, color: '#bbb', fontSize: 15 }}>加载中...</div>
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ fontSize: 18, fontWeight: 600, color: '#111', marginBottom: 24 }}>我的画册</div>
        <div className="card-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <div
            className="card"
            style={{ padding: 12, cursor: 'pointer', overflow: 'hidden' }}
            onClick={() => navigate('/digital-album/new')}
          >
            <div style={{ width: '100%', aspectRatio: '1', borderRadius: 6, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, color: '#ddd' }}>+</div>
            <div style={{ fontSize: 12, color: '#999', marginTop: 8, textAlign: 'center' }}>创建画册</div>
          </div>
          {albums.map(album => (
            <div
              key={album.id}
              className="card"
              style={{ padding: 12, cursor: 'pointer', overflow: 'hidden', position: 'relative' }}
              onClick={() => navigate(`/digital-album/${album.id}`)}
            >
              <div onClick={e => handleDelete(e, album)} style={{ position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,.4)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 12, zIndex: 1 }}><DeleteOutlined /></div>
              {album.bannerUrl ? (
                <img src={album.bannerUrl} alt="" style={{ width: '100%', aspectRatio: '1', borderRadius: 6, objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', aspectRatio: '1', borderRadius: 6, background: 'linear-gradient(135deg, #f0e6ff, #e6f0ff)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#8B5CF6' }}>
                  <div style={{ fontSize: 28, marginBottom: 4 }}>📖</div>
                  <div style={{ fontSize: 11, opacity: 0.6 }}>点击编辑</div>
                </div>
              )}
              <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
                {new Date(album.updatedAt).toLocaleDateString('zh-CN')}
              </div>
              <div style={{ fontSize: 11, color: '#bbb', marginTop: 2 }}>
                {Array.isArray(album.categories) ? album.categories.length : 0} 个分类
              </div>
            </div>
          ))}
        </div>
    </div>
  )
}
