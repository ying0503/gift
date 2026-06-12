import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom'
import { AuthProvider, useAuth, API } from './AuthContext'
import Home from './pages/Home'
import Generate from './pages/Generate'
import MyAlbums from './pages/MyAlbums'
import AuthPage from './pages/Auth'
import DigitalAlbum from './pages/DigitalAlbum'
import Preview from './pages/Preview'
import LandingPage from './pages/LandingPage'

function AppContent() {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [publishing, setPublishing] = useState(false)
  const [pubProgress, setPubProgress] = useState(0)

  useEffect(() => { if (!location.pathname.startsWith('/preview')) setPublishing(false) }, [location.pathname])

  if (loading) {
    return (
      <div className="app">
        <header className="app-header">
          <div className="header-inner">
            <div className="header-nav">
              <span className="header-tab active">首页</span>
              <span className="header-tab">画册生成</span>
              <span className="header-tab">电子画册</span>
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
        <Route path="/preview" element={<Preview />} />
        <Route path="/preview/:catId" element={<Preview />} />
        <Route path="/preview/:catId/:itemId" element={<Preview />} />
        <Route path="/preview/:catId/:itemId/:albumId" element={<Preview />} />
      </Routes>
    )
  }

  if (location.pathname === '/') {
    return <LandingPage />
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="header-nav">
            <span className={`header-tab${location.pathname === '/' ? ' active' : ''}`} onClick={() => navigate('/')}>首页</span>
            <span className={`header-tab${location.pathname === '/gallery' ? ' active' : ''}`} onClick={() => navigate('/gallery')}>画册生成</span>
            <span className={`header-tab${location.pathname.startsWith('/digital-album') ? ' active' : ''}`} onClick={() => navigate('/digital-album')}>电子画册</span>
          </div>
          {user && (
            <div className="header-right">
              {location.pathname.startsWith('/digital-album') && (
                <button onClick={() => {
                  setPublishing(true); setPubProgress(0)
                  const token = localStorage.getItem('token')
                  if (token) fetch(`${API}/api/album/publish`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
                  const start = Date.now()
                  const id = setInterval(() => {
                    const elapsed = Date.now() - start
                    const pct = Math.min(Math.round(elapsed / 20), 100)
                    setPubProgress(pct)
                    if (pct >= 100) { clearInterval(id); setTimeout(() => navigate('/preview'), 300) }
                  }, 30)
                }} className="btn btn-primary" style={{ fontSize: 13, padding: '4px 14px', marginRight: 8, whiteSpace: 'nowrap' }}>画册预览</button>
              )}
              <div className="user-menu-wrap">
                <span className="header-user">{user.email}</span>
                <div className="user-dropdown">
                  <div className="dropdown-item" onClick={() => navigate('/my-albums')}>我的画册</div>
                  <div className="dropdown-item" onClick={logout}>退出</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/auth" element={user ? <Navigate to="/gallery" replace /> : <AuthPage />} />
          <Route path="/gallery" element={user ? <Home /> : <Navigate to="/auth" replace />} />
          <Route path="/digital-album" element={user ? <DigitalAlbum /> : <Navigate to="/auth" replace />} />
          <Route path="/digital-album/:catId" element={user ? <DigitalAlbum /> : <Navigate to="/auth" replace />} />
          <Route path="/digital-album/:catId/:itemId" element={user ? <DigitalAlbum /> : <Navigate to="/auth" replace />} />
          <Route path="/digital-album/:catId/:itemId/:albumId" element={user ? <DigitalAlbum /> : <Navigate to="/auth" replace />} />
          <Route path="/generate" element={user ? <Generate /> : <Navigate to="/auth" replace />} />
          <Route path="/my-albums" element={user ? <MyAlbums /> : <Navigate to="/auth" replace />} />
          <Route path="*" element={<Navigate to="/gallery" replace />} />
        </Routes>
      </main>
      {publishing && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,.45)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <div className="card" style={{ padding: '32px 48px', textAlign: 'center', marginBottom: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'rgba(0,0,0,.88)', marginBottom: 20 }}>正在发布...</div>
            <div style={{ width: 320, height: 8, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${pubProgress}%`, height: '100%', background: 'linear-gradient(90deg, #1677FF, #69B1FF)', borderRadius: 4, transition: 'width .05s linear' }} />
            </div>
            <div style={{ fontSize: 13, color: 'rgba(0,0,0,.45)', marginTop: 8 }}>{pubProgress}%</div>
          </div>
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
