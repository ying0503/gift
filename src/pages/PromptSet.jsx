import { useState, useEffect } from 'react'
import { message } from 'antd'
import { API } from '../AuthContext'
import AdminSidebar from '../components/AdminSidebar'

const TYPES = [
  { key: 'prompt_mockup', label: '样机图', default: '生成一个3d效果图，真实立体包装' },
  { key: 'prompt_whitebg', label: '白底图', default: '生成白底图' },
  { key: 'prompt_scene', label: '场景图', default: '' },
]

export default function PromptSet() {
  const [config, setConfig] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchConfig = () => {
    setLoading(true)
    fetch(`${API}/api/global-config`)
      .then(r => r.json())
      .then(data => setConfig(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchConfig() }, [])

  const save = async () => {
    setSaving(true)
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`${API}/api/global-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(config),
      })
      if (!res.ok) throw new Error('保存失败')
      message.success('保存成功')
    } catch (e) {
      message.error(e.message)
    }
    setSaving(false)
  }

  return (
    <div style={{ display: 'flex', height: '100%', background: '#f5f5f5', borderRadius: 8 }}>
      <AdminSidebar />
      <div style={{ flex: 1, padding: 24, overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'rgba(0,0,0,.88)' }}>生图提示词</div>
          <button className="btn btn-primary" onClick={save} disabled={saving}
            style={{ fontSize: 13, height: 34, padding: '0 16px', borderRadius: 8, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? .6 : 1 }}
          >{saving ? '保存中...' : '保存'}</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', paddingTop: 60, color: '#94a3b8', fontSize: 14 }}>加载中...</div>
        ) : (
          <div style={{ maxWidth: 800 }}>
            {TYPES.map(t => (
              <div key={t.key} style={{ marginBottom: 24, background: '#fff', borderRadius: 10, padding: 20, border: '1px solid #e8e8e8' }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'rgba(0,0,0,.88)', marginBottom: 10 }}>{t.label}</div>
                <textarea
                  value={config[t.key] !== undefined ? config[t.key] : t.default}
                  onChange={e => setConfig(prev => ({ ...prev, [t.key]: e.target.value }))}
                  placeholder={t.default}
                  rows={t.key === 'prompt_scene' ? 12 : 4}
                  style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid #d9d9d9', borderRadius: 6, outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6, boxSizing: 'border-box' }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
