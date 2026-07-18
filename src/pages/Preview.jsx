import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { API } from '../AuthContext'
import OgMeta from '../components/OgMeta'

export default function Preview() {
  const navigate = useNavigate()
  const { userId, albumId, catId: urlCatId, itemAlbumId } = useParams()
  const [categories, setCategories] = useState([])
  const [bannerUrl, setBannerUrl] = useState(null)
  const [bannerTitle, setBannerTitle] = useState('')
  const [albumTitle, setAlbumTitle] = useState('')
  const [bannerSubtitle, setBannerSubtitle] = useState('')
  const [bgFrom, setBgFrom] = useState('')
  const [bgTo, setBgTo] = useState('')
  const [menuBgFrom, setMenuBgFrom] = useState('')
  const [menuBgTo, setMenuBgTo] = useState('')
  const [nameColor, setNameColor] = useState('')
  const [descColor, setDescColor] = useState('')
  const [selectedCat, setSelectedCat] = useState(null)
  
  const [viewAlbum, setViewAlbum] = useState(null)
  const [albums, setAlbums] = useState([])
  const [gifts, setGifts] = useState([])
  const [loading, setLoading] = useState(true)
  const initialUrlSync = useRef(false)

  useEffect(() => {
    const s = document.createElement('style')
    s.textContent = '::-webkit-scrollbar{width:3px!important;height:3px!important}::-webkit-scrollbar-thumb{background:#ccc!important;border-radius:2px!important}::-webkit-scrollbar-track{background:transparent!important}'
    document.head.appendChild(s)
    return () => s.remove()
  }, [])

  const ogTitle = albumTitle || bannerTitle || '礼企汇 - AI礼品画册'
  const ogDesc = (bannerTitle || '') + (bannerTitle && bannerSubtitle ? ', ' : '') + (bannerSubtitle || '') || 'AI 智能礼品画册，扫码查看全部礼品'
  const ogImage = bannerUrl || (() => {
    for (const c of categories) {
      for (const i of c.items) {
        for (const a of i.albums || []) {
          const u = a.imageUrls?.[0] || a.imageUrl
          if (u) return u
        }
      }
    }
    return ''
  })()

  useEffect(() => {
    document.title = ogTitle
  }, [ogTitle])

  const albumMap = useMemo(() => {
    const m = {}
    for (const a of albums) m[a.id] = a
    return m
  }, [albums])

  const giftMap = useMemo(() => {
    const m = {}
    for (const g of gifts) m[g.id] = g
    return m
  }, [gifts])

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
    const params = albumId ? `?id=${encodeURIComponent(albumId)}` : (token ? '' : `?userId=${encodeURIComponent(userId)}`)
    const url = token ? `${API}/api/digital-album${params}` : `${API}/api/album${params}`
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    fetch(url, { headers })
      .then(r => r.json())
      .then(data => {
        if (data.categories?.length && categories.length === 0) {
          setCategories(data.categories)
          if (!urlCatId) setSelectedCat(data.categories[0].id)
        }
        if (data.bannerUrl) setBannerUrl(data.bannerUrl)
        if (data.bannerTitle) setBannerTitle(data.bannerTitle)
        if (data.albumTitle) setAlbumTitle(data.albumTitle)
        if (data.bannerSubtitle) setBannerSubtitle(data.bannerSubtitle)
        setBgFrom(data.titleBgFrom || '')
        setBgTo(data.titleBgTo || '')
        setMenuBgFrom(data.menuBgFrom || '')
        setMenuBgTo(data.menuBgTo || '')
        setNameColor(data.nameColor || '')
        setDescColor(data.descColor || '')
        setLoading(false)
      })
      .catch(() => setLoading(false))
    if (token) {
      fetch(`${API}/api/albums`, { headers })
        .then(r => r.json())
        .then(d => { if (d.albums) setAlbums(d.albums) })
        .catch(() => {})
      fetch(`${API}/api/gifts`, { headers })
        .then(r => r.json())
        .then(d => { if (d.gifts) setGifts(d.gifts) })
        .catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (loading || initialUrlSync.current) return
    initialUrlSync.current = true
    if (urlCatId) {
      if (!categories.some(c => c.id === urlCatId)) { navigate(`/preview/${userId}${albumId ? '/' + albumId : ''}`, { replace: true }); return }
      setSelectedCat(urlCatId)
    }
    if (itemAlbumId) {
      for (const c of categories) {
        for (const i of c.items) {
          const a = i.albums?.find(alb => alb.albumId === itemAlbumId)
          if (a) { setViewAlbum(a); return }
          for (const combo of (i.albums || []).filter(alb => alb.type === '组合')) {
            const ci = (combo.comboItems || []).find(item => item.albumId === itemAlbumId)
            if (ci) { const found = allAlbums.find(x => x.albumId === ci.albumId); setViewAlbum({ ...ci, productName: ci.productName || found?._albumData?.productName || found?._albumData?.giftData?.name || '' }); return }
          }
        }
      }
    }

  }, [loading])

  useEffect(() => {
    if (loading || !initialUrlSync.current) return
    if (urlCatId) {
      if (!categories.some(c => c.id === urlCatId)) { navigate(`/preview/${userId}${albumId ? '/' + albumId : ''}`, { replace: true }); return }
      setSelectedCat(urlCatId)
    } else {
      setSelectedCat(categories[0]?.id || null); setViewAlbum(null)
    }
    if (itemAlbumId) {
      for (const c of categories) {
        for (const i of c.items) {
          const a = i.albums?.find(alb => alb.albumId === itemAlbumId)
          if (a) { setViewAlbum(a); return }
          for (const combo of (i.albums || []).filter(alb => alb.type === '组合')) {
            const ci = (combo.comboItems || []).find(item => item.albumId === itemAlbumId)
            if (ci) { const found = allAlbums.find(x => x.albumId === ci.albumId); setViewAlbum({ ...ci, productName: ci.productName || found?._albumData?.productName || found?._albumData?.giftData?.name || '' }); return }
          }
        }
      }
    } else {
      setViewAlbum(null)
    }
  }, [urlCatId, itemAlbumId, albumId, loading])

  function renderContent(m) {
    const detailMode = !!itemAlbumId
    return (
      <div>
        {!detailMode && bannerUrl && <div style={{ width: '100%', aspectRatio: '16/9', background: '#fff', position: 'relative' }}>
          <img src={bannerUrl} alt="" style={{ width: '100%', height: '100%', display: 'block', objectFit: 'fill' }} />
          {(bannerTitle || bannerSubtitle) && (
            <div style={{
              position: 'absolute', bottom: -30, left: 0,
              width: '100%', height: 76,
            }}>
              <svg viewBox="0 0 900 140" preserveAspectRatio="none"
                style={{ width: '100%', height: '100%', display: 'block' }}
              >
                <defs>
                  <linearGradient id="tabG" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={bgFrom || '#F5C5F9'} />
                    <stop offset="100%" stopColor={bgTo || '#FDF0FC'} />
                  </linearGradient>
                  <filter id="tabS">
                    <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="rgba(0,0,0,.08)" />
                  </filter>
                </defs>
                <path
                  d="M28 0 H398 Q418 0 426 12 L482 68 Q502 80 510 80 H900 V140 H8 Q8 140 0 132 V28 Q0 0 28 0 Z"
                  fill="url(#tabG)" filter="url(#tabS)"
                />
              </svg>
              <div style={{
                position: 'absolute', left: 12, top: 0, bottom: 0, right: 0,
                display: 'flex', flexDirection: 'column', justifyContent: 'center',
                overflow: 'hidden',
              }}>
                <div style={{ fontSize: 24, fontWeight: 400, color: nameColor || '#3E3E3E', letterSpacing: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'DingTalk JinBuTi', marginTop: -2 }}>{bannerTitle}</div>
                {bannerSubtitle && <div style={{ fontSize: 12, color: descColor || '#3E3E3E', marginTop: -2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bannerSubtitle}</div>}
              </div>
            </div>
          )}
        </div>}
        <div style={{ display: 'flex', gap: 0, alignItems: 'flex-start', minHeight: detailMode ? '100vh' : 'calc(100vh - 60px)', background: bgTo || '#fffdf1', paddingTop: !detailMode && bannerUrl ? 30 : 0, maxWidth: '100%' }}>
          {!detailMode && <div style={{ flex: '0 0 auto', width: 'max-content', maxWidth: '40vw', background: bgTo || '#fffdf1', border: 'none', borderRadius: '0 20px 20px 0', alignSelf: 'stretch', display: 'flex', flexDirection: 'column' }}>
            <div className="album-tree-list album-tree-list-preview">
              {categories.length === 0 ? (
                <div className="album-tree-empty">暂无内容</div>
              ) : (
                categories.map(cat => (
                  <div key={cat.id} className="album-tree-group">
                    <div
                      onClick={() => { setSelectedCat(cat.id); navigate(`/preview/${userId}/${albumId}/${cat.id}`) }}
                      className={`album-tree-node album-tree-node-level1${selectedCat === cat.id ? ' active' : ''}${m ? ' album-tree-node-compact' : ''}`}
                      style={selectedCat === cat.id && (menuBgFrom || menuBgTo) ? { background: `linear-gradient(180deg, ${menuBgFrom || '#fbe99c'}, ${menuBgTo || '#fbe99c'})` } : undefined}
                    >{cat.name}</div>

                  </div>
                ))
              )}
            </div>
          </div>}

          <div style={{ flex: 1, minWidth: 0, alignSelf: 'stretch', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
            {viewAlbum?.type === '组合' ? (
              <div style={{ background: bgTo || '#fffdf1', borderRadius: 8, padding: m ? 12 : 16, marginBottom: 0, flex: 1 }}>
                <div style={{ fontSize: m ? 15 : 18, fontWeight: 600, color: '#333', marginBottom: 12 }}>{giftMap[viewAlbum.albumId]?.name || albumMap[viewAlbum.albumId]?.name || (viewAlbum.productName && viewAlbum.productName !== '产品名称' ? viewAlbum.productName : null) || viewAlbum._albumData?.giftData?.name || viewAlbum._albumData?.productName || '产品名称'}</div>
                {viewAlbum.bannerUrl && (
                  <div style={{ height: m ? 'auto' : 350, aspectRatio: m ? '2/1' : undefined, background: `url(${viewAlbum.bannerUrl}) center/cover no-repeat`, borderRadius: 8, marginBottom: 16 }} />
                )}
                <div style={{ display: 'grid', gridTemplateColumns: m ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: m ? 8 : 10, alignItems: 'start' }}>
                  {(viewAlbum.comboItems || []).map(item => {
                    const itemUrl = albumMap[item.albumId]?.imageUrls?.[0] || albumMap[item.albumId]?.imageUrl || item.imageUrls?.[0] || item.imageUrl
                    const liveName = giftMap[item.albumId]?.name || albumMap[item.albumId]?.name || (item.productName && item.productName !== '产品名称' ? item.productName : null) || allAlbums.find(x => x.albumId === item.albumId)?._albumData?.productName || allAlbums.find(x => x.albumId === item.albumId)?._albumData?.giftData?.name || ''
                    return (
                      <div key={item.albumId} style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #eee', cursor: 'pointer' }} onClick={() => { setViewAlbum({ ...item, productName: liveName }); navigate(`/preview/${userId}/${albumId}/${selectedCat}/${item.albumId}?combo=${viewAlbum.albumId}`) }}>
                        <img src={itemUrl} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                        <div style={{ padding: '4px 8px', fontSize: 13, color: '#333', borderTop: '1px solid #f0f0f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center' }}>{liveName || '产品名称'}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : viewAlbum ? (
              <div style={{ background: detailMode ? 'transparent' : bgTo || '#fffdf1', padding: detailMode ? 0 : m ? 12 : 16, marginBottom: 0, flex: 1 }}>
                {(() => {
                  const urls = getImageUrls(viewAlbum)
                  return (
                    <>
                      <img src={urls[0]} alt="" style={{ width: '100%', display: 'block', marginBottom: detailMode ? 0 : 12 }} />
                      <div style={{ marginTop: detailMode ? 0 : 16, borderTop: detailMode ? 'none' : '1px solid #eee', paddingTop: detailMode ? 0 : 16, marginBottom: detailMode ? 0 : 16 }}>
                        {(() => {
                          const albumId = viewAlbum.albumId
                          const gift = giftMap[albumId]
                          const liveName = gift?.name || albumMap[albumId]?.name || (viewAlbum.productName && viewAlbum.productName !== '产品名称' ? viewAlbum.productName : null) || viewAlbum._albumData?.giftData?.name || viewAlbum._albumData?.productName || ''
                          return liveName ? <div style={{ fontSize: 17, fontWeight: 600, color: '#333', marginBottom: 10 }}>{liveName}</div> : null
                        })()}
                        <div style={{ fontSize: 15, color: '#666', marginBottom: 6, fontWeight: 600, letterSpacing: 0.5 }}>产品参数</div>
                        {(() => {
                          const albumId = viewAlbum.albumId
                          const gift = giftMap[albumId]
                          const liveGift = gift ? { spec: gift.spec, price: gift.price, totalWeight: gift.netContent, shelfLife: gift.shelfLife, stock: gift.stock, note: gift.tips } : null
                          const p = viewAlbum.productParams || {}
                          const g = viewAlbum.giftData || viewAlbum._albumData?.giftData || {}
                          const live = albumMap[viewAlbum.albumId]
                          const spec = liveGift?.spec || p.spec || g.spec || live?.spec || '-'
                          const price = liveGift?.price || p.price || g.price || live?.price || '-'
                          const totalWeight = liveGift?.totalWeight || p.totalWeight || g.netContent || live?.netContent || '-'
                          const shelfLife = liveGift?.shelfLife || p.shelfLife || g.shelfLife || live?.shelfLife || '-'
                          const stock = liveGift?.stock || p.stock || g.stock || live?.stock || '-'
                          const note = liveGift?.note || p.note || g.tips || live?.tips || '-'
                          return (<>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                              <span style={{ width: 56, color: '#888', flexShrink: 0 }}>规格</span>
                              <span style={{ color: '#888', whiteSpace: 'pre-wrap' }}>{spec}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                              <span style={{ width: 56, color: '#888', flexShrink: 0 }}>零售价</span>
                              <span style={{ color: '#888' }}>{price}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                              <span style={{ width: 56, color: '#888', flexShrink: 0 }}>净含量</span>
                              <span style={{ color: '#888' }}>{totalWeight}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                              <span style={{ width: 56, color: '#888', flexShrink: 0 }}>保质期</span>
                              <span style={{ color: '#888' }}>{shelfLife}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                              <span style={{ width: 56, color: '#888', flexShrink: 0 }}>库存</span>
                              <span style={{ color: '#888' }}>{stock}</span>
                            </div>
                            <div style={{ marginTop: 20 }}>
                              <div style={{ color: '#FF4D4F', fontSize: 12, marginBottom: 2 }}>温馨提示</div>
                              <div style={{ color: '#FF4D4F', whiteSpace: 'pre-wrap', fontSize: 12 }}>{note}</div>
                            </div>
                          </>)
                        })()}
                      </div>
                      {urls.slice(1).map((url, i) => (
                        <img key={i} src={url} alt="" style={{ width: '100%', display: 'block', marginBottom: detailMode ? 0 : i < urls.length - 2 ? 12 : 0 }} />
                      ))}
                    </>
                  )
                })()}
              </div>
            ) : selectedCat && currentCat ? (
              <div style={{ background: bgTo || '#fffdf1', borderRadius: 8, padding: m ? 12 : 16, marginBottom: 0, flex: 1 }}>
                <div style={{ fontSize: m ? 13 : 16, fontWeight: 600, color: '#333', marginBottom: m ? 0 : 12, display: m ? 'none' : 'block' }}>{currentCat.name}</div>
                {currentCat.items.flatMap(i => (i.albums || []).map(a => ({ ...a }))).length === 0 ? (
                  <div style={{ padding: 60, textAlign: 'center', color: 'rgba(0,0,0,.25)', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>暂无数据</div>
                ) : (
                <div style={{ display: 'grid', gridTemplateColumns: m ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: m ? 8 : 12 }}>
                  {currentCat.items.flatMap(i => (i.albums || []).map(a => ({ ...a }))).map((a, i) => (
                    <div key={a.albumId + '-' + i} style={{ background: '#fff', borderRadius: 8, overflow: 'hidden', border: '1px solid #f0f0f0', cursor: 'pointer', position: 'relative', transition: 'all .3s' }} className="album-card-hover" onClick={() => { setViewAlbum(a); navigate(`/preview/${userId}/${albumId}/${selectedCat}/${a.albumId}`) }}>
                      <img src={getCoverUrl(a)} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                      <div style={{ padding: '4px 8px', fontSize: 13, color: '#333', borderTop: '1px solid #f0f0f0', textAlign: 'center' }}>{giftMap[a.albumId]?.name || albumMap[a.albumId]?.name || (a.productName && a.productName !== '产品名称' ? a.productName : null) || a._albumData?.giftData?.name || a._albumData?.productName || (a.type === '组合' ? '未命名组合' : '产品名称')}</div>
                    </div>
                  ))}
                </div>
                )}
              </div>

            ) : !selectedCat && allAlbums.length > 0 ? (
              <div style={{ background: bgTo || '#fffdf1', borderRadius: 8, padding: m ? 12 : 16, marginBottom: 0, flex: 1 }}>
                <div style={{ fontSize: m ? 13 : 16, fontWeight: 600, color: '#333', marginBottom: m ? 0 : 12, display: m ? 'none' : 'block' }}>所有画册</div>
                <div style={{ display: 'grid', gridTemplateColumns: m ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: m ? 8 : 12 }}>
                  {allAlbums.map(a => (
                    <div key={a.albumId} style={{ background: '#fff', borderRadius: 8, overflow: 'hidden', border: '1px solid #f0f0f0', cursor: 'pointer', position: 'relative', transition: 'all .3s' }} className="album-card-hover" onClick={() => { setViewAlbum(a); navigate(`/preview/${userId}/${albumId}/${a._catId}/${a.albumId}`) }}>
                      <img src={getCoverUrl(a)} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                      <div style={{ padding: '4px 8px', borderTop: '1px solid #f0f0f0' }}>
                        <div style={{ fontSize: 11, color: '#999', marginBottom: 2 }}>{a._catName} / {a._itemName}</div>
                        <div style={{ fontSize: 13, color: '#333', padding: '2px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center' }}>{giftMap[a.albumId]?.name || albumMap[a.albumId]?.name || (a.productName && a.productName !== '产品名称' ? a.productName : null) || a._albumData?.giftData?.name || a._albumData?.productName || (a.type === '组合' ? '未命名组合' : '产品名称')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ background: bgTo || '#fffdf1', borderRadius: 8, padding: 60, textAlign: 'center', color: 'rgba(0,0,0,.25)', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                暂无数据
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
    <>
      <OgMeta title={ogTitle} description={ogDesc} image={ogImage} />
      <div style={{ maxHeight: '100vh', overflowY: 'auto', overflowX: 'hidden', maxWidth: '100vw', background: bgTo || '#fffdf1' }}>
        {renderContent(true)}
      </div>
    </>
  )
}
