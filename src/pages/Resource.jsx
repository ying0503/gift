import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { API } from '../AuthContext'

const catMap = { 'gift-card': '礼品卡', 'gift-book': '礼品册', 'gift-coupon': '礼品券', 'cover': '画册封面', 'envelope': '封套' }
const catTitles = { 'gift-card': '礼品卡', 'gift-book': '礼品册', 'gift-coupon': '礼品券', 'cover': '画册封面', 'envelope': '封套' }
const thumbColors = ['#FFE7BA', '#D4F0FF', '#FFD4D4', '#D4FFD4', '#E8D4FF', '#FFD4E8', '#D4E8FF', '#FFF4D4']

export default function Resource() {
  const location = useLocation()
  const navigate = useNavigate()
  const hash = location.hash.replace('#', '')
  const categoryId = catMap[hash] ? hash : 'gift-card'
  const categoryTitle = catTitles[categoryId]
  const [items, setItems] = useState([])

  useEffect(() => {
    const token = localStorage.getItem('token')
    fetch(`${API}/api/resources`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        const all = data.resources || []
        setItems(all.filter(r => r.category === catMap[categoryId]))
      })
      .catch(() => {})
  }, [categoryId])

  return (
    <div style={{ padding: '40px 40px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div
          onClick={() => navigate('/workbench')}
          style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 14, color: '#666', flexShrink: 0 }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M8.85932 5.33781H1.78882V4.65356H8.85932V5.33781Z" fill="#ACACAC"/><path d="M4.52579 1.75024C4.59341 1.7503 4.6595 1.7704 4.71571 1.808C4.77191 1.84559 4.81572 1.899 4.84159 1.96148C4.86746 2.02396 4.87423 2.0927 4.86105 2.15903C4.84788 2.22535 4.81534 2.28629 4.76756 2.33413L2.10586 4.99583L4.76756 7.65753C4.80117 7.68885 4.82813 7.72662 4.84683 7.76859C4.86553 7.81056 4.87558 7.85586 4.87639 7.9018C4.8772 7.94773 4.86875 7.99336 4.85155 8.03596C4.83434 8.07856 4.80873 8.11726 4.77624 8.14975C4.74375 8.18224 4.70506 8.20785 4.66246 8.22505C4.61986 8.24226 4.57423 8.25071 4.52829 8.2499C4.48235 8.24909 4.43705 8.23903 4.39508 8.22034C4.35312 8.20164 4.31535 8.17468 4.28403 8.14106L1.13879 4.99583L4.28403 1.8506C4.34812 1.78642 4.43509 1.75032 4.52579 1.75024Z" fill="#ACACAC"/></svg>
          <span>返回首页</span>
        </div>
        <div style={{ width: 0, height: 12, borderLeft: '1px solid #E6E6E6' }} />
        <div style={{ width: 18, height: 18, borderRadius: 3, background: 'linear-gradient(0deg, #72D2FF, #7B52FF)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><g clipPath="url(#iconClip)"><path d="M8.33333 10H1.66667C0.733333 10 0 9.26667 0 8.33333V1.66667C0 0.733333 0.733333 0 1.66667 0H8.33333C9.26667 0 10 0.733333 10 1.66667V8.33333C10 9.26667 9.26667 10 8.33333 10ZM1.66667 0.666667C1.1 0.666667 0.666667 1.1 0.666667 1.66667V8.33333C0.666667 8.9 1.1 9.33333 1.66667 9.33333H8.33333C8.9 9.33333 9.33333 8.9 9.33333 8.33333V1.66667C9.33333 1.1 8.9 0.666667 8.33333 0.666667H1.66667Z" fill="white"/><path d="M2.5 3.43338C2.5 3.51655 2.51638 3.59891 2.54821 3.67575C2.58004 3.75259 2.62669 3.82241 2.6855 3.88122C2.74431 3.94003 2.81413 3.98668 2.89097 4.01851C2.96781 4.05033 3.05016 4.06672 3.13333 4.06672C3.2165 4.06672 3.29886 4.05033 3.3757 4.01851C3.45254 3.98668 3.52236 3.94003 3.58117 3.88122C3.63998 3.82241 3.68663 3.75259 3.71846 3.67575C3.75028 3.59891 3.76667 3.51655 3.76667 3.43338C3.76667 3.35021 3.75028 3.26786 3.71846 3.19102C3.68663 3.11418 3.63998 3.04436 3.58117 2.98555C3.52236 2.92674 3.45254 2.88009 3.3757 2.84826C3.29886 2.81643 3.2165 2.80005 3.13333 2.80005C3.05016 2.80005 2.96781 2.81643 2.89097 2.84826C2.81413 2.88009 2.74431 2.92674 2.6855 2.98555C2.62669 3.04436 2.58004 3.11418 2.54821 3.19102C2.51638 3.26786 2.5 3.35021 2.5 3.43338Z" fill="white"/><path d="M2.16665 8.3667L1.56665 8.10003L1.69998 7.80003C2.39998 6.1667 3.53332 5.33337 5.03332 5.23337C6.29998 5.1667 7.23332 4.80003 7.79998 4.13337L8.03332 3.8667L8.53332 4.30003L8.29998 4.5667C7.59998 5.3667 6.49998 5.83337 5.06665 5.90003C3.83332 5.9667 2.93332 6.6667 2.33332 8.0667L2.16665 8.3667Z" fill="white"/></g><defs><clipPath id="iconClip"><rect width="10" height="10" fill="white"/></clipPath></defs></svg>
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
    </div>
  )
}
