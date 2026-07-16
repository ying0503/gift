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
import AIPoster from './pages/AIPoster'
import LandingPage from './pages/LandingPage'
import ErrorBoundary from './components/ErrorBoundary'
import PreviewModal from './components/PreviewModal'
import QRModal from './components/QRModal'
import UserDropdown from './components/UserDropdown'
import WorkbenchSidebar from './components/WorkbenchSidebar'

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
      {user && location.pathname.startsWith('/digital-album/') && (
        <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 1000, display: 'flex', gap: 8 }}>
          <button onClick={() => setShowQR(true)} style={{ padding: '6px 16px', fontSize: 13, border: '1px solid #d0ccc4', borderRadius: 6, cursor: 'pointer', background: '#fff', color: '#555', fontWeight: 500 }}>分享</button>
          <button onClick={openPreview} style={{ padding: '6px 16px', fontSize: 13, border: 'none', borderRadius: 6, cursor: 'pointer', background: 'linear-gradient(135deg, #8B5CF6, #EC4899)', color: '#fff', fontWeight: 500 }}>预览</button>
        </div>
      )}
      <div className="app-body">
        {user && !['/workbench', '/my-gifts', '/gift-editor', '/ai-poster'].some(p => location.pathname.startsWith(p)) && <WorkbenchSidebar />}
        <main className="app-main" style={['/workbench', '/my-gifts', '/gift-editor', '/ai-poster'].some(p => location.pathname.startsWith(p)) ? { padding: 0 } : undefined}>
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
          <Route path="/ai-poster" element={<ErrorBoundary>{user ? <AIPoster /> : <Navigate to="/" />}</ErrorBoundary>} />
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
