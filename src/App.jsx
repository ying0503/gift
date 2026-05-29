import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext'
import Home from './pages/Home'
import Generate from './pages/Generate'
import MyAlbums from './pages/MyAlbums'
import AuthPage from './pages/Auth'

function AppContent() {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>礼品画册制作工具 V1.0</h1>
        </header>
        <main className="app-main" style={{ textAlign: 'center', paddingTop: 100, color: '#999' }}>
          加载中...
        </main>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <h1 style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>画册制作AI工具</h1>
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
