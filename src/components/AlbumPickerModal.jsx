import { useState, useEffect } from 'react'
import { Modal, Pagination } from 'antd'

const PAGE_SIZE = 20

export default function AlbumPickerModal({
  visible,
  onCancel,
  onOk,
  title,
  items,
  pickerSelected,
  setPickerSelected,
}) {
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (visible) setPage(1)
  }, [visible])

  const total = items.length
  const start = (page - 1) * PAGE_SIZE
  const pageItems = items.slice(start, start + PAGE_SIZE)

  return (
    <Modal
      title={title || '选择'}
      open={visible}
      onCancel={onCancel}
      onOk={onOk}
      okText="确定"
      width={980}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 220px)', gap: 16, maxHeight: 460, overflow: 'auto', minHeight: 300 }}>
        {pageItems.map((item, i) => {
          const rawUrls = item.imageUrls && item.imageUrls.length ? item.imageUrls : (item.imageUrl ? [item.imageUrl] : [])
          const urls = rawUrls.filter(Boolean)
          const idx = start + i
          const selected = pickerSelected.has(idx)
          return (
            <div
              key={idx}
              style={{ width: 220, height: 260, borderRadius: 10, overflow: 'hidden', border: selected ? '2px solid #7B52FF' : '1px solid #E6E6E6', background: '#fff', cursor: 'pointer', position: 'relative', transition: 'border-color .2s' }}
              onClick={() => setPickerSelected(prev => { 
                const n = new Set(prev); 
                if (n.has(idx)) n.delete(idx); 
                else n.add(idx); 
                return n;
              })}
              onMouseEnter={e => { if (!selected) e.currentTarget.style.borderColor = '#7B52FF' }}
              onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = '#E6E6E6' }}
            >
              <img src={urls[0]} alt="" style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block', borderBottom: '1px solid #E6E6E6' }} />
              {urls.length > 1 && (
                <div style={{ position: 'absolute', bottom: 46, right: 6, background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 11, padding: '1px 8px', borderRadius: 10, lineHeight: '20px' }}>
                  {urls.length}张
                </div>
              )}
              <div style={{ padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: 14, color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.name || '未命名'}
                </div>
              </div>
            </div>
          )
        })}
        {items.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
            暂无可用图片
          </div>
        )}
      </div>
      {total > PAGE_SIZE && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
          <Pagination
            current={page}
            total={total}
            pageSize={PAGE_SIZE}
            onChange={setPage}
            size="small"
            showSizeChanger={false}
          />
        </div>
      )}
    </Modal>
  )
}
