import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext'
import Home from './pages/Home'
import Generate from './pages/Generate'
import MyAlbums from './pages/MyAlbums'
import AuthPage from './pages/Auth'
import DigitalAlbum from './pages/DigitalAlbum'
import Preview from './pages/Preview'

function AppContent() {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  if (loading) {
    return (
      <div className="app">
        <header className="app-header">
          <div className="header-inner">
            <div className="header-nav">
              <span className="header-tab active">画册生成</span>
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

  if (location.pathname === '/preview') {
    return <Preview />
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="header-nav">
            <span className={`header-tab${location.pathname === '/' ? ' active' : ''}`} onClick={() => navigate('/')}>画册生成</span>
            <span className={`header-tab${location.pathname === '/digital-album' ? ' active' : ''}`} onClick={() => navigate('/digital-album')}>电子画册</span>
          </div>
          {user && (
            <div className="header-right">
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
          <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
          <Route path="/" element={user ? <Home /> : <Navigate to="/auth" replace />} />
          <Route path="/digital-album" element={user ? <DigitalAlbum /> : <Navigate to="/auth" replace />} />
          <Route path="/generate" element={user ? <Generate /> : <Navigate to="/auth" replace />} />
          <Route path="/my-albums" element={user ? <MyAlbums /> : <Navigate to="/auth" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
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
