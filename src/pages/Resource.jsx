import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { API } from '../AuthContext'

const PAGE_SIZE = 50
const catMap = { 'gift-card': '礼品卡', 'gift-book': '礼品册', 'gift-coupon': '礼品券', 'cover': '画册封面', 'envelope': '封套' }
const catTitles = { 'gift-card': '礼品卡', 'gift-book': '礼品册', 'gift-coupon': '礼品券', 'cover': '画册封面', 'envelope': '封套' }
const thumbColors = ['#FFE7BA', '#D4F0FF', '#FFD4D4', '#D4FFD4', '#E8D4FF', '#FFD4E8', '#D4E8FF', '#FFF4D4']

export default function Resource() {
  const location = useLocation()
  const hash = location.hash.replace('#', '')
  const categoryId = catMap[hash] ? hash : 'gift-card'
  const categoryTitle = catTitles[categoryId]
  const categoryName = catMap[categoryId]
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    setPage(1)
  }, [categoryId])

  useEffect(() => {
    fetch(`${API}/api/resources/public?category=${encodeURIComponent(categoryName)}&page=${page}&limit=${PAGE_SIZE}`)
      .then(r => r.json())
      .then(data => {
        setItems(data.resources || [])
        setTotal(data.total || 0)
      })
      .catch(() => {})
  }, [categoryId, page, categoryName])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div style={{ padding: '40px 40px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ width: 18, height: 18, borderRadius: 3, background: 'linear-gradient(0deg, #72D2FF, #7B52FF)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><g clipPath="url(#iconClip)"><path d="M8.33333 10H1.66667C0.733333 10 0 9.26667 0 8.33333V1.66667C0 0.733333 0.733333 0 1.66667 0H8.33333C9.26667 0 10 0.733333 10 1.66667V8.33333C10 9.26667 9.26667 10 8.33333 10ZM1.66667 0.666667C1.1 0.666667 0.666667 1.1 0.666667 1.66667V8.33333C0.666667 8.9 1.1 9.33333 1.66667 9.33333H8.33333C8.9 9.33333 9.33333 8.9 9.33333 8.33333V1.66667C9.33333 1.1 8.9 0.666667 8.33333 0.666667H1.66667Z" fill="white"/><path d="M2.5 3.43338C2.5 3.51655 2.51638 3.59891 2.54821 3.67575C2.58004 3.75259 2.62669 3.82241 2.6855 3.88122C2.74431 3.94003 2.81413 3.98668 2.89097 4.01851C2.96781 4.05033 3.05016 4.06672 3.13333 4.06672C3.2165 4.06672 3.29886 4.05033 3.3757 4.01851C3.45254 3.98668 3.52236 3.94003 3.58117 3.88122C3.63998 3.82241 3.68663 3.75259 3.71846 3.67575C3.75028 3.59891 3.76667 3.51655 3.76667 3.43338C3.76667 3.35021 3.75028 3.26786 3.71846 3.19102C3.68663 3.11418 3.63998 3.04436 3.58117 2.98555C3.52236 2.92674 3.474 2.88009 3.3757 2.84826C3.29886 2.81643 3.2165 2.80005 3.13333 2.80005C3.05016 2.80005 2.96781 2.81643 2.89097 2.84826C2.81413 2.88009 2.74431 2.92674 2.6855 2.98555C2.62669 3.04436 2.58004 3.11418 2.54821 3.19102C2.51638 3.26786 2.5 3.35021 2.5 3.43338Z" fill="white"/><path d="M2.16665 8.3667L1.56665 8.10003L1.69998 7.80003C2.39998 6.1667 3.53332 5.33337 5.03332 5.23337C6.29998 5.1667 7.23332 4.80003 7.79998 4.13337L8.03332 3.8667L8.53332 4.30003L8.29998 4.5667C7.59998 5.3667 6.49998 5.83337 5.06665 5.90003C3.83332 5.9667 2.93332 6.6667 2.33332 8.0667L2.16665 8.3667Z" fill="white"/></g><defs><clipPath id="iconClip"><rect width="10" height="10" fill="white"/></clipPath></defs></svg>
        </div>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#000' }}>{categoryTitle}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 220px)', gap: '20px' }}>
        {items.map((item, i) => (
          <div
            key={item.id}
            style={{ width: 220, height: 260, borderRadius: 10, border: '1px solid #E6E6E6', background: '#fff', cursor: 'pointer', overflow: 'hidden', transition: 'border-color .2s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#7B52FF'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#E6E6E6'}
          >
            <div style={{ width: '100%', height: 220, background: item.cover ? `url(${item.cover}) center/cover no-repeat` : thumbColors[i % thumbColors.length], display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #E6E6E6' }}>
              {!item.cover && <div style={{ fontSize: 13, color: '#999' }}>暂无预览</div>}
            </div>
            <div style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 14, color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                {item.name}
              </div>
              {item.resourceUrl && (
                <a href={item.resourceUrl} download style={{ flexShrink: 0, lineHeight: 0, textDecoration: 'none' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M5.60002 14V18.4H18.4V14H19.6V19L19 19.6H5.00002L4.40002 19V14H5.60002ZM12.6 4V13.549L15.576 10.576L16.424 11.424L12.424 15.424H11.576L7.57402 11.424L8.42202 10.576L11.4 13.553V4H12.6Z" fill="#666666"/>
                  </svg>
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 32 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
            style={{ padding: '6px 14px', border: '1px solid #d9d9d9', borderRadius: 6, background: page <= 1 ? '#f5f5f5' : '#fff', fontSize: 14, color: page <= 1 ? '#ccc' : '#333', cursor: page <= 1 ? 'not-allowed' : 'pointer' }}>
            上一页
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)}
              style={{ width: 32, height: 32, border: p === page ? '1px solid #7B52FF' : '1px solid #d9d9d9', borderRadius: 6, background: p === page ? '#7B52FF' : '#fff', fontSize: 14, color: p === page ? '#fff' : '#333', cursor: 'pointer' }}>
              {p}
            </button>
          ))}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            style={{ padding: '6px 14px', border: '1px solid #d9d9d9', borderRadius: 6, background: page >= totalPages ? '#f5f5f5' : '#fff', fontSize: 14, color: page >= totalPages ? '#ccc' : '#333', cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}>
            下一页
          </button>
          <span style={{ fontSize: 13, color: '#999', marginLeft: 8 }}>共 {total} 个</span>
        </div>
      )}
    </div>
  )
}