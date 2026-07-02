import { useState, useEffect } from 'react'
import { Modal, Pagination } from 'antd'

const PAGE_SIZE = 20

export default function AlbumPickerModal({
  visible,
  onCancel,
  onOk,
  albumImages,
  pickerSelected,
  setPickerSelected,
}) {
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (visible) setPage(1)
  }, [visible])

  const total = albumImages.length
  const start = (page - 1) * PAGE_SIZE
  const pageItems = albumImages.slice(start, start + PAGE_SIZE)

  return (
    <Modal
      title="选择礼品图"
      open={visible}
      onCancel={onCancel}
      onOk={onOk}
      okText="确定"
      width={720}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, maxHeight: 460, overflow: 'auto', minHeight: 300 }}>
        {pageItems.map((a, i) => {
          const urls = a.imageUrls && a.imageUrls.length ? a.imageUrls : [a.imageUrl]
          const idx = start + i
          return urls.map((url, j) => {
            const selected = pickerSelected.has(idx)
            return (
              <div
                key={`${idx}_${j}`}
                style={{ cursor: 'pointer', borderRadius: 6, overflow: 'hidden', border: selected ? '2px solid #1677FF' : '1px solid #e6e6e6', transition: 'all .2s', position: 'relative' }}
                onClick={() => setPickerSelected(prev => { 
                  const n = new Set(prev); 
                  if (n.has(idx)) n.delete(idx); 
                  else n.add(idx); 
                  return n;
                })}
              >
                <img src={url} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                {urls.length > 1 && j === 0 && (
                  <div style={{ position: 'absolute', bottom: 4, right: 4, background: 'rgba(0,0,0,.55)', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 8 }}>
                    {urls.length}张
                  </div>
                )}
              </div>
            )
          })
        })}
        {albumImages.length === 0 && (
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
