import { useState } from 'react'
import { Modal } from 'antd'
import { useAuth } from '../AuthContext'

export default function AuthModal({ open, onClose }) {
  const { login, register } = useAuth()

  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (isLogin) {
        await login(email, password)
      } else {
        await register(email, password)
      }
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={420}
      centered
      destroyOnClose
    >
      <div style={{ padding: '24px 0 8px' }}>
        <div style={{
          display: 'flex', gap: 0, marginBottom: 28,
          borderBottom: '2px solid #f0f0f0',
        }}>
          <button
            onClick={() => { setIsLogin(true); setError('') }}
            style={{
              flex: 1, padding: '10px 0', border: 'none', background: 'none',
              fontSize: 16, fontWeight: 600, cursor: 'pointer',
              color: isLogin ? '#7B61FF' : '#999',
              borderBottom: isLogin ? '2px solid #7B61FF' : '2px solid transparent',
              marginBottom: -2, transition: 'all 0.2s',
            }}
          >登录</button>
          <button
            onClick={() => { setIsLogin(false); setError('') }}
            style={{
              flex: 1, padding: '10px 0', border: 'none', background: 'none',
              fontSize: 16, fontWeight: 600, cursor: 'pointer',
              color: !isLogin ? '#7B61FF' : '#999',
              borderBottom: !isLogin ? '2px solid #7B61FF' : '2px solid transparent',
              marginBottom: -2, transition: 'all 0.2s',
            }}
          >注册</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14, color: '#555', fontWeight: 500 }}>邮箱</label>
            <input
              type="email"
              placeholder="请输入邮箱"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{
                width: '100%', padding: '10px 14px', border: '1px solid #d9d9d9',
                borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14, color: '#555', fontWeight: 500 }}>密码</label>
            <input
              type="password"
              placeholder="请输入密码（至少6位）"
              value={password}
              onChange={e => setPassword(e.target.value)}
              minLength={6}
              required
              style={{
                width: '100%', padding: '10px 14px', border: '1px solid #d9d9d9',
                borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 14px', background: '#fff2f0', border: '1px solid #ffccc7',
              borderRadius: 8, color: '#ff4d4f', fontSize: 13, marginBottom: 16,
            }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={busy}
            style={{
              width: '100%', padding: '12px 0', border: 'none', borderRadius: 8,
              fontSize: 15, fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer',
              background: busy ? '#d9d9d9' : '#7B61FF', color: '#fff',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => { if (!busy) e.target.style.background = '#6a52e0' }}
            onMouseLeave={e => { if (!busy) e.target.style.background = '#7B61FF' }}
          >
            {busy ? '处理中...' : isLogin ? '登录' : '注册'}
          </button>
        </form>
      </div>
    </Modal>
  )
}
