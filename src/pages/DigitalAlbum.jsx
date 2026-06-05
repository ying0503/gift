import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
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
  const [viewAlbum, setViewAlbum] = useState(null)
  const [editingParams, setEditingParams] = useState(null)
  const [publishing, setPublishing] = useState(false)
  const [pubProgress, setPubProgress] = useState(0)

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
      if (al.albums) setAlbums(al.albums)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const save = useCallback(async (cats) => {
    const token = localStorage.getItem('token')
    if (!token) return
    setCategories(cats)
    await fetch(`${API}/api/digital-album`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ categories: cats }),
    })
  }, [])

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
    if (selectedCat === id) { setSelectedCat(null); setSelectedItem(null) }
  }, [categories, save, selectedCat])

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
    if (selectedItem === itemId) setSelectedItem(null)
  }, [categories, save, selectedItem])

  const removeAlbum = useCallback((catId, itemId, albumId) => {
    save(categories.map(c => c.id === catId ? { ...c, items: c.items.map(i => i.id === itemId ? { ...i, albums: i.albums.filter(a => a.albumId !== albumId) } : i) } : c))
  }, [categories, save])

  const updateProductParams = useCallback((catId, itemId, albumId, field, value) => {
    save(categories.map(c => c.id === catId ? {
      ...c, items: c.items.map(i => i.id === itemId ? {
        ...i, albums: i.albums.map(a => a.albumId === albumId ? {
          ...a, productParams: { ...(a.productParams || { spec: '', shelfLife: '', totalWeight: '', note: '' }), [field]: value }
        } : a)
      } : i)
    } : c))
  }, [categories, save])

  const openPicker = useCallback(() => {
    setPicked(new Set())
    setShowPicker(true)
  }, [])

  const togglePick = useCallback((id) => {
    setPicked(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }, [])

  const confirmPick = useCallback(() => {
    const catId = selectedCat
    const itemId = selectedItem
    if (!catId || !itemId) return
    const added = albums.filter(a => picked.has(a.id))
    save(categories.map(c => c.id === catId ? {
      ...c, items: c.items.map(i => i.id === itemId ? {
        ...i, albums: [...i.albums, ...added.map(a => ({
          albumId: a.id, imageUrl: a.imageUrl, prompt: a.prompt || '', model: a.config?.model || '', createdAt: a.createdAt, productParams: { spec: '', shelfLife: '', totalWeight: '', note: '' },
        }))]
      } : i)
    } : c))
    setShowPicker(false)
  }, [selectedCat, selectedItem, albums, picked, categories, save])

  const currentCat = categories.find(c => c.id === selectedCat)
  const currentItem = currentCat?.items.find(i => i.id === selectedItem)

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>加载中...</div>
  }

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', minHeight: 'calc(100vh - 120px)' }}>
      <div className="card" style={{ flex: '0 0 260px', padding: 0, marginBottom: 0, overflow: 'hidden', alignSelf: 'stretch', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: '#333' }}>目录</span>
          <button onClick={addCategory} style={{ background: 'none', border: 'none', color: '#1a1a2e', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '0 4px' }} title="添加分类">+</button>
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
                  onClick={() => { setSelectedCat(cat.id); setSelectedItem(null); setExpandedCats(s => new Set(s).add(cat.id)) }}
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

                  <span onClick={e => { e.stopPropagation(); startEdit(cat.id, cat.name) }} className="album-tree-action" title="重命名">✎</span>
                  <span onClick={e => { e.stopPropagation(); addItem(cat.id) }} className="album-tree-action album-tree-action-add" title="添加页面">+</span>
                  <span onClick={e => { e.stopPropagation(); deleteCategory(cat.id) }} className="album-tree-action" title="删除分类">✕</span>
                </div>
                {expandedCats.has(cat.id) && (
                  <div className="album-tree-children">
                    {cat.items.map(item => (
                      <div
                        key={item.id}
                        className={`album-tree-node album-tree-node-level2${selectedItem === item.id ? ' active' : ''}`}
                        onClick={() => { setSelectedCat(cat.id); setSelectedItem(item.id) }}
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
                        <span onClick={e => { e.stopPropagation(); startEdit(item.id, item.name) }} className="album-tree-action" title="重命名">✎</span>
                        <span onClick={e => { e.stopPropagation(); deleteItem(cat.id, item.id) }} className="album-tree-action" title="删除">✕</span>
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
        {(selectedCat || viewAlbum) && (
          <div className="card" style={{ padding: '10px 16px', marginBottom: 12, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
            <button className="btn btn-primary" style={{ fontSize: 14, padding: '6px 18px' }} onClick={() => {
              setPublishing(true); setPubProgress(0)
              const token = localStorage.getItem('token')
              if (token) {
                fetch(`${API}/api/album/publish`, {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${token}` },
                }).catch(() => {})
              }
              const start = Date.now()
              const id = setInterval(() => {
                const elapsed = Date.now() - start
                const pct = Math.min(Math.round(elapsed / 20), 100)
                setPubProgress(pct)
                if (pct >= 100) {
                  clearInterval(id)
                  setTimeout(() => navigate('/preview', { state: { categories } }), 300)
                }
              }, 30)
            }}>发布</button>
          </div>
        )}
        {viewAlbum ? (
          <div className="card" style={{ padding: 16, marginBottom: 0 }}>
            <button
              onClick={() => setViewAlbum(null)}
              className="btn btn-outline"
              style={{ marginBottom: 12, fontSize: 13, padding: '4px 12px' }}
            >← 返回</button>
            <img src={viewAlbum.imageUrl} alt="" style={{ width: '100%', borderRadius: 6, display: 'block' }} />
            {viewAlbum.prompt && (
              <div style={{ marginTop: 12, fontSize: 15, color: '#666', lineHeight: 1.6, wordBreak: 'break-word' }}>{viewAlbum.prompt}</div>
            )}
            <div style={{ marginTop: 8, fontSize: 14, color: '#999' }}>
              {viewAlbum.model || ''}{viewAlbum.model && viewAlbum.createdAt ? ' · ' : ''}{viewAlbum.createdAt ? new Date(viewAlbum.createdAt).toLocaleDateString('zh-CN') : ''}
              
            </div>
          </div>
        ) : selectedCat && currentCat && !selectedItem ? (
          <div className="card" style={{ padding: 16, marginBottom: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#333', marginBottom: 12 }}>{currentCat.name}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
              {currentCat.items.flatMap(i => (i.albums || []).map(a => ({ ...a, _pageName: i.name, _itemId: i.id }))).map((a, i) => (
                <div key={a.albumId + '-' + i} style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #eee', cursor: 'pointer' }} onClick={() => setViewAlbum(a)}>
                  <img src={a.imageUrl} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />

                  <div style={{ padding: '2px 10px 8px 14px', fontSize: 14, borderTop: '1px solid #f0f0f0' }} onClick={e => e.stopPropagation()}>
                    {editingParams === a.albumId ? (
                      <>
                        <div style={{ fontSize: 15, color: '#666', marginBottom: 6, fontWeight: 600, letterSpacing: 0.5, }}>产品参数</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                          <span style={{ color: '#888', whiteSpace: 'nowrap', flexShrink: 0, width: 56 }}>规格</span>
                          <textarea value={(a.productParams || {}).spec || ''} onChange={e => updateProductParams(selectedCat, a._itemId, a.albumId, 'spec', e.target.value)} style={{ flex: 1, fontSize: 13, padding: '4px 6px', border: '1px solid #d9d9d9', borderRadius: 4, resize: 'none', height: 120, lineHeight: 1.5, outline: 'none' }} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                          <span style={{ color: '#888', whiteSpace: 'nowrap', flexShrink: 0, width: 56 }}>保质期</span>
                          <input value={(a.productParams || {}).shelfLife || ''} onChange={e => updateProductParams(selectedCat, a._itemId, a.albumId, 'shelfLife', e.target.value)} style={{ flex: 1, fontSize: 13, padding: '4px 6px', border: '1px solid #d9d9d9', borderRadius: 4, outline: 'none' }} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                          <span style={{ color: '#888', whiteSpace: 'nowrap', flexShrink: 0, width: 56 }}>总重量</span>
                          <input value={(a.productParams || {}).totalWeight || ''} onChange={e => updateProductParams(selectedCat, a._itemId, a.albumId, 'totalWeight', e.target.value)} style={{ flex: 1, fontSize: 13, padding: '4px 6px', border: '1px solid #d9d9d9', borderRadius: 4, outline: 'none' }} />
                        </div>
                        <div style={{ marginTop: 24 }}>
                          <div style={{ color: '#e74c3c', fontSize: 12, marginBottom: 2 }}>温馨提示</div>
                          <input value={(a.productParams || {}).note || ''} onChange={e => updateProductParams(selectedCat, a._itemId, a.albumId, 'note', e.target.value)} style={{ width: '100%', fontSize: 12, padding: '4px 6px', border: '1px solid #d9d9d9', borderRadius: 4, outline: 'none', boxSizing: 'border-box' }} />
                        </div>
                        <button onClick={() => setEditingParams(null)} style={{ marginTop: 8, fontSize: 13, padding: '4px 16px', border: 'none', borderRadius: 4, background: '#1a1a2e', cursor: 'pointer', color: '#fff' }}>保存</button>
                      </>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ paddingTop: 4 }}>
                            <div style={{ fontSize: 15, color: '#666', marginBottom: 6, fontWeight: 600, letterSpacing: 0.5, }}>产品参数</div>
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
                            <div style={{ color: '#e74c3c', fontSize: 12, marginBottom: 2 }}>温馨提示</div>
                            <div style={{ color: '#e74c3c', whiteSpace: 'pre-wrap', fontSize: 12 }}>{(a.productParams || {}).note || '-'}</div>
                          </div>
                        </div>
                        <span onClick={() => setEditingParams(editingParams === a.albumId ? null : a.albumId)} style={{ cursor: 'pointer', color: '#bbb', fontSize: 15, flexShrink: 0, marginTop: 8, padding: '2px' }}>✎</span>
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
                <div key={a.albumId} style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #eee', position: 'relative', cursor: 'pointer' }} onClick={() => setViewAlbum(a)}>
                  <img src={a.imageUrl} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                  <div style={{ padding: '2px 10px 8px 14px', fontSize: 14, borderTop: '1px solid #f0f0f0' }} onClick={e => e.stopPropagation()}>
                    {editingParams === a.albumId ? (
                      <>
                        <div style={{ fontSize: 15, color: '#666', marginBottom: 6, fontWeight: 600, letterSpacing: 0.5, }}>产品参数</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                          <span style={{ color: '#888', whiteSpace: 'nowrap', flexShrink: 0, width: 56 }}>规格</span>
                          <textarea value={(a.productParams || {}).spec || ''} onChange={e => updateProductParams(selectedCat, selectedItem, a.albumId, 'spec', e.target.value)} style={{ flex: 1, fontSize: 13, padding: '4px 6px', border: '1px solid #d9d9d9', borderRadius: 4, resize: 'none', height: 120, lineHeight: 1.5, outline: 'none' }} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                          <span style={{ color: '#888', whiteSpace: 'nowrap', flexShrink: 0, width: 56 }}>保质期</span>
                          <input value={(a.productParams || {}).shelfLife || ''} onChange={e => updateProductParams(selectedCat, selectedItem, a.albumId, 'shelfLife', e.target.value)} style={{ flex: 1, fontSize: 13, padding: '4px 6px', border: '1px solid #d9d9d9', borderRadius: 4, outline: 'none' }} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                          <span style={{ color: '#888', whiteSpace: 'nowrap', flexShrink: 0, width: 56 }}>总重量</span>
                          <input value={(a.productParams || {}).totalWeight || ''} onChange={e => updateProductParams(selectedCat, selectedItem, a.albumId, 'totalWeight', e.target.value)} style={{ flex: 1, fontSize: 13, padding: '4px 6px', border: '1px solid #d9d9d9', borderRadius: 4, outline: 'none' }} />
                        </div>
                        <div style={{ marginTop: 24 }}>
                          <div style={{ color: '#e74c3c', fontSize: 12, marginBottom: 2 }}>温馨提示</div>
                          <input value={(a.productParams || {}).note || ''} onChange={e => updateProductParams(selectedCat, selectedItem, a.albumId, 'note', e.target.value)} style={{ width: '100%', fontSize: 12, padding: '4px 6px', border: '1px solid #d9d9d9', borderRadius: 4, outline: 'none', boxSizing: 'border-box' }} />
                        </div>
                        <button onClick={() => setEditingParams(null)} style={{ marginTop: 8, fontSize: 13, padding: '4px 16px', border: 'none', borderRadius: 4, background: '#1a1a2e', cursor: 'pointer', color: '#fff' }}>保存</button>
                      </>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ paddingTop: 4 }}>
                            <div style={{ fontSize: 15, color: '#666', marginBottom: 6, fontWeight: 600, letterSpacing: 0.5, }}>产品参数</div>
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
                            <div style={{ color: '#e74c3c', fontSize: 12, marginBottom: 2 }}>温馨提示</div>
                            <div style={{ color: '#e74c3c', whiteSpace: 'pre-wrap', fontSize: 12 }}>{(a.productParams || {}).note || '-'}</div>
                          </div>
                        </div>
                        <span onClick={() => setEditingParams(editingParams === a.albumId ? null : a.albumId)} style={{ cursor: 'pointer', color: '#bbb', fontSize: 15, flexShrink: 0, marginTop: 8, padding: '2px' }}>✎</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); removeAlbum(selectedCat, selectedItem, a.albumId) }}
                    style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,.4)', color: '#fff', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                  >✕</button>
                </div>
              ))}
              <div
                onClick={openPicker}
                style={{ borderRadius: 8, border: '2px dashed #d9d9d9', aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#bbb', fontSize: 15, gap: 4 }}
              >
                <span style={{ fontSize: 26 }}>+</span>
                <span>添加画册</span>
              </div>
            </div>
          </div>
        ) : selectedCat && currentCat ? (
          <div className="card" style={{ padding: 60, textAlign: 'center', color: '#999' }}>
            请在左侧选择一个页面
          </div>
        ) : (
          <div className="card" style={{ padding: 60, textAlign: 'center', color: '#999' }}>
            请先在左侧添加分类和页面
          </div>
        )}
      </div>

      {showPicker && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowPicker(false)}
        >
          <div className="card" style={{ width: '90%', maxWidth: 640, maxHeight: '80vh', display: 'flex', flexDirection: 'column', padding: 20, marginBottom: 0 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 12 }}>选择画册</div>
            {albums.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#999', fontSize: 15 }}>
                暂无已生成的画册，请先去「画册生成」页面生成
              </div>
            ) : (
              <div style={{ flex: 1, overflow: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10, marginBottom: 12 }}>
                {albums.map(a => {
                  const isPicked = picked.has(a.id)
                  return (
                    <div
                      key={a.id}
                      onClick={() => togglePick(a.id)}
                      style={{ cursor: 'pointer', borderRadius: 6, overflow: 'hidden', border: isPicked ? '2px solid #1a1a2e' : '2px solid #eee', position: 'relative' }}
                    >
                      {isPicked && (
                        <div style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', background: '#1a1a2e', color: '#fff', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>✓</div>
                      )}
                      <img src={a.imageUrl} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                      <div style={{ padding: '6px 8px', fontSize: 13, color: '#666', lineHeight: 1.4 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.prompt ? a.prompt.slice(0, 20) : a.config?.model || ''}</div>
                        <div style={{ color: '#999', marginTop: 2 }}>{new Date(a.createdAt).toLocaleDateString('zh-CN')}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-outline" onClick={() => setShowPicker(false)}>取消</button>
              <button className="btn btn-primary" disabled={picked.size === 0} onClick={confirmPick}>添加 ({picked.size})</button>
            </div>
          </div>
        </div>
      )}

      {publishing && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(255,255,255,.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#333' }}>正在发布...</div>
          <div style={{ width: 280, height: 6, background: '#eee', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${pubProgress}%`, height: '100%', background: 'linear-gradient(90deg, #1a1a2e, #4a4a8e)', borderRadius: 3, transition: 'width .05s linear' }} />
          </div>
        </div>
      )}
    </div>
  )
}
