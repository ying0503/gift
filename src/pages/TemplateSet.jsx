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
        const res = await fetch(`${API}/api/templates/${tpl.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(tpl),
        })
        if (!res.ok) { const e = await res.json(); alert('保存失败: ' + (e.error || res.status)); return }
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
    <div style={{ display: 'flex', height: '100%', background: '#f5f5f5', borderRadius: 8 }}>
      <AdminSidebar />
      <div style={{ flex: 1, padding: 24, overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'rgba(0,0,0,.88)' }}>画册模板</div>
          <button className="btn btn-primary" style={{ fontSize: 13, height: 34, padding: '0 16px', borderRadius: 8, border: 'none', cursor: 'pointer' }}
            onClick={() => { setCreating(true); setEditing({ name: '', templateName: '', icon: '📄', description: '', cover: '', banner: '', categories: [], enabled: true, titleBgFrom: '', titleBgTo: '', menuBgFrom: '', menuBgTo: '' }) }}>
            <PlusOutlined /> 新增模板
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', paddingTop: 60, color: '#94a3b8', fontSize: 14 }}>加载中...</div>
        ) : templates.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 60, color: '#94a3b8', fontSize: 14 }}>暂无模板，点击右上角新增</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16 }}>
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
                  <div style={{ fontSize: 14, fontWeight: 600, color: tpl.cover ? '#fff' : '#0f172a' }}>
                    {tpl.templateName || tpl.name}
                  </div>
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
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 1000,
        width: 400, background: '#fff', boxShadow: '-4px 0 24px rgba(0,0,0,.1)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        animation: 'slideInRight .25s ease-out',
      }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'rgba(0,0,0,.88)' }}>{isNew ? '新增模板' : '编辑模板'}</div>
          <span onClick={onClose} style={{ cursor: 'pointer', fontSize: 18, color: 'rgba(0,0,0,.45)', lineHeight: 1 }}><CloseOutlined /></span>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(0,0,0,.65)', whiteSpace: 'nowrap', width: 60 }}>模板名称</span>
            <input value={form.templateName || ''} onChange={e => update('templateName', e.target.value)}
              placeholder="模板名称"
              style={{ flex: 1, height: 36, padding: '0 12px', fontSize: 14, border: '1px solid #d9d9d9', borderRadius: 6, outline: 'none' }} />
          </div>

          <div style={{ marginBottom: 16, display: 'flex', gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(0,0,0,.65)', whiteSpace: 'nowrap', width: 52, flexShrink: 0, paddingTop: 4 }}>示意图</span>
            <div style={{ flex: 1 }}>
              <div
                onClick={() => document.getElementById('cover-upload')?.click()}
                style={{
                  height: 160, background: '#f8fafc', borderRadius: 8, border: '1px solid #e8e8e8', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden',
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
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: '#c0c8d4' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                    <span style={{ fontSize: 12 }}>点击上传示意图</span>
                  </div>
                )}
              </div>
              {form.cover && (
                <div style={{ marginTop: 4, textAlign: 'right' }}>
                  <span onClick={() => update('cover', '')} style={{ fontSize: 12, color: '#ff4d4f', cursor: 'pointer' }}>移除图片</span>
                </div>
              )}
            </div>
          </div>

          <div style={{ marginBottom: 16, display: 'flex', gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(0,0,0,.65)', whiteSpace: 'nowrap', width: 52, flexShrink: 0, paddingTop: 4 }}>氛围图</span>
            <div style={{ flex: 1 }}>
              <div
                onClick={() => document.getElementById('banner-upload')?.click()}
                style={{
                  height: 120, background: '#f8fafc', borderRadius: 8, border: '1px solid #e8e8e8', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden',
                }}
              >
                <input id="banner-upload" type="file" accept="image/*" style={{ display: 'none' }}
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
                        }).then(r => r.json()).then(data => { if (data.url) update('banner', data.url) }).catch(() => {})
                      }
                    }
                    reader.readAsDataURL(file)
                    e.target.value = ''
                  }}
                />
                {form.banner ? (
                  <img src={form.banner} alt="banner" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: '#c0c8d4' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                    <span style={{ fontSize: 12 }}>点击上传氛围图</span>
                  </div>
                )}
              </div>
              {form.banner && (
                <div style={{ marginTop: 4, textAlign: 'right' }}>
                  <span onClick={() => update('banner', '')} style={{ fontSize: 12, color: '#ff4d4f', cursor: 'pointer' }}>移除图片</span>
                </div>
              )}
            </div>
          </div>

          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(0,0,0,.65)', whiteSpace: 'nowrap', width: 60 }}>画册标题</span>
            <input value={form.name} onChange={e => update('name', e.target.value)}
              placeholder="画册标题"
              style={{ flex: 1, height: 36, padding: '0 12px', fontSize: 14, border: '1px solid #d9d9d9', borderRadius: 6, outline: 'none' }} />
          </div>

          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(0,0,0,.65)', whiteSpace: 'nowrap', width: 60 }}>画册描述</span>
            <input value={form.description} onChange={e => update('description', e.target.value)}
              placeholder="画册描述"
              style={{ flex: 1, height: 36, padding: '0 12px', fontSize: 14, border: '1px solid #d9d9d9', borderRadius: 6, outline: 'none' }} />
          </div>

          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(0,0,0,.65)', whiteSpace: 'nowrap', width: 52, flexShrink: 0 }}>标题背景</span>
            <input value={form.titleBgFrom || ''} onChange={e => update('titleBgFrom', e.target.value)}
              placeholder="#F5C5F9"
              style={{ width: 130, height: 36, padding: '0 12px', fontSize: 14, border: '1px solid #d9d9d9', borderRadius: 6, outline: 'none' }} />
            <span style={{ color: '#d9d9d9', fontSize: 16, fontWeight: 300, lineHeight: 1, flexShrink: 0 }}>—</span>
            <input value={form.titleBgTo || ''} onChange={e => update('titleBgTo', e.target.value)}
              placeholder="#FDF0FC"
              style={{ width: 130, height: 36, padding: '0 12px', fontSize: 14, border: '1px solid #d9d9d9', borderRadius: 6, outline: 'none' }} />
          </div>

          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(0,0,0,.65)', whiteSpace: 'nowrap', width: 52, flexShrink: 0 }}>菜单背景</span>
            <input value={form.menuBgFrom || ''} onChange={e => update('menuBgFrom', e.target.value)}
              placeholder="#EEE"
              style={{ width: 130, height: 36, padding: '0 12px', fontSize: 14, border: '1px solid #d9d9d9', borderRadius: 6, outline: 'none' }} />
            <span style={{ color: '#d9d9d9', fontSize: 16, fontWeight: 300, lineHeight: 1, flexShrink: 0 }}>—</span>
            <input value={form.menuBgTo || ''} onChange={e => update('menuBgTo', e.target.value)}
              placeholder="#FFF"
              style={{ width: 130, height: 36, padding: '0 12px', fontSize: 14, border: '1px solid #d9d9d9', borderRadius: 6, outline: 'none' }} />
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
