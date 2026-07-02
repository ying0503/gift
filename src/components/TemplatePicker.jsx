import { useState, useEffect } from 'react'
import { CloseOutlined } from '@ant-design/icons'
import { API } from '../AuthContext'

const fallbackTemplates = []

export default function TemplatePicker({ visible, onClose, currentTitle, albumId, currentCategories, currentAlbumTitle }) {
  const [templates, setTemplates] = useState(fallbackTemplates)

  useEffect(() => {
    if (!visible) return
    fetch(`${API}/api/templates/public`)
      .then(r => r.json())
      .then(data => {
        if (data.templates?.length) setTemplates(data.templates)
      })
      .catch(() => {})
  }, [visible])

  const create = async (tpl) => {
    if (albumId) {
      const token = localStorage.getItem('token')
      if (token && albumId) {
        await fetch(`${API}/api/digital-album`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            id: albumId,
            categories: currentCategories,
            bannerUrl: tpl.banner || '',
            bannerTitle: tpl.name || '',
            albumTitle: currentAlbumTitle || '',
            bannerSubtitle: tpl.description || '',
            titleBgFrom: tpl.titleBgFrom || '',
            titleBgTo: tpl.titleBgTo || '',
            menuBgFrom: tpl.menuBgFrom || '',
            menuBgTo: tpl.menuBgTo || '',
          }),
        })
      }
      onClose()
      window.location.reload()
      return
    }
    const token = localStorage.getItem('token')
    if (!token) return
    try {
      const res = await fetch(`${API}/api/digital-album`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ categories: tpl.categories, bannerTitle: tpl.name, albumTitle: currentAlbumTitle || '', bannerSubtitle: tpl.description || '', bannerUrl: tpl.banner || '', titleBgFrom: tpl.titleBgFrom || '', titleBgTo: tpl.titleBgTo || '', menuBgFrom: tpl.menuBgFrom || '', menuBgTo: tpl.menuBgTo || '' }),
      })
      const data = await res.json()
      if (data.id) window.location.href = `/digital-album/${data.id}`
      else alert('创建失败：' + (data.error || '服务器返回异常'))
    } catch (e) {
      alert('创建失败，请检查服务器是否重启')
    }
  }

  if (!visible) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div className="card" style={{ width: 720, maxHeight: '80vh', padding: 24, overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'rgba(0,0,0,.88)' }}>选择画册模板</div>
          <span onClick={onClose} style={{ cursor: 'pointer', fontSize: 16, color: 'rgba(0,0,0,.45)' }}><CloseOutlined /></span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {templates.map(tpl => {
            const isCurrent = !!(currentTitle && (tpl.name === currentTitle || tpl.templateName === currentTitle))
            return (
              <div key={tpl.id}
                onClick={() => create(tpl)}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,.12)'; if (!isCurrent) e.currentTarget.style.borderColor = '#1677FF' }}
                onMouseLeave={e => { if (!isCurrent) { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#f1f5f9' } }}
                style={{
                  cursor: 'pointer', borderRadius: 10, overflow: 'hidden',
                  border: isCurrent ? '2px solid #1677FF' : '1px solid #f1f5f9',
                  background: '#fff', transition: 'all .2s',
                  position: 'relative', aspectRatio: '1/1.7',
                }}
              >
                {isCurrent && <div style={{ position: 'absolute', top: 4, right: 4, zIndex: 2, background: '#1677FF', color: '#fff', borderRadius: 4, fontSize: 10, fontWeight: 500, padding: '1px 6px', lineHeight: '18px' }}>当前</div>}
                {tpl.cover ? (
                  <img src={tpl.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', position: 'absolute', inset: 0 }} />
                ) : (
                  <div style={{ height: '50%', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
                    {tpl.icon || '📄'}
                  </div>
                )}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: tpl.cover ? 'linear-gradient(transparent, rgba(0,0,0,.65))' : '#fff',
                  padding: tpl.cover ? '28px 10px 10px' : '8px 10px 10px',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: tpl.cover ? '#fff' : '#0f172a' }}>{tpl.templateName || tpl.name}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
