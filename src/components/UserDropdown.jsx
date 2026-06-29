import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function UserDropdown() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const badgeStyle = user?.vipType === 'gold'
    ? { background: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 40%, #D97706 100%)', label: '金卡会员' }
    : { background: 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 40%, #5B21B6 100%)', label: '钻石会员' }

  return (
    <div style={{ position: 'relative' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <img
          src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23E8E0FF'/%3E%3Ccircle cx='50' cy='38' r='16' fill='%237B61FF'/%3E%3Cellipse cx='50' cy='72' rx='26' ry='22' fill='%237B61FF'/%3E%3C/svg%3E"
          alt="avatar"
          style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
        />
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, paddingTop: 12,
          zIndex: 1001,
        }}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          <div style={{
            background: '#fff', borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            width: 180, padding: '8px 0',
          }}>
            <div style={{ padding: '10px 16px 8px', fontSize: 13, color: '#999' }}>
              <div>{user.email}</div>
              {user?.isAdmin ? (
                <span style={{
                  display: 'inline-block', marginTop: 6,
                  fontSize: 11, padding: '2px 10px', borderRadius: 4,
                  background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 40%, #B91C1C 100%)',
                  color: '#fff', fontWeight: 600, letterSpacing: 0.3,
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)',
                }}>管理员</span>
              ) : user?.vipType === 'gold' || user?.vipType === 'diamond' ? (
                <span style={{
                  display: 'inline-block', marginTop: 6,
                  fontSize: 11, padding: '2px 10px', borderRadius: 4,
                  ...badgeStyle,
                  color: '#fff', fontWeight: 600, letterSpacing: 0.3,
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)',
                }}>
                  {badgeStyle.label}
                </span>
              ) : null}
            </div>
            {user?.isAdmin && (
              <>
                <div style={{ borderTop: '1px solid #f0f0f0' }} />
                <div style={{ padding: '8px 16px 4px', fontSize: 11, color: '#bbb', fontWeight: 500, letterSpacing: 0.5 }}>后台管理</div>
                <button style={{
                  display: 'block', width: '100%', padding: '6px 16px', border: 'none', background: 'none',
                  fontSize: 14, color: '#555', cursor: 'pointer', textAlign: 'left',
                }}
                  onMouseEnter={e => e.target.style.background = '#f5f5f5'}
                  onMouseLeave={e => e.target.style.background = 'none'}
                  onClick={() => { navigate('/model-use'); setOpen(false) }}
                >AI模型管理</button>
                <button style={{
                  display: 'block', width: '100%', padding: '6px 16px', border: 'none', background: 'none',
                  fontSize: 14, color: '#555', cursor: 'pointer', textAlign: 'left',
                }}
                  onMouseEnter={e => e.target.style.background = '#f5f5f5'}
                  onMouseLeave={e => e.target.style.background = 'none'}
                  onClick={() => { navigate('/template-set'); setOpen(false) }}
                >画册模板</button>
              </>
            )}
            <div style={{ borderTop: '1px solid #f0f0f0' }} />
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 16px', fontSize: 14, color: '#555',
            }}>
              <span>图片消耗</span>
              <span style={{ fontWeight: 600 }}>{user.generatedCount ?? 0}/2500</span>
            </div>
            <button style={{
              display: 'block', width: '100%', padding: '10px 16px', border: 'none', background: 'none',
              fontSize: 14, color: '#ff4d4f', cursor: 'pointer', textAlign: 'left',
            }}
              onMouseEnter={e => e.target.style.background = '#fff2f0'}
              onMouseLeave={e => e.target.style.background = 'none'}
              onClick={() => { logout(); setOpen(false) }}
            >退出登录</button>
          </div>
        </div>
      )}
    </div>
  )
}
