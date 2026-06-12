import { useState, useEffect, useMemo, useRef } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeftOutlined, QrcodeOutlined } from '@ant-design/icons'
import QRCode from 'qrcode'
import { API } from '../AuthContext'

export default function Preview() {
  const location = useLocation()
  const navigate = useNavigate()
  const { catId: urlCatId, itemId: urlItemId, albumId: urlAlbumId } = useParams()
  const [categories, setCategories] = useState(location.state?.categories || [])
  const [bannerUrl, setBannerUrl] = useState(location.state?.bannerUrl || null)
  const [selectedCat, setSelectedCat] = useState(null)
  const [selectedItem, setSelectedItem] = useState(null)
  const [viewAlbum, setViewAlbum] = useState(null)
  const [albums, setAlbums] = useState([])
  const [loading, setLoading] = useState(categories.length === 0)
  const [mobile, setMobile] = useState(window.innerWidth < 768)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const handler = (e) => setMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  const [showQR, setShowQR] = useState(false)
  const [qrDataURL, setQrDataURL] = useState('')
  const qrRef = useRef(null)
  const initialUrlSync = useRef(false)

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
  const currentItem = currentCat?.items.find(i => i.id === selectedItem)

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
    const url = token ? `${API}/api/digital-album` : `${API}/api/album`
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
      if (!categories.some(c => c.id === urlCatId)) { navigate('/preview', { replace: true }); return }
      setSelectedCat(urlCatId)
    }
    if (urlItemId) {
      const cat = categories.find(c => c.id === urlCatId)
      if (!cat?.items.some(i => i.id === urlItemId)) { navigate(urlCatId ? `/preview/${urlCatId}` : '/preview', { replace: true }); return }
      setSelectedItem(urlItemId)
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
      if (!categories.some(c => c.id === urlCatId)) { navigate('/preview', { replace: true }); return }
      setSelectedCat(urlCatId)
    } else {
      setSelectedCat(null); setSelectedItem(null); setViewAlbum(null)
    }
    if (urlItemId) {
      const cat = categories.find(c => c.id === urlCatId)
      if (!cat?.items.some(i => i.id === urlItemId)) { navigate(urlCatId ? `/preview/${urlCatId}` : '/preview', { replace: true }); return }
      setSelectedItem(urlItemId)
    } else if (!urlItemId && !urlCatId) {
      setSelectedItem(null); setViewAlbum(null)
    }
    if (urlAlbumId) {
      for (const c of categories) {
        for (const i of c.items) {
          const a = i.albums?.find(alb => alb.albumId === urlAlbumId)
          if (a) { setViewAlbum(a); return }
        }
      }
    } else if (!urlAlbumId) {
      setViewAlbum(null)
    }
  }, [urlCatId, urlItemId, urlAlbumId, loading])

  useEffect(() => {
    const url = window.location.origin + '/preview'
    QRCode.toDataURL(url, { width: 300, margin: 1 }, (err, url) => {
      if (!err) setQrDataURL(url)
    })
  }, [])

  useEffect(() => {
    if (!showQR) return
    const handler = (e) => { if (qrRef.current && !qrRef.current.contains(e.target)) setShowQR(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showQR])

  const content = (
    <div>
      {bannerUrl && <div style={{ width: '100%', height: 240, background: '#fff', position: 'relative' }}><img src={bannerUrl} alt="" style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }} /></div>}
      <div style={{ display: 'flex', gap: 0, alignItems: 'flex-start', minHeight: 'calc(100vh - 60px)', background: '#f0f2f5' }}>
        <div style={{ flex: '0 0 auto', width: 'max-content', background: 'transparent', borderRadius: 8, border: '1px solid #f0f0f0', overflow: 'hidden', alignSelf: 'stretch', display: 'flex', flexDirection: 'column' }}>
          <div className="album-tree-list album-tree-list-preview">
            {categories.length === 0 ? (
              <div className="album-tree-empty">暂无内容</div>
            ) : (
              categories.map(cat => (
                <div key={cat.id} className="album-tree-group">
                  <div
                    onClick={() => { setSelectedCat(cat.id); setSelectedItem(null); navigate(`/preview/${cat.id}`) }}
                    className={`album-tree-node album-tree-node-level1${selectedCat === cat.id && selectedItem === null ? ' active' : ''}${mobile ? ' album-tree-node-compact' : ''}`}
                  >{cat.name}</div>
                  {cat.items.map(item => (
                    <div
                      key={item.id}
                      onClick={() => { setSelectedCat(cat.id); setSelectedItem(item.id); navigate(`/preview/${cat.id}/${item.id}`) }}
                      className={`album-tree-node album-tree-node-level2${selectedItem === item.id ? ' active' : ''}${mobile ? ' album-tree-node-compact' : ''}`}
                    >{item.name}</div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {viewAlbum?.type === '组合' ? (
            <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #f0f0f0', padding: 16, marginBottom: 0 }}>
              <div style={{ fontSize: mobile ? 15 : 18, fontWeight: 600, color: '#333', marginBottom: 12 }}>{viewAlbum.productName || '产品名称'}</div>
              {viewAlbum.bannerUrl && (
                <div style={{ height: mobile ? 'auto' : 350, aspectRatio: mobile ? '2/1' : undefined, background: `url(${viewAlbum.bannerUrl}) center/cover no-repeat`, borderRadius: 8, marginBottom: 16 }} />
              )}
              <div style={{ display: 'grid', gridTemplateColumns: mobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: mobile ? 8 : 10, alignItems: 'start' }}>
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
            <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #f0f0f0', padding: 16, marginBottom: 0 }}>
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
              <div style={{ marginTop: 8, fontSize: 14, color: '#999' }}>
                {viewAlbum.createdAt ? new Date(viewAlbum.createdAt).toLocaleDateString('zh-CN') : ''}
              </div>
              </div>
          ) : selectedCat && currentCat && !selectedItem ? (
            <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #f0f0f0', padding: mobile ? 12 : 16, marginBottom: 0 }}>
              <div style={{ fontSize: mobile ? 13 : 16, fontWeight: 600, color: '#333', marginBottom: mobile ? 0 : 12, display: mobile ? 'none' : 'block' }}>{currentCat.name}</div>
              <div style={{ display: 'grid', gridTemplateColumns: mobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: mobile ? 8 : 12 }}>
                {currentCat.items.flatMap(i => (i.albums || []).map(a => ({ ...a, _pageName: i.name, _itemId: i.id }))).map((a, i) => (
                  <div key={a.albumId + '-' + i} style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #f0f0f0', cursor: 'pointer', position: 'relative', transition: 'all .3s' }} className="album-card-hover" onClick={() => { setViewAlbum(a); navigate(`/preview/${selectedCat}/${a._itemId}/${a.albumId}`) }}>
                    <img src={getCoverUrl(a)} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                    <div style={{ padding: '4px 8px', fontSize: 13, color: '#333', borderTop: '1px solid #f0f0f0' }}>{a.productName || '产品名称'}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : currentItem ? (
            <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #f0f0f0', padding: mobile ? 12 : 16, marginBottom: 0 }}>
              <div style={{ fontSize: mobile ? 13 : 16, fontWeight: 600, color: '#333', marginBottom: mobile ? 0 : 12, display: mobile ? 'none' : 'block' }}>{currentItem.name}</div>
              <div style={{ display: 'grid', gridTemplateColumns: mobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: mobile ? 8 : 12 }}>
                {(currentItem.albums || []).map(a => (
                  <div key={a.albumId} style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #f0f0f0', cursor: 'pointer', position: 'relative', transition: 'all .3s' }} className="album-card-hover" onClick={() => { setViewAlbum(a); navigate(`/preview/${selectedCat}/${selectedItem}/${a.albumId}`) }}>
                    <img src={getCoverUrl(a)} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                    <div style={{ padding: '4px 8px', fontSize: 13, color: '#333', borderTop: '1px solid #f0f0f0' }}>{a.productName || '产品名称'}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : !selectedCat && allAlbums.length > 0 ? (
            <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #f0f0f0', padding: mobile ? 12 : 16, marginBottom: 0 }}>
              <div style={{ fontSize: mobile ? 13 : 16, fontWeight: 600, color: '#333', marginBottom: mobile ? 0 : 12, display: mobile ? 'none' : 'block' }}>所有画册</div>
              <div style={{ display: 'grid', gridTemplateColumns: mobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: mobile ? 8 : 12 }}>
                {allAlbums.map(a => (
                  <div key={a.albumId} style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #f0f0f0', cursor: 'pointer', position: 'relative', transition: 'all .3s' }} className="album-card-hover" onClick={() => { setViewAlbum(a); navigate(`/preview/${a._catId}/${a._itemId}/${a.albumId}`) }}>
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
            <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #f0f0f0', padding: 60, textAlign: 'center', color: 'rgba(0,0,0,.25)' }}>
              请在左侧选择一个页面
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh' }}>
      {!mobile && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 32px', background: '#fff', borderBottom: '1px solid #f0f0f0', height: 56, flexShrink: 0, position: 'relative' }}>
          <button onClick={() => navigate('/digital-album')} style={{ background: 'none', border: 'none', color: '#1677FF', cursor: 'pointer', fontSize: 14, padding: '4px 12px' }}><ArrowLeftOutlined /> 退出预览</button>
          <div style={{ position: 'relative' }}>
            <span onClick={e => { e.stopPropagation(); setShowQR(s => !s) }} style={{ cursor: 'pointer', fontSize: 20, color: '#666', padding: 4 }}><QrcodeOutlined /></span>
            {showQR && qrDataURL && (
              <div ref={qrRef} style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, background: '#fff', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,.15)', padding: 8, zIndex: 200 }}>
                <img src={qrDataURL} alt="二维码" style={{ width: 300, height: 300, display: 'block' }} />
              </div>
            )}
          </div>
        </div>
      )}
      {content}
    </div>
  )
}
