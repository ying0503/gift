import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import WorkbenchSidebar from '../components/WorkbenchSidebar'
import AlbumPickerModal from '../components/AlbumPickerModal'

const UploadZone = ({ img, setImg, inputRef, buttons }) => (
  <>
    <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) setImg(f); e.target.value = '' }} />
    <div style={{ width: '100%', height: 184, borderRadius: 10, border: '1px dashed #D3D3D3', background: 'rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {img ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0, overflow: 'hidden', borderRadius: 10 }}>
          <img src={URL.createObjectURL(img)} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', background: 'rgba(0,0,0,0.02)' }} />
          <div onClick={e => { e.stopPropagation(); setImg(null) }} style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.35)', color: '#fff', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2 }}>&#10005;</div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 27 }}>
          {buttons?.map((btn, i) => (
            <div key={i} onClick={btn.onClick} style={{
              width: 96, height: 36, padding: '0 16px', fontSize: 14, borderRadius: 10,
              background: 'rgba(0,0,0,0.04)', cursor: 'pointer', color: '#333',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background .2s, color .2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(123,82,255,0.1)'; e.currentTarget.style.color = '#7B52FF' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; e.currentTarget.style.color = '#333' }}
            >{btn.label}</div>
          ))}
        </div>
      )}
    </div>
  </>
)

export default function AIPoster() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [productImg, setProductImg] = useState(null)
  const [styleImg, setStyleImg] = useState(null)
  const [specs, setSpecs] = useState('')
  const [price, setPrice] = useState('')
  const [netContent, setNetContent] = useState('')
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState(null)
  const productRef = useRef(null)
  const styleRef = useRef(null)
  const [showPicker, setShowPicker] = useState(false)
  const [pickerType, setPickerType] = useState('')
  const [pickerSelected, setPickerSelected] = useState(new Set())
  const [albumList, setAlbumList] = useState([])
  const [giftList, setGiftList] = useState([])

  useEffect(() => {
    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }
    fetch('http://localhost:3000/api/albums', { headers })
      .then(r => r.json())
      .then(d => setAlbumList((d.albums || []).filter(a => a.imageUrl).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))))
      .catch(() => {})
    fetch('http://localhost:3000/api/gifts', { headers })
      .then(r => r.json())
      .then(d => setGiftList(d.gifts || []))
      .catch(() => {})
  }, [])

  const handleGenerate = async () => {
    if (!name.trim()) return
    setGenerating(true)
    setResult(null)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://localhost:3000/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          prompt: `制作一张关于"${name}"的礼品海报，规格：${specs}，零售价：${price}，净含量：${netContent}`,
          size: '1024x1792',
        }),
      })
      const data = await res.json()
      if (data.success) setResult(data)
      else setResult({ error: data.error || '生成失败' })
    } catch {
      setResult({ error: '网络错误' })
    } finally {
      setGenerating(false)
    }
  }

  const openPicker = (type) => {
    setPickerType(type)
    setPickerSelected(new Set())
    setShowPicker(true)
  }

  const confirmPicker = () => {
    if (pickerSelected.size === 0) return
    const idx = [...pickerSelected][0]
    if (pickerType === 'product') {
      const gift = giftList[idx]
      const url = gift.imageUrls?.[0] || gift.firstImageUrl
      if (url) {
        fetch(url).then(r => r.blob()).then(b => setProductImg(new File([b], 'product.jpg', { type: b.type }))).catch(() => {})
      }
    } else if (pickerType === 'template') {
      const album = albumList[idx]
      const url = album.imageUrls?.[0] || album.imageUrl
      if (url) {
        fetch(url).then(r => r.blob()).then(b => setStyleImg(new File([b], 'template.jpg', { type: b.type }))).catch(() => {})
      }
    }
    setShowPicker(false)
  }

  return (
    <><div style={{ display: 'flex', minHeight: '100vh', background: '#fff' }}>
      <WorkbenchSidebar />
      <div style={{ flex: 1, minWidth: 0, overflow: 'auto', padding: '40px 40px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 48 }}>
        <div style={{ width: 18, height: 18, borderRadius: 3, background: 'linear-gradient(0deg, #72D2FF, #7B52FF)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" style={{ display: 'block' }}><path d="M13.3333 16H2.66667C1.17333 16 0 14.8267 0 13.3333V2.66667C0 1.17333 1.17333 0 2.66667 0H13.3333C14.8267 0 16 1.17333 16 2.66667V13.3333C16 14.8267 14.8267 16 13.3333 16ZM2.66667 1.06667C1.76 1.06667 1.06667 1.76 1.06667 2.66667V13.3333C1.06667 14.24 1.76 14.9333 2.66667 14.9333H13.3333C14.24 14.9333 14.9333 14.24 14.9333 13.3333V2.66667C14.9333 1.76 14.24 1.06667 13.3333 1.06667H2.66667Z" fill="white"/><path d="M4 5.49331C4 5.62639 4.02621 5.75816 4.07714 5.8811C4.12806 6.00404 4.2027 6.11575 4.2968 6.20985C4.39089 6.30395 4.5026 6.37859 4.62555 6.42951C4.74849 6.48044 4.88026 6.50665 5.01333 6.50665C5.14641 6.50665 5.27818 6.48044 5.40112 6.42951C5.52406 6.37859 5.63577 6.30395 5.72987 6.20985C5.82397 6.11575 5.89861 6.00404 5.94953 5.8811C6.00046 5.75816 6.02667 5.62639 6.02667 5.49331C6.02667 5.36024 6.00046 5.22847 5.94953 5.10553C5.89861 4.98258 5.82397 4.87088 5.72987 4.77678C5.63577 4.68268 5.52406 4.60804 5.40112 4.55712C5.27818 4.50619 5.14641 4.47998 5.01333 4.47998C4.88026 4.47998 4.74849 4.50619 4.62555 4.55712C4.5026 4.60804 4.39089 4.68268 4.2968 4.77678C4.2027 4.87088 4.12806 4.98258 4.07714 5.10553C4.02621 5.22847 4 5.36024 4 5.49331Z" fill="white"/><path d="M3.46671 13.3866L2.50671 12.96L2.72005 12.48C3.84005 9.86665 5.65338 8.53331 8.05338 8.37331C10.08 8.26665 11.5734 7.67998 12.48 6.61331L12.8534 6.18665L13.6534 6.87998L13.28 7.30665C12.16 8.58665 10.4 9.33331 8.10671 9.43998C6.13338 9.54665 4.69338 10.6666 3.73338 12.9066L3.46671 13.3866Z" fill="white"/></svg>
        </div>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#000' }}>AI 海报</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 3fr 4fr', gap: 30, maxWidth: 1400 }}>
        {/* ========== COL 1: Upload Zone ========== */}
        <div>
          <div style={{ fontSize: 14, color: '#000', marginBottom: 10 }}>上传产品图</div>
          <UploadZone img={productImg} setImg={setProductImg} inputRef={productRef} buttons={[
            { label: '选择商品', onClick: () => openPicker('product') },
            { label: '上传图片', onClick: () => productRef.current?.click() },
          ]} />

          <div style={{ fontSize: 14, color: '#000', marginBottom: 10, marginTop: 32 }}>参考风格图</div>
          <UploadZone img={styleImg} setImg={setStyleImg} inputRef={styleRef} buttons={[
            { label: '选择模板', onClick: () => openPicker('template') },
            { label: '上传模板', onClick: () => styleRef.current?.click() },
          ]} />
        </div>

        {/* ========== COL 2: Form ========== */}
        <div>
          <div style={{ fontSize: 14, color: '#000', marginBottom: 10 }}>名称</div>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="输入海报名称"
            style={{ height: 42, padding: '0 14px', fontSize: 14, border: '1px solid #D3D3D3', borderRadius: 8, background: 'rgba(0,0,0,0.02)', outline: 'none', color: '#000', width: '100%', boxSizing: 'border-box', marginBottom: 24 }}
          />

          <div style={{ fontSize: 14, color: '#000', marginBottom: 10 }}>规格（内配）</div>
          <textarea value={specs} onChange={e => setSpecs(e.target.value)} placeholder="例如：500g×2 瓶"
            style={{ height: 80, padding: '10px 14px', fontSize: 14, border: '1px solid #D3D3D3', borderRadius: 8, background: 'rgba(0,0,0,0.02)', outline: 'none', color: '#000', width: '100%', boxSizing: 'border-box', resize: 'none', marginBottom: 24 }}
          />

          <div style={{ fontSize: 14, color: '#000', marginBottom: 10 }}>零售价</div>
          <input value={price} onChange={e => setPrice(e.target.value)} placeholder="¥ 0.00"
            style={{ height: 42, padding: '0 14px', fontSize: 14, border: '1px solid #D3D3D3', borderRadius: 8, background: 'rgba(0,0,0,0.02)', outline: 'none', color: '#000', width: '100%', boxSizing: 'border-box', marginBottom: 24 }}
          />

          <div style={{ fontSize: 14, color: '#000', marginBottom: 10 }}>净含量</div>
          <input value={netContent} onChange={e => setNetContent(e.target.value)} placeholder="例如：1000g"
            style={{ height: 42, padding: '0 14px', fontSize: 14, border: '1px solid #D3D3D3', borderRadius: 8, background: 'rgba(0,0,0,0.02)', outline: 'none', color: '#000', width: '100%', boxSizing: 'border-box', marginBottom: 32 }}
          />

          <button onClick={handleGenerate} disabled={!name.trim() || generating}
            style={{
              height: 48, fontSize: 15, fontWeight: 500, width: '100%', border: 'none', borderRadius: 10,
              background: !name.trim() || generating ? '#ccc' : 'linear-gradient(90deg, #7B52FF, #72D2FF)',
              color: '#fff', cursor: !name.trim() || generating ? 'not-allowed' : 'pointer',
              boxShadow: !name.trim() || generating ? 'none' : '0 4px 20px rgba(123,82,255,.25)',
              opacity: !name.trim() || generating ? 0.5 : 1,
              transition: 'all .3s',
            }}
            onMouseEnter={e => { if (name.trim() && !generating) { e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = '0 8px 28px rgba(123,82,255,.35)' } }}
            onMouseLeave={e => { if (name.trim() && !generating) { e.target.style.transform = 'none'; e.target.style.boxShadow = '0 4px 20px rgba(123,82,255,.25)' } }}
          >{generating ? '生成中…' : '生成海报'}</button>
        </div>

        {/* ========== COL 3: Results ========== */}
        <div>
          <div style={{ fontSize: 14, color: '#000', marginBottom: 10 }}>生成结果</div>
          <div style={{ border: '1px dashed #D3D3D3', borderRadius: 10, background: 'rgba(0,0,0,0.02)', minHeight: 380, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {generating ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <div className="loading-spinner" />
                <span style={{ fontSize: 14, color: '#888' }}>AI 生成中…</span>
              </div>
            ) : result?.imageUrl ? (
              <img src={result.imageUrl} alt="海报" style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8, objectFit: 'contain' }} />
            ) : result?.error ? (
              <div style={{ color: '#FF4D4F', fontSize: 13 }}>{result.error}</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 56, height: 56, borderRadius: 10, background: 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><g clipPath="url(#resClip)"><path d="M13.3333 16H2.66667C1.17333 16 0 14.8267 0 13.3333V2.66667C0 1.17333 1.17333 0 2.66667 0H13.3333C14.8267 0 16 1.17333 16 2.66667V13.3333C16 14.8267 14.8267 16 13.3333 16ZM2.66667 1.06667C1.76 1.06667 1.06667 1.76 1.06667 2.66667V13.3333C1.06667 14.24 1.76 14.9333 2.66667 14.9333H13.3333C14.24 14.9333 14.9333 14.24 14.9333 13.3333V2.66667C14.9333 1.76 14.24 1.06667 13.3333 1.06667H2.66667Z" fill="#666"/><path d="M4 5.49331C4 5.62639 4.02621 5.75816 4.07714 5.8811C4.12806 6.00404 4.2027 6.11575 4.2968 6.20985C4.39089 6.30395 4.5026 6.37859 4.62555 6.42951C4.74849 6.48044 4.88026 6.50665 5.01333 6.50665C5.14641 6.50665 5.27818 6.48044 5.40112 6.42951C5.52406 6.37859 5.63577 6.30395 5.72987 6.20985C5.82397 6.11575 5.89861 6.00404 5.94953 5.8811C6.00046 5.75816 6.02667 5.62639 6.02667 5.49331C6.02667 5.36024 6.00046 5.22847 5.94953 5.10553C5.89861 4.98258 5.82397 4.87088 5.72987 4.77678C5.63577 4.68268 5.52406 4.60804 5.40112 4.55712C5.27818 4.50619 5.14641 4.47998 5.01333 4.47998C4.88026 4.47998 4.74849 4.50619 4.62555 4.55712C4.5026 4.60804 4.39089 4.68268 4.2968 4.77678C4.2027 4.87088 4.12806 4.98258 4.07714 5.10553C4.02621 5.22847 4 5.36024 4 5.49331Z" fill="#666"/><path d="M3.46667 13.3866L2.50667 12.96L2.72 12.48C3.84 9.86665 5.65333 8.53331 8.05333 8.37331C10.08 8.26665 11.5733 7.67998 12.48 6.61331L12.8533 6.18665L13.6533 6.87998L13.28 7.30665C12.16 8.58665 10.4 9.33331 8.10667 9.43998C6.13333 9.54665 4.69333 10.6666 3.73333 12.9066L3.46667 13.3866Z" fill="#666"/></g><defs><clipPath id="resClip"><rect width="16" height="16" fill="white"/></clipPath></defs></svg>
                </div>
                <span style={{ fontSize: 14, color: '#ACACAC' }}>暂无生成结果</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </div>

      <AlbumPickerModal
        visible={showPicker}
        onCancel={() => setShowPicker(false)}
        onOk={confirmPicker}
        title={pickerType === 'product' ? '选择商品' : '选择模板'}
        items={pickerType === 'product'
          ? giftList.map(g => ({ imageUrls: g.imageUrls || [], name: g.name }))
          : albumList.map(a => ({ imageUrls: a.imageUrls || (a.imageUrl ? [a.imageUrl] : []), imageUrl: a.imageUrl || '' }))
        }
        pickerSelected={pickerSelected}
        setPickerSelected={setPickerSelected}
      />
  </>)
}
