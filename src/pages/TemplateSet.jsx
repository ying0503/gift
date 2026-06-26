import { useState, useEffect } from 'react'
import { PlusOutlined, DeleteOutlined, CloseOutlined } from '@ant-design/icons'
import { Modal } from 'antd'
import { API } from '../AuthContext'
import AdminSidebar from '../components/AdminSidebar'

export default function TemplateSet() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [creating, setCreating] = useState(false)

  const fetchTemplates = () => {
    const token = localStorage.getItem('token')
    if (!token) return
    setLoading(true)
    fetch(`${API}/api/templates`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (data.templates) setTemplates(data.templates) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchTemplates() }, [])

  const save = async (tpl) => {
    const token = localStorage.getItem('token')
    if (!token) return
    try {
      if (tpl.id) {
        await fetch(`${API}/api/templates/${tpl.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(tpl),
        })
      } else {
        const res = await fetch(`${API}/api/templates`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(tpl),
        })
        const data = await res.json()
        if (!data.id) { alert('创建失败'); return }
      }
      fetchTemplates()
      setEditing(null)
    } catch (e) { alert('保存失败') }
  }

  const remove = (id) => {
    Modal.confirm({
      title: '删除模板',
      content: '确定要删除这个模板吗？',
      okText: '删除', okType: 'danger', cancelText: '取消',
      onOk: async () => {
        const token = localStorage.getItem('token')
        await fetch(`${API}/api/templates/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
        setTemplates(a => a.filter(x => x.id !== id))
      },
    })
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 48px)', background: '#f5f5f5' }}>
      <AdminSidebar />
      <div style={{ flex: 1, padding: 24, overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'rgba(0,0,0,.88)' }}>画册模板</div>
          <button className="btn btn-primary" style={{ fontSize: 13, height: 34, padding: '0 16px', borderRadius: 8, border: 'none', cursor: 'pointer' }}
            onClick={() => { setCreating(true); setEditing({ name: '', icon: '📄', description: '', cover: '', categories: [], enabled: true }) }}>
            <PlusOutlined /> 新增模板
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', paddingTop: 60, color: '#94a3b8', fontSize: 14 }}>加载中...</div>
        ) : templates.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 60, color: '#94a3b8', fontSize: 14 }}>暂无模板，点击右上角新增</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
            {templates.map(tpl => (
              <div key={tpl.id}
                style={{ cursor: 'pointer', borderRadius: 10, border: '1px solid #e8e8e8', overflow: 'hidden', background: '#fff', transition: 'all .2s', position: 'relative', aspectRatio: '3/4' }}
                onClick={() => { setCreating(false); setEditing({ ...tpl, categories: [...tpl.categories] }) }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.1)'; e.currentTarget.style.borderColor = '#1677FF' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#e8e8e8' }}
              >
                {tpl.cover ? (
                  <img src={tpl.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', position: 'absolute', inset: 0 }} />
                ) : (
                  <div style={{ height: '55%', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>
                    {tpl.icon}
                  </div>
                )}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: tpl.cover ? 'linear-gradient(transparent, rgba(0,0,0,.7))' : '#fff',
                  padding: tpl.cover ? '32px 14px 14px' : '10px 14px 12px',
                }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: tpl.cover ? '#fff' : '#0f172a', marginBottom: 2 }}>
                    {tpl.name}
                  </div>
                  <div style={{ fontSize: 12, color: tpl.cover ? 'rgba(255,255,255,.75)' : '#94a3b8', lineHeight: 1.4 }}>{tpl.description}</div>
                </div>
                <div style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,.4)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 13, zIndex: 2 }}
                  onClick={e => { e.stopPropagation(); remove(tpl.id) }}>
                  <DeleteOutlined />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <RightPanel data={editing} isNew={creating} onSave={save} onClose={() => { setEditing(null); setCreating(false) }} />
      )}
    </div>
  )
}

function RightPanel({ data, isNew, onSave, onClose }) {
  const [form, setForm] = useState(data)

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'transparent' }} onClick={onClose} />
      <div style={{
        position: 'fixed', top: 48, right: 0, bottom: 0, zIndex: 1000,
        width: 400, background: '#fff', boxShadow: '-4px 0 24px rgba(0,0,0,.1)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        animation: 'slideInRight .25s ease-out',
      }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'rgba(0,0,0,.88)' }}>{isNew ? '新增模板' : '编辑模板'}</div>
          <span onClick={onClose} style={{ cursor: 'pointer', fontSize: 18, color: 'rgba(0,0,0,.45)', lineHeight: 1 }}><CloseOutlined /></span>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(0,0,0,.65)', marginBottom: 6 }}>标题</div>
            <input value={form.name} onChange={e => update('name', e.target.value)}
              placeholder="模板名称"
              style={{ width: '100%', height: 40, padding: '0 12px', fontSize: 14, border: '1px solid #d9d9d9', borderRadius: 6, outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(0,0,0,.65)', marginBottom: 6 }}>副标题</div>
            <input value={form.description} onChange={e => update('description', e.target.value)}
              placeholder="模板描述"
              style={{ width: '100%', height: 40, padding: '0 12px', fontSize: 14, border: '1px solid #d9d9d9', borderRadius: 6, outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(0,0,0,.65)', marginBottom: 8 }}>示意图</div>
            <div
              onClick={() => document.getElementById('cover-upload')?.click()}
              style={{
                height: 200, background: '#f8fafc', borderRadius: 8, border: '1px solid #e8e8e8', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 60, position: 'relative', overflow: 'hidden',
              }}
            >
              <input id="cover-upload" type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const reader = new FileReader()
                  reader.onload = (ev) => {
                    const base64 = ev.target?.result
                    if (typeof base64 === 'string') {
                      fetch(`${API}/api/upload`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
                        body: JSON.stringify({ image: base64 }),
                      }).then(r => r.json()).then(data => { if (data.url) update('cover', data.url) }).catch(() => {})
                    }
                  }
                  reader.readAsDataURL(file)
                  e.target.value = ''
                }}
              />
              {form.cover ? (
                <img src={form.cover} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: '#c0c8d4' }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                  <span style={{ fontSize: 13 }}>点击上传示意图</span>
                </div>
              )}
            </div>
            {form.cover && (
              <div style={{ marginTop: 6, textAlign: 'right' }}>
                <span onClick={() => update('cover', '')} style={{ fontSize: 12, color: '#ff4d4f', cursor: 'pointer' }}>移除图片</span>
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
          <button className="btn btn-outline" onClick={onClose}>取消</button>
          <button className="btn btn-primary" disabled={!form.name.trim()} onClick={() => onSave({ ...form, enabled: true })}>保存</button>
        </div>
      </div>
    </>
  )
}
