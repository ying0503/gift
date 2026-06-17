import { useState, useEffect, useMemo, useRef } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { API } from '../AuthContext'

export default function Preview() {
  const location = useLocation()
  const navigate = useNavigate()
  const { userId, catId: urlCatId, albumId: urlAlbumId } = useParams()
  const [categories, setCategories] = useState(location.state?.categories || [])
  const [bannerUrl, setBannerUrl] = useState(location.state?.bannerUrl || null)
  const [selectedCat, setSelectedCat] = useState(null)
  
  const [viewAlbum, setViewAlbum] = useState(null)
  const [albums, setAlbums] = useState([])
  const [loading, setLoading] = useState(categories.length === 0)
  const initialUrlSync = useRef(false)

  useEffect(() => {
    const s = document.createElement('style')
    s.textContent = '::-webkit-scrollbar{width:3px!important;height:3px!important}::-webkit-scrollbar-thumb{background:#ccc!important;border-radius:2px!important}::-webkit-scrollbar-track{background:transparent!important}'
    document.head.appendChild(s)
    return () => s.remove()
  }, [])

  const albumMap = useMemo(() => {
    const m = {}
    for (const a of albums) m[a.id] = a
    return m
  }, [albums])

  function getImageUrls(a) {
    const fresh = albumMap[a.albumId]
    return fresh?.imageUrls || a.imageUrls || [a.imageUrl]
  }

  function getCoverUrl(a) {
    if (a.type === '组合' && a.comboItems?.[0]) {
      const first = a.comboItems[0]
      const fresh = albumMap[first.albumId]
      return fresh?.imageUrls?.[0] || fresh?.imageUrl || first.imageUrls?.[0] || first.imageUrl
    }
    return (a.imageUrls || [a.imageUrl])[0]
  }

  const currentCat = categories.find(c => c.id === selectedCat)
  

  const allAlbums = useMemo(() => {
    const result = []
    for (const c of categories) {
      for (const i of c.items) {
        for (const a of i.albums || []) {
          result.push({ ...a, _catId: c.id, _itemId: i.id, _catName: c.name, _itemName: i.name })
        }
      }
    }
    return result
  }, [categories])

  useEffect(() => {
    const token = localStorage.getItem('token')
    const url = token ? `${API}/api/digital-album` : `${API}/api/album?userId=${encodeURIComponent(userId)}`
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    fetch(url, { headers })
      .then(r => r.json())
      .then(data => {
        if (data.categories?.length && categories.length === 0) {
          setCategories(data.categories)
        }
        if (data.bannerUrl) setBannerUrl(data.bannerUrl)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
    if (token) {
      fetch(`${API}/api/albums`, { headers })
        .then(r => r.json())
        .then(d => { if (d.albums) setAlbums(d.albums) })
        .catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (loading || initialUrlSync.current) return
    initialUrlSync.current = true
    if (urlCatId) {
      if (!categories.some(c => c.id === urlCatId)) { navigate(`/preview/${userId}`, { replace: true }); return }
      setSelectedCat(urlCatId)
    }
    if (urlAlbumId) {
      for (const c of categories) {
        for (const i of c.items) {
          const a = i.albums?.find(alb => alb.albumId === urlAlbumId)
          if (a) { setViewAlbum(a); return }
        }
      }
    }

  }, [loading])

  useEffect(() => {
    if (loading || !initialUrlSync.current) return
    if (urlCatId) {
      if (!categories.some(c => c.id === urlCatId)) { navigate(`/preview/${userId}`, { replace: true }); return }
      setSelectedCat(urlCatId)
    } else {
      setSelectedCat(null); setViewAlbum(null)
    }
    if (urlAlbumId) {
      for (const c of categories) {
        for (const i of c.items) {
          const a = i.albums?.find(alb => alb.albumId === urlAlbumId)
          if (a) { setViewAlbum(a); return }
        }
      }
    } else {
      setViewAlbum(null)
    }
  }, [urlCatId, urlAlbumId, loading])

  function renderContent(m) {
    return (
      <div>
        {bannerUrl && <div style={{ width: '100%', height: 200, background: '#fff', position: 'relative' }}><img src={bannerUrl} alt="" style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }} /></div>}
        <div style={{ display: 'flex', gap: 0, alignItems: 'flex-start', minHeight: 'calc(100vh - 60px)', background: '#f0f2f5' }}>
          <div style={{ flex: '0 0 auto', width: 'max-content', background: 'transparent', borderRadius: 8, border: '1px solid #f0f0f0', overflow: 'hidden', alignSelf: 'stretch', display: 'flex', flexDirection: 'column' }}>
            <div className="album-tree-list album-tree-list-preview">
              {categories.length === 0 ? (
                <div className="album-tree-empty">暂无内容</div>
              ) : (
                categories.map(cat => (
                  <div key={cat.id} className="album-tree-group">
                    <div
                      onClick={() => { setSelectedCat(cat.id); navigate(`/preview/${userId}/${cat.id}`) }}
                      className={`album-tree-node album-tree-node-level1${selectedCat === cat.id ? ' active' : ''}${m ? ' album-tree-node-compact' : ''}`}
                    >{cat.name}</div>

                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 0, alignSelf: 'stretch', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
            {viewAlbum?.type === '组合' ? (
              <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #f0f0f0', padding: m ? 12 : 16, marginBottom: 0, flex: 1 }}>
                <div style={{ fontSize: m ? 15 : 18, fontWeight: 600, color: '#333', marginBottom: 12 }}>{viewAlbum.productName || '产品名称'}</div>
                {viewAlbum.bannerUrl && (
                  <div style={{ height: m ? 'auto' : 350, aspectRatio: m ? '2/1' : undefined, background: `url(${viewAlbum.bannerUrl}) center/cover no-repeat`, borderRadius: 8, marginBottom: 16 }} />
                )}
                <div style={{ display: 'grid', gridTemplateColumns: m ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: m ? 8 : 10, alignItems: 'start' }}>
                  {(viewAlbum.comboItems || []).map(item => {
                    const itemUrl = albumMap[item.albumId]?.imageUrls?.[0] || albumMap[item.albumId]?.imageUrl || item.imageUrls?.[0] || item.imageUrl
                    const liveParams = allAlbums.find(x => x.albumId === item.albumId)?.productParams || item.productParams || {}
                    return (
                      <div key={item.albumId} style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #eee' }}>
                        <img src={itemUrl} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                        <div style={{ padding: '2px 6px 4px', fontSize: 11, color: '#999', lineHeight: 1.5 }}>
                          <div>规格：{liveParams.spec || '-'}</div>
                          <div>保质期：{liveParams.shelfLife || '-'}</div>
                          <div>总重量：{liveParams.totalWeight || '-'}</div>
                          <div style={{ color: '#FF4D4F', marginTop: 2 }}>温馨提示：{liveParams.note || '-'}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : viewAlbum ? (
              <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #f0f0f0', padding: m ? 12 : 16, marginBottom: 0, flex: 1 }}>
                {(() => {
                  const urls = getImageUrls(viewAlbum)
                  return (
                    <>
                      <img src={urls[0]} alt="" style={{ width: '100%', borderRadius: 6, display: 'block', marginBottom: 12 }} />
                      <div style={{ marginTop: 16, borderTop: '1px solid #eee', paddingTop: 16, marginBottom: 16 }}>
                        <div style={{ fontSize: 15, color: '#666', marginBottom: 6, fontWeight: 600, letterSpacing: 0.5 }}>产品参数</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                          <span style={{ width: 56, color: '#888', flexShrink: 0 }}>规格</span>
                          <span style={{ color: '#888', whiteSpace: 'pre-wrap' }}>{(viewAlbum.productParams || {}).spec || '-'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                          <span style={{ width: 56, color: '#888', flexShrink: 0 }}>保质期</span>
                          <span style={{ color: '#888' }}>{(viewAlbum.productParams || {}).shelfLife || '-'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                          <span style={{ width: 56, color: '#888', flexShrink: 0 }}>总重量</span>
                          <span style={{ color: '#888' }}>{(viewAlbum.productParams || {}).totalWeight || '-'}</span>
                        </div>
                        <div style={{ marginTop: 20 }}>
                          <div style={{ color: '#FF4D4F', fontSize: 12, marginBottom: 2 }}>温馨提示</div>
                          <div style={{ color: '#FF4D4F', whiteSpace: 'pre-wrap', fontSize: 12 }}>{(viewAlbum.productParams || {}).note || '-'}</div>
                        </div>
                      </div>
                      {urls.slice(1).map((url, i) => (
                        <img key={i} src={url} alt="" style={{ width: '100%', borderRadius: 6, display: 'block', marginBottom: i < urls.length - 2 ? 12 : 0 }} />
                      ))}
                    </>
                  )
                })()}
              </div>
            ) : selectedCat && currentCat ? (
              <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #f0f0f0', padding: m ? 12 : 16, marginBottom: 0, flex: 1 }}>
                <div style={{ fontSize: m ? 13 : 16, fontWeight: 600, color: '#333', marginBottom: m ? 0 : 12, display: m ? 'none' : 'block' }}>{currentCat.name}</div>
                <div style={{ display: 'grid', gridTemplateColumns: m ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: m ? 8 : 12 }}>
                  {currentCat.items.flatMap(i => (i.albums || []).map(a => ({ ...a }))).map((a, i) => (
                    <div key={a.albumId + '-' + i} style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #f0f0f0', cursor: 'pointer', position: 'relative', transition: 'all .3s' }} className="album-card-hover" onClick={() => { setViewAlbum(a); navigate(`/preview/${userId}/${selectedCat}/${a.albumId}`) }}>
                      <img src={getCoverUrl(a)} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                      <div style={{ padding: '4px 8px', fontSize: 13, color: '#333', borderTop: '1px solid #f0f0f0' }}>{a.productName || '产品名称'}</div>
                    </div>
                  ))}
                </div>
              </div>

            ) : !selectedCat && allAlbums.length > 0 ? (
              <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #f0f0f0', padding: m ? 12 : 16, marginBottom: 0, flex: 1 }}>
                <div style={{ fontSize: m ? 13 : 16, fontWeight: 600, color: '#333', marginBottom: m ? 0 : 12, display: m ? 'none' : 'block' }}>所有画册</div>
                <div style={{ display: 'grid', gridTemplateColumns: m ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: m ? 8 : 12 }}>
                  {allAlbums.map(a => (
                    <div key={a.albumId} style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #f0f0f0', cursor: 'pointer', position: 'relative', transition: 'all .3s' }} className="album-card-hover" onClick={() => { setViewAlbum(a); navigate(`/preview/${userId}/${a._catId}/${a.albumId}`) }}>
                      <img src={getCoverUrl(a)} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                      <div style={{ padding: '4px 8px', borderTop: '1px solid #f0f0f0' }}>
                        <div style={{ fontSize: 11, color: '#999', marginBottom: 2 }}>{a._catName} / {a._itemName}</div>
                        <div style={{ fontSize: 13, color: '#333', padding: '2px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.productName || '产品名称'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #f0f0f0', padding: 60, textAlign: 'center', color: 'rgba(0,0,0,.25)', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                请选择
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#999' }}>加载中...</div>
  }

  return (
    <div style={{ maxHeight: '100vh', overflowY: 'auto', background: '#f0f2f5', paddingRight: 2 }}>
      {renderContent(true)}
    </div>
  )
}
