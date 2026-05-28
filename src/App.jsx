import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Generate from './pages/Generate'

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>礼品画册制作工具 V1.0</h1>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/generate" element={<Generate />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
