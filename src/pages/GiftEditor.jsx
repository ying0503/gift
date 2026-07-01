import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Modal, message } from 'antd'
import { API } from '../AuthContext'
import AlbumPickerModal from '../components/AlbumPickerModal'

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

  // Redirect if no auth
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
          navigate(`/gift-editor/${data.gift.id}`, { replace: true })
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

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 16px' }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 28, letterSpacing: 0.5 }}>
        {isNew ? '新建礼品' : '编辑礼品'}
      </div>

      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 8 }}>礼品图</div>
          <div style={{ display: 'grid', gridTemplateColumns: '160px 160px', gap: 8 }}>
            {imageUrls.map((url, i) => (
              <div key={i} style={{ position: 'relative', width: 160, height: 160 }}>
                <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, border: '1px solid #e6e6e6' }} />
                <div
                  onClick={() => Modal.confirm({
                    title: '删除图片',
                    content: '确定要删除这张图片吗？',
                    okText: '删除',
                    okType: 'danger',
                    cancelText: '取消',
                    onOk: () => setImageUrls(urls => urls.filter((_, j) => j !== i)),
                  })}
                  style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,.5)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 12, lineHeight: 1 }}
                >✕</div>
              </div>
            ))}
            <div style={{ width: 160, height: 160, borderRadius: 8, border: '1px dashed #d9d9d9', background: '#fafafa', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <button onClick={openAlbumPicker} style={{ padding: '6px 14px', fontSize: 12, border: '1px solid #d9d9d9', borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#555', whiteSpace: 'nowrap' }}>选择礼品图</button>
              <button onClick={uploadImage} style={{ padding: '6px 14px', fontSize: 12, border: '1px solid #d9d9d9', borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#555', whiteSpace: 'nowrap' }}>上传图片</button>
            </div>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 6 }}>礼品名称</div>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="请输入礼品名称" style={{ width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: 6, fontSize: 14, outline: 'none' }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 6 }}>礼品规格</div>
            <textarea value={spec} onChange={e => setSpec(e.target.value)} placeholder="如：礼盒装 500g" rows={4} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: 6, fontSize: 14, outline: 'none', resize: 'vertical' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 6 }}>销售价（元）</div>
              <input value={price} onChange={e => setPrice(e.target.value)} placeholder="请输入销售价" style={{ width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: 6, fontSize: 14, outline: 'none' }} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 6 }}>净含量</div>
              <input value={netContent} onChange={e => setNetContent(e.target.value)} placeholder="如：500g" style={{ width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: 6, fontSize: 14, outline: 'none' }} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 6 }}>保质期</div>
              <input value={shelfLife} onChange={e => setShelfLife(e.target.value)} placeholder="如：12个月" style={{ width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: 6, fontSize: 14, outline: 'none' }} />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 6 }}>温馨提示</div>
            <input value={tips} onChange={e => setTips(e.target.value)} placeholder="如：请置于阴凉干燥处" style={{ width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: 6, fontSize: 14, outline: 'none' }} />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ padding: '10px 32px', fontSize: 15 }}>
              {saving ? '保存中...' : '保存'}
            </button>
            <button className="btn btn-outline" onClick={() => navigate('/my-gifts')} style={{ padding: '10px 32px', fontSize: 15 }}>
              返回
            </button>
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
