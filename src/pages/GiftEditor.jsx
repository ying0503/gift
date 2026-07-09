import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Modal, message } from 'antd'
import { DndContext, closestCorners, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, rectSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { API } from '../AuthContext'
import AlbumPickerModal from '../components/AlbumPickerModal'

function SortableImage({ url, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: url })
  const style = {
    position: 'relative',
    width: 120,
    height: 120,
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 'auto',
  }
  if (isDragging) {
    return <div ref={setNodeRef} style={{ ...style, borderRadius: 10, border: '2px dashed #3b82f6', background: '#f0f5ff' }} {...attributes} {...listeners} />
  }
  return (
    <div ref={setNodeRef} style={style} className="gift-img-wrap" {...attributes} {...listeners}>
      <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10, border: '1px solid #f0f0f0', cursor: 'grab' }} />
      <div className="gift-img-del"
        onClick={e => { e.stopPropagation(); Modal.confirm({ title: '删除图片', content: '确定要删除这张图片吗？', okText: '删除', okType: 'danger', cancelText: '取消', onOk: onDelete }) }}
      >✕</div>
    </div>
  )
}

export default function GiftEditor() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()
  const isNew = id === 'new'

  const initialImages = location.state?.images || []

  const [name, setName] = useState('')
  const [spec, setSpec] = useState('')
  const [price, setPrice] = useState('')
  const [netContent, setNetContent] = useState('')
  const [shelfLife, setShelfLife] = useState('')
  const [tips, setTips] = useState('')
  const [imageUrls, setImageUrls] = useState([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(!isNew)
  const [showAlbumPicker, setShowAlbumPicker] = useState(false)
  const [albumImages, setAlbumImages] = useState([])
  const [pickerSelected, setPickerSelected] = useState(new Set())
  const [dragActiveId, setDragActiveId] = useState(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragStart = ({ active }) => setDragActiveId(active.id)

  const handleDragEnd = ({ active, over }) => {
    setDragActiveId(null)
    if (!over || active.id === over.id) return
    const oldIdx = imageUrls.indexOf(active.id)
    const newIdx = imageUrls.indexOf(over.id)
    if (oldIdx === -1 || newIdx === -1) return
    setImageUrls(urls => arrayMove(urls, oldIdx, newIdx))
  }

  const handleDragCancel = () => setDragActiveId(null)

  useEffect(() => {
    if (initialImages.length > 0) {
      setImageUrls(initialImages)
    }
  }, [])

  useEffect(() => {
    if (!isNew && id) {
      const token = localStorage.getItem('token')
      fetch(`${API}/api/gifts/${id}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => {
          if (data.gift) {
            const g = data.gift
            setName(g.name || '')
            setSpec(g.spec || '')
            setPrice(g.price || '')
            setNetContent(g.netContent || '')
            setShelfLife(g.shelfLife || '')
            setTips(g.tips || '')
            setImageUrls(g.imageUrls || [])
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [id, isNew])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) navigate('/')
  }, [navigate])

  const uploadImage = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const file = input.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64 = e.target.result
        const token = localStorage.getItem('token')
        try {
          const res = await fetch(`${API}/api/upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ image: base64 }),
          })
          const data = await res.json()
          if (data.url) {
            const newUrls = [...imageUrls]
            newUrls.push(data.url)
            setImageUrls(newUrls)
          }
        } catch (err) {
          message.error('上传失败')
        }
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }

  const openAlbumPicker = () => {
    const token = localStorage.getItem('token')
    setPickerSelected(new Set())
    fetch(`${API}/api/albums`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.albums) setAlbumImages(data.albums.filter(a => a.imageUrl).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)))
        setShowAlbumPicker(true)
      })
      .catch(() => {})
  }

  const confirmAlbumPick = () => {
    const newUrls = [...imageUrls]
    albumImages.filter((_, i) => pickerSelected.has(i)).forEach(a => {
      const urls = a.imageUrls && a.imageUrls.length ? a.imageUrls : [a.imageUrl]
      urls.forEach(u => { if (!newUrls.includes(u)) newUrls.push(u) })
    })
    setImageUrls(newUrls)
    setShowAlbumPicker(false)
  }

  const handleSave = async () => {
    if (!name.trim()) {
      message.error('请输入礼品名称')
      return
    }
    if (imageUrls.length === 0) {
      message.error('请至少添加一张礼品图')
      return
    }
    const token = localStorage.getItem('token')
    if (!token) return
    setSaving(true)
    try {
      const body = {
        name,
        spec,
        price,
        netContent,
        shelfLife,
        tips,
        imageUrls,
        firstImageUrl: imageUrls[0] || '',
      }
      if (isNew) {
        const res = await fetch(`${API}/api/gifts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || '保存失败')
        if (data.gift) {
          message.success('保存成功')
          navigate('/my-gifts', { replace: true })
        }
      } else {
        const res = await fetch(`${API}/api/gifts/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || '保存失败')
        message.success('保存成功')
        navigate('/my-gifts', { replace: true })
      }
    } catch (err) {
      message.error(err.message || '保存失败')
    }
    setSaving(false)
  }

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div className="loading-spinner" />
    </div>
  }

  const inputStyle = {
    flex: 1,
    padding: '9px 12px',
    border: '1px solid #d9d9d9',
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
    transition: 'border-color .2s, box-shadow .2s',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '16px 16px 64px' }}>
      <div style={{
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04)',
        padding: 24,
      }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginBottom: 20, letterSpacing: 0.5 }}>
          {isNew ? '新建礼品' : '编辑礼品'}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 80, fontSize: 14, fontWeight: 500, color: '#475569', textAlign: 'right', whiteSpace: 'nowrap', marginTop: 4 }}>礼品图<span style={{ color: '#ff4d4f', marginLeft: 2 }}>*</span></div>
            <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
                <SortableContext items={imageUrls} strategy={rectSortingStrategy}>
                  {imageUrls.map((url, i) => (
                    <SortableImage key={url} url={url} index={i} onDelete={() => setImageUrls(urls => urls.filter((_, j) => j !== i))} />
                  ))}
                </SortableContext>
                <DragOverlay dropAnimation={null}>
                  {dragActiveId ? <div style={{ width: 120, height: 120, borderRadius: 10, border: '1px solid #f0f0f0', boxShadow: '0 8px 24px rgba(0,0,0,.18)', overflow: 'hidden' }}><img src={dragActiveId} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /></div> : null}
                </DragOverlay>
              </DndContext>
              <div style={{ width: 120, height: 120, borderRadius: 10, border: '1px dashed #d9d9d9', background: '#fafafa', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'border-color .2s, background .2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#f0f5ff' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#d9d9d9'; e.currentTarget.style.background = '#fafafa' }}
              >
                <button onClick={openAlbumPicker} style={{ padding: '6px 12px', fontSize: 13, border: '1px solid #d9d9d9', borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#555', whiteSpace: 'nowrap', width: 100 }}>选择礼品图</button>
                <button onClick={uploadImage} style={{ padding: '6px 12px', fontSize: 13, border: '1px solid #d9d9d9', borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#555', whiteSpace: 'nowrap', width: 100 }}>上传图片</button>
              </div>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 80, fontSize: 14, fontWeight: 500, color: '#475569', textAlign: 'right', whiteSpace: 'nowrap' }}>礼品名称<span style={{ color: '#ff4d4f', marginLeft: 2 }}>*</span></div>
              <input
                value={name} onChange={e => setName(e.target.value)}
                placeholder="请输入礼品名称"
                style={{ ...inputStyle }}
                onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 2px rgba(59,130,246,.15)' }}
                onBlur={e => { e.target.style.borderColor = '#d9d9d9'; e.target.style.boxShadow = 'none' }}
              />
            </div>
            <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 80, fontSize: 14, fontWeight: 500, color: '#475569', textAlign: 'right', whiteSpace: 'nowrap', marginTop: 4 }}>礼品规格</div>
              <textarea
                value={spec} onChange={e => setSpec(e.target.value)}
                placeholder="如：礼盒装 500g" rows={4}
                style={{ ...inputStyle, resize: 'vertical' }}
                onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 2px rgba(59,130,246,.15)' }}
                onBlur={e => { e.target.style.borderColor = '#d9d9d9'; e.target.style.boxShadow = 'none' }}
              />
            </div>
            <div style={{ marginBottom: 20, display: 'flex', gap: 16 }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 80, fontSize: 14, fontWeight: 500, color: '#475569', textAlign: 'right', whiteSpace: 'nowrap' }}>销售价</div>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    value={price} onChange={e => setPrice(e.target.value)}
                    placeholder="请输入"
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #d9d9d9', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', transition: 'border-color .2s, box-shadow .2s' }}
                    onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 2px rgba(59,130,246,.15)' }}
                    onBlur={e => { e.target.style.borderColor = '#d9d9d9'; e.target.style.boxShadow = 'none' }}
                  />
                  <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#94a3b8', pointerEvents: 'none' }}>（元）</span>
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 80, fontSize: 14, fontWeight: 500, color: '#475569', textAlign: 'right', whiteSpace: 'nowrap' }}>净含量</div>
                <div style={{ flex: 1 }}>
                  <input
                    value={netContent} onChange={e => setNetContent(e.target.value)}
                    placeholder="请输入"
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #d9d9d9', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', transition: 'border-color .2s, box-shadow .2s' }}
                    onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 2px rgba(59,130,246,.15)' }}
                    onBlur={e => { e.target.style.borderColor = '#d9d9d9'; e.target.style.boxShadow = 'none' }}
                  />
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 80, fontSize: 14, fontWeight: 500, color: '#475569', textAlign: 'right', whiteSpace: 'nowrap' }}>保质期</div>
                <div style={{ flex: 1 }}>
                  <input
                    value={shelfLife} onChange={e => setShelfLife(e.target.value)}
                    placeholder="请输入"
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #d9d9d9', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', transition: 'border-color .2s, box-shadow .2s' }}
                    onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 2px rgba(59,130,246,.15)' }}
                    onBlur={e => { e.target.style.borderColor = '#d9d9d9'; e.target.style.boxShadow = 'none' }}
                  />
                </div>
              </div>
            </div>
            <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 80, fontSize: 14, fontWeight: 500, color: '#475569', textAlign: 'right', whiteSpace: 'nowrap' }}>温馨提示</div>
              <input
                value={tips} onChange={e => setTips(e.target.value)}
                placeholder="如：请置于阴凉干燥处"
                style={{ ...inputStyle }}
                onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 2px rgba(59,130,246,.15)' }}
                onBlur={e => { e.target.style.borderColor = '#d9d9d9'; e.target.style.boxShadow = 'none' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 12, paddingTop: 24, borderTop: '1px solid #f1f5f9' }}>
              <div style={{ width: 80 }} />
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
                style={{ padding: '10px 36px', fontSize: 15, fontWeight: 600, borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? .6 : 1 }}
              >
                {saving ? '保存中...' : '保存'}
              </button>
              <button
                className="btn btn-outline"
                onClick={() => navigate('/my-gifts')}
                style={{ padding: '10px 36px', fontSize: 15, borderRadius: 8, cursor: 'pointer' }}
              >
                返回
              </button>
            </div>
          </div>
        </div>
      </div>

       <AlbumPickerModal
         visible={showAlbumPicker}
         onCancel={() => setShowAlbumPicker(false)}
         onOk={confirmAlbumPick}
         albumImages={albumImages}
         pickerSelected={pickerSelected}
         setPickerSelected={setPickerSelected}
       />
    </div>)
}
