import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API } from '../AuthContext'

export default function MyAlbums() {
  const navigate = useNavigate()
  const [albums, setAlbums] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { navigate('/'); return }

    fetch(`${API}/api/albums`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.albums) setAlbums(data.albums)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [navigate])

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>加载中...</div>
  }

  return (
    <div>
      <h2 style={{ fontSize: 18, marginBottom: 20 }}>我的画册</h2>
      {albums.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60, color: '#999' }}>
          暂无画册，去首页生成一个吧
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {albums.map(album => (
            <div
              key={album.id}
              className="card"
              style={{ display: 'flex', gap: 16, alignItems: 'center', cursor: 'pointer', padding: 16 }}
              onClick={() => navigate('/generate', { state: { taskId: album.taskId, config: album.config, excel: [] } })}
            >
              <img
                src={album.imageUrl}
                alt=""
                style={{ width: 80, height: 80, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
              />
              <div style={{ flex: 1, fontSize: 13, color: '#555' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 4 }}>
                  {album.config?.size || '画册'} · {album.config?.color || ''}
                </div>
                <div>{album.productCount || 0} 件礼品</div>
                <div style={{ color: '#999', fontSize: 12, marginTop: 2 }}>
                  {new Date(album.createdAt).toLocaleDateString('zh-CN')}
                </div>
              </div>
              <span style={{ color: '#999', fontSize: 12 }}>查看 →</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
