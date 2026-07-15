import { useState, useCallback, useEffect, useRef } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext'
import Home from './pages/Home'
import Generate from './pages/Generate'
import MyAlbums from './pages/MyAlbums'
import DigitalAlbum from './pages/DigitalAlbum'
import DigitalAlbumList from './pages/DigitalAlbumList'
import ModelUse from './pages/ModelUse'
import TemplateSet from './pages/TemplateSet'
import Resource from './pages/Resource'
import VipInfo from './pages/VipInfo'
import Preview from './pages/Preview'
import MyGifts from './pages/MyGifts'
import ImageList from './pages/ImageList'
import GiftEditor from './pages/GiftEditor'
import LandingPage from './pages/LandingPage'
import ErrorBoundary from './components/ErrorBoundary'
import PreviewModal from './components/PreviewModal'
import QRModal from './components/QRModal'
import UserDropdown from './components/UserDropdown'

function AppContent() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPreview, setShowPreview] = useState(false)
  const [previewAnim, setPreviewAnim] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewKey, setPreviewKey] = useState(0)
  const [currentTime, setCurrentTime] = useState(() => new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }))
  const previewSaveRef = useRef(null)
  const previewAlbumIdRef = useRef(null)
  const [submenuOpen, setSubmenuOpen] = useState(false)
  const submenuTimer = useRef(null)
  const openSubmenu = () => { if (submenuTimer.current) clearTimeout(submenuTimer.current); setSubmenuOpen(true) }
  const closeSubmenu = () => { if (submenuTimer.current) clearTimeout(submenuTimer.current); submenuTimer.current = setTimeout(() => setSubmenuOpen(false), 200) }
  const [previewTitle, setPreviewTitle] = useState('画册标题')
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
        const albumId = location.pathname.split('/')[2]
        QRCode.toDataURL(
          window.location.origin + '/preview/' + user.id + (albumId ? '/' + albumId : ''),
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
      <header className="app-header" style={['/workbench', '/image-list'].some(p => location.pathname.startsWith(p)) ? { display: 'none' } : undefined}>
          <div className="header-inner">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <img src="https://gift-bucket-0503.oss-cn-beijing.aliyuncs.com/static/site/logo-64.png" alt="logo" style={{ height: 28, display: 'block' }} />
              <span style={{ fontSize: 16, fontWeight: 700, color: '#111', letterSpacing: -0.5 }}>Ligent</span>
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
      <header className="app-header" style={['/workbench', '/image-list'].some(p => location.pathname.startsWith(p)) ? { display: 'none' } : undefined}>
        <div className="header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="https://gift-bucket-0503.oss-cn-beijing.aliyuncs.com/static/site/logo-64.png" alt="logo" style={{ height: 28, display: 'block' }} />
            <span style={{ fontSize: 16, fontWeight: 700, color: '#111', letterSpacing: -0.5 }}>Ligent</span>
          </div>
        {user && (
            <div className="header-right">
              {!['/template-set', '/model-use'].some(p => location.pathname.startsWith(p)) && location.pathname.startsWith('/digital-album/') && (
                <button onClick={() => setShowQR(true)} style={{
                  padding: '6px 16px', fontSize: 13, border: '1px solid #d0ccc4', borderRadius: 6, cursor: 'pointer',
                  background: '#fff', color: '#555', fontWeight: 500, whiteSpace: 'nowrap',
                }}>分享</button>
              )}
              {location.pathname.startsWith('/digital-album/') && (
                <button onClick={openPreview} style={{
                  padding: '6px 16px', fontSize: 13, border: 'none', borderRadius: 6, cursor: 'pointer',
                  background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
                  color: '#fff', fontWeight: 500, whiteSpace: 'nowrap', marginLeft: 8, marginRight: 12,
                }}>预览</button>
              )}
              <UserDropdown />
            </div>
          )}
        </div>
      </header>
      <div className="app-body">
        {user && !['/template-set', '/model-use', '/workbench', '/image-list'].some(p => location.pathname.startsWith(p)) && (
          <nav className="app-sidebar">
            <div className="sidebar-nav">
              <div style={{ position: 'relative' }} onMouseEnter={openSubmenu} onMouseLeave={closeSubmenu}>
              <button className={`sidebar-tab${location.pathname === '/workbench' || location.pathname === '/image-list' ? ' active' : ''}`} onClick={() => { setSubmenuOpen(o => !o); navigate('/workbench') }}>
                <svg viewBox="0 0 1024 1024" width="22" height="22" fill="currentColor"><path d="M605.3376 800.1024v9.5744c0 15.872-9.6256 30.3104-24.576 36.7616l-43.0592 18.688a63.9488 63.9488 0 0 1-50.5856 0.1024l-43.776-18.7904a40.2432 40.2432 0 0 1-24.7296-36.864v-9.472h186.7264zM306.688 678.9632l4.9664 0.768c8.2432 2.1504 14.6432 8.3456 16.896 16.384a22.6816 22.6816 0 0 1-6.2464 22.3232l-30.0032 29.184a24.32 24.32 0 0 1-23.04 5.9392 23.4496 23.4496 0 0 1-16.8448-16.384 22.6816 22.6816 0 0 1 6.1952-22.272l30.0544-29.184a24.32 24.32 0 0 1 23.04-5.9904z m404.0704-0.8704a24.32 24.32 0 0 1 22.9888 5.9904l31.744 30.8224a22.784 22.784 0 0 1 0 32.6656 24.064 24.064 0 0 1-33.6896 0l-31.744-30.7712a22.6816 22.6816 0 0 1-6.144-22.3744 23.5008 23.5008 0 0 1 16.8448-16.3328zM512 260.096c137.5232 0 249.0368 108.2368 249.0368 241.7152 0 101.4784-64.4096 188.2624-155.648 224.1536v27.5456h-69.5296c0.6144-118.1696 34.4064-212.6336 51.8656-219.0336 8.3456 0 18.3296 10.6496 26.6752 28.4672 5.632 11.3664 19.6096 16.2304 31.3856 11.008a22.8864 22.8864 0 0 0 11.9808-30.208c-21.6064-45.8752-50.0224-55.5008-70.0416-55.5008-35.84 0-60.1088 41.0624-75.7248 93.5424-15.616-52.48-39.936-93.5424-75.776-93.5424-19.968 0-48.384 9.6256-69.9904 55.5008a22.528 22.528 0 0 0 2.2528 23.04 24.064 24.064 0 0 0 41.1136-3.84c8.3456-17.8176 18.3296-28.4672 25.7536-28.5696 18.432 6.5024 52.1728 100.9664 52.736 219.136H418.6624v-27.5456c-91.2384-35.8912-155.648-122.6752-155.648-224.1536C262.9632 368.2816 374.4768 260.096 512 260.096zM217.6 478.4128c13.1072 0 23.7568 10.3936 23.7568 23.1424 0 12.8-10.6496 23.0912-23.808 23.0912h-40.1408A23.4496 23.4496 0 0 1 153.6 501.5552c0-12.8 10.6496-23.1424 23.808-23.1424z m628.992 0c13.1584 0 23.808 10.3936 23.808 23.1424 0 12.8-10.6496 23.0912-23.808 23.0912h-43.6224a23.4496 23.4496 0 0 1-23.808-23.0912c0-12.8 10.6496-23.1424 23.808-23.1424z m-96.768-229.6832l4.9664 0.768c8.192 2.1504 14.6432 8.3968 16.8448 16.384a22.6816 22.6816 0 0 1-6.1952 22.3232l-29.2352 28.3648a24.32 24.32 0 0 1-23.04 5.9904 23.4496 23.4496 0 0 1-16.8448-16.384 22.6816 22.6816 0 0 1 6.1952-22.3232l29.2352-28.3648a24.32 24.32 0 0 1 23.04-5.9904z m-480.5632 0.768a24.32 24.32 0 0 1 22.9888 5.9904l27.4432 26.624a22.784 22.784 0 0 1 0 32.768 24.064 24.064 0 0 1-33.6896 0l-27.4432-26.6752a22.6816 22.6816 0 0 1-6.144-22.3232 23.5008 23.5008 0 0 1 16.8448-16.384zM512 153.6c13.1584 0 23.808 10.3424 23.808 23.1424v38.144c0 12.8-10.6496 23.1424-23.808 23.1424a23.4496 23.4496 0 0 1-23.808-23.1424v-38.144c0-12.8 10.6496-23.1424 23.808-23.1424z"/></svg>
                创作
              </button>
              <div className="sidebar-submenu" style={{ display: submenuOpen ? 'block' : 'none' }} onMouseEnter={openSubmenu} onMouseLeave={closeSubmenu}>
                <button className="sidebar-submenu-item" onClick={() => { setSubmenuOpen(false); navigate('/workbench') }}>图片生成</button>
                <button className="sidebar-submenu-item" onClick={() => { setSubmenuOpen(false); navigate('/image-list') }}>图片列表</button>
              </div>
            </div>
              <button className={`sidebar-tab${location.pathname.startsWith('/my-gifts') || location.pathname.startsWith('/gift-editor') ? ' active' : ''}`} onClick={() => navigate('/my-gifts')}>
                <svg viewBox="0 0 1024 1024" width="22" height="22" fill="currentColor"><path d="M832 128H192c-35.2 0-64 28.8-64 64v640c0 35.2 28.8 64 64 64h640c35.2 0 64-28.8 64-64V192c0-35.2-28.8-64-64-64zM512 736c-123.2 0-224-100.8-224-224s100.8-224 224-224 224 100.8 224 224-100.8 224-224 224z"/></svg>
                礼品
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
        <main className="app-main" style={['/model-use', '/template-set', '/workbench', '/image-list'].some(p => location.pathname.startsWith(p)) ? { padding: 0 } : undefined}>
        <Routes>
          <Route path="/workbench" element={<ErrorBoundary>{user ? <Home /> : <Navigate to="/" />}</ErrorBoundary>} />
          <Route path="/digital-album" element={<ErrorBoundary>{user ? <DigitalAlbumList /> : <Navigate to="/" />}</ErrorBoundary>} />
          <Route path="/digital-album/new" element={<ErrorBoundary key="da">{user ? <DigitalAlbum setPreviewSave={cb => previewSaveRef.current = cb} setPreviewAlbumId={id => previewAlbumIdRef.current = id} setPreviewTitle={setPreviewTitle} /> : <Navigate to="/" />}</ErrorBoundary>} />
          <Route path="/digital-album/:albumId" element={<ErrorBoundary key="da">{user ? <DigitalAlbum setPreviewSave={cb => previewSaveRef.current = cb} setPreviewAlbumId={id => previewAlbumIdRef.current = id} setPreviewTitle={setPreviewTitle} /> : <Navigate to="/" />}</ErrorBoundary>} />
          <Route path="/digital-album/:albumId/detail/:albumDtlId" element={<ErrorBoundary key="da">{user ? <DigitalAlbum setPreviewSave={cb => previewSaveRef.current = cb} setPreviewAlbumId={id => previewAlbumIdRef.current = id} setPreviewTitle={setPreviewTitle} /> : <Navigate to="/" />}</ErrorBoundary>} />
          <Route path="/digital-album/:albumId/:catId" element={<ErrorBoundary key="da">{user ? <DigitalAlbum setPreviewSave={cb => previewSaveRef.current = cb} setPreviewAlbumId={id => previewAlbumIdRef.current = id} setPreviewTitle={setPreviewTitle} /> : <Navigate to="/" />}</ErrorBoundary>} />
          <Route path="/digital-album/:albumId/:catId/:itemId" element={<ErrorBoundary key="da">{user ? <DigitalAlbum setPreviewSave={cb => previewSaveRef.current = cb} setPreviewAlbumId={id => previewAlbumIdRef.current = id} setPreviewTitle={setPreviewTitle} /> : <Navigate to="/" />}</ErrorBoundary>} />
          <Route path="/digital-album/:albumId/:catId/:itemId/:albumDtlId" element={<ErrorBoundary key="da">{user ? <DigitalAlbum setPreviewSave={cb => previewSaveRef.current = cb} setPreviewAlbumId={id => previewAlbumIdRef.current = id} setPreviewTitle={setPreviewTitle} /> : <Navigate to="/" />}</ErrorBoundary>} />
          <Route path="/generate" element={<ErrorBoundary>{user ? <Generate /> : <Navigate to="/" />}</ErrorBoundary>} />
          <Route path="/model-use" element={<ErrorBoundary>{user ? (user.isAdmin ? <ModelUse /> : <Navigate to="/workbench" replace />) : <Navigate to="/" />}</ErrorBoundary>} />
          <Route path="/my-albums" element={<ErrorBoundary>{user ? <MyAlbums /> : <Navigate to="/" />}</ErrorBoundary>} />
          <Route path="/resource" element={<ErrorBoundary>{user ? <Resource /> : <Navigate to="/" />}</ErrorBoundary>} />
          <Route path="/template-set" element={<ErrorBoundary>{user ? (user.isAdmin ? <TemplateSet /> : <Navigate to="/workbench" replace />) : <Navigate to="/" />}</ErrorBoundary>} />
          <Route path="/my-gifts" element={<ErrorBoundary>{user ? <MyGifts /> : <Navigate to="/" />}</ErrorBoundary>} />
          <Route path="/image-list" element={<ErrorBoundary>{user ? <ImageList /> : <Navigate to="/" />}</ErrorBoundary>} />
          <Route path="/gift-editor/:id" element={<ErrorBoundary>{user ? <GiftEditor /> : <Navigate to="/" />}</ErrorBoundary>} />
          <Route path="/vip-info" element={<ErrorBoundary>{user ? <VipInfo /> : <Navigate to="/" />}</ErrorBoundary>} />
          <Route path="*" element={<Navigate to="/workbench" replace />} />
        </Routes>
      </main>
      </div>
      <PreviewModal
        visible={showPreview}
        onClose={closePreview}
        anim={previewAnim}
        loading={previewLoading}
        previewKey={previewKey}
        user={user}
        albumIdRef={previewAlbumIdRef}
        currentTime={currentTime}
        pageTitle={previewTitle}
      />
      <QRModal visible={showQR} qrDataUrl={qrDataUrl} onClose={() => { setShowQR(false); setQrDataUrl('') }} />
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
