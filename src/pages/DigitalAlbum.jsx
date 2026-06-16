import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { EditOutlined, CloseOutlined, CheckOutlined, ArrowLeftOutlined, ReloadOutlined, PlusOutlined } from '@ant-design/icons'
import { API } from '../AuthContext'

export default function DigitalAlbum() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState([])
  const [albums, setAlbums] = useState([])
  const [selectedCat, setSelectedCat] = useState(null)
  const [selectedItem, setSelectedItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expandedCats, setExpandedCats] = useState(new Set())
  const [editing, setEditing] = useState(null)
  const [editValue, setEditValue] = useState('')
  const editInputRef = useRef(null)
  const [showPicker, setShowPicker] = useState(false)
  const [picked, setPicked] = useState(new Set())
  const [pendingType, setPendingType] = useState(null)
  const [viewAlbum, setViewAlbum] = useState(null)
  const [editingParams, setEditingParams] = useState(null)
  const [comboPickerOpen, setComboPickerOpen] = useState(false)
  const [comboPicked, setComboPicked] = useState(new Set())
  const [editingProductNameId, setEditingProductNameId] = useState(null)
  const [generatingBanner, setGeneratingBanner] = useState(false)
  const [hoverBanner, setHoverBanner] = useState(false)
  const [bannerError, setBannerError] = useState(null)
  const [pickerPage, setPickerPage] = useState(0)
  const [globalBannerUrl, setGlobalBannerUrl] = useState(null)
  const [globalBannerProgress, setGlobalBannerProgress] = useState(0)
  const [globalBannerError, setGlobalBannerError] = useState(null)
  const [festival, setFestival] = useState('')
  const [festivalPrompt, setFestivalPrompt] = useState('')
  const [generatingPrompt, setGeneratingPrompt] = useState(false)
  const [generatingGlobalBanner, setGeneratingGlobalBanner] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const fileInputRef = useRef(null)
  const festivals = ['春节', '元宵节', '端午节', '中秋节', '情人节', '圣诞节', '国庆节', '新年', '母亲节', '父亲节', '教师节', '七夕节', '万圣节', '感恩节']

  const { catId: urlCatId, itemId: urlItemId, albumId: urlAlbumId } = useParams()
  const initialUrlSync = useRef(false)

  useEffect(() => {
    if (loading || initialUrlSync.current) return
    initialUrlSync.current = true
    if (urlCatId) {
      if (!categories.some(c => c.id === urlCatId)) { navigate('/digital-album', { replace: true }); return }
      setSelectedCat(urlCatId)
      setExpandedCats(s => new Set(s).add(urlCatId))
    }
    if (urlItemId) {
      const cat = categories.find(c => c.id === urlCatId)
      if (!cat?.items.some(i => i.id === urlItemId)) { navigate(urlCatId ? `/digital-album/${urlCatId}` : '/digital-album', { replace: true }); return }
      setSelectedItem(urlItemId)
    }
    if (urlAlbumId) {
      for (const c of categories) {
        for (const i of c.items) {
          const a = i.albums?.find(alb => alb.albumId === urlAlbumId)
          if (a) { setViewAlbum(a); return }
        }
      }
    }
  }, [loading])

  useEffect(() => {
    if (loading || !initialUrlSync.current) return
    if (urlCatId) {
      if (!categories.some(c => c.id === urlCatId)) { navigate('/digital-album', { replace: true }); return }
      setSelectedCat(urlCatId)
      setExpandedCats(s => new Set(s).add(urlCatId))
    } else {
      setSelectedCat(null)
      setSelectedItem(null)
      setViewAlbum(null)
    }
    if (urlItemId) {
      const cat = categories.find(c => c.id === urlCatId)
      if (!cat?.items.some(i => i.id === urlItemId)) { navigate(urlCatId ? `/digital-album/${urlCatId}` : '/digital-album', { replace: true }); return }
      setSelectedItem(urlItemId)
    } else if (!urlItemId && !urlCatId) {
      setSelectedItem(null)
      setViewAlbum(null)
    }
    if (urlAlbumId) {
      for (const c of categories) {
        for (const i of c.items) {
          const a = i.albums?.find(alb => alb.albumId === urlAlbumId)
          if (a) { setViewAlbum(a); return }
        }
      }
    } else if (!urlAlbumId) {
      setViewAlbum(null)
    }
  }, [urlCatId, urlItemId, urlAlbumId, loading])

  const albumMap = useMemo(() => {
    const m = {}
    for (const a of albums) m[a.id] = a
    return m
  }, [albums])

  const allAlbums = useMemo(() => {
    const result = []
    for (const c of categories) {
      for (const i of c.items) {
        for (const a of i.albums || []) {
          result.push({ ...a, _catId: c.id, _itemId: i.id, _catName: c.name, _itemName: i.name })
        }
      }
    }
    return result
  }, [categories])

  function getImageUrls(a) {
    const fresh = albumMap[a.albumId]
    return fresh?.imageUrls || a.imageUrls || [a.imageUrl]
  }

  function getCoverUrl(a) {
    if (a.type === '组合' && a.comboItems?.[0]) {
      const first = a.comboItems[0]
      const fresh = albumMap[first.albumId]
      return fresh?.imageUrls?.[0] || fresh?.imageUrl || first.imageUrls?.[0] || first.imageUrl
    }
    return getImageUrls(a)[0]
  }

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    Promise.all([
      fetch(`${API}/api/digital-album`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API}/api/albums`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([da, al]) => {
      if (da.categories) {
        const cats = da.categories.map(c => ({ ...c, items: c.items.map(i => ({ ...i, albums: i.albums || [] })) }))
        setCategories(cats)
      }
      if (da.bannerUrl) setGlobalBannerUrl(da.bannerUrl)
      if (al.albums) setAlbums(al.albums)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!festival) { setFestivalPrompt(''); return }
    const token = localStorage.getItem('token')
    if (!token) return
    setGeneratingPrompt(true)
    fetch(`${API}/api/generate/prompts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ festival, count: 1 }),
    }).then(r => r.json()).then(data => {
      if (data.prompts?.length) setFestivalPrompt(data.prompts[0])
      else setFestivalPrompt('')
    }).catch(() => {}).finally(() => setGeneratingPrompt(false))
  }, [festival])

  const save = useCallback(async (cats, bannerUrl) => {
    const token = localStorage.getItem('token')
    if (!token) return
    setCategories(cats)
    if (bannerUrl !== undefined) setGlobalBannerUrl(bannerUrl)
    await fetch(`${API}/api/digital-album`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ categories: cats, bannerUrl: bannerUrl !== undefined ? bannerUrl : globalBannerUrl }),
    })
  }, [globalBannerUrl])

  const saveGlobalBannerUrl = (url) => {
    const token = localStorage.getItem('token')
    if (!token) return
    setGlobalBannerUrl(url)
    fetch(`${API}/api/digital-album`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ categories, bannerUrl: url }),
    }).then(() => {
      fetch(`${API}/api/album/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})
    }).catch(() => {})
  }

  const handleUploadBanner = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { alert('请上传图片文件'); return }
    if (file.size > 10 * 1024 * 1024) { alert('图片不能超过10MB'); return }
    const token = localStorage.getItem('token')
    if (!token) return
    setUploadingBanner(true)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target.result
      fetch(API + '/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ image: dataUrl }),
      }).then(r => r.json()).then(data => {
        if (data.url) {
          setGlobalBannerUrl(data.url)
        } else {
          alert(data.error || '上传失败')
        }
      }).catch(() => alert('上传失败，请重试')).finally(() => setUploadingBanner(false))
    }
    reader.onerror = () => { alert('读取文件失败'); setUploadingBanner(false) }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const generateGlobalBanner = () => {
    const token = localStorage.getItem('token')
    if (!token) return
    const prompt = festivalPrompt || `生成一个${festival || '节日'}的banner，喜庆、大气`
    setGeneratingGlobalBanner(true)
    setGlobalBannerProgress(0)
    setGlobalBannerError(null)

    fetch(`${API}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        config: {
          model: 'maiziai-chatgpt-image-2',
          prompt,
          size: '16:9',
        },
      }),
    }).then(r => r.json()).then(data => {
      if (!data.taskId) {
        setGlobalBannerError(data.error || '生成失败')
        setGeneratingGlobalBanner(false)
        return
      }
      const poll = () => {
        fetch(`${API}/api/generate/status?taskId=${data.taskId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.json()).then(status => {
          if (status.imageUrl) {
            setGlobalBannerProgress(100)
            setTimeout(() => {
              saveGlobalBannerUrl(status.imageUrl)
              setGeneratingGlobalBanner(false)
            }, 300)
          } else if (status.taskStatus === 'SUCCEEDED') {
            setGlobalBannerProgress(100)
            setTimeout(() => {
              saveGlobalBannerUrl(status.imageUrl)
              setGeneratingGlobalBanner(false)
            }, 300)
          } else if (status.taskStatus === 'FAILED') {
            setGlobalBannerError(status.statusText || '生成失败')
            setGeneratingGlobalBanner(false)
          } else {
            setTimeout(poll, 500)
          }
        }).catch(() => setTimeout(poll, 500))
      }
      setTimeout(poll, 500)
    }).catch(err => {
      setGlobalBannerError(err.message || '网络错误')
      setGeneratingGlobalBanner(false)
    })
  }

  const startEdit = useCallback((id, currentName) => {
    setEditing(id)
    setEditValue(currentName)
    setTimeout(() => editInputRef.current?.focus(), 50)
  }, [])

  const confirmEdit = useCallback(() => {
    if (!editing || !editValue.trim()) { setEditing(null); return }
    const trimmed = editValue.trim()
    save(categories.map(c => {
      if (c.id === editing) return { ...c, name: trimmed }
      return { ...c, items: c.items.map(i => i.id === editing ? { ...i, name: trimmed } : i) }
    }))
    setEditing(null)
  }, [editing, editValue, categories, save])

  const addCategory = useCallback(() => {
    const id = crypto.randomUUID()
    save([...categories, { id, name: '新分类', items: [] }])
    setExpandedCats(s => new Set(s).add(id))
    setTimeout(() => startEdit(id, '新分类'), 50)
  }, [categories, save, startEdit])

  const deleteCategory = useCallback((id) => {
    const cat = categories.find(c => c.id === id)
    const total = cat?.items.reduce((sum, i) => sum + (i.albums || []).length, 0) || 0
    if (total > 0) { alert('该分类下还有画册，无法删除'); return }
    save(categories.filter(c => c.id !== id))
    if (selectedCat === id) { setSelectedCat(null); setSelectedItem(null); navigate('/digital-album') }
  }, [categories, save, selectedCat, navigate])

  const addItem = useCallback((catId) => {
    const id = crypto.randomUUID()
    save(categories.map(c => c.id === catId ? { ...c, items: [...c.items, { id, name: '新页面', albums: [] }] } : c))
    setExpandedCats(s => new Set(s).add(catId))
    setTimeout(() => startEdit(id, '新页面'), 50)
  }, [categories, save, startEdit])

  const deleteItem = useCallback((catId, itemId) => {
    const item = categories.find(c => c.id === catId)?.items.find(i => i.id === itemId)
    if (item && (item.albums || []).length > 0) { alert('该页面下还有画册，无法删除'); return }
    save(categories.map(c => c.id === catId ? { ...c, items: c.items.filter(i => i.id !== itemId) } : c))
    if (selectedItem === itemId) { setSelectedItem(null); navigate(`/digital-album/${catId}`) }
  }, [categories, save, selectedItem, navigate])

  const removeAlbum = useCallback((catId, itemId, albumId) => {
    save(categories.map(c => c.id === catId ? { ...c, items: c.items.map(i => i.id === itemId ? { ...i, albums: i.albums.filter(a => a.albumId !== albumId) } : i) } : c))
  }, [categories, save])

  const removeComboItem = useCallback((catId, itemId, albumId, itemAlbumId) => {
    const newCats = categories.map(c => c.id === catId ? {
      ...c, items: c.items.map(i => i.id === itemId ? {
        ...i, albums: i.albums.map(a => a.albumId === albumId ? {
          ...a, comboItems: (a.comboItems || []).filter(item => item.albumId !== itemAlbumId)
        } : a)
      } : i)
    } : c)
    save(newCats)
    const cat = newCats.find(c => c.id === catId)
    const item = cat?.items.find(i => i.id === itemId)
    const updated = item?.albums.find(a => a.albumId === albumId)
    if (updated) setViewAlbum(updated)
  }, [categories, save])

  const updateAlbumBanner = useCallback((catId, itemId, albumId, bannerUrl) => {
    const newCats = categories.map(c => c.id === catId ? {
      ...c, items: c.items.map(i => i.id === itemId ? {
        ...i, albums: i.albums.map(a => a.albumId === albumId ? { ...a, bannerUrl } : a)
      } : i)
    } : c)
    save(newCats)
    const cat = newCats.find(c => c.id === catId)
    const item = cat?.items.find(i => i.id === itemId)
    const updated = item?.albums.find(a => a.albumId === albumId)
    if (updated) setViewAlbum(updated)
  }, [categories, save])

  const updateProductParams = useCallback((catId, itemId, albumId, field, value) => {
    const newCats = categories.map(c => c.id === catId ? {
      ...c, items: c.items.map(i => i.id === itemId ? {
        ...i, albums: i.albums.map(a => a.albumId === albumId ? {
          ...a, productParams: { ...(a.productParams || { spec: '', shelfLife: '', totalWeight: '', note: '' }), [field]: value }
        } : a)
      } : i)
    } : c)
    save(newCats)
    const cat = newCats.find(c => c.id === catId)
    const item = cat?.items.find(i => i.id === itemId)
    const updated = item?.albums.find(a => a.albumId === albumId)
    if (updated) setViewAlbum(updated)
  }, [categories, save])

  const updateProductName = useCallback((catId, itemId, albumId, name) => {
    save(categories.map(c => c.id === catId ? {
      ...c, items: c.items.map(i => i.id === itemId ? {
        ...i, albums: i.albums.map(a => a.albumId === albumId ? { ...a, productName: name } : a)
      } : i)
    } : c))
  }, [categories, save])

  const openPicker = useCallback((type) => {
    setPicked(new Set())
    setPendingType(type)
    setPickerPage(0)
    setShowPicker(true)
  }, [])

  const confirmPick = useCallback(() => {
    const catId = selectedCat
    const itemId = selectedItem
    if (!catId || !itemId) return
    const added = albums.filter(a => picked.has(a.id))
    if (pendingType === '组合' && added.length > 0) {
      const comboId = crypto.randomUUID()
      const comboEntry = {
        albumId: comboId,
        type: '组合',
        imageUrl: added[0].imageUrl,
        imageUrls: added[0].imageUrls,
        prompt: '',
        config: {},
        createdAt: Date.now(),
        productName: '产品名称',
        productParams: { spec: '', shelfLife: '', totalWeight: '', note: '' },
        comboItems: added.slice(0, 12).map(a => ({ albumId: a.id, imageUrl: a.imageUrl, imageUrls: a.imageUrls, prompt: a.prompt, productParams: { spec: '', shelfLife: '', totalWeight: '', note: '' } }))
      }
      save(categories.map(c => c.id === catId ? {
        ...c, items: c.items.map(i => i.id === itemId ? {
          ...i, albums: [...i.albums, comboEntry]
        } : i)
      } : c))
    } else {
      save(categories.map(c => c.id === catId ? {
        ...c, items: c.items.map(i => i.id === itemId ? {
          ...i, albums: [...i.albums, ...added.map(a => ({ ...a, albumId: a.id, _albumData: a, type: pendingType || '单品', productName: '产品名称' }))]
        } : i)
      } : c))
    }
    setShowPicker(false)
  }, [selectedCat, selectedItem, albums, picked, categories, save, pendingType])

  const currentCat = categories.find(c => c.id === selectedCat)
  const currentItem = currentCat?.items.find(i => i.id === selectedItem)

  const albumLocation = useMemo(() => {
    if (!viewAlbum) return null
    for (const c of categories) {
      for (const i of c.items) {
        if (i.albums?.some(a => a.albumId === viewAlbum.albumId)) {
          return { catId: c.id, itemId: i.id }
        }
      }
    }
    return null
  }, [categories, viewAlbum])

  const currentViewAlbum = useMemo(() => {
    if (!viewAlbum || !albumLocation) return viewAlbum
    const cat = categories.find(c => c.id === albumLocation.catId)
    const item = cat?.items.find(i => i.id === albumLocation.itemId)
    return item?.albums.find(a => a.albumId === viewAlbum.albumId) || viewAlbum
  }, [categories, albumLocation, viewAlbum])

  const generateBanner = useCallback(() => {
    if (!albumLocation || !currentViewAlbum) return
    setGeneratingBanner(true)
    setBannerError(null)
    const token = localStorage.getItem('token')
    if (!token) return
    fetch(`${API}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ config: { model: 'maiziai-chatgpt-image-2', prompt: currentViewAlbum.productName || '产品名称', size: '16:9', banner: true } }),
    }).then(r => r.json()).then(data => {
      if (data.taskId) {
        const poll = () => {
          fetch(`${API}/api/generate/status?taskId=${data.taskId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then(r => r.json()).then(status => {
            if (status.imageUrl) {
              updateAlbumBanner(albumLocation.catId, albumLocation.itemId, currentViewAlbum.albumId, status.imageUrl)
              setGeneratingBanner(false)
            } else if (status.taskStatus === 'FAILED') {
              setBannerError(status.statusText || '生成失败')
              setGeneratingBanner(false)
            } else {
              setTimeout(poll, 500)
            }
          }).catch(() => setTimeout(poll, 500))
        }
        setTimeout(poll, 500)
      } else {
        setBannerError(data.error || '生成失败')
        setGeneratingBanner(false)
      }
    }).catch(err => {
      setBannerError(err.message || '网络错误')
      setGeneratingBanner(false)
    })
  }, [albumLocation, currentViewAlbum, updateAlbumBanner])

  const confirmComboPick = useCallback(() => {
    if (!albumLocation || !viewAlbum) return
    const added = albums.filter(a => comboPicked.has(a.id))
    const newCats = categories.map(c => c.id === albumLocation.catId ? {
      ...c, items: c.items.map(i => i.id === albumLocation.itemId ? {
        ...i, albums: i.albums.map(alb => alb.albumId === viewAlbum.albumId ? {
          ...alb, comboItems: [...(alb.comboItems || []), ...added.map(a => {
            const live = allAlbums.find(x => x.albumId === a.id)
            return { albumId: a.id, imageUrl: a.imageUrl, imageUrls: a.imageUrls, prompt: a.prompt, productParams: live?.productParams || a.productParams || { spec: '', shelfLife: '', totalWeight: '', note: '' } }
          })]
        } : alb)
      } : i)
    } : c)
    save(newCats)
    const cat = newCats.find(c => c.id === albumLocation.catId)
    const item = cat?.items.find(i => i.id === albumLocation.itemId)
    const updated = item?.albums.find(a => a.albumId === viewAlbum.albumId)
    if (updated) setViewAlbum(updated)
    setComboPickerOpen(false)
  }, [albumLocation, viewAlbum, albums, comboPicked, categories, allAlbums, save])

  const renderProductParams = () => {
    if (!albumLocation) return null
    const a = viewAlbum
    if (editingParams === a.albumId) {
      return (
        <div style={{ marginTop: 12, borderTop: '1px solid #eee', paddingTop: 12 }}>
          <div style={{ fontSize: 15, color: '#666', marginBottom: 6, fontWeight: 600, letterSpacing: 0.5 }}>产品参数</div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 8 }}>
            <span style={{ color: '#888', whiteSpace: 'nowrap', flexShrink: 0, width: 56, marginTop: 4 }}>规格</span>
            <textarea value={(a.productParams || {}).spec || ''} onChange={e => updateProductParams(albumLocation.catId, albumLocation.itemId, a.albumId, 'spec', e.target.value)} style={{ flex: 1, fontSize: 14, padding: '4px 11px', border: '1px solid #d9d9d9', borderRadius: 6, resize: 'none', height: 120, lineHeight: 1.5, outline: 'none', transition: 'all .3s' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <span style={{ color: '#888', whiteSpace: 'nowrap', flexShrink: 0, width: 56 }}>保质期</span>
            <input value={(a.productParams || {}).shelfLife || ''} onChange={e => updateProductParams(albumLocation.catId, albumLocation.itemId, a.albumId, 'shelfLife', e.target.value)} style={{ flex: 1, fontSize: 14, padding: '4px 11px', border: '1px solid #d9d9d9', borderRadius: 6, outline: 'none', transition: 'all .3s' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <span style={{ color: '#888', whiteSpace: 'nowrap', flexShrink: 0, width: 56 }}>总重量</span>
            <input value={(a.productParams || {}).totalWeight || ''} onChange={e => updateProductParams(albumLocation.catId, albumLocation.itemId, a.albumId, 'totalWeight', e.target.value)} style={{ flex: 1, fontSize: 14, padding: '4px 11px', border: '1px solid #d9d9d9', borderRadius: 6, outline: 'none', transition: 'all .3s' }} />
          </div>
          <div style={{ marginTop: 24 }}>
            <div style={{ color: '#FF4D4F', fontSize: 12, marginBottom: 2 }}>温馨提示</div>
            <input value={(a.productParams || {}).note || ''} onChange={e => updateProductParams(albumLocation.catId, albumLocation.itemId, a.albumId, 'note', e.target.value)} style={{ width: '100%', fontSize: 14, padding: '4px 11px', border: '1px solid #d9d9d9', borderRadius: 6, outline: 'none', boxSizing: 'border-box', transition: 'all .3s' }} />
          </div>
          <button onClick={() => setEditingParams(null)} style={{ marginTop: 8, fontSize: 13, padding: '4px 16px', border: 'none', borderRadius: 4, background: '#1677FF', cursor: 'pointer', color: '#fff' }}>保存</button>
        </div>
      )
    }
    return (
      <div style={{ marginTop: 12, borderTop: '1px solid #eee', paddingTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 15, color: '#666', marginBottom: 6, fontWeight: 600, letterSpacing: 0.5 }}>产品参数</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <span style={{ width: 56, color: '#888', flexShrink: 0 }}>规格</span>
              <span style={{ color: '#888', whiteSpace: 'pre-wrap' }}>{(a.productParams || {}).spec || '-'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <span style={{ width: 56, color: '#888', flexShrink: 0 }}>保质期</span>
              <span style={{ color: '#888' }}>{(a.productParams || {}).shelfLife || '-'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <span style={{ width: 56, color: '#888', flexShrink: 0 }}>总重量</span>
              <span style={{ color: '#888' }}>{(a.productParams || {}).totalWeight || '-'}</span>
            </div>
            <div style={{ marginTop: 20 }}>
              <div style={{ color: '#FF4D4F', fontSize: 12, marginBottom: 2 }}>温馨提示</div>
              <div style={{ color: '#FF4D4F', whiteSpace: 'pre-wrap', fontSize: 12 }}>{(a.productParams || {}).note || '-'}</div>
            </div>
          </div>
          <span onClick={() => setEditingParams(a.albumId)} style={{ cursor: 'pointer', color: '#bbb', fontSize: 15, flexShrink: 0, marginTop: 8, padding: '2px' }}><EditOutlined /></span>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>加载中...</div>
  }

  return (
    <div>
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUploadBanner} style={{ display: 'none' }} />
      <div className="card" style={{ padding: 16, marginBottom: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'rgba(0,0,0,.88)', marginBottom: 12 }}>顶部Banner</div>
        {globalBannerUrl ? (
          <div style={{ position: 'relative' }}>
            <img src={globalBannerUrl} alt="" style={{ width: '100%', height: 300, objectFit: 'cover', borderRadius: 6, display: 'block' }} />
            <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 6 }}>
              <button onClick={() => fileInputRef.current?.click()} disabled={uploadingBanner} style={{ padding: '4px 10px', fontSize: 12, background: 'rgba(0,0,0,.45)', color: '#fff', border: 'none', borderRadius: 4, cursor: uploadingBanner ? 'not-allowed' : 'pointer', opacity: uploadingBanner ? 0.6 : 1 }}>
                {uploadingBanner ? '上传中...' : '上传'}
              </button>
              <button onClick={() => { setFestival(''); setFestivalPrompt(''); setGlobalBannerUrl(null) }} style={{ padding: '4px 10px', fontSize: 12, background: 'rgba(0,0,0,.45)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>移除</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {generatingGlobalBanner ? (
              <>
                <div style={{ fontSize: 13, color: '#666', textAlign: 'center' }}>正在生成banner...</div>
                <div style={{ width: '100%', height: 6, background: '#ddd', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${globalBannerProgress}%`, height: '100%', background: 'linear-gradient(90deg, #1677FF, #69B1FF)', borderRadius: 3, transition: 'width .1s linear' }} />
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center' }}>
                <select value={festival} onChange={e => setFestival(e.target.value)} style={{ padding: '6px 10px', fontSize: 14, borderRadius: 6, border: '1px solid #d9d9d9', outline: 'none', background: '#fff' }}>
                  <option value="">选择节日</option>
                  {festivals.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <button onClick={generateGlobalBanner} disabled={!festival || generatingPrompt} style={{ padding: '8px 20px', fontSize: 14, background: !festival || generatingPrompt ? '#d9d9d9' : '#1677FF', color: '#fff', border: 'none', borderRadius: 6, cursor: !festival || generatingPrompt ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
                  {generatingPrompt ? '生成提示词中...' : 'AI生成Banner'}
                </button>
                <button onClick={() => fileInputRef.current?.click()} disabled={uploadingBanner} style={{ padding: '8px 20px', fontSize: 14, background: uploadingBanner ? '#d9d9d9' : '#fff', color: '#666', border: '1px solid #d9d9d9', borderRadius: 6, cursor: uploadingBanner ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
                  {uploadingBanner ? '上传中...' : '上传图片'}
                </button>
              </div>
            )}
            {globalBannerError && <div style={{ fontSize: 12, color: '#e44', textAlign: 'center' }}>{globalBannerError}</div>}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', minHeight: 'calc(100vh - 120px)' }}>
      <div className="card" style={{ flex: '0 0 260px', padding: 0, marginBottom: 0, overflow: 'hidden', alignSelf: 'stretch', display: 'flex', flexDirection: 'column', background: '#fff', borderRight: 'none' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: 'rgba(0,0,0,.88)' }}>目录</span>
          <button onClick={addCategory} style={{ background: 'none', border: 'none', color: '#1677FF', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 4px' }} title="添加分类"><PlusOutlined /></button>
        </div>
        <div className="album-tree-list">
          {categories.length === 0 ? (
            <div className="album-tree-empty">
              暂无分类，点击 + 添加
            </div>
          ) : (
            categories.map(cat => (
              <div key={cat.id} className="album-tree-group">
                <div
                  className={`album-tree-node album-tree-node-level1${selectedCat === cat.id && selectedItem === null ? ' active' : ''}`}
                  onClick={() => { setSelectedCat(cat.id); setSelectedItem(null); setExpandedCats(s => new Set(s).add(cat.id)); navigate(`/digital-album/${cat.id}`) }}
                >

                  {editing === cat.id ? (
                    <input
                      ref={editInputRef}
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onBlur={confirmEdit}
                      onKeyDown={e => { if (e.key === 'Enter') confirmEdit(); if (e.key === 'Escape') setEditing(null) }}
                      className="album-tree-edit"
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <span
                      className="album-tree-label"
                    >{cat.name}</span>
                  )}

                  <span onClick={e => { e.stopPropagation(); startEdit(cat.id, cat.name) }} className="album-tree-action" title="重命名"><EditOutlined /></span>
                  <span onClick={e => { e.stopPropagation(); addItem(cat.id) }} className="album-tree-action album-tree-action-add" title="添加页面"><PlusOutlined /></span>
                  <span onClick={e => { e.stopPropagation(); deleteCategory(cat.id) }} className="album-tree-action" title="删除分类"><CloseOutlined /></span>
                </div>
                {expandedCats.has(cat.id) && (
                  <div className="album-tree-children">
                    {cat.items.map(item => (
                      <div
                        key={item.id}
                        className={`album-tree-node album-tree-node-level2${selectedItem === item.id ? ' active' : ''}`}
                        onClick={() => { setSelectedCat(cat.id); setSelectedItem(item.id); navigate(`/digital-album/${cat.id}/${item.id}`) }}
                      >
                        {editing === item.id ? (
                          <input
                            ref={editInputRef}
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onBlur={confirmEdit}
                            onKeyDown={e => { if (e.key === 'Enter') confirmEdit(); if (e.key === 'Escape') setEditing(null) }}
                            className="album-tree-edit"
                            onClick={e => e.stopPropagation()}
                          />
                        ) : (
                          <span
                            className="album-tree-label"
                          >{item.name}</span>
                        )}
                        <span onClick={e => { e.stopPropagation(); startEdit(item.id, item.name) }} className="album-tree-action" title="重命名"><EditOutlined /></span>
                        <span onClick={e => { e.stopPropagation(); deleteItem(cat.id, item.id) }} className="album-tree-action" title="删除"><CloseOutlined /></span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {currentViewAlbum?.type === '组合' ? (
          <div className="card" style={{ padding: 16, marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <button
                onClick={() => { setViewAlbum(null); navigate(urlItemId ? `/digital-album/${urlCatId}/${urlItemId}` : urlCatId ? `/digital-album/${urlCatId}` : '/digital-album') }}
                className="btn btn-outline"
                style={{ fontSize: 13, padding: '4px 12px' }}
              ><ArrowLeftOutlined /> 返回</button>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#333' }}>{currentViewAlbum.productName || '产品名称'}</div>
              <div style={{ width: 60 }} />
            </div>
            <div
              style={{ height: 350, background: currentViewAlbum.bannerUrl ? `url(${currentViewAlbum.bannerUrl}) center/cover no-repeat` : '#f5f5f5', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, position: 'relative', overflow: 'hidden' }}
              onMouseEnter={() => setHoverBanner(true)}
              onMouseLeave={() => setHoverBanner(false)}
            >
              {currentViewAlbum.bannerUrl && (hoverBanner || generatingBanner) && (
                <button
                  onClick={generateBanner}
                  style={{ position: 'absolute', top: 8, right: 8, width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,.45)', color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, animation: generatingBanner ? 'spin 1s linear infinite' : 'none' }}
                  title="重新生成"
                ><ReloadOutlined /></button>
              )}
              {!currentViewAlbum.bannerUrl && (
                generatingBanner ? (
                  <div style={{ fontSize: 14, color: '#999' }}>正在生成Banner...</div>
                ) : (
                  <button
                    onClick={generateBanner}
                    style={{ padding: '10px 24px', fontSize: 14, background: '#1677FF', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                  >生成Banner</button>
                )
              )}
            </div>
            {bannerError && <div style={{ color: '#FF4D4F', fontSize: 13, marginBottom: 12 }}>{bannerError}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, alignItems: 'start' }}>
              {(currentViewAlbum.comboItems || []).map(item => {
                const itemUrl = albumMap[item.albumId]?.imageUrls?.[0] || albumMap[item.albumId]?.imageUrl || item.imageUrls?.[0] || item.imageUrl
                const liveParams = allAlbums.find(x => x.albumId === item.albumId)?.productParams || item.productParams || {}
                return (
                  <div key={item.albumId} style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #eee' }}>
                    <div style={{ position: 'relative' }}>
                      <img src={itemUrl} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                      <button
                        onClick={() => albumLocation && removeComboItem(albumLocation.catId, albumLocation.itemId, currentViewAlbum.albumId, item.albumId)}
                        style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,.4)', color: '#fff', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                      ><CloseOutlined /></button>
                    </div>
                    <div style={{ padding: '2px 6px 4px', fontSize: 11, color: '#999', lineHeight: 1.5 }}>
                      <div>规格：{liveParams.spec || '-'}</div>
                      <div>保质期：{liveParams.shelfLife || '-'}</div>
                      <div>总重量：{liveParams.totalWeight || '-'}</div>
                      <div style={{ color: '#FF4D4F', marginTop: 2 }}>温馨提示：{liveParams.note || '-'}</div>
                    </div>
                  </div>
                )
              })}
              {(currentViewAlbum.comboItems || []).length < 12 && albumLocation && (
                <div
                  onClick={() => { setComboPicked(new Set()); setPickerPage(0); setComboPickerOpen(true) }}
                  style={{ borderRadius: 8, border: '2px dashed #d9d9d9', aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#bbb', fontSize: 15, gap: 4 }}
                >
                  <span style={{ fontSize: 22 }}><PlusOutlined /></span>
                  <span style={{ fontSize: 12 }}>添加单品</span>
                </div>
              )}
            </div>
          </div>
        ) : viewAlbum ? (
          <div className="card" style={{ padding: 16, marginBottom: 0 }}>
            <button
              onClick={() => { setViewAlbum(null); navigate(urlItemId ? `/digital-album/${urlCatId}/${urlItemId}` : urlCatId ? `/digital-album/${urlCatId}` : '/digital-album') }}
              className="btn btn-outline"
              style={{ marginBottom: 12, fontSize: 13, padding: '4px 12px' }}
            ><ArrowLeftOutlined /> 返回</button>
            {(() => {
              const urls = getImageUrls(viewAlbum)
              return (
                <>
                  <img src={urls[0]} alt="" style={{ width: '100%', borderRadius: 6, display: 'block', marginBottom: 12 }} />
                  {renderProductParams()}
                  {urls.slice(1).map((url, i) => (
                    <img key={i} src={url} alt="" style={{ width: '100%', borderRadius: 6, display: 'block', marginBottom: i < urls.length - 2 ? 12 : 0 }} />
                  ))}
                </>
              )
            })()}
          </div>
        ) : selectedCat && currentCat && !selectedItem ? (
          <div className="card" style={{ padding: 16, marginBottom: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#333', marginBottom: 12 }}>{currentCat.name}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
              {currentCat.items.flatMap(i => (i.albums || []).map(a => ({ ...a, _pageName: i.name, _itemId: i.id }))).map((a, i) => (
                <div key={a.albumId + '-' + i} style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #f0f0f0', cursor: 'pointer', position: 'relative', transition: 'all .3s' }} className="album-card-hover" onClick={() => { setViewAlbum(a); navigate(`/digital-album/${selectedCat}/${a._itemId}/${a.albumId}`) }}>
                  <img src={getCoverUrl(a)} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                  <div style={{ position: 'absolute', top: 4, left: 4, background: a.type === '组合' ? '#FF4D4F' : '#1677FF', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 8, lineHeight: 1.6 }}>{a.type === '组合' ? '组合' : '单品'}</div>
                  <div style={{ padding: '4px 8px', borderTop: '1px solid #f0f0f0' }} onClick={e => e.stopPropagation()}>
                    {editingProductNameId === a.albumId ? (
                      <input
                        autoFocus
                        defaultValue={a.productName || '产品名称'}
                        onBlur={e => { updateProductName(selectedCat, a._itemId, a.albumId, e.target.value || '产品名称'); setEditingProductNameId(null) }}
                        onKeyDown={e => { if (e.key === 'Enter') { updateProductName(selectedCat, a._itemId, a.albumId, e.currentTarget.value || '产品名称'); setEditingProductNameId(null) } }}
                        style={{ width: '100%', fontSize: 14, padding: '4px 11px', border: '1px solid #d9d9d9', borderRadius: 6, outline: 'none', boxSizing: 'border-box', transition: 'all .3s' }}
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <div onClick={() => setEditingProductNameId(a.albumId)} style={{ fontSize: 13, color: '#333', cursor: 'pointer', padding: '2px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {a.productName || '产品名称'}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : currentItem ? (
          <div className="card" style={{ padding: 16, marginBottom: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#333', marginBottom: 12 }}>{currentItem.name}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
              {(currentItem.albums || []).map(a => (
                <div key={a.albumId} style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #f0f0f0', position: 'relative', cursor: 'pointer', transition: 'all .3s' }} className="album-card-hover" onClick={() => { setViewAlbum(a); navigate(`/digital-album/${selectedCat}/${selectedItem}/${a.albumId}`) }}>
                  <img src={getCoverUrl(a)} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                  <div style={{ position: 'absolute', top: 4, left: 4, background: a.type === '组合' ? '#FF4D4F' : '#1677FF', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 8, lineHeight: 1.6 }}>{a.type === '组合' ? '组合' : '单品'}</div>
                  <button
                    onClick={e => { e.stopPropagation(); removeAlbum(selectedCat, selectedItem, a.albumId) }}
                    style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,.4)', color: '#fff', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                  ><CloseOutlined /></button>
                  <div style={{ padding: '4px 8px', borderTop: '1px solid #f0f0f0' }} onClick={e => e.stopPropagation()}>
                    {editingProductNameId === a.albumId ? (
                      <input
                        autoFocus
                        defaultValue={a.productName || '产品名称'}
                        onBlur={e => { updateProductName(selectedCat, selectedItem, a.albumId, e.target.value || '产品名称'); setEditingProductNameId(null) }}
                        onKeyDown={e => { if (e.key === 'Enter') { updateProductName(selectedCat, selectedItem, a.albumId, e.currentTarget.value || '产品名称'); setEditingProductNameId(null) } }}
                        style={{ width: '100%', fontSize: 14, padding: '4px 11px', border: '1px solid #d9d9d9', borderRadius: 6, outline: 'none', boxSizing: 'border-box', transition: 'all .3s' }}
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <div onClick={() => setEditingProductNameId(a.albumId)} style={{ fontSize: 13, color: '#333', cursor: 'pointer', padding: '2px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {a.productName || '产品名称'}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div
                className="add-card-hover"
                style={{ borderRadius: 8, border: '2px dashed #d9d9d9', aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: 15, gap: 4, transition: 'all .3s', cursor: 'default' }}
              >
                <span style={{ fontSize: 22, marginBottom: 4 }}><PlusOutlined /></span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span onClick={() => openPicker('单品')} className="type-btn" style={{ cursor: 'pointer', fontSize: 12, padding: '4px 12px', borderRadius: 6, background: '#1677FF', color: '#fff', transition: 'all .3s' }}>单品</span>
                  <span onClick={() => openPicker('组合')} className="type-btn" style={{ cursor: 'pointer', fontSize: 12, padding: '4px 12px', borderRadius: 6, background: '#FF4D4F', color: '#fff', transition: 'all .3s' }}>组合</span>
                </div>
              </div>
            </div>
          </div>
        ) : selectedCat && currentCat ? (
          <div className="card" style={{ padding: 60, textAlign: 'center', color: '#999' }}>
            请在左侧选择一个页面
          </div>
        ) : allAlbums.length > 0 ? (
          <div className="card" style={{ padding: 16, marginBottom: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#333', marginBottom: 12 }}>所有画册</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
              {allAlbums.map(a => (
                <div key={a.albumId} style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #f0f0f0', position: 'relative', cursor: 'pointer', transition: 'all .3s' }} className="album-card-hover" onClick={() => { setViewAlbum(a); navigate(`/digital-album/${a._catId}/${a._itemId}/${a.albumId}`) }}>
                  <img src={getCoverUrl(a)} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                  <div style={{ position: 'absolute', top: 4, left: 4, background: a.type === '组合' ? '#FF4D4F' : '#1677FF', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 8, lineHeight: 1.6 }}>{a.type === '组合' ? '组合' : '单品'}</div>
                  <div style={{ padding: '4px 8px', borderTop: '1px solid #f0f0f0' }} onClick={e => e.stopPropagation()}>
                    <div style={{ fontSize: 11, color: '#999', marginBottom: 2 }}>{a._catName} / {a._itemName}</div>
                    {editingProductNameId === a.albumId ? (
                      <input
                        autoFocus
                        defaultValue={a.productName || '产品名称'}
                        onBlur={e => { updateProductName(a._catId, a._itemId, a.albumId, e.target.value || '产品名称'); setEditingProductNameId(null) }}
                        onKeyDown={e => { if (e.key === 'Enter') { updateProductName(a._catId, a._itemId, a.albumId, e.currentTarget.value || '产品名称'); setEditingProductNameId(null) } }}
                        style={{ width: '100%', fontSize: 14, padding: '4px 11px', border: '1px solid #d9d9d9', borderRadius: 6, outline: 'none', boxSizing: 'border-box', transition: 'all .3s' }}
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <div onClick={() => setEditingProductNameId(a.albumId)} style={{ fontSize: 13, color: '#333', cursor: 'pointer', padding: '2px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {a.productName || '产品名称'}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: 60, textAlign: 'center', color: '#999' }}>
            请先在左侧添加分类和页面
          </div>
        )}
      </div>

      {showPicker && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => { setShowPicker(false); setPickerPage(0) }}
        >
          <div className="card" style={{ width: '90%', maxWidth: 720, maxHeight: '80vh', display: 'flex', flexDirection: 'column', padding: 0, marginBottom: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #f0f0f0' }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'rgba(0,0,0,.88)' }}>{pendingType === '组合' ? '选择组合' : '选择画册'}</div>
              <span onClick={() => { setShowPicker(false); setPickerPage(0) }} style={{ cursor: 'pointer', color: 'rgba(0,0,0,.25)', fontSize: 16, padding: 4, transition: 'color .3s' }}><CloseOutlined /></span>
            </div>
            {(() => {
              const pageSize = 12
              const totalPages = Math.ceil(albums.length / pageSize) || 1
              const pageAlbums = albums.slice(pickerPage * pageSize, (pickerPage + 1) * pageSize)
              if (albums.length === 0) {
                return (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', color: 'rgba(0,0,0,.25)', fontSize: 14 }}>
                    暂无已生成的画册
                  </div>
                )
              }
              return (
                <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                        {pageAlbums.map(a => {
                          const isPicked = picked.has(a.id)
                          return (
                            <div
                              key={a.id}
                              onClick={() => {
                                setPicked(s => {
                                  if (s.has(a.id)) {
                                    const n = new Set(s); n.delete(a.id); return n
                                  } else if (pendingType !== '组合' || s.size < 12) {
                                    return new Set(s).add(a.id)
                                  }
                                  return s
                                })
                              }}
                              style={{ cursor: 'pointer', borderRadius: 6, overflow: 'hidden', border: isPicked ? '2px solid #1677FF' : '2px solid #eee', position: 'relative' }}
                            >
                              {isPicked && (
                                <div style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', background: '#1677FF', color: '#fff', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckOutlined /></div>
                              )}
                              <img src={a.imageUrl} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                              {a.imageUrls?.length > 1 && (
                                <div style={{ position: 'absolute', bottom: 4, right: 4, background: 'rgba(0,0,0,.55)', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 8 }}>{a.imageUrls.length}张</div>
                              )}
                              <div style={{ padding: '4px 8px', fontSize: 12, color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.productName || '产品名称'}</div>
                            </div>
                          )
                        })}
                      </div>
                      {totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 8 }}>
                          <button
                            onClick={() => setPickerPage(p => Math.max(0, p - 1))}
                            disabled={pickerPage === 0}
                            style={{ padding: '4px 12px', fontSize: 13, border: '1px solid #d9d9d9', borderRadius: 6, background: pickerPage === 0 ? '#f5f5f5' : '#fff', cursor: pickerPage === 0 ? 'default' : 'pointer', color: pickerPage === 0 ? 'rgba(0,0,0,.25)' : 'rgba(0,0,0,.88)', transition: 'all .3s' }}
                          >上一页</button>
                          <span style={{ fontSize: 13, color: 'rgba(0,0,0,.45)' }}>{pickerPage + 1} / {totalPages}</span>
                          <button
                            onClick={() => setPickerPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={pickerPage >= totalPages - 1}
                            style={{ padding: '4px 12px', fontSize: 13, border: '1px solid #d9d9d9', borderRadius: 6, background: pickerPage >= totalPages - 1 ? '#f5f5f5' : '#fff', cursor: pickerPage >= totalPages - 1 ? 'default' : 'pointer', color: pickerPage >= totalPages - 1 ? 'rgba(0,0,0,.25)' : 'rgba(0,0,0,.88)', transition: 'all .3s' }}
                          >下一页</button>
                        </div>
                      )}
                    </div>
                  )
                })()}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '16px 24px', borderTop: '1px solid #f0f0f0' }}>
              <button className="btn btn-outline" onClick={() => setShowPicker(false)}>取消</button>
              <button className="btn btn-primary" disabled={picked.size === 0} onClick={confirmPick}>添加 ({picked.size})</button>
            </div>
          </div>
        </div>
      )}

      {comboPickerOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => { setComboPickerOpen(false); setPickerPage(0) }}
        >
          <div className="card" style={{ width: '90%', maxWidth: 720, maxHeight: '80vh', display: 'flex', flexDirection: 'column', padding: 0, marginBottom: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #f0f0f0' }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'rgba(0,0,0,.88)' }}>选择单品（{comboPicked.size}/12）</div>
              <span onClick={() => { setComboPickerOpen(false); setPickerPage(0) }} style={{ cursor: 'pointer', color: 'rgba(0,0,0,.25)', fontSize: 16, padding: 4, transition: 'color .3s' }}><CloseOutlined /></span>
            </div>
            {(() => {
              const pageSize = 12
              const filtered = albums.filter(a => !(currentViewAlbum?.comboItems || []).some(c => c.albumId === a.id))
              const totalPages = Math.ceil(filtered.length / pageSize) || 1
              const pageAlbums = filtered.slice(pickerPage * pageSize, (pickerPage + 1) * pageSize)
              if (filtered.length === 0) {
                return (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', color: 'rgba(0,0,0,.25)', fontSize: 14 }}>
                    暂无更多单品可添加
                  </div>
                )
              }
              return (
                <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                        {pageAlbums.map(a => {
                          const isPicked = comboPicked.has(a.id)
                          return (
                            <div
                              key={a.id}
                              onClick={() => {
                                if (isPicked) {
                                  setComboPicked(s => { const n = new Set(s); n.delete(a.id); return n })
                                } else if (comboPicked.size < 12) {
                                  setComboPicked(s => new Set(s).add(a.id))
                                }
                              }}
                              style={{ cursor: 'pointer', borderRadius: 6, overflow: 'hidden', border: isPicked ? '2px solid #1677FF' : '2px solid #eee', position: 'relative' }}
                            >
                              {isPicked && (
                                <div style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', background: '#1677FF', color: '#fff', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckOutlined /></div>
                              )}
                              <img src={a.imageUrl} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                              {a.imageUrls?.length > 1 && (
                                <div style={{ position: 'absolute', bottom: 4, right: 4, background: 'rgba(0,0,0,.55)', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 8 }}>{a.imageUrls.length}张</div>
                              )}
                              <div style={{ padding: '4px 8px', fontSize: 12, color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.productName || '产品名称'}</div>
                            </div>
                          )
                        })}
                      </div>
                      {totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 8 }}>
                          <button
                            onClick={() => setPickerPage(p => Math.max(0, p - 1))}
                            disabled={pickerPage === 0}
                            style={{ padding: '4px 12px', fontSize: 13, border: '1px solid #d9d9d9', borderRadius: 6, background: pickerPage === 0 ? '#f5f5f5' : '#fff', cursor: pickerPage === 0 ? 'default' : 'pointer', color: pickerPage === 0 ? 'rgba(0,0,0,.25)' : 'rgba(0,0,0,.88)', transition: 'all .3s' }}
                          >上一页</button>
                          <span style={{ fontSize: 13, color: 'rgba(0,0,0,.45)' }}>{pickerPage + 1} / {totalPages}</span>
                          <button
                            onClick={() => setPickerPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={pickerPage >= totalPages - 1}
                            style={{ padding: '4px 12px', fontSize: 13, border: '1px solid #d9d9d9', borderRadius: 6, background: pickerPage >= totalPages - 1 ? '#f5f5f5' : '#fff', cursor: pickerPage >= totalPages - 1 ? 'default' : 'pointer', color: pickerPage >= totalPages - 1 ? 'rgba(0,0,0,.25)' : 'rgba(0,0,0,.88)', transition: 'all .3s' }}
                          >下一页</button>
                        </div>
                      )}
                    </div>
                  )
                })()}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '16px 24px', borderTop: '1px solid #f0f0f0' }}>
              <button className="btn btn-outline" onClick={() => setComboPickerOpen(false)}>取消</button>
              <button className="btn btn-primary" disabled={comboPicked.size === 0} onClick={confirmComboPick}>添加 ({comboPicked.size})</button>
            </div>
          </div>
        </div>
      )}

    </div>
    </div>
  )
}
