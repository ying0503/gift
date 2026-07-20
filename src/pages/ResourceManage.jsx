import { useState, useEffect } from 'react'
import { API } from '../AuthContext'
import AdminSidebar from '../components/AdminSidebar'

const resourceCategories = ['礼品卡', '礼品册', '礼品券', '画册封面', '封套']
const emptyForm = { name: '', cover: '', resourceUrl: '', resourceFileName: '', category: '' }

export default function ResourceManage() {
  const [resources, setResources] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [uploading, setUploading] = useState('')
  const [batchOpen, setBatchOpen] = useState(false)
  const [batchClosing, setBatchClosing] = useState(false)
  const [batchFiles, setBatchFiles] = useState([])
  const [batchCategory, setBatchCategory] = useState('')
  const [batchProgress, setBatchProgress] = useState(0)
  const [batchTotal, setBatchTotal] = useState(0)
  const [batchUploading, setBatchUploading] = useState(false)

  const load = () => {
    const token = localStorage.getItem('token')
    fetch(`${API}/api/resources`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setResources(data.resources || []))
      .catch(() => {})
  }

  useEffect(() => { load() }, [])

  const handleClose = () => {
    setClosing(true)
    setTimeout(() => { setClosing(false); setModalOpen(false) }, 250)
  }

  const openCreate = () => {
    setEditing(null)
    setForm({ ...emptyForm })
    setClosing(false)
    setModalOpen(true)
  }

  const openEdit = (r) => {
    setEditing(r)
    setForm({ name: r.name, cover: r.cover || '', resourceUrl: r.resourceUrl, resourceFileName: r.resourceUrl?.split('/').pop() || '', category: r.category || '' })
    setModalOpen(true)
  }

  const uploadFile = (file, type) => {
    if (!file) return
    setUploading(type)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const base64 = ev.target?.result
      if (typeof base64 === 'string') {
        fetch(`${API}/api/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
          body: JSON.stringify({ image: base64, filename: file.name }),
        })
          .then(r => r.json())
          .then(data => { if (data.url) setForm(f => ({ ...f, [type === 'cover' ? 'cover' : 'resourceUrl']: data.url, ...(type === 'resource' ? { resourceFileName: file.name } : {}) })); else alert(data.error || '上传失败') })
          .catch(() => { alert('上传请求失败') })
          .finally(() => setUploading(''))
      }
    }
    reader.onerror = () => { alert('文件读取失败'); setUploading('') }
    reader.readAsDataURL(file)
  }

  const save = () => {
    if (!form.name) return
    const token = localStorage.getItem('token')
    const url = editing ? `${API}/api/resources/${editing.id}` : `${API}/api/resources`
    const method = editing ? 'PUT' : 'POST'
    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    })
      .then(r => r.json())
      .then(() => { handleClose(); load() })
      .catch(() => {})
  }

  const handleBatchClose = () => {
    setBatchClosing(true)
    setTimeout(() => { setBatchClosing(false); setBatchOpen(false); setBatchFiles([]); setBatchCategory(''); setBatchProgress(0); setBatchTotal(0) }, 250)
  }

  const uploadOne = (file) => {
    return new Promise((resolve, reject) => {
      const r = new FileReader()
      r.onload = e => resolve(e.target.result)
      r.onerror = reject
      r.readAsDataURL(file)
    }).then(base64 => {
      return fetch(`${API}/api/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ image: base64, filename: file.name }),
      }).then(r => r.json())
    })
  }

  const startBatchUpload = async () => {
    if (!batchFiles.length || !batchCategory) return
    setBatchUploading(true)
    setBatchTotal(batchFiles.length)
    const token = localStorage.getItem('token')
    let done = 0
    for (const file of batchFiles) {
      try {
        const uploadData = await uploadOne(file)
        if (uploadData.url) {
          await fetch(`${API}/api/resources`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ name: file.name.replace(/\.[^.]+$/, ''), cover: '', resourceUrl: uploadData.url, category: batchCategory }),
          })
        }
      } catch (e) {}
      done++
      setBatchProgress(done)
    }
    setBatchUploading(false)
    handleBatchClose()
    load()
  }

  const remove = (id) => {
    if (!confirm('确定删除？')) return
    const token = localStorage.getItem('token')
    fetch(`${API}/api/resources/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(() => load())
      .catch(() => {})
  }

  return (
    <div style={{ display: 'flex', height: '100%', background: '#f5f5f5' }}>
      <AdminSidebar />
      <div style={{ flex: 1, padding: 24, overflow: 'auto' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#333', marginBottom: 4 }}>资源管理</h1>
              <p style={{ fontSize: 13, color: '#999', margin: 0 }}>上传和管理资源文件</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setBatchFiles([]); setBatchCategory(''); setBatchProgress(0); setBatchTotal(0); setBatchClosing(false); setBatchOpen(true) }}
                style={{ padding: '8px 20px', border: '1px solid #1677FF', borderRadius: 6, background: '#fff', fontSize: 14, color: '#1677FF', cursor: 'pointer' }}>批量新增</button>
              <button onClick={openCreate} style={{ padding: '8px 20px', background: '#1677FF', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, cursor: 'pointer' }}>新增资源</button>
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: 8 }}>
            {resources.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#999', fontSize: 14 }}>暂无资源</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: '#666', fontWeight: 600 }}>封面</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: '#666', fontWeight: 600 }}>名称</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: '#666', fontWeight: 600 }}>资源文件</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: '#666', fontWeight: 600 }}>分类</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: '#666', fontWeight: 600 }}>上传时间</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13, color: '#666', fontWeight: 600 }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {resources.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '10px 16px' }}>
                        {r.cover ? (
                          <img src={r.cover} alt="" style={{ width: 48, height: 48, borderRadius: 4, objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 48, height: 48, borderRadius: 4, background: '#f5f5f5' }} />
                        )}
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 14, color: '#333' }}>{r.name}</td>
                      <td style={{ padding: '10px 16px', fontSize: 13, color: '#999' }}>
                        {r.resourceUrl ? (
                          <a href={r.resourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#1677FF', textDecoration: 'none' }}>
                            {r.resourceUrl.split('/').pop()}
                          </a>
                        ) : '-'}
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 13, color: '#666' }}>{r.category || '-'}</td>
                      <td style={{ padding: '10px 16px', fontSize: 13, color: '#999' }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                        <button onClick={() => openEdit(r)} style={{ padding: '4px 12px', border: '1px solid #d9d9d9', borderRadius: 4, background: '#fff', fontSize: 13, cursor: 'pointer', marginRight: 8 }}>编辑</button>
                        <button onClick={() => remove(r.id)} style={{ padding: '4px 12px', border: '1px solid #ff4d4f', borderRadius: 4, background: '#fff', fontSize: 13, color: '#ff4d4f', cursor: 'pointer' }}>删除</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000 }} onClick={handleClose}>
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, width: 480, background: '#fff',
          boxShadow: '-4px 0 16px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column',
          animation: closing ? 'slideOutRight .25s ease forwards' : 'slideInRight .25s ease',
        }} onClick={e => e.stopPropagation()}>
          <style>{`@keyframes slideInRight { from { transform: translateX(100%) } to { transform: translateX(0) } }@keyframes slideOutRight { from { transform: translateX(0) } to { transform: translateX(100%) } }`}</style>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#333' }}>{editing ? '编辑资源' : '新增资源'}</div>
            <svg onClick={handleClose} style={{ cursor: 'pointer' }} width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M15 5L5 15M5 5l10 10" stroke="#999" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 6 }}>名称</div>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="请输入资源名称"
                style={{ width: '100%', height: 40, border: '1px solid #d9d9d9', borderRadius: 6, padding: '0 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 6 }}>封面</div>
              <label style={{ display: 'block', width: 140, height: 140, border: '2px dashed #d9d9d9', borderRadius: 8, cursor: 'pointer', background: form.cover ? `url(${form.cover}) center/cover no-repeat` : '#fafafa', position: 'relative' }}>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => uploadFile(e.target.files[0], 'cover')} />
                {!form.cover && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#999' }}>
                    {uploading === 'cover' ? '上传中...' : '点击上传'}
                  </div>
                )}
              </label>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 6 }}>资源文件</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: '2px dashed #d9d9d9', borderRadius: 8, cursor: 'pointer', background: '#fafafa' }}>
                <input type="file" style={{ display: 'none' }} onChange={e => uploadFile(e.target.files[0], 'resource')} />
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2v10m0 0l-3-3m3 3l3-3m-6 6h6" stroke="#999" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span style={{ fontSize: 14, color: form.resourceUrl ? '#333' : '#999' }}>
                  {uploading === 'resource' ? '上传中...' : (form.resourceFileName ? `${form.resourceFileName} 已上传成功` : '选择文件')}
                </span>
              </label>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 6 }}>资源分类</div>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                style={{ width: '100%', height: 40, border: '1px solid #d9d9d9', borderRadius: 6, padding: '0 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff' }}>
                <option value="">请选择分类</option>
                {resourceCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', padding: '16px 24px', borderTop: '1px solid #f0f0f0' }}>
            <button onClick={handleClose} style={{ padding: '8px 20px', border: '1px solid #d9d9d9', borderRadius: 6, background: '#fff', fontSize: 14, cursor: 'pointer' }}>取消</button>
            <button onClick={save} style={{ padding: '8px 20px', background: '#1677FF', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, cursor: 'pointer' }}>保存</button>
          </div>
        </div>
        </div>
      )}

      {batchOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000 }} onClick={handleBatchClose}>
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, width: 480, background: '#fff',
          boxShadow: '-4px 0 16px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column',
          animation: batchClosing ? 'slideOutRight .25s ease forwards' : 'slideInRight .25s ease',
        }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#333' }}>批量新增</div>
            <svg onClick={handleBatchClose} style={{ cursor: 'pointer' }} width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M15 5L5 15M5 5l10 10" stroke="#999" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 10 }}>资源分类</div>
              <select value={batchCategory} onChange={e => setBatchCategory(e.target.value)}
                style={{ width: '100%', height: 40, border: '1px solid #d9d9d9', borderRadius: 6, padding: '0 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff' }}>
                <option value="">请选择分类</option>
                {resourceCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 10 }}>选择文件</div>
              <label style={{ display: 'block', padding: '24px', border: '2px dashed #d9d9d9', borderRadius: 8, cursor: 'pointer', background: '#fafafa', textAlign: 'center' }}>
                <input type="file" multiple style={{ display: 'none' }} onChange={e => { const files = Array.from(e.target.files || []); setBatchFiles(files) }} />
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ marginBottom: 8 }}><path d="M12 4v12m0 0l-4-4m4 4l4-4m-6 8h6" stroke="#999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <div style={{ fontSize: 14, color: '#999' }}>{batchFiles.length ? `已选择 ${batchFiles.length} 个文件` : '点击选择多个文件'}</div>
              </label>
              {batchFiles.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  {batchFiles.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: '#f9f9f9', borderRadius: 4, marginBottom: 4, fontSize: 13, color: '#555' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{f.name}</span>
                      <svg onClick={() => setBatchFiles(prev => prev.filter((_, idx) => idx !== i))} style={{ cursor: 'pointer', flexShrink: 0 }} width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M10.5 3.5l-7 7M3.5 3.5l7 7" stroke="#999" strokeWidth="1.2" strokeLinecap="round"/></svg>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {batchUploading && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 6 }}>上传进度</div>
                <div style={{ height: 8, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${batchTotal ? (batchProgress / batchTotal) * 100 : 0}%`, background: '#1677FF', borderRadius: 4, transition: 'width .3s' }} />
                </div>
                <div style={{ fontSize: 13, color: '#999', marginTop: 4 }}>{batchProgress} / {batchTotal}</div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', padding: '16px 24px', borderTop: '1px solid #f0f0f0' }}>
            <button onClick={handleBatchClose} disabled={batchUploading} style={{ padding: '8px 20px', border: '1px solid #d9d9d9', borderRadius: 6, background: '#fff', fontSize: 14, cursor: 'pointer' }}>取消</button>
            <button onClick={startBatchUpload} disabled={!batchCategory || batchUploading}
              style={{ padding: '8px 20px', background: !batchCategory || batchUploading ? '#ccc' : '#1677FF', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, cursor: !batchCategory || batchUploading ? 'not-allowed' : 'pointer' }}>
              {batchUploading ? '上传中...' : '批量新增'}
            </button>
          </div>
        </div>
        </div>
      )}
    </div>
  )
}
