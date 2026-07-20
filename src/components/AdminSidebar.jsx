import { useNavigate, useLocation } from 'react-router-dom'

const navItems = [
  { path: '/template-set', icon: '📋', label: '画册模板' },
  { path: '/prompt-set', icon: '✏️', label: '生图提示词' },
  { path: '/model-use', icon: '⚙️', label: 'AI模型管理' },
  { path: '/resource-manage', icon: '📁', label: '资源管理' },
]

export default function AdminSidebar() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div style={{ width: 150, background: '#fff', borderRight: '1px solid #e8e8e8', padding: '16px 0', flexShrink: 0 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(0,0,0,.88)', padding: '8px 16px', marginBottom: 8 }}>后台管理</div>
      {navItems.map(item => (
        <div key={item.path}
          onClick={() => navigate(item.path)}
          style={{
            padding: '10px 16px', cursor: 'pointer', fontSize: 13,
            color: location.pathname === item.path ? '#1677FF' : 'rgba(0,0,0,.65)',
            background: location.pathname === item.path ? '#e6f4ff' : 'transparent',
            borderRight: location.pathname === item.path ? '2px solid #1677FF' : '2px solid transparent',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          <span>{item.icon}</span><span>{item.label}</span>
        </div>
      ))}
    </div>
  )
}
