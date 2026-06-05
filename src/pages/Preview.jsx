import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { API } from '../AuthContext'

export default function Preview() {
  const location = useLocation()
  const navigate = useNavigate()
  const [categories, setCategories] = useState(location.state?.categories || [])
  const [bannerUrl, setBannerUrl] = useState(location.state?.bannerUrl || null)
  const [selectedCat, setSelectedCat] = useState(null)
  const [selectedItem, setSelectedItem] = useState(null)
  const [viewAlbum, setViewAlbum] = useState(null)
  const [mobile, setMobile] = useState(false)
  const [generatingBanner, setGeneratingBanner] = useState(false)
  const [bannerProgress, setBannerProgress] = useState(0)
  const [bannerError, setBannerError] = useState(null)

  const currentCat = categories.find(c => c.id === selectedCat)
  const currentItem = currentCat?.items.find(i => i.id === selectedItem)

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
  }, [])

  const saveBannerUrl = (url) => {
    const token = localStorage.getItem('token')
    if (!token) return
    setBannerUrl(url)
    fetch(`${API}/api/digital-album`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ categories, bannerUrl: url }),
    }).then(() => {
      fetch(`${API}/api/album/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})
    }).catch(() => {})
  }

  const generateBanner = () => {
    const token = localStorage.getItem('token')
    if (!token) return
    setGeneratingBanner(true)
    setBannerProgress(0)
    setBannerError(null)

    fetch(`${API}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        config: {
          model: 'maiziai-chatgpt-image-2',
          prompt: '生成一个端午节的banner，喜庆、大气',
          size: '1:1',
        },
      }),
    }).then(r => r.json()).then(data => {
      if (!data.taskId) {
        setBannerError(data.error || '生成失败')
        setGeneratingBanner(false)
        return
      }
      const poll = () => {
        fetch(`${API}/api/generate/status?taskId=${data.taskId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.json()).then(status => {
          if (status.imageUrl) {
            setBannerProgress(100)
            setTimeout(() => {
              saveBannerUrl(status.imageUrl)
              setGeneratingBanner(false)
            }, 300)
          } else if (status.taskStatus === 'SUCCEEDED') {
            setBannerProgress(100)
            setTimeout(() => {
              saveBannerUrl(status.imageUrl)
              setGeneratingBanner(false)
            }, 300)
          } else if (status.taskStatus === 'FAILED') {
            setBannerError(status.statusText || '生成失败')
            setGeneratingBanner(false)
          } else {
            setTimeout(poll, 500)
          }
        }).catch(() => setTimeout(poll, 500))
      }
      setTimeout(poll, 500)
    }).catch(err => {
      setBannerError(err.message || '网络错误')
      setGeneratingBanner(false)
    })
  }

  const banner = (
    <div style={{ width: '100%', height: 240, background: mobile ? '#e8e8e8' : 'transparent', position: 'relative' }}>
      {bannerUrl && <img src={bannerUrl} alt="" style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }} />}
      {!bannerUrl && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          {generatingBanner ? (
            <>
              <div style={{ fontSize: 13, color: '#666' }}>正在生成banner...</div>
              <div style={{ width: 200, height: 6, background: '#ddd', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${bannerProgress}%`, height: '100%', background: 'linear-gradient(90deg, #1a1a2e, #4a4a8e)', borderRadius: 3, transition: 'width .1s linear' }} />
              </div>
            </>
          ) : localStorage.getItem('token') ? (
            <button onClick={generateBanner} style={{ padding: '10px 24px', fontSize: 14, background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
              🎨 AI生成Banner
            </button>
          ) : null}
          {bannerError && <div style={{ fontSize: 12, color: '#e44' }}>{bannerError}</div>}
        </div>
      )}
    </div>
  )

  const content = (
    <div>
      {banner}
      <div style={{ display: 'flex', gap: mobile ? 8 : 20, alignItems: 'flex-start', minHeight: 'calc(100vh - 60px)', background: '#f0f2f5' }}>
        <div style={{ flex: '0 0 auto', width: 'max-content', background: '#fff', borderRadius: mobile ? 0 : 8, boxShadow: mobile ? 'none' : '0 1px 3px rgba(0,0,0,.08)', overflow: 'hidden', alignSelf: 'stretch', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: mobile ? '8px 6px' : '14px 16px', borderBottom: mobile ? 'none' : '1px solid #eee', fontSize: mobile ? 12 : 15, fontWeight: 600, color: '#333' }}>目录</div>
          <div className={`album-tree-list album-tree-list-preview${mobile ? ' album-tree-list-compact' : ''}`}>
            {categories.length === 0 ? (
              <div className="album-tree-empty">暂无内容</div>
            ) : (
              categories.map(cat => (
                <div key={cat.id} className="album-tree-group">
                  <div
                    onClick={() => { setSelectedCat(cat.id); setSelectedItem(null) }}
                    className={`album-tree-node album-tree-node-level1${selectedCat === cat.id && selectedItem === null ? ' active' : ''}${mobile ? ' album-tree-node-compact' : ''}`}
                  >{cat.name}</div>
                  {cat.items.map(item => (
                    <div
                      key={item.id}
                      onClick={() => { setSelectedCat(cat.id); setSelectedItem(item.id) }}
                      className={`album-tree-node album-tree-node-level2${selectedItem === item.id ? ' active' : ''}${mobile ? ' album-tree-node-compact' : ''}`}
                    >{item.name}</div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {viewAlbum ? (
            <div style={{ background: '#fff', borderRadius: mobile ? 0 : 8, boxShadow: '0 1px 3px rgba(0,0,0,.08)', padding: 16, marginBottom: 0 }}>
              <button onClick={() => setViewAlbum(null)} style={{ background: 'none', border: 'none', color: '#1a1a2e', cursor: 'pointer', fontSize: 13, marginBottom: 12, padding: 0 }}>← 返回</button>
              <img src={viewAlbum.imageUrl} alt="" style={{ width: '100%', borderRadius: mobile ? 0 : 6, display: 'block' }} />
              {viewAlbum.prompt && <div style={{ marginTop: 12, fontSize: 15, color: '#666', lineHeight: 1.6 }}>{viewAlbum.prompt}</div>}
              <div style={{ marginTop: 8, fontSize: 14, color: '#999' }}>
                {viewAlbum.model || ''}{viewAlbum.model && viewAlbum.createdAt ? ' · ' : ''}{viewAlbum.createdAt ? new Date(viewAlbum.createdAt).toLocaleDateString('zh-CN') : ''}
              </div>
            </div>
          ) : selectedCat && currentCat && !selectedItem ? (
            <div style={{ background: mobile ? 'none' : '#fff', borderRadius: mobile ? 0 : 8, boxShadow: mobile ? 'none' : '0 1px 3px rgba(0,0,0,.08)', padding: mobile ? 12 : 16, marginBottom: 0 }}>
              <div style={{ fontSize: mobile ? 13 : 16, fontWeight: 600, color: '#333', marginBottom: mobile ? 0 : 12, display: mobile ? 'none' : 'block' }}>{currentCat.name}</div>
              <div style={{ display: 'grid', gridTemplateColumns: mobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: mobile ? 8 : 12 }}>
                {currentCat.items.flatMap(i => (i.albums || []).map(a => ({ ...a, _pageName: i.name }))).map((a, i) => (
                  <div key={a.albumId + '-' + i} style={{ borderRadius: mobile ? 0 : 8, overflow: 'hidden', border: '1px solid #eee', cursor: 'pointer' }} onClick={() => setViewAlbum(a)}>
                    <img src={a.imageUrl} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />

                    <div style={{ padding: '2px 10px 8px 14px', fontSize: 14, borderTop: '1px solid #f0f0f0' }}>
                      <div style={{ paddingTop: 4 }}>
                        <div style={{ fontSize: 15, color: '#666', marginBottom: 6, fontWeight: 600, letterSpacing: 0.5 }}>产品参数</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                          <span style={{ width: 56, color: '#888', flexShrink: 0 }}>规格</span>
                          <span style={{ color: '#888', whiteSpace: 'pre-wrap' }}>{(a.productParams || {}).spec || '-'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                          <span style={{ width: 56, color: '#888', flexShrink: 0 }}>保质期</span>
                          <span style={{ color: '#888' }}>{(a.productParams || {}).shelfLife || '-'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                          <span style={{ width: 56, color: '#888', flexShrink: 0 }}>总重量</span>
                          <span style={{ color: '#888' }}>{(a.productParams || {}).totalWeight || '-'}</span>
                        </div>
                        <div style={{ marginTop: 20 }}>
                          <div style={{ color: '#e74c3c', fontSize: 12, marginBottom: 2 }}>温馨提示</div>
                          <div style={{ color: '#e74c3c', whiteSpace: 'pre-wrap', fontSize: 12 }}>{(a.productParams || {}).note || '-'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : currentItem ? (
            <div style={{ background: mobile ? 'none' : '#fff', borderRadius: mobile ? 0 : 8, boxShadow: mobile ? 'none' : '0 1px 3px rgba(0,0,0,.08)', padding: mobile ? 12 : 16, marginBottom: 0 }}>
              <div style={{ fontSize: mobile ? 13 : 16, fontWeight: 600, color: '#333', marginBottom: mobile ? 0 : 12, display: mobile ? 'none' : 'block' }}>{currentItem.name}</div>
              <div style={{ display: 'grid', gridTemplateColumns: mobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: mobile ? 8 : 12 }}>
                {(currentItem.albums || []).map(a => (
                  <div key={a.albumId} style={{ borderRadius: mobile ? 0 : 8, overflow: 'hidden', border: '1px solid #eee', cursor: 'pointer' }} onClick={() => setViewAlbum(a)}>
                    <img src={a.imageUrl} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                    <div style={{ padding: '2px 10px 8px 14px', fontSize: 14, borderTop: '1px solid #f0f0f0' }}>
                      <div style={{ paddingTop: 4 }}>
                        <div style={{ fontSize: 15, color: '#666', marginBottom: 6, fontWeight: 600, letterSpacing: 0.5 }}>产品参数</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                          <span style={{ width: 56, color: '#888', flexShrink: 0 }}>规格</span>
                          <span style={{ color: '#888', whiteSpace: 'pre-wrap' }}>{(a.productParams || {}).spec || '-'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                          <span style={{ width: 56, color: '#888', flexShrink: 0 }}>保质期</span>
                          <span style={{ color: '#888' }}>{(a.productParams || {}).shelfLife || '-'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                          <span style={{ width: 56, color: '#888', flexShrink: 0 }}>总重量</span>
                          <span style={{ color: '#888' }}>{(a.productParams || {}).totalWeight || '-'}</span>
                        </div>
                        <div style={{ marginTop: 20 }}>
                          <div style={{ color: '#e74c3c', fontSize: 12, marginBottom: 2 }}>温馨提示</div>
                          <div style={{ color: '#e74c3c', whiteSpace: 'pre-wrap', fontSize: 12 }}>{(a.productParams || {}).note || '-'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ background: '#fff', borderRadius: mobile ? 0 : 8, boxShadow: '0 1px 3px rgba(0,0,0,.08)', padding: 60, textAlign: 'center', color: '#999' }}>
              请在左侧选择一个页面
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#1a1a2e' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', background: '#1a1a2e' }}>
        <button onClick={() => navigate('/digital-album')} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 14, padding: '4px 12px', borderRadius: mobile ? 0 : 4 }}>← 退出预览</button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setMobile(false)} style={{ background: !mobile ? 'rgba(255,255,255,.15)' : 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13, padding: '6px 14px', borderRadius: mobile ? 0 : 4 }}>💻</button>
          <button onClick={() => setMobile(true)} style={{ background: mobile ? 'rgba(255,255,255,.15)' : 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13, padding: '6px 14px', borderRadius: mobile ? 0 : 4 }}>📱</button>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', padding: mobile ? '20px 0' : 0 }}>
        <div style={mobile ? { width: 390, maxHeight: 'calc(100vh - 60px)', overflow: 'auto', borderRadius: 0, border: '3px solid #444', background: '#f0f2f5' } : { width: '100%' }}>
          {mobile ? <div style={{ padding: 0 }}>{content}</div> : content}
        </div>
      </div>
    </div>
  )
}
