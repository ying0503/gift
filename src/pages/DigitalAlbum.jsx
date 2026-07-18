import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Modal } from 'antd'
import { EditOutlined, CloseOutlined, CheckOutlined, ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons'
import TemplatePicker from '../components/TemplatePicker'
import { API } from '../AuthContext'

export default function DigitalAlbum({ setPreviewSave, setPreviewAlbumId, setPreviewTitle }) {
  const navigate = useNavigate()
  const location = useLocation()
  const albumIdRef = useRef(null)
  const [categories, setCategories] = useState([])
  const [albums, setAlbums] = useState([])
  const [giftList, setGiftList] = useState([])
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
  const [comboPickerOpen, setComboPickerOpen] = useState(false)
  const [comboPicked, setComboPicked] = useState(new Set())
  const [generatingBanner, setGeneratingBanner] = useState(false)
  const [bannerError, setBannerError] = useState(null)
  const [comboBannerAiMode, setComboBannerAiMode] = useState(false)
  const [comboBannerPrompt, setComboBannerPrompt] = useState('')
  const [comboGeneratingPrompt, setComboGeneratingPrompt] = useState(false)
  const [comboBannerProgress, setComboBannerProgress] = useState(0)
  const [comboUploadingBanner, setComboUploadingBanner] = useState(false)
  const comboFileInputRef = useRef(null)
  const [editingComboBanner, setEditingComboBanner] = useState(false)
  const [renameTarget, setRenameTarget] = useState(null)
  const [renameInput, setRenameInput] = useState('')
  const [pickerPage, setPickerPage] = useState(0)
const [globalBannerUrl, setGlobalBannerUrl] = useState(null)
const [globalBannerProgress, setGlobalBannerProgress] = useState(0)
  const [globalBannerError, setGlobalBannerError] = useState(null)
  const [bannerAiMode, setBannerAiMode] = useState(false)
  const [bannerTitle, setBannerTitle] = useState('')
  const [bannerSubtitle, setBannerSubtitle] = useState('')
  const [titleBgFrom, setTitleBgFrom] = useState('')
  const [titleBgTo, setTitleBgTo] = useState('')
  const [menuBgFrom, setMenuBgFrom] = useState('')
  const [menuBgTo, setMenuBgTo] = useState('')
  const [nameColor, setNameColor] = useState('')
  const [descColor, setDescColor] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingSubtitle, setEditingSubtitle] = useState(false)
  const [festival, setFestival] = useState('')
  const [festivalPrompt, setFestivalPrompt] = useState('')
  const [generatingPrompt, setGeneratingPrompt] = useState(false)
  const [generatingGlobalBanner, setGeneratingGlobalBanner] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [generatingCats, setGeneratingCats] = useState(false)
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)
  const [albumTitle, setAlbumTitle] = useState('')
  const [editingAlbumTitle, setEditingAlbumTitle] = useState(false)
  const [titleModalOpen, setTitleModalOpen] = useState(false)
  const [titleInput, setTitleInput] = useState('')
  const fileInputRef = useRef(null)
  const categoriesRef = useRef([])
  useEffect(() => { categoriesRef.current = categories }, [categories])
  const festivals = ['春节', '元宵节', '端午节', '中秋节', '情人节', '圣诞节', '国庆节', '新年', '母亲节', '父亲节', '教师节', '七夕节', '万圣节', '感恩节']

  useEffect(() => {
    fetch(`${API}/api/global-config`)
      .then(r => r.json())
      .then(cfg => {
        if (cfg.defaultImageModel) localStorage.setItem('defaultImageModel', cfg.defaultImageModel)
        if (cfg.textGenerationModel) localStorage.setItem('textGenerationModel', cfg.textGenerationModel)
        if (cfg.textTemperature) localStorage.setItem('textTemperature', cfg.textTemperature)
        if (cfg.textMaxTokens) localStorage.setItem('textMaxTokens', cfg.textMaxTokens)
      })
      .catch(() => {})
  }, [])

  const { albumId: urlAlbumId, catId: urlCatId, itemId: urlItemId, albumDtlId: urlAlbumDtlId } = useParams()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { setLoading(false); return }
    const id = urlAlbumId
    const url = id ? `${API}/api/digital-album?id=${encodeURIComponent(id)}` : `${API}/api/digital-album`
    Promise.all([
      fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API}/api/albums`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API}/api/gifts`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([da, al, gl]) => {
      if (da.id) { albumIdRef.current = da.id; if (setPreviewAlbumId) setPreviewAlbumId(da.id) }
      if (da.categories) {
        const cats = da.categories.map(c => ({ ...c, items: c.items.map(i => ({ ...i, albums: i.albums || [] })) }))
        setCategories(cats)
      }
      if (da.bannerUrl) setGlobalBannerUrl(da.bannerUrl)
      if (da.bannerTitle) setBannerTitle(da.bannerTitle)
      if (da.albumTitle) setAlbumTitle(da.albumTitle)
      if (da.bannerSubtitle) setBannerSubtitle(da.bannerSubtitle)
      if (da.titleBgFrom !== undefined) setTitleBgFrom(da.titleBgFrom)
      if (da.titleBgTo !== undefined) setTitleBgTo(da.titleBgTo)
      if (da.menuBgFrom !== undefined) setMenuBgFrom(da.menuBgFrom)
      if (da.menuBgTo !== undefined) setMenuBgTo(da.menuBgTo)
      if (da.nameColor !== undefined) setNameColor(da.nameColor)
      if (da.descColor !== undefined) setDescColor(da.descColor)
      if (al.albums) setAlbums(al.albums)
      if (gl.gifts) setGiftList(gl.gifts)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (loading) return
    if (!albumTitle) { setTitleModalOpen(true); setTitleInput('') }
  }, [loading])

  useEffect(() => {
    if (loading) return
    if (urlCatId) {
      if (categories.some(c => c.id === urlCatId)) {
        setSelectedCat(urlCatId)
        setExpandedCats(s => new Set(s).add(urlCatId))
      }
      return
    }
    if (categories.length > 0 && !selectedCat) {
      const first = categories[0]
      setSelectedCat(first.id)
      setExpandedCats(s => new Set(s).add(first.id))
      const aid = urlAlbumId || albumIdRef.current
      navigate(aid ? `/digital-album/${aid}/${first.id}` : `/digital-album/${first.id}`, { replace: true })
    }
  }, [loading])

  const albumMap = useMemo(() => {
    const m = {}
    for (const a of albums) m[a.id] = a
    return m
  }, [albums])

  const allAlbums = useMemo(() => {
    const result = []
    const seen = new Set()
    for (const c of categories) {
      for (const i of c.items) {
        for (const a of i.albums || []) {
          if (seen.has(a.albumId)) continue
          seen.add(a.albumId)
          result.push({ ...a, _catId: c.id, _itemId: i.id, _catName: c.name, _itemName: i.name })
        }
      }
    }
    return result
  }, [categories])

  const mergedAlbums = useMemo(() => {
    const catMap = {}
    for (const a of allAlbums) {
      if (a.albumId) catMap[a.albumId] = a
    }

    const fixUrl = (url) => {
      if (!url) return url
      const idx = url.indexOf('https://', 8)
      return idx > 0 ? url.slice(idx) : url
    }
    const fixUrls = (arr) => (arr || []).map(u => fixUrl(u))

    const seen = new Set()
    const result = []
    for (const a of albums) {
      if (!a.id) continue
      const cat = catMap[a.id]
      result.push(cat ? { ...a, ...cat, id: a.id, albumId: a.id, imageUrl: a.imageUrl, imageUrls: a.imageUrls } : { ...a, id: a.id })
      seen.add(a.id)
    }
    for (const a of allAlbums) {
      if (!a.albumId || seen.has(a.albumId)) continue
      seen.add(a.albumId)
      result.push({ ...a, id: a.albumId, imageUrl: fixUrl(a.imageUrl), imageUrls: fixUrls(a.imageUrls) })
    }
    return result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  }, [albums, allAlbums])

  const giftAlbums = useMemo(() => {
    return giftList.map(g => ({
      id: g.id,
      imageUrl: g.imageUrls?.[0] || g.firstImageUrl || '',
      imageUrls: g.imageUrls || [],
      productName: g.name || '未命名礼品',
      createdAt: g.createdAt || 0,
      giftData: g,
    })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  }, [giftList])

  const giftMap = useMemo(() => {
    const m = {}
    for (const g of giftList) m[g.id] = g
    return m
  }, [giftList])

  const isGiftDeleted = useCallback((albumId, type) => {
    if (type === '组合') return false
    return !giftMap[albumId]
  }, [giftMap])

  useEffect(() => {
    if (loading || !urlAlbumDtlId || !mergedAlbums.length) return
    const searchParams = new URLSearchParams(location.search)
    const fromCombo = searchParams.get('fromCombo')
    if (fromCombo) {
      const parts = fromCombo.split('/')
      const cat = categories.find(c => c.id === parts[0])
      const item = cat?.items.find(i => i.id === parts[1])
      const combo = item?.albums.find(a => a.albumId === parts[2])
      const comboItem = combo?.comboItems?.find(ci => ci.albumId === urlAlbumDtlId)
      if (comboItem) {
        setViewAlbum({ ...comboItem, productName: comboItem.productName || mergedAlbums.find(x => x.id === comboItem.albumId)?.productName || '', productParams: comboItem.productParams || {} })
        return
      }
    }
    const found = mergedAlbums.find(a => a.id === urlAlbumDtlId || a.albumId === urlAlbumDtlId)
    if (found) {
      const gift = giftMap[found.albumId]
      if (gift) {
        setViewAlbum({ ...found, productName: gift.name || found.productName, imageUrl: gift.imageUrls?.[0] || gift.firstImageUrl || found.imageUrl, imageUrls: gift.imageUrls || found.imageUrls })
      } else {
        setViewAlbum(found)
      }
    }
  }, [loading, mergedAlbums, urlAlbumDtlId, categories, location.search])

  function getImageUrls(a) {
    const fresh = albumMap[a.albumId]
    if (fresh?.imageUrls?.length) return fresh.imageUrls
    const gift = giftMap[a.albumId]
    if (gift?.imageUrls?.length) return gift.imageUrls
    return a.imageUrls || [a.imageUrl]
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
    if (!bannerAiMode) return
    if (festivalPrompt) return
    const token = localStorage.getItem('token')
    if (!token) return
    setGeneratingPrompt(true)
    setFestivalPrompt('')
    const text = bannerTitle || '节日礼品'
    fetch(`${API}/api/generate/prompts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ festival: text, count: 1 }),
    }).then(r => r.json()).then(data => {
      const prompt = data.prompts?.[0] || (bannerTitle ? `节日氛围浓厚的高品质banner图，以${bannerTitle}为主题，画面采用暖色调光影，点缀金色和红色元素，背景融入传统节日纹样与灯笼装饰，前景摆放精美礼品礼盒，整体构图大气喜庆，传递温馨团圆的节日祝福，细节丰富光影层次分明，适合作为品牌活动页顶部氛围展示。` : '')
      setFestivalPrompt(prompt)
      if (prompt) generateGlobalBanner(prompt)
    }).catch(() => {
      const prompt = bannerTitle ? `节日氛围浓厚的高品质banner图，以${bannerTitle}为主题，画面采用暖色调光影，点缀金色和红色元素，背景融入传统节日纹样与灯笼装饰，前景摆放精美礼品礼盒，整体构图大气喜庆，传递温馨团圆的节日祝福，细节丰富光影层次分明，适合作为品牌活动页顶部氛围展示。` : ''
      setFestivalPrompt(prompt)
      if (prompt) generateGlobalBanner(prompt)
    }).finally(() => setGeneratingPrompt(false))
  }, [bannerAiMode])

  useEffect(() => {
    if (!comboBannerAiMode) return
    if (comboBannerPrompt) return
    const token = localStorage.getItem('token')
    if (!token) return
    setComboGeneratingPrompt(true)
    setComboBannerPrompt('')
    const text = currentViewAlbum?.productName || '产品展示'
    fetch(`${API}/api/generate/prompts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ festival: text, count: 1 }),
    }).then(r => r.json()).then(data => {
      const p = data.prompts?.[0] || `高品质产品展示banner图，以${text}为主题，画面精美大气，光影层次分明，背景融入氛围感元素，前景摆放精美产品，整体构图专业，细节丰富。`
      setComboBannerPrompt(p)
      generateBanner(p)
    }).catch(() => {
      const p = `高品质产品展示banner图，以${text}为主题，画面精美大气，光影层次分明，背景融入氛围感元素，前景摆放精美产品，整体构图专业，细节丰富。`
      setComboBannerPrompt(p)
      generateBanner(p)
    }).finally(() => setComboGeneratingPrompt(false))
  }, [comboBannerAiMode])

const save = useCallback(async (cats, bannerUrl) => {
const token = localStorage.getItem('token')
if (!token) return
setCategories(cats)
if (bannerUrl !== undefined) setGlobalBannerUrl(bannerUrl)
await fetch(`${API}/api/digital-album`, {
method: 'POST',
headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
body: JSON.stringify({
id: albumIdRef.current,
categories: cats,
bannerUrl: bannerUrl !== undefined ? bannerUrl : globalBannerUrl,
bannerTitle,
albumTitle,
bannerSubtitle,
titleBgFrom,
titleBgTo,
menuBgFrom,
menuBgTo,
}),
})
}, [globalBannerUrl, bannerTitle, albumTitle, bannerSubtitle, titleBgFrom, titleBgTo, menuBgFrom, menuBgTo, nameColor, descColor])

const saveForPreview = useCallback(async () => {
const token = localStorage.getItem('token')
if (!token) return
await fetch(`${API}/api/digital-album`, {
method: 'POST',
headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
body: JSON.stringify({ id: albumIdRef.current, categories, bannerUrl: globalBannerUrl, bannerTitle, albumTitle, bannerSubtitle, titleBgFrom, titleBgTo, menuBgFrom, menuBgTo, nameColor, descColor }),
})
}, [categories, globalBannerUrl, bannerTitle, albumTitle, bannerSubtitle, titleBgFrom, titleBgTo, menuBgFrom, menuBgTo, nameColor, descColor])

useEffect(() => {
if (setPreviewSave) setPreviewSave(saveForPreview)
}, [setPreviewSave, saveForPreview])

useEffect(() => { document.title = albumTitle || '礼企汇' }, [albumTitle])

useEffect(() => { if (setPreviewTitle) setPreviewTitle(albumTitle || '画册名称') }, [albumTitle, setPreviewTitle])

const saveGlobalBannerUrl = (url) => {
const token = localStorage.getItem('token')
if (!token) return
setGlobalBannerUrl(url)
fetch(`${API}/api/digital-album`, {
method: 'POST',
headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
body: JSON.stringify({ id: albumIdRef.current, categories, bannerUrl: url, bannerTitle, albumTitle, bannerSubtitle, titleBgFrom, titleBgTo, menuBgFrom, menuBgTo, nameColor, descColor }),
}).catch(() => {})
}

const saveTitle = () => {
const token = localStorage.getItem('token')
if (!token) return
fetch(`${API}/api/digital-album`, {
method: 'POST',
headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
body: JSON.stringify({ id: albumIdRef.current, categories, bannerUrl: globalBannerUrl, bannerTitle, albumTitle, bannerSubtitle, titleBgFrom, titleBgTo, menuBgFrom, menuBgTo, nameColor, descColor }),
}).catch(() => {})
}

const saveSubtitle = () => {
const token = localStorage.getItem('token')
if (!token) return
fetch(`${API}/api/digital-album`, {
method: 'POST',
headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
body: JSON.stringify({ id: albumIdRef.current, categories, bannerUrl: globalBannerUrl, bannerTitle, albumTitle, bannerSubtitle, titleBgFrom, titleBgTo, menuBgFrom, menuBgTo, nameColor, descColor }),
}).catch(() => {})
}

const saveAlbumTitle = () => {
const token = localStorage.getItem('token')
if (!token) return
fetch(`${API}/api/digital-album`, {
method: 'POST',
headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
body: JSON.stringify({ id: albumIdRef.current, categories, bannerUrl: globalBannerUrl, bannerTitle, albumTitle, bannerSubtitle, titleBgFrom, titleBgTo, menuBgFrom, menuBgTo, nameColor, descColor }),
}).catch(() => {})
}

  const smartGenerateCategories = async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    setGeneratingCats(true)
    try {
      const textModel = localStorage.getItem('textGenerationModel') || 'qwen3.5-flash'
      const temperature = parseFloat(localStorage.getItem('textTemperature') || '0.8')
      const maxTokens = parseInt(localStorage.getItem('textMaxTokens') || '2000')
      const res = await fetch(`${API}/api/generate/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ festival: bannerTitle, model: textModel, temperature, maxTokens }),
      })
      const data = await res.json()
      if (data.names?.length) {
        const newCats = data.names.map(name => ({ id: crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2, 8), name, items: [] }))
        const merged = [...categories, ...newCats]
        setCategories(merged)
await fetch(`${API}/api/digital-album`, {
method: 'POST',
headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
body: JSON.stringify({ id: albumIdRef.current, categories: merged, bannerUrl: globalBannerUrl, bannerTitle, albumTitle, bannerSubtitle, titleBgFrom, titleBgTo, menuBgFrom, menuBgTo, nameColor, descColor }),
}).then(r => r.json()).then(d => { if (d.id && !albumIdRef.current) { albumIdRef.current = d.id; if (setPreviewAlbumId) setPreviewAlbumId(d.id) } })
        if (merged.length > 0 && newCats.length > 0) {
          const firstId = newCats[0].id
          setSelectedCat(firstId)
          setSelectedItem(null)
          navigate(albumIdRef.current ? `/digital-album/${albumIdRef.current}/${firstId}` : `/digital-album/${firstId}`)
        }
      }
    } catch (e) {
      alert('生成失败，请重试')
    } finally {
      setGeneratingCats(false)
    }
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
          const token2 = localStorage.getItem('token')
          if (token2) {
            fetch(`${API}/api/digital-album`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token2}` },
              body: JSON.stringify({ id: albumIdRef.current, categories, bannerUrl: data.url, bannerTitle, albumTitle, bannerSubtitle, titleBgFrom, titleBgTo, menuBgFrom, menuBgTo, nameColor, descColor }),
            }).then(r => r.json()).then(d => { if (d.id && !albumIdRef.current) { albumIdRef.current = d.id; if (setPreviewAlbumId) setPreviewAlbumId(d.id) } }).catch(() => {})
          }
        } else {
          alert(data.error || '上传失败')
        }
      }).catch(() => alert('上传失败，请重试')).finally(() => setUploadingBanner(false))
    }
    reader.onerror = () => { alert('读取文件失败'); setUploadingBanner(false) }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleComboBannerUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { alert('请上传图片文件'); return }
    if (file.size > 10 * 1024 * 1024) { alert('图片不能超过10MB'); return }
    const token = localStorage.getItem('token')
    if (!token) return
    setComboUploadingBanner(true)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target.result
      fetch(API + '/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ image: dataUrl }),
      }).then(r => r.json()).then(data => {
        if (data.url && albumLocation && currentViewAlbum) {
          updateAlbumBanner(albumLocation.catId, albumLocation.itemId, currentViewAlbum.albumId, data.url)
        } else {
          alert(data.error || '上传失败')
        }
      }).catch(() => alert('上传失败，请重试')).finally(() => setComboUploadingBanner(false))
    }
    reader.onerror = () => { alert('读取文件失败'); setComboUploadingBanner(false) }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const generateGlobalBanner = (customPrompt) => {
    const token = localStorage.getItem('token')
    if (!token) return
    const prompt = customPrompt || festivalPrompt || `生成一个${festival || '节日'}的banner，喜庆、大气`
    setGeneratingGlobalBanner(true)
    setGlobalBannerProgress(1)
    setGlobalBannerError(null)
    setTimeout(() => setGlobalBannerProgress(2), 200)
    let prog = 2
    const progTimer = setInterval(() => {
      prog = Math.min(prog + Math.random() * 2, 95)
      setGlobalBannerProgress(Math.round(prog))
    }, 800)

    const finish = (url) => {
      clearInterval(progTimer)
      setGlobalBannerProgress(100)
      setTimeout(() => {
        saveGlobalBannerUrl(url)
        setGeneratingGlobalBanner(false)
      }, 300)
    }

    fetch(`${API}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        config: {
          model: localStorage.getItem('defaultImageModel') || 'maiziai-chatgpt-image-2',
          prompt,
          size: '16:9',
        },
      }),
    }).then(r => r.json()).then(data => {
      if (!data.taskId) {
        clearInterval(progTimer)
        setGlobalBannerError(data.error || '生成失败')
        setGeneratingGlobalBanner(false)
        return
      }
      const poll = () => {
        fetch(`${API}/api/generate/status?taskId=${data.taskId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.json()).then(status => {
          if (status.imageUrl) {
            finish(status.imageUrl)
          } else if (status.taskStatus === 'SUCCEEDED') {
            finish(status.imageUrl)
          } else if (status.taskStatus === 'FAILED') {
            clearInterval(progTimer)
            setGlobalBannerError(status.statusText || '生成失败')
            setGeneratingGlobalBanner(false)
          } else {
            setTimeout(poll, 500)
          }
        }).catch(() => setTimeout(poll, 500))
      }
      setTimeout(poll, 500)
    }).catch(err => {
      clearInterval(progTimer)
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

  function addCategory() {
    const id = crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    const newCats = [...categories, { id, name: '新分类', items: [] }]
    setCategories(newCats)
    setExpandedCats(prev => new Set(prev).add(id))
    setTimeout(() => startEdit(id, '新分类'), 50)
    save(newCats)
  }

  const deleteCategory = useCallback((id) => {
    const cat = categories.find(c => c.id === id)
    const total = cat?.items.reduce((sum, i) => sum + (i.albums || []).length, 0) || 0
    if (total > 0) { alert('该分类下还有画册，无法删除'); return }
    const remaining = categories.filter(c => c.id !== id)
    save(remaining)
    if (selectedCat === id) {
      const idx = categories.findIndex(c => c.id === id)
      const next = remaining[idx] || remaining[idx - 1] || null
      if (next) { setSelectedCat(next.id); setSelectedItem(null); navigate(albumIdRef.current ? `/digital-album/${albumIdRef.current}/${next.id}` : `/digital-album/${next.id}`) }
      else { setSelectedCat(null); setSelectedItem(null); navigate('/digital-album') }
    }
  }, [categories, save, selectedCat, navigate])

  const addItem = useCallback((catId) => {
    const id = crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    save(categories.map(c => c.id === catId ? { ...c, items: [...c.items, { id, name: '新页面', albums: [] }] } : c))
    setExpandedCats(s => new Set(s).add(catId))
    setTimeout(() => startEdit(id, '新页面'), 50)
  }, [categories, save, startEdit])

  const deleteItem = useCallback((catId, itemId) => {
    const item = categories.find(c => c.id === catId)?.items.find(i => i.id === itemId)
    if (item && (item.albums || []).length > 0) { alert('该页面下还有画册，无法删除'); return }
    save(categories.map(c => c.id === catId ? { ...c, items: c.items.filter(i => i.id !== itemId) } : c))
    if (selectedItem === itemId) { setSelectedItem(null); navigate(albumIdRef.current ? `/digital-album/${albumIdRef.current}/${catId}` : '/digital-album') }
  }, [categories, save, selectedItem, navigate])

  const removeAlbum = useCallback((catId, itemId, albumId) => {
    setCategories(prev => {
      const next = prev.map(c => c.id === catId ? { ...c, items: c.items.map(i => i.id === itemId ? { ...i, albums: i.albums.filter(a => a.albumId !== albumId) } : i) } : c)
      const token = localStorage.getItem('token')
      if (token) {
        fetch(`${API}/api/digital-album`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ id: albumIdRef.current, categories: next, bannerUrl: globalBannerUrl, bannerTitle, albumTitle, bannerSubtitle, titleBgFrom, titleBgTo, menuBgFrom, menuBgTo, nameColor, descColor }),
        }).catch(() => {})
      }
      return next
    })
  }, [globalBannerUrl, bannerTitle, albumTitle, bannerSubtitle])

  const removeComboItem = useCallback((catId, itemId, albumId, itemAlbumId) => {
    setCategories(prev => {
      const next = prev.map(c => c.id === catId ? {
        ...c, items: c.items.map(i => i.id === itemId ? {
          ...i, albums: i.albums.map(a => a.albumId === albumId ? {
            ...a, comboItems: (a.comboItems || []).filter(item => item.albumId !== itemAlbumId)
          } : a)
        } : i)
      } : c)
      const token = localStorage.getItem('token')
      if (token) {
        fetch(`${API}/api/digital-album`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ id: albumIdRef.current, categories: next, bannerUrl: globalBannerUrl, bannerTitle, albumTitle, bannerSubtitle, titleBgFrom, titleBgTo, menuBgFrom, menuBgTo, nameColor, descColor }),
        }).catch(() => {})
      }
      return next
    })
  }, [globalBannerUrl, bannerTitle, albumTitle, bannerSubtitle])

  const updateAlbumBanner = useCallback((catId, itemId, albumId, bannerUrl) => {
    const newCats = categories.map(c => c.id === catId ? {
      ...c, items: c.items.map(i => i.id === itemId ? {
        ...i, albums: i.albums.map(a => a.albumId === albumId ? { ...a, bannerUrl } : a)
      } : i)
    } : c)
    save(newCats)
    if (bannerUrl) setEditingComboBanner(false)
    const cat = newCats.find(c => c.id === catId)
    const item = cat?.items.find(i => i.id === itemId)
    const updated = item?.albums.find(a => a.albumId === albumId)
    if (updated) setViewAlbum(updated)
  }, [categories, save])

  const handleRenameCombo = useCallback(() => {
    if (!renameTarget || !renameInput.trim()) return
    const { catId, itemId, albumId } = renameTarget
    const newCats = categories.map(c => c.id === catId ? {
      ...c, items: c.items.map(i => i.id === itemId ? {
        ...i, albums: i.albums.map(a => a.albumId === albumId ? { ...a, productName: renameInput.trim() } : a)
      } : i)
    } : c)
    save(newCats)
    setRenameTarget(null)
    setRenameInput('')
  }, [renameTarget, renameInput, categories, save])

  const openPicker = useCallback((type) => {
    setPicked(new Set())
    setPendingType(type)
    setPickerPage(0)
    setShowPicker(true)
  }, [])

  const confirmPick = useCallback(() => {
    const catId = selectedCat
    let itemId = selectedItem
    if (!catId) return
    const source = giftAlbums
    const added = source.filter(a => picked.has(a.id))
    if (added.length === 0) return
    if (!itemId) {
      itemId = crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
      const newItem = { id: itemId, name: '默认页面', albums: [] }
      const catsWithItem = categories.map(c => c.id === catId ? { ...c, items: [...c.items, newItem] } : c)
      setCategories(catsWithItem)
      save(catsWithItem)
      setTimeout(() => {
        const finalAdded = pendingType === '组合' && added.length > 0
          ? [{ albumId: crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2, 8), type: '组合', imageUrl: added[0].imageUrl, imageUrls: added[0].imageUrls, prompt: '', config: {}, createdAt: Date.now(), productName: '未命名组合', productParams: { spec: '', price: '', shelfLife: '', totalWeight: '', stock: '', note: '' }, comboItems: added.slice(0, 12).map(a => { const g = giftMap[a.id]; return { albumId: a.id, imageUrl: a.imageUrl, imageUrls: a.imageUrls, prompt: '', productParams: g ? { spec: g.spec || '', price: g.price || '', shelfLife: g.shelfLife || '', totalWeight: g.netContent || '', stock: g.stock || '', note: g.tips || '' } : { spec: '', price: '', shelfLife: '', totalWeight: '', stock: '', note: '' } } }) }]
          : added.map(a => { const g = giftMap[a.id]; return { ...a, albumId: a.id, _albumData: a, type: pendingType || '单品', productName: '产品名称', productParams: g ? { spec: g.spec || '', price: g.price || '', shelfLife: g.shelfLife || '', totalWeight: g.netContent || '', stock: g.stock || '', note: g.tips || '' } : { spec: '', price: '', shelfLife: '', totalWeight: '', stock: '', note: '' } } })
        const nextCats = categories.map(c => c.id === catId ? { ...c, items: [...c.items, newItem].map(i => i.id === itemId ? { ...i, albums: finalAdded } : i) } : c)
        save(nextCats)
      }, 100)
      setShowPicker(false)
      return
    }
    if (pendingType === '组合' && added.length > 0) {
      const comboId = crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
      const comboEntry = { albumId: comboId, type: '组合', imageUrl: added[0].imageUrl, imageUrls: added[0].imageUrls, prompt: '', config: {}, createdAt: Date.now(), productName: '未命名组合', productParams: { spec: '', price: '', shelfLife: '', totalWeight: '', stock: '', note: '' }, comboItems: added.slice(0, 12).map(a => { const g = giftMap[a.id]; return { albumId: a.id, imageUrl: a.imageUrl, imageUrls: a.imageUrls, prompt: '', productParams: g ? { spec: g.spec || '', price: g.price || '', shelfLife: g.shelfLife || '', totalWeight: g.netContent || '', stock: g.stock || '', note: g.tips || '' } : { spec: '', price: '', shelfLife: '', totalWeight: '', stock: '', note: '' } } }) }
      save(categories.map(c => c.id === catId ? { ...c, items: c.items.map(i => i.id === itemId ? { ...i, albums: [...i.albums, comboEntry] } : i) } : c))
    } else {
      save(categories.map(c => c.id === catId ? { ...c, items: c.items.map(i => i.id === itemId ? { ...i, albums: [...i.albums, ...added.map(a => { const g = giftMap[a.id]; return { ...a, albumId: a.id, _albumData: a, type: pendingType || '单品', productName: '产品名称', productParams: g ? { spec: g.spec || '', price: g.price || '', shelfLife: g.shelfLife || '', totalWeight: g.netContent || '', stock: g.stock || '', note: g.tips || '' } : { spec: '', price: '', shelfLife: '', totalWeight: '', stock: '', note: '' } } })] } : i) } : c))
    }
    setShowPicker(false)
  }, [selectedCat, selectedItem, mergedAlbums, giftAlbums, giftMap, picked, categories, save, pendingType])

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

  const generateBanner = useCallback((prompt) => {
    if (!albumLocation || !currentViewAlbum) return
    setComboBannerProgress(1)
    setGeneratingBanner(true)
    setBannerError(null)
    const token = localStorage.getItem('token')
    if (!token) return
    const title = currentViewAlbum.productName || '产品展示'
    const promptText = (prompt || title) + `，图中居中大字标题为「${title}」`
    setTimeout(() => setComboBannerProgress(2), 200)
    let prog = 2
    const progTimer = setInterval(() => {
      prog = Math.min(prog + Math.random() * 2, 95)
      setComboBannerProgress(Math.round(prog))
    }, 800)
    const finish = (url) => {
      clearInterval(progTimer)
      setComboBannerProgress(100)
      setTimeout(() => {
        updateAlbumBanner(albumLocation.catId, albumLocation.itemId, currentViewAlbum.albumId, url)
        setGeneratingBanner(false)
      }, 300)
    }
    fetch(`${API}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ config: { model: localStorage.getItem('defaultImageModel') || 'maiziai-chatgpt-image-2', prompt: promptText, size: '16:9', banner: true } }),
    }).then(r => r.json()).then(data => {
      if (data.taskId) {
        const poll = () => {
          fetch(`${API}/api/generate/status?taskId=${data.taskId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then(r => r.json()).then(status => {
            if (status.imageUrl) {
              finish(status.imageUrl)
            } else if (status.taskStatus === 'FAILED') {
              clearInterval(progTimer)
              setBannerError(status.statusText || '生成失败')
              setGeneratingBanner(false)
            } else {
              setTimeout(poll, 500)
            }
          }).catch(() => setTimeout(poll, 500))
        }
        setTimeout(poll, 500)
      } else {
        clearInterval(progTimer)
        setBannerError(data.error || '生成失败')
        setGeneratingBanner(false)
      }
    }).catch(err => {
      clearInterval(progTimer)
      setBannerError(err.message || '网络错误')
      setGeneratingBanner(false)
    })
  }, [albumLocation, currentViewAlbum, updateAlbumBanner])

  const confirmComboPick = useCallback(() => {
    if (!albumLocation || !viewAlbum) return
    const added = giftAlbums.filter(a => comboPicked.has(a.id))
    const newCats = categories.map(c => c.id === albumLocation.catId ? {
      ...c, items: c.items.map(i => i.id === albumLocation.itemId ? {
        ...i, albums: i.albums.map(alb => alb.albumId === viewAlbum.albumId ? {
          ...alb, comboItems: [...(alb.comboItems || []), ...added.map(a => {
            const g = giftMap[a.id]
            return { albumId: a.id, imageUrl: a.imageUrl, imageUrls: a.imageUrls, prompt: '', productParams: g ? { spec: g.spec || '', price: g.price || '', shelfLife: g.shelfLife || '', totalWeight: g.netContent || '', stock: g.stock || '', note: g.tips || '' } : { spec: '', price: '', shelfLife: '', totalWeight: '', stock: '', note: '' } }
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
  }, [albumLocation, viewAlbum, giftAlbums, giftMap, comboPicked, categories, save])

  useEffect(() => {
    document.body.style.overflow = (showPicker || comboPickerOpen) ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [showPicker, comboPickerOpen])

  const renderProductParams = () => {
    const a = viewAlbum
    if (!a) return null
    const gift = giftMap[a.albumId]
    const liveParams = gift ? {
      spec: gift.spec || '',
      price: gift.price || '',
      shelfLife: gift.shelfLife || '',
      totalWeight: gift.netContent || '',
      stock: gift.stock || '',
      note: gift.tips || '',
    } : null
    const params = liveParams || a.productParams || {}
    const liveName = gift?.name || a.productName || a._albumData?.giftData?.name || ''
    return (
      <>
        {liveName ? <div style={{ width: '100%', height: 48, display: 'flex', alignItems: 'center', paddingLeft: 16, background: 'linear-gradient(180deg, #FF0000 0%, #BB0000 100%)', color: '#fff', fontSize: 16 }}>{liveName}</div> : null}
        <div style={{ padding: '20px' }}>
          <div style={{ fontSize: 15, color: '#666', marginBottom: 6, fontWeight: 600, letterSpacing: 0.5 }}>产品参数</div>
        {params.spec ? (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 8 }}>
            <span style={{ color: '#888', whiteSpace: 'nowrap', flexShrink: 0, width: 56, marginTop: 4 }}>规格</span>
            <span style={{ color: '#888', whiteSpace: 'pre-wrap' }}>{params.spec}</span>
          </div>
        ) : null}
        {params.price ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <span style={{ color: '#888', whiteSpace: 'nowrap', flexShrink: 0, width: 56 }}>零售价</span>
            <span style={{ color: '#888' }}>{params.price}</span>
          </div>
        ) : null}
        {params.totalWeight ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <span style={{ color: '#888', whiteSpace: 'nowrap', flexShrink: 0, width: 56 }}>净含量</span>
            <span style={{ color: '#888' }}>{params.totalWeight}</span>
          </div>
        ) : null}
        {params.shelfLife ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <span style={{ color: '#888', whiteSpace: 'nowrap', flexShrink: 0, width: 56 }}>保质期</span>
            <span style={{ color: '#888' }}>{params.shelfLife}</span>
          </div>
        ) : null}
        {params.stock ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <span style={{ color: '#888', whiteSpace: 'nowrap', flexShrink: 0, width: 56 }}>库存</span>
            <span style={{ color: '#888' }}>{params.stock}</span>
          </div>
        ) : null}
        {params.note ? (
          <div style={{ marginTop: 20 }}>
            <div style={{ color: '#FF4D4F', fontSize: 12, marginBottom: 2 }}>温馨提示</div>
            <div style={{ color: '#FF4D4F', whiteSpace: 'pre-wrap', fontSize: 12 }}>{params.note}</div>
          </div>
        ) : null}
      </div>
      </>
    )
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>加载中...</div>
  }

  return (
    <div style={{ maxWidth: 920, margin: '0 auto' }}>
      <div style={{ position: 'fixed', right: 24, top: 80, zIndex: 100 }}>
        <button onClick={() => setTemplatePickerOpen(true)} style={{ fontSize: 12, padding: '3px 10px', border: '1px solid #d9d9d9', borderRadius: 4, background: '#fff', cursor: 'pointer', color: '#666', whiteSpace: 'nowrap' }}>更改画册模板</button>
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUploadBanner} style={{ display: 'none' }} />
      <div className="card" style={{ padding: '12px 16px', marginBottom: 12 }}>
        {editingAlbumTitle ? (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,.45)', marginBottom: 4 }}>画册名称</div>
            <input autoFocus value={albumTitle} onChange={e => setAlbumTitle(e.target.value)}
              style={{ width: '100%', height: 34, padding: '0 10px', fontSize: 15, border: '1px solid #8B5CF6', borderRadius: 6, outline: 'none', boxSizing: 'border-box' }}
              onKeyDown={e => { if (e.key === 'Enter') { setEditingAlbumTitle(false); saveAlbumTitle() } }}
              onBlur={() => { setEditingAlbumTitle(false); saveAlbumTitle() }}
            />
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,.45)', marginBottom: 2 }}>画册名称</div>
              <span style={{ fontSize: 16, fontWeight: 600, color: 'rgba(0,0,0,.88)' }}>{albumTitle || '未命名画册'}</span>
            </div>
            <span onClick={() => setEditingAlbumTitle(true)} style={{ cursor: 'pointer', color: '#bbb', fontSize: 16, padding: 4 }}><EditOutlined /></span>
          </div>
        )}
        {editingTitle ? (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,.45)', marginBottom: 4 }}>画册主题</div>
            <input autoFocus value={bannerTitle} onChange={e => setBannerTitle(e.target.value)}
              style={{ width: '100%', height: 34, padding: '0 10px', fontSize: 15, border: '1px solid #8B5CF6', borderRadius: 6, outline: 'none', boxSizing: 'border-box' }}
              onKeyDown={e => { if (e.key === 'Enter') { setEditingTitle(false); saveTitle() } }}
              onBlur={() => { setEditingTitle(false); saveTitle() }}
            />
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,.45)', marginBottom: 2 }}>画册主题</div>
              <span style={{ fontSize: 14, color: nameColor || 'rgba(0,0,0,.65)' }}>{bannerTitle || '未设置主题'}</span>
            </div>
            <span onClick={() => setEditingTitle(true)} style={{ cursor: 'pointer', color: '#bbb', fontSize: 16, padding: 4 }}><EditOutlined /></span>
          </div>
        )}
        {editingSubtitle ? (
          <div>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,.45)', marginBottom: 4 }}>描述</div>
            <input autoFocus value={bannerSubtitle} onChange={e => setBannerSubtitle(e.target.value)}
              style={{ width: '100%', height: 34, padding: '0 10px', fontSize: 14, border: '1px solid #d9d9d9', borderRadius: 6, outline: 'none', boxSizing: 'border-box' }}
              onKeyDown={e => { if (e.key === 'Enter') { setEditingSubtitle(false); saveSubtitle() } }}
              onBlur={() => { setEditingSubtitle(false); saveSubtitle() }}
            />
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,.45)', marginBottom: 2 }}>描述</div>
              <span style={{ fontSize: 13, color: descColor || 'rgba(0,0,0,.55)' }}>{bannerSubtitle || '添加描述'}</span>
            </div>
            <span onClick={() => setEditingSubtitle(true)} style={{ cursor: 'pointer', color: '#bbb', fontSize: 13, padding: 4 }}><EditOutlined /></span>
          </div>
        )}
      </div>
      <div className="card" style={{ padding: 0, marginBottom: 12, position: 'relative', aspectRatio: '16/9' }}>
        {globalBannerUrl ? (
          <div style={{ width: '100%', height: '100%', borderRadius: 8, overflow: 'hidden' }}>
            <div onClick={() => { setGlobalBannerUrl(null); setGlobalBannerError(null); setBannerAiMode(false) }}
              style={{ position: 'absolute', top: 8, right: 8, zIndex: 2, width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,.9)', color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14, boxShadow: '0 2px 8px rgba(0,0,0,.1)' }}
            ><EditOutlined /></div>
            <img src={globalBannerUrl} alt="" style={{ width: '100%', height: '100%', display: 'block', objectFit: 'fill' }} />
          </div>
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'rgba(0,0,0,.88)', marginBottom: 10 }}>顶部海报</div>
            {!bannerAiMode ? (
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flex: 1, alignItems: 'center' }}>
                <button onClick={() => setBannerAiMode(true)}
                  style={{
                    padding: '8px 20px', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap',
                    background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
                    color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer',
                  }}
                >AI智能生成</button>
                <button onClick={() => fileInputRef.current?.click()} disabled={uploadingBanner} style={{
                  padding: '8px 20px', fontSize: 14, whiteSpace: 'nowrap',
                  background: uploadingBanner ? '#d9d9d9' : 'linear-gradient(90deg, #ff7db8, #8f7cff)',
                  color: '#fff', border: 'none', borderRadius: 8, cursor: uploadingBanner ? 'not-allowed' : 'pointer',
                  opacity: uploadingBanner ? .6 : 1,
                }}>
                  {uploadingBanner ? '上传中...' : '上传图片'}
                </button>
              </div>
            ) : generatingGlobalBanner ? (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 }}>
                <div className="loading-spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
                <div style={{ fontSize: 28, fontWeight: 700, color: '#8B5CF6' }}>{globalBannerProgress}%</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ marginBottom: 20, background: '#fff', borderRadius: 10, padding: '12px 16px', fontSize: 14, lineHeight: 1.6, width: 500, whiteSpace: 'normal', wordBreak: 'break-word', boxShadow: '0 4px 20px rgba(0,0,0,.1)', border: '1px solid #e8e8e8', position: 'relative' }}>
                    {generatingPrompt ? (
                      <div style={{ padding: '4px 0' }}>
                        <div style={{ height: 2, borderRadius: 1, background: 'linear-gradient(90deg, transparent, #8B5CF6, #EC4899, transparent)', backgroundSize: '200% 100%', animation: 'shimmer 3.5s ease-in-out infinite', marginBottom: 14 }} />
                        <div style={{ textAlign: 'center', color: '#bbb', fontSize: 14 }}>文案智能策划中</div>
                      </div>
                    ) : festivalPrompt ? (
                      <>
                        <div style={{ color: '#333', animation: 'fadeIn .5s ease' }}>{festivalPrompt}</div>
                        <div style={{ position: 'absolute', bottom: -9, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderTop: '9px solid #e8e8e8' }} />
                        <div style={{ position: 'absolute', bottom: -7, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: '7px solid #fff' }} />
                      </>
                    ) : (
                      <div style={{ color: '#999', fontSize: 13 }}>提示词生成失败，<span onClick={() => { setBannerAiMode(false); setTimeout(() => setBannerAiMode(true), 50) }} style={{ color: '#8B5CF6', cursor: 'pointer', textDecoration: 'underline' }}>点击重试</span></div>
                    )}
                  </div>
                  {!generatingPrompt && festivalPrompt && (
                    <button onClick={() => { if (festivalPrompt) generateGlobalBanner() }}
                      disabled={!festivalPrompt}
                      style={{
                        height: 38, padding: '0 24px', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap',
                        background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
                        color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', opacity: festivalPrompt ? 1 : 0.5, transition: 'opacity .2s',
                      }}
                    >生成海报</button>
                  )}
                </div>
              </div>
            )}
            {globalBannerError && <div style={{ fontSize: 12, color: '#e44', marginBottom: 10, textAlign: 'center' }}>{globalBannerError}</div>}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', minHeight: 'calc(100vh - 120px)' }}>
      <div className="card" style={{ flex: '0 0 260px', padding: 0, marginBottom: 0, overflow: 'hidden', alignSelf: 'stretch', display: 'flex', flexDirection: 'column', background: '#fff' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: 'rgba(0,0,0,.88)' }}>目录</span>
          <button onClick={addCategory} style={{ background: 'none', border: 'none', color: '#1677FF', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 4px' }} title="添加分类"><PlusOutlined /></button>
        </div>
        <div className="album-tree-list">
          {categories.length === 0 ? (
            <div className="album-tree-empty">
              {generatingCats ? (
                <div style={{ width: '100%', padding: '24px 16px' }}>
                  <div style={{ height: 2, borderRadius: 1, background: 'linear-gradient(90deg, transparent, #8B5CF6, #EC4899, transparent)', backgroundSize: '200% 100%', animation: 'shimmer 3.5s ease-in-out infinite', marginBottom: 14 }} />
                  <div style={{ textAlign: 'center', color: '#bbb', fontSize: 13 }}>AI智能目录生成中</div>
                </div>
              ) : (
              <button
                onClick={smartGenerateCategories}
                style={{
                  padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
                  color: '#fff', border: 'none', cursor: 'pointer',
                }}
              >AI智能目录</button>
              )}
            </div>
          ) : (
            categories.map(cat => (
              <div key={cat.id} className="album-tree-group">
                <div
                  className={`album-tree-node album-tree-node-level1${selectedCat === cat.id ? ' active' : ''}`}
                  onClick={() => { setViewAlbum(null); setSelectedCat(cat.id); setSelectedItem(null); navigate(albumIdRef.current ? `/digital-album/${albumIdRef.current}/${cat.id}` : `/digital-album/${cat.id}`) }}
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
                  <span onClick={e => { e.stopPropagation(); deleteCategory(cat.id) }} className="album-tree-action" title="删除分类"><CloseOutlined /></span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0, maxWidth: 640 }}>
        {currentViewAlbum?.type === '组合' ? (
          <div className="card" style={{ padding: 16, marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <button
                onClick={() => { const aid = urlAlbumId || albumIdRef.current; setViewAlbum(null); navigate(urlItemId ? `/digital-album/${aid}/${urlCatId}/${urlItemId}` : urlCatId ? `/digital-album/${aid}/${urlCatId}` : aid ? `/digital-album/${aid}` : '/digital-album') }}

                className="btn btn-outline"
                style={{ fontSize: 13, padding: '4px 12px' }}
              ><ArrowLeftOutlined /> 返回</button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 18, fontWeight: 600, color: '#333' }}>{(currentViewAlbum.productName && currentViewAlbum.productName !== '产品名称') ? currentViewAlbum.productName : '未命名组合'}</div>
                {albumLocation && (
                  <EditOutlined onClick={() => { setRenameTarget({ catId: albumLocation.catId, itemId: albumLocation.itemId, albumId: currentViewAlbum.albumId }); setRenameInput(currentViewAlbum.productName || '') }} style={{ fontSize: 16, color: '#1677FF', cursor: 'pointer' }} />
                )}
              </div>
              <div style={{ width: 60 }} />
            </div>
            <div style={{ height: 350, borderRadius: 8, marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
              {currentViewAlbum.bannerUrl && !editingComboBanner ? (
                <div style={{ width: '100%', height: '100%', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
                  <div onClick={() => { setEditingComboBanner(true) }}
                    style={{ position: 'absolute', top: 8, right: 8, zIndex: 2, width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,.9)', color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14, boxShadow: '0 2px 8px rgba(0,0,0,.1)' }}
                  ><EditOutlined /></div>
                  <img src={currentViewAlbum.bannerUrl} alt="" style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }} />
                </div>
              ) : (
                <div style={{ width: '100%', height: '100%', background: '#f5f5f5', borderRadius: 8, display: 'flex', flexDirection: 'column', padding: 16 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'rgba(0,0,0,.88)', marginBottom: 10 }}>组合头图</div>
                  {!comboBannerAiMode ? (
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flex: 1, alignItems: 'center' }}>
                      <button onClick={() => { if (!currentViewAlbum?.productName?.trim() || currentViewAlbum.productName.trim() === '未命名组合') { setRenameTarget({ catId: albumLocation.catId, itemId: albumLocation.itemId, albumId: currentViewAlbum.albumId }); setRenameInput('未命名组合'); return } setComboBannerPrompt(''); setComboBannerAiMode(true) }}
                        style={{ padding: '8px 20px', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', background: 'linear-gradient(135deg, #8B5CF6, #EC4899)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
                      >AI智能生成</button>
                      <button onClick={() => comboFileInputRef.current?.click()} disabled={comboUploadingBanner}
                        style={{ padding: '8px 20px', fontSize: 14, whiteSpace: 'nowrap', background: comboUploadingBanner ? '#d9d9d9' : 'linear-gradient(90deg, #ff7db8, #8f7cff)', color: '#fff', border: 'none', borderRadius: 8, cursor: comboUploadingBanner ? 'not-allowed' : 'pointer', opacity: comboUploadingBanner ? .6 : 1 }}
                      >{comboUploadingBanner ? '上传中...' : '上传图片'}</button>
                    </div>
                  ) : generatingBanner ? (
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 }}>
                      <div className="loading-spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
                      <div style={{ fontSize: 28, fontWeight: 700, color: '#8B5CF6' }}>{comboBannerProgress}%</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ marginBottom: 20, background: '#fff', borderRadius: 10, padding: '12px 16px', fontSize: 14, lineHeight: 1.6, width: 500, whiteSpace: 'normal', wordBreak: 'break-word', boxShadow: '0 4px 20px rgba(0,0,0,.1)', border: '1px solid #e8e8e8', position: 'relative' }}>
                          {comboGeneratingPrompt ? (
                            <div style={{ padding: '4px 0' }}>
                              <div style={{ height: 2, borderRadius: 1, background: 'linear-gradient(90deg, transparent, #8B5CF6, #EC4899, transparent)', backgroundSize: '200% 100%', animation: 'shimmer 3.5s ease-in-out infinite', marginBottom: 14 }} />
                              <div style={{ textAlign: 'center', color: '#bbb', fontSize: 14 }}>文案智能策划中</div>
                            </div>
                          ) : comboBannerPrompt ? (
                            <>
                              <div style={{ color: '#333', animation: 'fadeIn .5s ease' }}>{comboBannerPrompt}</div>
                              <div style={{ position: 'absolute', bottom: -9, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderTop: '9px solid #e8e8e8' }} />
                              <div style={{ position: 'absolute', bottom: -7, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: '7px solid #fff' }} />
                            </>
                          ) : (
                            <div style={{ color: '#999', fontSize: 13 }}>提示词生成失败，<span onClick={() => { setComboBannerAiMode(false); setTimeout(() => setComboBannerAiMode(true), 50) }} style={{ color: '#8B5CF6', cursor: 'pointer', textDecoration: 'underline' }}>点击重试</span></div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  {bannerError && <div style={{ fontSize: 12, color: '#e44', marginBottom: 10, textAlign: 'center' }}>{bannerError}</div>}
                </div>
              )}
              <input type="file" accept="image/*" ref={comboFileInputRef} onChange={handleComboBannerUpload} style={{ display: 'none' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, alignItems: 'start' }}>
              {(currentViewAlbum.comboItems || []).map(item => {
                const itemUrl = albumMap[item.albumId]?.imageUrls?.[0] || albumMap[item.albumId]?.imageUrl || item.imageUrls?.[0] || item.imageUrl
                const liveParams = mergedAlbums.find(x => x.id === item.albumId)?.productParams || item.productParams || {}
                const liveName = giftMap[item.albumId]?.name || mergedAlbums.find(x => x.id === item.albumId)?.productName || ''
                const displayName = liveName || item.productName || ''
                return (
                  <div key={item.albumId} style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #f0f0f0', position: 'relative', cursor: 'pointer', transition: 'all .3s' }} className="album-card-hover" onClick={() => { setViewAlbum({ ...item, productName: displayName, productParams: liveParams }); const aid = urlAlbumId || albumIdRef.current; const found = mergedAlbums.find(x => x.id === item.albumId); const comboPath = albumLocation ? `${albumLocation.catId}/${albumLocation.itemId}/${currentViewAlbum?.albumId}` : ''; if (found?._catId && found?._itemId) navigate(`/digital-album/${aid}/${found._catId}/${found._itemId}/${found.albumId || found.id}${comboPath ? `?fromCombo=${comboPath}` : ''}`); else navigate(`/digital-album/${aid}/detail/${item.albumId}${comboPath ? `?fromCombo=${comboPath}` : ''}`) }}>
                    <div style={{ position: 'relative' }}>
                      <img src={itemUrl} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                      <button
                        onClick={e => { e.stopPropagation(); Modal.confirm({ title: '移除此礼品', content: '确定从组合中移除此礼品吗？', okText: '确定', okType: 'danger', cancelText: '取消', onOk: () => albumLocation && removeComboItem(albumLocation.catId, albumLocation.itemId, currentViewAlbum.albumId, item.albumId) }) }}
                        style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,.4)', color: '#fff', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                      ><CloseOutlined /></button>
                    </div>
                    <div style={{ padding: '2px 6px 4px', fontSize: 11, color: '#999', lineHeight: 1.5 }} onClick={e => e.stopPropagation()}>
                      <div style={{ fontSize: 13, color: '#333', padding: '2px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center' }}>
                        {displayName}
                      </div>
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
          <div className="card" style={{ padding: 16, marginBottom: 0, maxWidth: 900, marginLeft: 'auto', marginRight: 'auto' }}>
            <button
              onClick={() => { const aid = urlAlbumId || albumIdRef.current; setViewAlbum(null); const fromCombo = new URLSearchParams(location.search).get('fromCombo'); if (fromCombo) { navigate(`/digital-album/${aid}/${fromCombo}`) } else { navigate(urlItemId ? `/digital-album/${aid}/${urlCatId}/${urlItemId}` : urlCatId ? `/digital-album/${aid}/${urlCatId}` : aid ? `/digital-album/${aid}` : '/digital-album') } }}
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {currentCat.items.flatMap(i => (i.albums || []).map(a => ({ ...a, _pageName: i.name, _itemId: i.id }))).map((a, i) => {
                const deleted = isGiftDeleted(a.albumId, a.type)
                const live = !deleted && giftMap[a.albumId]
                const coverUrl = live ? (live.imageUrls?.[0] || live.firstImageUrl || '') : getCoverUrl(a)
                return (
                <div key={a.albumId + '-' + i} style={{ borderRadius: 8, overflow: 'hidden', border: deleted ? '2px solid #ff4d4f' : '1px solid #f0f0f0', cursor: deleted ? 'default' : 'pointer', position: 'relative', transition: 'all .3s', opacity: deleted ? 0.7 : 1 }} className={deleted ? '' : 'album-card-hover'} onClick={deleted ? undefined : () => { setViewAlbum(a); const aid = urlAlbumId || albumIdRef.current; navigate(`/digital-album/${aid}/${selectedCat}/${a._itemId}/${a.albumId}`) }}>
                  {deleted && (
                    <>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,77,79,.75)', zIndex: 2, fontSize: 18, color: '#fff', fontWeight: 700, letterSpacing: 2 }}>
                        已删除
                      </div>
                      <button onClick={e => { e.stopPropagation(); Modal.confirm({ title: '删除画册', content: '确定删除此画册吗？', okText: '确定', okType: 'danger', cancelText: '取消', onOk: () => removeAlbum(selectedCat, a._itemId, a.albumId) }) }} style={{ position: 'absolute', top: 4, right: 4, width: 28, height: 28, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,.6)', color: '#fff', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, zIndex: 3 }}><CloseOutlined /></button>
                    </>)}
                  <img src={coverUrl} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                  <div style={{ position: 'absolute', top: 4, left: 4, background: a.type === '组合' ? '#FF4D4F' : '#1677FF', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 8, lineHeight: 1.6 }}>{a.type === '组合' ? '组合' : '单品'}</div>
                  <button onClick={e => { e.stopPropagation(); Modal.confirm({ title: '删除画册', content: '确定删除此画册吗？', okText: '确定', okType: 'danger', cancelText: '取消', onOk: () => removeAlbum(selectedCat, a._itemId, a.albumId) }) }} style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,.4)', color: '#fff', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}><CloseOutlined /></button>
                  <div style={{ padding: '4px 8px', borderTop: '1px solid #f0f0f0' }}>
                    <div style={{ fontSize: 13, color: deleted ? '#bbb' : '#333', padding: '2px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center' }}>
                      {live?.name || (a.productName && a.productName !== '产品名称' ? a.productName : null) || (a.type === '组合' ? '未命名组合' : '产品名称')}
                    </div>
                    </div>
                  </div>
                )
              })}
              <div
              style={{ borderRadius: 8, border: '2px dashed #d9d9d9', overflow: 'hidden', cursor: 'default' }}
            >
              <div style={{ aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: 15, gap: 4 }}>
                <span style={{ fontSize: 22, marginBottom: 4 }}><PlusOutlined /></span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span onClick={() => openPicker('单品')} style={{ cursor: 'pointer', fontSize: 12, padding: '4px 12px', borderRadius: 6, background: '#1677FF', color: '#fff', transition: 'all .3s' }}>单品</span>
                  <span onClick={() => openPicker('组合')} style={{ cursor: 'pointer', fontSize: 12, padding: '4px 12px', borderRadius: 6, background: '#FF4D4F', color: '#fff', transition: 'all .3s' }}>组合</span>
                </div>
              </div>
              <div style={{ padding: '4px 8px', borderTop: '1px solid #f0f0f0' }}>&nbsp;</div>
            </div>
          </div>
          </div>
        ) : currentItem ? (
          <div className="card" style={{ padding: 16, marginBottom: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#333', marginBottom: 12 }}>{currentItem.name}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {(currentItem.albums || []).map(a => (
                (() => {
                  const deleted = isGiftDeleted(a.albumId, a.type)
                  const live = !deleted && giftMap[a.albumId]
                  const coverUrl = live ? (live.imageUrls?.[0] || live.firstImageUrl || '') : getCoverUrl(a)
                  return (
                <div key={a.albumId} style={{ borderRadius: 8, overflow: 'hidden', border: deleted ? '2px solid #ff4d4f' : '1px solid #f0f0f0', position: 'relative', cursor: deleted ? 'default' : 'pointer', transition: 'all .3s', opacity: deleted ? 0.7 : 1 }} className={deleted ? '' : 'album-card-hover'} onClick={deleted ? undefined : () => { setViewAlbum(a); const aid = urlAlbumId || albumIdRef.current; navigate(`/digital-album/${aid}/${selectedCat}/${selectedItem}/${a.albumId}`) }}>
                  {deleted && (
                    <>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,77,79,.75)', zIndex: 2, fontSize: 18, color: '#fff', fontWeight: 700, letterSpacing: 2 }}>
                        已删除
                      </div>
                      <button onClick={e => { e.stopPropagation(); Modal.confirm({ title: '删除画册', content: '确定删除此画册吗？', okText: '确定', okType: 'danger', cancelText: '取消', onOk: () => removeAlbum(selectedCat, selectedItem, a.albumId) }) }} style={{ position: 'absolute', top: 4, right: 4, width: 28, height: 28, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,.6)', color: '#fff', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, zIndex: 3 }}><CloseOutlined /></button>
                  </>
                  )}
                  <img src={coverUrl} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                  <div style={{ position: 'absolute', top: 4, left: 4, background: a.type === '组合' ? '#FF4D4F' : '#1677FF', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 8, lineHeight: 1.6 }}>{a.type === '组合' ? '组合' : '单品'}</div>
                  <button
                    onClick={e => { e.stopPropagation(); Modal.confirm({ title: '删除画册', content: '确定删除此画册吗？', okText: '确定', okType: 'danger', cancelText: '取消', onOk: () => removeAlbum(selectedCat, selectedItem, a.albumId) }) }}
                    style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,.4)', color: '#fff', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                  ><CloseOutlined /></button>
                  <div style={{ padding: '4px 8px', borderTop: '1px solid #f0f0f0' }}>
                    <div style={{ fontSize: 13, color: deleted ? '#bbb' : '#333', padding: '2px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center' }}>
                      {live?.name || (a.productName && a.productName !== '产品名称' ? a.productName : null) || (a.type === '组合' ? '未命名组合' : '产品名称')}
                    </div>
                  </div>
                </div>
              )
            })()
          ))}
          <div
            className="add-card-hover"
            style={{ borderRadius: 8, border: '2px dashed #d9d9d9', overflow: 'hidden', cursor: 'default' }}
          >
            <div style={{ aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: 15, gap: 4 }}>
              <span style={{ fontSize: 22, marginBottom: 4 }}><PlusOutlined /></span>
              <div style={{ display: 'flex', gap: 8 }}>
                <span onClick={() => openPicker('单品')} className="type-btn" style={{ cursor: 'pointer', fontSize: 12, padding: '4px 12px', borderRadius: 6, background: '#1677FF', color: '#fff', transition: 'all .3s' }}>单品</span>
                <span onClick={() => openPicker('组合')} className="type-btn" style={{ cursor: 'pointer', fontSize: 12, padding: '4px 12px', borderRadius: 6, background: '#FF4D4F', color: '#fff', transition: 'all .3s' }}>组合</span>
              </div>
            </div>
            <div style={{ padding: '4px 8px', borderTop: '1px solid #f0f0f0' }}>&nbsp;</div>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {allAlbums.map(a => {
                const deleted = isGiftDeleted(a.albumId, a.type)
                const live = !deleted && giftMap[a.albumId]
                const coverUrl = live ? (live.imageUrls?.[0] || live.firstImageUrl || '') : getCoverUrl(a)
                return (
                <div key={a.albumId} style={{ borderRadius: 8, overflow: 'hidden', border: deleted ? '2px solid #ff4d4f' : '1px solid #f0f0f0', position: 'relative', cursor: deleted ? 'default' : 'pointer', transition: 'all .3s', opacity: deleted ? 0.7 : 1 }} className={deleted ? '' : 'album-card-hover'} onClick={deleted ? undefined : () => { setViewAlbum(a); const aid = urlAlbumId || albumIdRef.current; navigate(`/digital-album/${aid}/${a._catId}/${a._itemId}/${a.albumId}`) }}>
                  {deleted && (
                    <>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,77,79,.75)', zIndex: 2, fontSize: 18, color: '#fff', fontWeight: 700, letterSpacing: 2 }}>
                        已删除
                      </div>
                      <button onClick={e => { e.stopPropagation(); Modal.confirm({ title: '删除画册', content: '确定删除此画册吗？', okText: '确定', okType: 'danger', cancelText: '取消', onOk: () => removeAlbum(a._catId, a._itemId, a.albumId) }) }} style={{ position: 'absolute', top: 4, right: 4, width: 28, height: 28, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,.6)', color: '#fff', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, zIndex: 3 }}><CloseOutlined /></button>
                    </>
                  )}
                  <img src={coverUrl} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                  <div style={{ position: 'absolute', top: 4, left: 4, background: a.type === '组合' ? '#FF4D4F' : '#1677FF', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 8, lineHeight: 1.6 }}>{a.type === '组合' ? '组合' : '单品'}</div>
                    <div style={{ padding: '4px 8px', borderTop: '1px solid #f0f0f0' }}>
                      <div style={{ fontSize: 13, color: deleted ? '#bbb' : '#333', padding: '2px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center' }}>
                        {live?.name || (a.productName && a.productName !== '产品名称' ? a.productName : null) || (a.type === '组合' ? '未命名组合' : '产品名称')}
                      </div>
                    </div>
                </div>
                )
              })}
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
              <div style={{ fontSize: 16, fontWeight: 600, color: 'rgba(0,0,0,.88)' }}>{pendingType === '组合' ? '选择组合的礼品' : '选择礼品'}</div>
              <span onClick={() => { setShowPicker(false); setPickerPage(0) }} style={{ cursor: 'pointer', color: 'rgba(0,0,0,.25)', fontSize: 16, padding: 4, transition: 'color .3s' }}><CloseOutlined /></span>
            </div>
            {(() => {
              const source = giftAlbums
              const pageSize = 12
              const totalPages = Math.ceil(source.length / pageSize) || 1
              const pageAlbums = source.slice(pickerPage * pageSize, (pickerPage + 1) * pageSize)
              if (source.length === 0) {
                return (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', color: 'rgba(0,0,0,.25)', fontSize: 14 }}>
                    {pendingType === '组合' ? '暂无已生成的画册' : '暂无礼品数据'}
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
                              <div style={{ padding: '4px 8px', fontSize: 12, color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center' }}>{a.productName || '产品名称'}</div>
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
              <div style={{ fontSize: 16, fontWeight: 600, color: 'rgba(0,0,0,.88)' }}>选择组合的礼品</div>
              <span onClick={() => { setComboPickerOpen(false); setPickerPage(0) }} style={{ cursor: 'pointer', color: 'rgba(0,0,0,.25)', fontSize: 16, padding: 4, transition: 'color .3s' }}><CloseOutlined /></span>
            </div>
            {(() => {
              const pageSize = 12
              const filtered = giftAlbums.filter(a => !(currentViewAlbum?.comboItems || []).some(c => c.albumId === a.id))
              const totalPages = Math.ceil(filtered.length / pageSize) || 1
              const pageAlbums = filtered.slice(pickerPage * pageSize, (pickerPage + 1) * pageSize)
              if (filtered.length === 0) {
                return (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', color: 'rgba(0,0,0,.25)', fontSize: 14 }}>
                    暂无更多礼品可添加
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
                              <div style={{ padding: '4px 8px', fontSize: 12, color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center' }}>{a.productName || '产品名称'}</div>
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

      {titleModalOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => {}}
        >
          <div className="card" style={{ width: 380, padding: 24, position: 'relative' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'rgba(0,0,0,.88)', marginBottom: 16 }}>填写画册名称</div>
            <span onClick={() => setTitleModalOpen(false)} style={{ position: 'absolute', top: 16, right: 16, cursor: 'pointer', fontSize: 16, color: 'rgba(0,0,0,.45)' }}>✕</span>
            <input
              autoFocus
              value={titleInput}
              onChange={e => setTitleInput(e.target.value)}
              placeholder="请输入画册名称"
              style={{ width: '100%', height: 38, padding: '0 12px', fontSize: 15, border: '1px solid #d9d9d9', borderRadius: 6, outline: 'none', boxSizing: 'border-box' }}
              onKeyDown={e => { if (e.key === 'Enter' && titleInput.trim()) { const v = titleInput.trim(); setAlbumTitle(v); setTitleModalOpen(false); const t = localStorage.getItem('token'); if (t) fetch(`${API}/api/digital-album`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: JSON.stringify({ id: albumIdRef.current, categories, bannerUrl: globalBannerUrl, bannerTitle, albumTitle: v, bannerSubtitle }) }).catch(() => {}) } }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button className="btn btn-outline" onClick={() => setTitleModalOpen(false)}>取消</button>
              <button className="btn btn-primary" disabled={!titleInput.trim()} onClick={() => { const v = titleInput.trim(); setAlbumTitle(v); setTitleModalOpen(false); const t = localStorage.getItem('token'); if (t) fetch(`${API}/api/digital-album`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: JSON.stringify({ id: albumIdRef.current, categories, bannerUrl: globalBannerUrl, bannerTitle, albumTitle: v, bannerSubtitle }) }).catch(() => {}) }}>确定</button>
            </div>
          </div>
        </div>
      )}

      <TemplatePicker visible={templatePickerOpen} onClose={() => setTemplatePickerOpen(false)} currentTitle={bannerTitle} currentAlbumTitle={albumTitle} albumId={urlAlbumId} currentCategories={categories} />

      {renameTarget && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => { setRenameTarget(null); setRenameInput('') }}
        >
          <div className="card" style={{ width: 380, padding: 24, position: 'relative' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'rgba(0,0,0,.88)', marginBottom: 16 }}>请先填写组合名称</div>
            <span onClick={() => { setRenameTarget(null); setRenameInput('') }} style={{ position: 'absolute', top: 16, right: 16, cursor: 'pointer', fontSize: 16, color: 'rgba(0,0,0,.45)' }}>✕</span>
            <input
              autoFocus
              value={renameInput}
              onChange={e => setRenameInput(e.target.value)}
              placeholder="请输入组合名称"
              style={{ width: '100%', height: 38, padding: '0 12px', fontSize: 15, border: '1px solid #d9d9d9', borderRadius: 6, outline: 'none', boxSizing: 'border-box' }}
              onKeyDown={e => { if (e.key === 'Enter') handleRenameCombo() }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button className="btn btn-outline" onClick={() => { setRenameTarget(null); setRenameInput('') }}>取消</button>
              <button className="btn btn-primary" disabled={!renameInput.trim()} onClick={handleRenameCombo}>确定</button>
            </div>
          </div>
        </div>
      )}

    </div>
    </div>
  )
}
