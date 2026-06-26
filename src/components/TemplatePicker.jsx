import { useState, useEffect } from 'react'
import { API } from '../AuthContext'

const uid = () => crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

const fallbackTemplates = [
  { id: 'duanwu', icon: '🎋', name: '端午安康', description: '粽子、艾草、茶叶等端午主题礼品', categories: [
    { id: uid(), name: '粽子礼盒', items: [{ id: uid(), name: '经典款', albums: [] }, { id: uid(), name: '豪华款', albums: [] }] },
    { id: uid(), name: '艾草香包', items: [{ id: uid(), name: '精品香包', albums: [] }] },
    { id: uid(), name: '茶叶礼盒', items: [{ id: uid(), name: '精选茶叶', albums: [] }] },
    { id: uid(), name: '糕点礼盒', items: [{ id: uid(), name: '传统糕点', albums: [] }] },
    { id: uid(), name: '养生保健', items: [{ id: uid(), name: '健康礼盒', albums: [] }] },
  ]},
  { id: 'zhongqiu', icon: '🌙', name: '中秋礼遇', description: '月饼、大闸蟹、茶叶等中秋主题礼品', categories: [
    { id: uid(), name: '月饼礼盒', items: [{ id: uid(), name: '经典款', albums: [] }, { id: uid(), name: '冰皮款', albums: [] }] },
    { id: uid(), name: '大闸蟹礼盒', items: [{ id: uid(), name: '阳澄湖大闸蟹', albums: [] }] },
    { id: uid(), name: '茶叶礼盒', items: [{ id: uid(), name: '精选茶叶', albums: [] }] },
    { id: uid(), name: '水果礼盒', items: [{ id: uid(), name: '时令鲜果', albums: [] }] },
    { id: uid(), name: '坚果礼盒', items: [{ id: uid(), name: '每日坚果', albums: [] }] },
  ]},
  { id: 'chunjie', icon: '🧨', name: '新春贺岁', description: '坚果、糕点、酒类等春节年货礼品', categories: [
    { id: uid(), name: '坚果礼盒', items: [{ id: uid(), name: '经典款', albums: [] }, { id: uid(), name: '豪华款', albums: [] }] },
    { id: uid(), name: '糕点礼盒', items: [{ id: uid(), name: '传统糕点', albums: [] }] },
    { id: uid(), name: '酒类礼盒', items: [{ id: uid(), name: '精选酒品', albums: [] }] },
    { id: uid(), name: '保健品礼盒', items: [{ id: uid(), name: '滋补养生', albums: [] }] },
    { id: uid(), name: '零食大礼包', items: [{ id: uid(), name: '零食组合', albums: [] }] },
  ]},
  { id: 'business', icon: '🤝', name: '商务伴手礼', description: '高端茶礼、定制礼品等商务馈赠', categories: [
    { id: uid(), name: '高端茶礼', items: [{ id: uid(), name: '精选茶品', albums: [] }] },
    { id: uid(), name: '商务酒类', items: [{ id: uid(), name: '精品酒水', albums: [] }] },
    { id: uid(), name: '定制文具', items: [{ id: uid(), name: '商务套装', albums: [] }] },
    { id: uid(), name: '品牌礼品', items: [{ id: uid(), name: '定制礼品', albums: [] }] },
  ]},
  { id: 'wedding', icon: '💍', name: '婚庆回礼', description: '喜糖礼盒、伴手礼等婚宴回赠礼品', categories: [
    { id: uid(), name: '喜糖礼盒', items: [{ id: uid(), name: '经典喜糖', albums: [] }] },
    { id: uid(), name: '伴手礼盒', items: [{ id: uid(), name: '精装伴手礼', albums: [] }] },
    { id: uid(), name: '定制纪念品', items: [{ id: uid(), name: '纪念好物', albums: [] }] },
    { id: uid(), name: '感谢卡套装', items: [{ id: uid(), name: '感恩心意', albums: [] }] },
  ]},
  { id: 'blank', icon: '📄', name: '空白画册', description: '从零开始创建画册', categories: [] },
]

export default function TemplatePicker({ visible, onClose }) {
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
    onClose()
    const token = localStorage.getItem('token')
    if (!token) return
    try {
      const res = await fetch(`${API}/api/digital-album`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ categories: tpl.categories, bannerTitle: tpl.name }),
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
      <div className="card" style={{ width: 640, maxHeight: '80vh', padding: 24, overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'rgba(0,0,0,.88)', marginBottom: 20 }}>选择画册模板</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {templates.map(tpl => (
              <div key={tpl.id}
                style={{ cursor: 'pointer', borderRadius: 10, border: '1px solid #f1f5f9', overflow: 'hidden', background: '#fff', transition: 'all .2s', position: 'relative' }}
                onClick={() => create(tpl)}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.1)'; e.currentTarget.style.borderColor = '#1677FF' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#f1f5f9' }}
              >
                <div style={{ height: 100, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, overflow: 'hidden' }}>
                  {tpl.cover ? <img src={tpl.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (tpl.icon || '📄')}
                </div>
              <div style={{ padding: '10px 12px 12px' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>{tpl.name}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.4 }}>{tpl.description || tpl.desc || ''}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
