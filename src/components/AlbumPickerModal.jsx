import { Modal, Checkbox } from 'antd'

export default function AlbumPickerModal({
  visible,
  onCancel,
  onOk,
  albumImages,
  pickerSelected,
  setPickerSelected,
}) {
  return (
    <Modal
      title="选择礼品图"
      open={visible}
      onCancel={onCancel}
      onOk={onOk}
      okText="确定"
      width={720}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 12, maxHeight: 460, overflow: 'auto' }}>
        {albumImages.map((a, i) => {
          const urls = a.imageUrls && a.imageUrls.length ? a.imageUrls : [a.imageUrl]
          return urls.map((url, j) => {
            const key = `${i}_${j}`
            const selected = pickerSelected.has(i)
            return (
              <div
                key={key}
                style={{ cursor: 'pointer', borderRadius: 6, overflow: 'hidden', border: selected ? '2px solid #1677FF' : '1px solid #e6e6e6', transition: 'all .2s', position: 'relative' }}
                onClick={() => setPickerSelected(prev => { 
                  const n = new Set(prev); 
                  if (n.has(i)) n.delete(i); 
                  else n.add(i); 
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
    </Modal>
  )
}
