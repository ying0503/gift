import { useState, useEffect } from 'react'
import { API } from '../AuthContext'

export default function VipInfo() {
  const [users, setUsers] = useState([])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [vipType, setVipType] = useState('')

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    const token = localStorage.getItem('token')
    if (!token) return
    const res = await fetch(`${API}/api/users`, { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) {
      const data = await res.json()
      setUsers((data.users || []).map(u => ({
        id: u.user_id,
        email: u.email,
        vipType: u.vip_type || '',
        createdAt: u.created_at,
      })))
    }
  }

  async function handleAdd() {
    const token = localStorage.getItem('token')
    if (!token || !email || !password) return
    const res = await fetch(`${API}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, vipType }),
    })
    if (res.ok) {
      setEmail('')
      setPassword('')
      setVipType('')
      fetchUsers()
    }
  }

  async function handleVipChange(userId, newVip) {
    const token = localStorage.getItem('token')
    if (!token) return
    await fetch(`${API}/api/users/${userId}/vip`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ vipType: newVip }),
    })
    fetchUsers()
  }

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 600, color: '#333', marginBottom: 24 }}>会员管理</div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">新增用户</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <input placeholder="邮箱" value={email} onChange={e => setEmail(e.target.value)}
            style={{ height: 36, padding: '0 12px', border: '1px solid #e0dedc', borderRadius: 8, fontSize: 14, outline: 'none', width: 200 }} />
          <input type="password" placeholder="密码" value={password} onChange={e => setPassword(e.target.value)}
            style={{ height: 36, padding: '0 12px', border: '1px solid #e0dedc', borderRadius: 8, fontSize: 14, outline: 'none', width: 200 }} />
          <select value={vipType} onChange={e => setVipType(e.target.value)}
            style={{ height: 36, padding: '0 12px', border: '1px solid #e0dedc', borderRadius: 8, fontSize: 14, outline: 'none', background: '#fff' }}>
            <option value="">选择会员类型</option>
            <option value="gold">金卡会员</option>
            <option value="diamond">钻石会员</option>
          </select>
          <button onClick={handleAdd} style={{ height: 36, padding: '0 20px', border: 'none', borderRadius: 8, background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>新增</button>
        </div>
      </div>

      <div className="card">
        <div className="card-title">用户列表</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 13, color: '#666' }}>邮箱</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 13, color: '#666' }}>会员类型</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 13, color: '#666' }}>注册时间</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '10px 12px', fontSize: 14 }}>{u.email}</td>
                <td style={{ padding: '10px 12px' }}>
                  <select value={u.vipType || ''} onChange={e => handleVipChange(u.id, e.target.value)}
                    style={{ height: 32, padding: '0 8px', border: '1px solid #e0dedc', borderRadius: 6, fontSize: 13, outline: 'none', background: '#fff' }}>
                    <option value="">非会员</option>
                    <option value="gold">金卡会员</option>
                    <option value="diamond">钻石会员</option>
                  </select>
                </td>
                <td style={{ padding: '10px 12px', fontSize: 13, color: '#888' }}>{new Date(u.createdAt).toLocaleString('zh-CN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
