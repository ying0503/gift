import { useState, useCallback, useEffect, useRef } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext'
import Home from './pages/Home'
import Generate from './pages/Generate'
import MyAlbums from './pages/MyAlbums'
import DigitalAlbum from './pages/DigitalAlbum'
import DigitalAlbumList from './pages/DigitalAlbumList'
import ModelUse from './pages/ModelUse'
import Resource from './pages/Resource'
import Preview from './pages/Preview'
import LandingPage from './pages/LandingPage'
import ErrorBoundary from './components/ErrorBoundary'

function AppContent() {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewAnim, setPreviewAnim] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewKey, setPreviewKey] = useState(0)
  const [currentTime, setCurrentTime] = useState(() => new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }))
  const previewSaveRef = useRef(null)
  const previewAlbumIdRef = useRef(null)
  const [showQR, setShowQR] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')

  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (showQR && !qrDataUrl && user) {
      import('qrcode').then(mod => {
        const QRCode = mod.default || mod
        QRCode.toDataURL(
          window.location.origin + '/preview/' + user.id + (previewAlbumIdRef.current ? '/' + previewAlbumIdRef.current : ''),
          { width: 360, margin: 1 }
        ).then(url => setQrDataUrl(url)).catch(() => {})
      })
    }
  }, [showQR, qrDataUrl, user])

  const openPreview = useCallback(() => {
    const doOpen = () => {
      setShowPreview(true)
      setPreviewAnim('in')
      setPreviewLoading(true)
      setPreviewKey(k => k + 1)
      setTimeout(() => setPreviewLoading(false), 1500)
    }
    if (previewSaveRef.current) {
      previewSaveRef.current().then(doOpen).catch(doOpen)
    } else {
      doOpen()
    }
  }, [])

  const closePreview = useCallback(() => {
    setPreviewAnim('out')
    setTimeout(() => { setShowPreview(false); setPreviewAnim(''); setPreviewLoading(false) }, 400)
  }, [])

  useEffect(() => {
    document.body.style.overflow = showPreview ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [showPreview])

  if (loading) {
    return (
      <div className="app">
        <header className="app-header">
          <div className="header-inner">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <img src="https://gift-bucket-0503.oss-cn-beijing.aliyuncs.com/static/site/logo-64.png" alt="logo" style={{ height: 28, display: 'block' }} />
              <span style={{ fontSize: 16, fontWeight: 700, color: '#111', letterSpacing: -0.5 }}>Ligent</span>
              <span style={{ fontSize: 11, color: '#fff', background: '#111', padding: '2px 8px', borderRadius: 999, letterSpacing: 0.5, display: 'inline-block' }}>礼企AI智能体</span>
            </div>
          </div>
        </header>
        <main className="app-main" style={{ textAlign: 'center', paddingTop: 100, color: '#999' }}>
          加载中...
        </main>
      </div>
    )
  }

  if (location.pathname.startsWith('/preview')) {
    return (
      <Routes>
        <Route path="/preview/:userId" element={<ErrorBoundary><Preview /></ErrorBoundary>} />
        <Route path="/preview/:userId/:albumId" element={<ErrorBoundary><Preview /></ErrorBoundary>} />
        <Route path="/preview/:userId/:albumId/:catId" element={<ErrorBoundary><Preview /></ErrorBoundary>} />
        <Route path="/preview/:userId/:albumId/:catId/:itemAlbumId" element={<ErrorBoundary><Preview /></ErrorBoundary>} />
      </Routes>
    )
  }

  if (location.pathname === '/') {
    return <ErrorBoundary><LandingPage /></ErrorBoundary>
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="https://gift-bucket-0503.oss-cn-beijing.aliyuncs.com/static/site/logo-64.png" alt="logo" style={{ height: 28, display: 'block' }} />
            <span style={{ fontSize: 16, fontWeight: 700, color: '#111', letterSpacing: -0.5 }}>Ligent</span>
            <span style={{ fontSize: 11, color: '#fff', background: '#111', padding: '2px 8px', borderRadius: 999, letterSpacing: 0.5, display: 'inline-block' }}>礼企AI智能体</span>
          </div>
          {user && (
            <div className="header-right">
              {location.pathname.startsWith('/digital-album/') && (
                <button onClick={openPreview} style={{
                  padding: '6px 16px', fontSize: 13, border: 'none', borderRadius: 6, cursor: 'pointer', marginRight: 8,
                  background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
                  color: '#fff', fontWeight: 500, whiteSpace: 'nowrap',
                }}>AI智能预览</button>
              )}
              <div style={{ position: 'relative' }}
                onMouseEnter={() => setAvatarOpen(true)}
                onMouseLeave={() => setAvatarOpen(false)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <img
                    src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23E8E0FF'/%3E%3Ccircle cx='50' cy='38' r='16' fill='%237B61FF'/%3E%3Cellipse cx='50' cy='72' rx='26' ry='22' fill='%237B61FF'/%3E%3C/svg%3E"
                    alt="avatar"
                    style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
                  />
                </div>
                {avatarOpen && (
                  <div style={{
                    position: 'absolute', top: '100%', right: 0, paddingTop: 12,
                    zIndex: 1001,
                  }}
                    onMouseEnter={() => setAvatarOpen(true)}
                    onMouseLeave={() => setAvatarOpen(false)}
                  >
                    <div style={{
                      background: '#fff', borderRadius: 12,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                      width: 160, padding: '8px 0',
                    }}>
                      <div style={{ padding: '10px 16px', fontSize: 13, color: '#999', borderBottom: '1px solid #f0f0f0' }}>{user.email}</div>
                      <button style={{
                        display: 'block', width: '100%', padding: '10px 16px', border: 'none', background: 'none',
                        fontSize: 14, color: '#555', cursor: 'pointer', textAlign: 'left',
                      }}
                        onMouseEnter={e => e.target.style.background = '#f5f5f5'}
                        onMouseLeave={e => e.target.style.background = 'none'}
                        onClick={() => navigate('/workbench')}
                      >账户设置</button>
                      <button style={{
                        display: 'block', width: '100%', padding: '10px 16px', border: 'none', background: 'none',
                        fontSize: 14, color: '#ff4d4f', cursor: 'pointer', textAlign: 'left',
                      }}
                        onMouseEnter={e => e.target.style.background = '#fff2f0'}
                        onMouseLeave={e => e.target.style.background = 'none'}
                        onClick={() => { logout(); setAvatarOpen(false) }}
                      >退出登录</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </header>
      <div className="app-body">
        {user && (
          <nav className="app-sidebar">
            <div className="sidebar-nav">
              <button className={`sidebar-tab${location.pathname === '/workbench' ? ' active' : ''}`} onClick={() => navigate('/workbench')}>
                <svg viewBox="0 0 1024 1024" width="30" height="30" fill="currentColor"><path d="M605.3376 800.1024v9.5744c0 15.872-9.6256 30.3104-24.576 36.7616l-43.0592 18.688a63.9488 63.9488 0 0 1-50.5856 0.1024l-43.776-18.7904a40.2432 40.2432 0 0 1-24.7296-36.864v-9.472h186.7264zM306.688 678.9632l4.9664 0.768c8.2432 2.1504 14.6432 8.3456 16.896 16.384a22.6816 22.6816 0 0 1-6.2464 22.3232l-30.0032 29.184a24.32 24.32 0 0 1-23.04 5.9392 23.4496 23.4496 0 0 1-16.8448-16.384 22.6816 22.6816 0 0 1 6.1952-22.272l30.0544-29.184a24.32 24.32 0 0 1 23.04-5.9904z m404.0704-0.8704a24.32 24.32 0 0 1 22.9888 5.9904l31.744 30.8224a22.784 22.784 0 0 1 0 32.6656 24.064 24.064 0 0 1-33.6896 0l-31.744-30.7712a22.6816 22.6816 0 0 1-6.144-22.3744 23.5008 23.5008 0 0 1 16.8448-16.3328zM512 260.096c137.5232 0 249.0368 108.2368 249.0368 241.7152 0 101.4784-64.4096 188.2624-155.648 224.1536v27.5456h-69.5296c0.6144-118.1696 34.4064-212.6336 51.8656-219.0336 8.3456 0 18.3296 10.6496 26.6752 28.4672 5.632 11.3664 19.6096 16.2304 31.3856 11.008a22.8864 22.8864 0 0 0 11.9808-30.208c-21.6064-45.8752-50.0224-55.5008-70.0416-55.5008-35.84 0-60.1088 41.0624-75.7248 93.5424-15.616-52.48-39.936-93.5424-75.776-93.5424-19.968 0-48.384 9.6256-69.9904 55.5008a22.528 22.528 0 0 0 2.2528 23.04 24.064 24.064 0 0 0 41.1136-3.84c8.3456-17.8176 18.3296-28.4672 25.7536-28.5696 18.432 6.5024 52.1728 100.9664 52.736 219.136H418.6624v-27.5456c-91.2384-35.8912-155.648-122.6752-155.648-224.1536C262.9632 368.2816 374.4768 260.096 512 260.096zM217.6 478.4128c13.1072 0 23.7568 10.3936 23.7568 23.1424 0 12.8-10.6496 23.0912-23.808 23.0912h-40.1408A23.4496 23.4496 0 0 1 153.6 501.5552c0-12.8 10.6496-23.1424 23.808-23.1424z m628.992 0c13.1584 0 23.808 10.3936 23.808 23.1424 0 12.8-10.6496 23.0912-23.808 23.0912h-43.6224a23.4496 23.4496 0 0 1-23.808-23.0912c0-12.8 10.6496-23.1424 23.808-23.1424z m-96.768-229.6832l4.9664 0.768c8.192 2.1504 14.6432 8.3968 16.8448 16.384a22.6816 22.6816 0 0 1-6.1952 22.3232l-29.2352 28.3648a24.32 24.32 0 0 1-23.04 5.9904 23.4496 23.4496 0 0 1-16.8448-16.384 22.6816 22.6816 0 0 1 6.1952-22.3232l29.2352-28.3648a24.32 24.32 0 0 1 23.04-5.9904z m-480.5632 0.768a24.32 24.32 0 0 1 22.9888 5.9904l27.4432 26.624a22.784 22.784 0 0 1 0 32.768 24.064 24.064 0 0 1-33.6896 0l-27.4432-26.6752a22.6816 22.6816 0 0 1-6.144-22.3232 23.5008 23.5008 0 0 1 16.8448-16.384zM512 153.6c13.1584 0 23.808 10.3424 23.808 23.1424v38.144c0 12.8-10.6496 23.1424-23.808 23.1424a23.4496 23.4496 0 0 1-23.808-23.1424v-38.144c0-12.8 10.6496-23.1424 23.808-23.1424z"/></svg>
                创作
              </button>
              <button className={`sidebar-tab${location.pathname.startsWith('/digital-album') ? ' active' : ''}`} onClick={() => navigate('/digital-album')}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M22 16V4c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2zm-11-4l2.03 2.71L16 11l4 5H8l3-4zM2 6v14c0 1.1.9 2 2 2h14v-2H4V6H2z"/></svg>
                画册
              </button>
              <button className={`sidebar-tab${location.pathname === '/resource' ? ' active' : ''}`} onClick={() => navigate('/resource')}>
                <svg viewBox="0 0 1024 1024" width="22" height="22" fill="currentColor"><path d="M929.6 352.8L512 64 94.4 352.8 512 641.7l417.6-288.9M512 706.2L143.4 460.6l-49 51.4L512 800.9 929.6 512 880 459.5 512 706.2m0 159.1L143.4 619.7l-49 51.4L512 960l417.6-288.9-49.6-52.4-368 246.6m0 0"/></svg>
                资源
              </button>
            </div>
          </nav>
        )}
        <main className="app-main">
        <Routes>
          <Route path="/workbench" element={<ErrorBoundary>{user ? <Home /> : <Navigate to="/" />}</ErrorBoundary>} />
          <Route path="/digital-album" element={<ErrorBoundary>{user ? <DigitalAlbumList /> : <Navigate to="/" />}</ErrorBoundary>} />
          <Route path="/digital-album/new" element={<ErrorBoundary key="da">{user ? <DigitalAlbum setPreviewSave={cb => previewSaveRef.current = cb} setPreviewAlbumId={id => previewAlbumIdRef.current = id} /> : <Navigate to="/" />}</ErrorBoundary>} />
          <Route path="/digital-album/:albumId" element={<ErrorBoundary key="da">{user ? <DigitalAlbum setPreviewSave={cb => previewSaveRef.current = cb} setPreviewAlbumId={id => previewAlbumIdRef.current = id} /> : <Navigate to="/" />}</ErrorBoundary>} />
          <Route path="/digital-album/:albumId/detail/:albumDtlId" element={<ErrorBoundary key="da">{user ? <DigitalAlbum setPreviewSave={cb => previewSaveRef.current = cb} setPreviewAlbumId={id => previewAlbumIdRef.current = id} /> : <Navigate to="/" />}</ErrorBoundary>} />
          <Route path="/digital-album/:albumId/:catId" element={<ErrorBoundary key="da">{user ? <DigitalAlbum setPreviewSave={cb => previewSaveRef.current = cb} setPreviewAlbumId={id => previewAlbumIdRef.current = id} /> : <Navigate to="/" />}</ErrorBoundary>} />
          <Route path="/digital-album/:albumId/:catId/:itemId" element={<ErrorBoundary key="da">{user ? <DigitalAlbum setPreviewSave={cb => previewSaveRef.current = cb} setPreviewAlbumId={id => previewAlbumIdRef.current = id} /> : <Navigate to="/" />}</ErrorBoundary>} />
          <Route path="/digital-album/:albumId/:catId/:itemId/:albumDtlId" element={<ErrorBoundary key="da">{user ? <DigitalAlbum setPreviewSave={cb => previewSaveRef.current = cb} setPreviewAlbumId={id => previewAlbumIdRef.current = id} /> : <Navigate to="/" />}</ErrorBoundary>} />
          <Route path="/generate" element={<ErrorBoundary>{user ? <Generate /> : <Navigate to="/" />}</ErrorBoundary>} />
          <Route path="/model-use" element={<ErrorBoundary>{user ? <ModelUse /> : <Navigate to="/" />}</ErrorBoundary>} />
          <Route path="/my-albums" element={<ErrorBoundary>{user ? <MyAlbums /> : <Navigate to="/" />}</ErrorBoundary>} />
          <Route path="/resource" element={<ErrorBoundary>{user ? <Resource /> : <Navigate to="/" />}</ErrorBoundary>} />
          <Route path="*" element={<Navigate to="/workbench" replace />} />
        </Routes>
      </main>
      </div>
      {showPreview && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
        }}>
          <div
            onClick={closePreview}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
              animation: previewAnim === 'out'
                ? 'fadeOut .35s cubic-bezier(.4,0,.2,1) forwards'
                : 'fadeIn .4s cubic-bezier(.22,1,.36,1)',
              pointerEvents: previewAnim === 'out' ? 'none' : 'auto',
            }}
          />
          <div style={{
            position: 'fixed', right: 0, top: 0, bottom: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
            animation: previewAnim === 'in' ? 'slideInRight .4s cubic-bezier(.22,1,.36,1)' : 'slideOutRight .3s cubic-bezier(.4,0,.2,1) forwards',
          }}>
            <div style={{ height: '100%', maxHeight: 820, display: 'flex', flexDirection: 'column', position: 'relative' }}>
              <div style={{
                width: 388,
                flex: 1,
                background: '#b9b2c0',
                borderRadius: 32,
                padding: 5,
                boxShadow: '0 12px 80px rgba(0,0,0,.12), 0 4px 16px rgba(0,0,0,.06), inset 0 2px 0 rgba(255,255,255,.8), inset 0 -1px 0 rgba(0,0,0,.1), inset 2px 0 0 rgba(255,255,255,.15), inset -1px 0 0 rgba(0,0,0,.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}>
                <div style={{ flex: 1, borderRadius: 27, overflow: 'hidden', border: '3px solid #0a0a0a', background: '#f7f7f8', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ height: 34, background: '#f7f7f8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', flexShrink: 0 }}>
                    <span style={{ color: '#333', fontSize: 14, fontWeight: 600 }}>{currentTime}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <svg width="20" height="14" viewBox="0 0 20 14"><rect x="0" y="9.5" width="3.5" height="4.5" rx="0.8" fill="#666"/><rect x="5.5" y="6" width="3.5" height="8" rx="0.8" fill="#666"/><rect x="11" y="2.5" width="3.5" height="11.5" rx="0.8" fill="#666"/><rect x="16.5" y="0" width="3.5" height="14" rx="0.8" fill="#666"/></svg>
                      <svg width="24" height="14" viewBox="0 0 24 14"><rect x="0" y="2.5" width="17" height="9" rx="1.5" fill="none" stroke="#666" strokeWidth="1.2"/><rect x="17" y="5" width="2.5" height="4" rx="0.5" fill="#666"/><rect x="1.8" y="4" width="3.5" height="6" rx="0.8" fill="#4ade80"/><rect x="6.3" y="4" width="3.5" height="6" rx="0.8" fill="#4ade80"/><rect x="10.8" y="4" width="3.5" height="6" rx="0.8" fill="#4ade80"/></svg>
                    </div>
                  </div>
                  <div style={{ background: '#f7f7f8', display: 'flex', alignItems: 'center', padding: '6px 10px', flexShrink: 0, gap: 8, borderBottom: '1px solid #e5e5e5' }}>
                    <svg onClick={closePreview} style={{ cursor: 'pointer' }} width="16" height="16" viewBox="0 0 16 16"><line x1="3" y1="3" x2="13" y2="13" stroke="#666" strokeWidth="1.5" strokeLinecap="round"/><line x1="13" y1="3" x2="3" y2="13" stroke="#666" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      <div style={{ flex: 1, textAlign: 'center', overflow: 'hidden' }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#111', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>AI智能预览</div>
                      <div style={{ fontSize: 9, color: '#999', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>liqihui.com</div>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 16 16"><circle cx="3" cy="8" r="1.2" fill="#666"/><circle cx="8" cy="8" r="1.2" fill="#666"/><circle cx="13" cy="8" r="1.2" fill="#666"/></svg>
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
                    {previewLoading ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 32, height: 32, border: '3px solid #e5e5e5', borderTopColor: '#8B5CF6',
                          borderRadius: '50%', animation: 'spin .8s linear infinite',
                        }} />
                        <span style={{ fontSize: 12, color: '#999' }}>加载中...</span>
                      </div>
                    ) : (
                      <iframe key={previewKey} src={`/preview/${user.id}${previewAlbumIdRef.current ? '/' + previewAlbumIdRef.current : ''}`} style={{ width: '100%', height: '100%', border: 'none' }} title="预览" />
                    )}
                  </div>
                </div>
              </div>
              <div style={{ position: 'absolute', left: -4, top: 100, width: 3, height: 30, background: 'linear-gradient(180deg, #d0ccc4, #bbb7af)', borderRadius: '2px 0 0 2px' }} />
              <div style={{ position: 'absolute', left: -4, top: 138, width: 3, height: 30, background: 'linear-gradient(180deg, #d0ccc4, #bbb7af)', borderRadius: '2px 0 0 2px' }} />
              <div style={{ position: 'absolute', right: -4, top: 120, width: 3, height: 40, background: 'linear-gradient(180deg, #d0ccc4, #bbb7af)', borderRadius: '0 2px 2px 0' }} />
              <div
                onClick={() => setShowQR(v => !v)}
                style={{
                  position: 'absolute', left: -28, top: '50%', transform: 'translateY(-50%)',
                  width: 28, height: 56,
                  background: 'linear-gradient(90deg, #b9b2c0, #cec8d2)',
                  border: 'none', borderRadius: '28px 0 0 28px',
                  cursor: 'pointer', zIndex: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '-2px 0 6px rgba(0,0,0,.08)',
                  transition: 'all .2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '-2px 0 12px rgba(0,0,0,.15)'; e.currentTarget.style.filter = 'brightness(1.08)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '-2px 0 6px rgba(0,0,0,.08)'; e.currentTarget.style.filter = 'none' }}
              >
                <svg viewBox="0 0 1024 1024" width="20" height="20">
                  <path d="M389.12 602.112l-163.84 0c-28.672 0-49.152 24.576-49.152 49.152l0 163.84c0 28.672 24.576 49.152 49.152 49.152l163.84 0c28.672 0 49.152-24.576 49.152-49.152l0-163.84C438.272 622.592 417.792 602.112 389.12 602.112zM397.312 815.104c0 4.096-4.096 8.192-8.192 8.192l-163.84 0c-4.096 0-8.192-4.096-8.192-8.192l0-163.84c0-4.096 4.096-8.192 8.192-8.192l163.84 0c4.096 0 8.192 4.096 8.192 8.192L397.312 815.104z" fill="#444" />
                  <path d="M327.68 696.32 282.624 696.32c-8.192 0-12.288 8.192-12.288 12.288l0 45.056c0 8.192 8.192 12.288 12.288 12.288L327.68 765.952c8.192 0 12.288-8.192 12.288-12.288l0-45.056C344.064 704.512 335.872 696.32 327.68 696.32z" fill="#444" />
                  <path d="M741.376 696.32 696.32 696.32c-8.192 0-12.288 8.192-12.288 12.288l0 45.056c0 8.192 8.192 12.288 12.288 12.288l45.056 0c8.192 0 12.288-8.192 12.288-12.288l0-45.056C753.664 704.512 749.568 696.32 741.376 696.32z" fill="#444" />
                  <path d="M282.624 360.448 327.68 360.448c8.192 0 12.288-8.192 12.288-12.288L339.968 299.008C344.064 290.816 335.872 286.72 327.68 286.72L282.624 286.72C274.432 286.72 270.336 290.816 270.336 299.008l0 45.056C270.336 352.256 274.432 360.448 282.624 360.448z" fill="#444" />
                  <path d="M741.376 286.72 696.32 286.72c-8.192 0-12.288 8.192-12.288 12.288l0 45.056c0 8.192 8.192 12.288 12.288 12.288l45.056 0c8.192 0 12.288-8.192 12.288-12.288L753.664 299.008C753.664 290.816 749.568 286.72 741.376 286.72z" fill="#444" />
                  <path d="M225.28 454.656l163.84 0c28.672 0 49.152-24.576 49.152-49.152l0-163.84c0-28.672-24.576-49.152-49.152-49.152l-163.84 0c-28.672 0-49.152 24.576-49.152 49.152l0 163.84C172.032 434.176 196.608 454.656 225.28 454.656zM212.992 241.664c0-4.096 4.096-8.192 8.192-8.192l163.84 0c4.096 0 8.192 4.096 8.192 8.192l0 163.84c0 4.096-4.096 8.192-8.192 8.192l-163.84 0c-4.096 0-8.192-4.096-8.192-8.192L212.992 241.664z" fill="#444" />
                  <path d="M798.72 602.112l-163.84 0c-28.672 0-49.152 24.576-49.152 49.152l0 163.84c0 28.672 24.576 49.152 49.152 49.152l163.84 0c28.672 0 49.152-24.576 49.152-49.152l0-163.84C851.968 622.592 827.392 602.112 798.72 602.112zM811.008 815.104c0 4.096-4.096 8.192-8.192 8.192l-163.84 0c-4.096 0-8.192-4.096-8.192-8.192l0-163.84c0-4.096 4.096-8.192 8.192-8.192l163.84 0c4.096 0 8.192 4.096 8.192 8.192L811.008 815.104z" fill="#444" />
                  <path d="M798.72 188.416l-163.84 0c-28.672 0-49.152 24.576-49.152 49.152l0 163.84c0 28.672 24.576 49.152 49.152 49.152l163.84 0c28.672 0 49.152-24.576 49.152-49.152l0-163.84C851.968 212.992 827.392 188.416 798.72 188.416zM811.008 405.504c0 4.096-4.096 8.192-8.192 8.192l-163.84 0c-4.096 0-8.192-4.096-8.192-8.192l0-163.84c0-4.096 4.096-8.192 8.192-8.192l163.84 0c4.096 0 8.192 4.096 8.192 8.192L811.008 405.504z" fill="#444" />
                  <path d="M512 331.776c12.288 0 20.48-8.192 20.48-20.48L532.48 208.896c0-12.288-8.192-20.48-20.48-20.48S491.52 200.704 491.52 208.896l0 102.4C491.52 323.584 499.712 331.776 512 331.776z" fill="#444" />
                  <path d="M512 720.896c-12.288 0-20.48 8.192-20.48 20.48l0 102.4c0 12.288 8.192 20.48 20.48 20.48s20.48-8.192 20.48-20.48l0-102.4C532.48 733.184 524.288 720.896 512 720.896z" fill="#444" />
                  <path d="M831.488 507.904l-102.4 0c-12.288 0-20.48 8.192-20.48 20.48s8.192 20.48 20.48 20.48l102.4 0c12.288 0 20.48-8.192 20.48-20.48S839.68 507.904 831.488 507.904z" fill="#444" />
                  <path d="M671.744 528.384c0-12.288-8.192-20.48-20.48-20.48L532.48 507.904 532.48 389.12C532.48 376.832 524.288 368.64 512 368.64S491.52 376.832 491.52 389.12l0 118.784L393.216 507.904 372.736 507.904 192.512 507.904c-12.288 0-20.48 8.192-20.48 20.48s8.192 20.48 20.48 20.48l176.128 0 20.48 0L491.52 548.864l0 118.784c0 12.288 8.192 20.48 20.48 20.48s20.48-8.192 20.48-20.48l0-118.784 118.784 0C663.552 548.864 671.744 540.672 671.744 528.384z" fill="#444" />
                </svg>
              </div>
          </div>
        </div>
      {showQR && (
        <div
          onClick={() => { setShowQR(false); setQrDataUrl('') }}
          style={{
            position: 'fixed', inset: 0, zIndex: 1010,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{
            animation: 'qrSlideUp .35s cubic-bezier(.22,1,.36,1) forwards',
          }}>
            <div style={{
              width: 360, height: 360,
              background: '#fff',
              borderRadius: 16,
              boxShadow: '0 8px 40px rgba(0,0,0,.25)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 16,
              position: 'relative',
            }}>
              <svg
                onClick={() => { setShowQR(false); setQrDataUrl('') }}
                style={{ position: 'absolute', top: 12, right: 12, cursor: 'pointer' }}
                width="16" height="16" viewBox="0 0 16 16"
              >
                <line x1="3" y1="3" x2="13" y2="13" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="13" y1="3" x2="3" y2="13" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {qrDataUrl ? (
                <>
                  <img src={qrDataUrl} alt="" style={{ width: 280, height: 280, display: 'block', borderRadius: 8 }} />
                  <div style={{ fontSize: 13, color: '#999', letterSpacing: 1 }}>请使用 微信 扫一扫</div>
                </>
              ) : (
                <div style={{ fontSize: 13, color: '#999' }}>生成中...</div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    )}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
