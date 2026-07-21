import { useState, useEffect } from 'react'
import { API } from '../AuthContext'
import AdminSidebar from '../components/AdminSidebar'

const resourceCategories = ['礼品卡', '礼品册', '礼品券', '画册封面', '封套']
const emptyForm = { name: '', cover: '', resourceUrl: '', resourceFileName: '', category: '' }

export default function ResourceManage() {
  const [resources, setResources] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [uploading, setUploading] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [batchOpen, setBatchOpen] = useState(false)
  const [batchClosing, setBatchClosing] = useState(false)
  const [batchFiles, setBatchFiles] = useState([])
  const [batchCategory, setBatchCategory] = useState('')
  const [batchProgress, setBatchProgress] = useState(0)
  const [batchTotal, setBatchTotal] = useState(0)
  const [batchUploading, setBatchUploading] = useState(false)
  const [batchProgresses, setBatchProgresses] = useState({})

  const load = (p) => {
    const token = localStorage.getItem('token')
    const pg = p || page
    fetch(`${API}/api/resources?page=${pg}&limit=50`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setResources(data.resources || [])
        setTotal(data.total || 0)
        if (p) setPage(p)
      })
      .catch(() => {})
  }

  useEffect(() => { load(1) }, [])

  const handleClose = () => {
    if (uploading && !window.confirm('资源正在上传中，确定关闭吗？')) return
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

  const uploadFile = async (file, type) => {
    if (!file) return
    setUploading(type)
    setUploadProgress(0)
    try {
      const token = localStorage.getItem('token')
      const presign = await fetch(`${API}/api/upload/presign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ filename: file.name }),
      }).then(r => r.json())
      if (!presign.url) { alert(presign.error || '获取上传地址失败'); setUploading(''); return }
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', presign.url)
        xhr.setRequestHeader('Content-Type', 'application/octet-stream')
        xhr.upload.onprogress = e => { if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100)) }
        xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`${xhr.status} ${xhr.responseText.slice(0, 100)}`))
        xhr.onerror = () => reject(new Error('网络错误'))
        xhr.send(file)
      })
      setForm(f => ({ ...f, [type === 'cover' ? 'cover' : 'resourceUrl']: presign.ossUrl, ...(type === 'resource' ? { resourceFileName: file.name } : {}) }))
    } catch (e) { alert('上传失败: ' + e.message); setUploading('') }
    setUploading('')
    setUploadProgress(0)
  }

  const save = () => {
    if (!form.name) return
    if (uploading) return
    const token = localStorage.getItem('token')
    const url = editing ? `${API}/api/resources/${editing.id}` : `${API}/api/resources`
    const method = editing ? 'PUT' : 'POST'
    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    })
      .then(r => r.json())
      .then(() => { handleClose(); load(page) })
      .catch(() => {})
  }

  const handleBatchClose = () => {
    if (batchUploading && !window.confirm('资源正在上传中，确定关闭吗？')) return
    setBatchClosing(true)
    setTimeout(() => { setBatchClosing(false); setBatchOpen(false); setBatchFiles([]); setBatchCategory(''); setBatchProgress(0); setBatchTotal(0); setBatchProgresses({}) }, 250)
  }

  const uploadOne = async (file, onProgress) => {
    const token = localStorage.getItem('token')
    const presign = await fetch(`${API}/api/upload/presign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ filename: file.name }),
    }).then(r => r.json())
    if (!presign.url) throw new Error(presign.error || '获取上传地址失败')
    if (onProgress) {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.onprogress = e => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100))
        xhr.onload = () => xhr.status === 200 ? resolve({ url: presign.ossUrl }) : reject(new Error(String(xhr.status)))
        xhr.onerror = () => reject(new Error('网络错误'))
        xhr.open('PUT', presign.url)
        xhr.setRequestHeader('Content-Type', 'application/octet-stream')
        xhr.send(file)
      })
    } else {
      const uploadRes = await fetch(presign.url, { method: 'PUT', body: file, headers: { 'Content-Type': 'application/octet-stream' } })
      if (!uploadRes.ok) { const errText = await uploadRes.text().catch(() => ''); throw new Error(`${uploadRes.status} ${errText.slice(0, 100)}`) }
      return { url: presign.ossUrl }
    }
  }

  const startBatchUpload = async () => {
    if (!batchFiles.length || !batchCategory) return
    setBatchUploading(true)
    setBatchTotal(batchFiles.length)
    const token = localStorage.getItem('token')
    let done = 0
    for (let i = 0; i < batchFiles.length; i++) {
      const file = batchFiles[i]
      try {
        const uploadData = await uploadOne(file, p => setBatchProgresses(prev => ({ ...prev, [i]: p })))
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
    load(1)
  }

  const remove = (id) => {
    if (!confirm('确定删除？')) return
    const token = localStorage.getItem('token')
    fetch(`${API}/api/resources/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(() => load(page))
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
            {total > 50 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0' }}>
                <button onClick={() => load(page - 1)} disabled={page <= 1}
                  style={{ padding: '4px 12px', border: '1px solid #d9d9d9', borderRadius: 4, background: page <= 1 ? '#f5f5f5' : '#fff', fontSize: 13, color: page <= 1 ? '#ccc' : '#333', cursor: page <= 1 ? 'not-allowed' : 'pointer' }}>
                  上一页
                </button>
                <span style={{ fontSize: 13, color: '#666' }}>{page} / {Math.ceil(total / 50)}</span>
                <button onClick={() => load(page + 1)} disabled={page >= Math.ceil(total / 50)}
                  style={{ padding: '4px 12px', border: '1px solid #d9d9d9', borderRadius: 4, background: page >= Math.ceil(total / 50) ? '#f5f5f5' : '#fff', fontSize: 13, color: page >= Math.ceil(total / 50) ? '#ccc' : '#333', cursor: page >= Math.ceil(total / 50) ? 'not-allowed' : 'pointer' }}>
                  下一页
                </button>
                <span style={{ fontSize: 12, color: '#999' }}>共 {total} 条</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.15)' }}>
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
                {form.cover && (
                  <svg onClick={() => setForm(f => ({ ...f, cover: '' }))} style={{ position: 'absolute', top: 4, right: 4, cursor: 'pointer', background: 'rgba(0,0,0,0.4)', borderRadius: '50%', padding: 2 }} width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4l8 8" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>
                )}
              </label>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 6 }}>资源文件</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: '2px dashed #d9d9d9', borderRadius: 8, cursor: uploading ? 'not-allowed' : 'pointer', background: '#fafafa', position: 'relative', overflow: 'hidden', pointerEvents: uploading ? 'none' : 'auto' }}>
                {uploading === 'resource' && (
                  <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${uploadProgress}%`, background: '#e6f4ff', transition: 'width .3s' }} />
                )}
                <input type="file" style={{ display: 'none' }} disabled={!!uploading} onChange={e => uploadFile(e.target.files[0], 'resource')} />
                <svg style={{ position: 'relative', zIndex: 1 }} width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2v10m0 0l-3-3m3 3l3-3m-6 6h6" stroke="#999" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span style={{ fontSize: 14, color: form.resourceUrl ? '#333' : '#999', flex: 1, position: 'relative', zIndex: 1 }}>
                  {uploading === 'resource' ? `上传中 ${uploadProgress}%` : (form.resourceFileName ? `${form.resourceFileName} 已上传成功` : '资源文件')}
                </span>
                {form.resourceUrl && (
                  <svg onClick={e => { e.stopPropagation(); setForm(f => ({ ...f, resourceUrl: '', resourceFileName: '' })) }} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', zIndex: 1 }} width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4l8 8" stroke="#999" strokeWidth="1.5" strokeLinecap="round"/></svg>
                )}
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.15)' }}>
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
              <div style={{ fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 10 }}>资源文件</div>
              <label style={{ display: 'block', padding: '24px', border: '2px dashed #d9d9d9', borderRadius: 8, cursor: batchUploading ? 'not-allowed' : 'pointer', background: '#fafafa', textAlign: 'center', pointerEvents: batchUploading ? 'none' : 'auto' }}>
                <input type="file" multiple style={{ display: 'none' }} disabled={batchUploading} onChange={e => { const files = Array.from(e.target.files || []); setBatchFiles(prev => [...prev, ...files]) }} />
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ marginBottom: 8 }}><path d="M12 4v12m0 0l-4-4m4 4l4-4m-6 8h6" stroke="#999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <div style={{ fontSize: 14, color: '#999' }}>{batchFiles.length ? `已选择 ${batchFiles.length} 个文件` : '资源文件'}</div>
              </label>
              {batchFiles.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  {batchFiles.map((f, i) => {
                    const p = batchProgresses[i]
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '6px 10px', background: '#f9f9f9', borderRadius: 4, marginBottom: 4, fontSize: 13, color: '#555', position: 'relative', overflow: 'hidden' }}>
                        {p != null && <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${p}%`, background: '#e6f4ff', transition: 'width .3s' }} />}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, position: 'relative', zIndex: 1 }}>{f.name}</span>
                        {p != null && <span style={{ fontSize: 12, color: '#1677FF', flexShrink: 0, marginLeft: 8, position: 'relative', zIndex: 1 }}>{p}%</span>}
                        {p == null && !batchUploading && (
                          <svg onClick={() => setBatchFiles(prev => prev.filter((_, idx) => idx !== i))} style={{ cursor: 'pointer', flexShrink: 0 }} width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M10.5 3.5l-7 7M3.5 3.5l7 7" stroke="#999" strokeWidth="1.2" strokeLinecap="round"/></svg>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
          </div>
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
