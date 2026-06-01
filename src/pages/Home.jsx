import { useState, useRef, useEffect, useMemo } from 'react'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import { API } from '../AuthContext'

const RATIOS = ['auto', '1:1', '16:9', '9:16', '4:3', '3:4']

export default function Home() {
  const [size, setSize] = useState('auto')
  const [image_size, setImageSize] = useState('1K')
  const [model, setModel] = useState('maiziai-chatgpt-image-2')
  const [excelData, setExcelData] = useState(null)
  const [excelFileName, setExcelFileName] = useState('')
  const [excelError, setExcelError] = useState('')
  const [excelImages, setExcelImages] = useState(null)
  const [excelMerges, setExcelMerges] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [promptText, setPromptText] = useState('')

  const [generations, setGenerations] = useState([])
  const pollTimers = useRef({})

  const computedPrompt = useMemo(() => {
    const rows = excelData ? excelData.slice(1) : []
    let products
    if (rows.length) {
      products = rows.map((row, i) => {
        const name = row[1] || row[0]
        const desc = row[2] ? String(row[2]).slice(0, 80) : ''
        return `${i + 1}. ${name}${desc ? ` - ${desc}` : ''}`
      }).join('\n')
    } else {
      products = '（请导入 Excel 数据）'
    }
    return `${size && size !== 'auto' ? `比例为${size}的` : ''}营销图片

礼品规格：
${products}`
  }, [size, excelData])

  useEffect(() => {
    setPromptText(computedPrompt)
  }, [computedPrompt])

  const excelInputRef = useRef()

  const onExcelFile = async (file) => {
    setExcelError('')
    setExcelData(null)
    setExcelFileName('')
    setExcelImages(null)

    if (!file) return

    const ext = file.name.split('.').pop().toLowerCase()
    if (!['xlsx', 'xls'].includes(ext)) {
      setExcelError('仅支持 .xlsx 和 .xls 格式文件')
      return
    }

    try {
      const arrayBuffer = await file.arrayBuffer()

      const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false, cellDates: true })

      const merges = sheet['!merges'] || []
      const mergeMap = {}
      for (const m of merges) {
        for (let r = m.s.r; r <= m.e.r; r++) {
          for (let c = m.s.c; c <= m.e.c; c++) {
            const key = `${r}:${c}`
            if (r === m.s.r && c === m.s.c) {
              mergeMap[key] = { rowSpan: m.e.r - m.s.r + 1, colSpan: m.e.c - m.s.c + 1, anchor: true }
            } else {
              mergeMap[key] = { anchor: false }
            }
          }
        }
      }

      if (!json || json.length === 0) {
        setExcelError('文件为空，请检查内容')
        return
      }

      const filtered = json.filter(row => row.some(cell => String(cell).trim() !== ''))

      if (filtered.length === 0) {
        setExcelError('文件为空，请检查内容')
        return
      }

      // Extract images from xlsx via JSZip
      const zip = await JSZip.loadAsync(arrayBuffer)
      const mediaFolder = zip.folder('xl/media')
      const imageMap = {}

      if (mediaFolder) {
        const imageFiles = []
        mediaFolder.forEach((path, entry) => {
          if (!entry.dir) imageFiles.push(entry)
        })

        if (imageFiles.length > 0) {
          // Try to parse drawing XML for row mapping
          const drawingFiles = {}
          const drawingsFolder = zip.folder('xl/drawings')
          if (drawingsFolder) {
            drawingsFolder.forEach((path, entry) => {
              if (!entry.dir) drawingFiles[path] = entry
            })
          }

          // Parse drawing XML -> relationships -> map image to row
          let rowToImages = {}

          for (const [dPath, dEntry] of Object.entries(drawingFiles)) {
            const dContent = await dEntry.async('string')

            // Find relationships file
            const dName = dPath.replace('.xml', '')
            const relsPath = `xl/drawings/_rels/${dName}.xml.rels`
            const relsEntry = zip.file(relsPath)
            let relsMap = {}
            if (relsEntry) {
              const relsContent = await relsEntry.async('string')
              const relMatches = relsContent.matchAll(/<Relationship\s+Id="([^"]+)"[^>]*Target="([^"]+)"/g)
              for (const m of relMatches) {
                const target = m[2].replace('..\\', '').replace('../', '')
                relsMap[m[1]] = target
              }
            }

            const picMatches = dContent.matchAll(
              /<xdr:from>[\s\S]*?<xdr:col>(\d+)<\/xdr:col>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>[\s\S]*?<\/xdr:from>[\s\S]*?<a:blip\s+r:embed="([^"]+)"/g
            )
            for (const m of picMatches) {
              const col = parseInt(m[1])
              const row = parseInt(m[2])
              const rId = m[3]
              const imgPath = relsMap[rId]
              if (imgPath) {
                const imgEntry = zip.file(imgPath) || zip.file(`xl/${imgPath}`)
                if (imgEntry) {
                  if (!rowToImages[row]) rowToImages[row] = []
                  rowToImages[row].push({ col, entry: imgEntry })
                }
              }
            }
          }

          // Fallback: if no drawing mapping, show all images at end
          if (Object.keys(rowToImages).length === 0) {
            rowToImages = { _all: imageFiles }
          }

          // Convert to blob URLs
          const resolved = {}
          for (const [key, entries] of Object.entries(rowToImages)) {
            resolved[key] = await Promise.all(
              entries.map(async (item) => {
                const entry = item.entry || item
                const blob = await entry.async('blob')
                const dataUrl = await new Promise(resolve => {
                  const r = new FileReader()
                  r.onloadend = () => resolve(r.result)
                  r.readAsDataURL(blob)
                })
                return { url: dataUrl, blob, col: item.col }
              })
            )
          }
          imageMap._mapped = Object.keys(rowToImages).length > 0 && !rowToImages._all
          imageMap.data = resolved
        }
      }

      setExcelImages(imageMap)
      setExcelMerges(mergeMap)
      setExcelData(filtered)
      setExcelFileName(file.name)
    } catch {
      setExcelError('文件解析失败，请确认文件格式正确')
    }
  }

  const onExcelDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer?.files?.[0]
    if (file) onExcelFile(file)
  }

  const onExcelDragOver = (e) => { e.preventDefault(); e.currentTarget.style.background = 'rgba(26,26,46,0.06)' }
  const onExcelDragLeave = (e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.85)' }

  const clearExcel = () => {
    setExcelData(null)
    setExcelFileName('')
    setExcelError('')
    setExcelImages(null)
    setExcelMerges(null)
  }

  const canGenerate = model && excelData

  const handleGenerate = async () => {
    if (!model) return alert('请选择模型')
    if (!excelData) return alert('请导入 Excel 数据')

    setGenerating(true)

    const token = localStorage.getItem('token')
    if (!token) {
      alert('请先登录')
      setGenerating(false)
      return
    }

    const id = Date.now()
    setGenerations(g => [...g, { id, taskId: null, progress: 0, statusText: '准备中...', imageUrl: null, error: null, finished: false }])

    try {
      const imgs = getOrderedImageUrls(excelImages)
      const sized = imgs.length ? await Promise.all(imgs.map(ensureMinSize)) : []
      const sendImages = sized.length > 4 ? await compositeToGrid(sized) : sized

      const res = await fetch(`${API}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          config: { size, model, image_size, prompt: promptText },
          excel: excelData,
          images: sendImages.length ? sendImages : undefined,
        }),
      })

      const r = await res.json()
      if (!res.ok) throw new Error(r.error || '请求失败')

      setGenerations(g => g.map(item => item.id === id ? { ...item, taskId: r.taskId, statusText: '任务已提交' } : item))
      startPolling(id, r.taskId, token)
    } catch (err) {
      setGenerations(g => g.map(item => item.id === id ? { ...item, error: err.message } : item))
      setGenerating(false)
    }
  }

  function startPolling(id, taskId, token) {
    let cancelled = false, realDone = false

    const sim = setInterval(() => {
      if (cancelled || realDone) return
      setGenerations(g => g.map(item => {
        if (item.id !== id) return item
        const p = item.progress >= 95 ? item.progress : Math.min(item.progress + Math.floor(Math.random() * 5) + 1, 95)
        let s = item.statusText
        if (p < 20) s = '正在提交任务...'
        else if (p < 40) s = 'AI 模型加载中...'
        else if (p < 60) s = '正在生成画册...'
        else if (p < 80) s = '正在优化画面细节...'
        else s = '即将完成...'
        return { ...item, progress: p, statusText: s }
      }))
    }, 800)

    const poll = async () => {
      try {
        const r = await fetch(`${API}/api/generate/status?taskId=${taskId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const res = await r.json()
        if (!r.ok || cancelled) return

        if (res.progress === -1) {
          realDone = true; clearInterval(sim)
          setGenerations(g => g.map(item => item.id === id ? { ...item, error: res.statusText || '生成失败' } : item))
          setGenerating(false)
          return
        }
        if (res.imageUrl) {
          realDone = true; clearInterval(sim)
          setGenerations(g => g.map(item => item.id === id ? { ...item, progress: 100, imageUrl: res.imageUrl, statusText: '生成完成！', finished: true } : item))
          setGenerating(false)
          return
        }
        if (res.taskStatus === 'FAILED') {
          realDone = true; clearInterval(sim)
          setGenerations(g => g.map(item => item.id === id ? { ...item, error: res.statusText || '生成失败' } : item))
          setGenerating(false)
          return
        }
        pollTimers.current[id] = setTimeout(poll, 2000)
      } catch (e) {
        if (!cancelled) {
          setGenerations(g => g.map(item => item.id === id ? { ...item, error: e.message } : item))
          setGenerating(false)
        }
      }
    }

    poll()
    pollTimers.current[id] = { sim, poll: true }
  }

  function ensureMinSize(url) {
    return new Promise(resolve => {
      const img = new Image()
      img.onload = () => {
        const pad = 16
        const w = Math.max(img.naturalWidth, 240) + pad * 2
        const h = Math.max(img.naturalHeight, 240) + pad * 2
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        const ctx = canvas.getContext('2d')
        const hue = Math.random() * 360
        ctx.fillStyle = `hsl(${hue}, 30%, 92%)`
        ctx.fillRect(0, 0, w, h)
        ctx.drawImage(img, pad, pad, img.naturalWidth, img.naturalHeight)
        ctx.fillStyle = `hsla(${hue}, 20%, 85%, 0.12)`
        ctx.fillRect(0, 0, w, h)
        const d = ctx.getImageData(0, 0, w, h)
        for (let i = 0; i < d.data.length; i += 4) {
          d.data[i] = Math.max(0, Math.min(255, d.data[i] + ((Math.random() * 14 - 7) | 0)))
          d.data[i + 1] = Math.max(0, Math.min(255, d.data[i + 1] + ((Math.random() * 14 - 7) | 0)))
          d.data[i + 2] = Math.max(0, Math.min(255, d.data[i + 2] + ((Math.random() * 14 - 7) | 0)))
        }
        ctx.putImageData(d, 0, 0)
        resolve(canvas.toDataURL('image/jpeg', 0.5))
      }
      img.onerror = () => resolve(url)
      img.src = url
    })
  }

  function getOrderedImageUrls(excelImages) {
    if (!excelImages?.data) return []
    const entries = Object.entries(excelImages.data).filter(([k]) => k !== '_all').sort(([a], [b]) => parseInt(a) - parseInt(b))
    const result = []
    for (const [, imgs] of entries) for (const img of imgs) result.push(img.url)
    if (excelImages.data._all) for (const img of excelImages.data._all) result.push(img.url)
    return result
  }

  function compositeToGrid(urls) {
    return new Promise(resolve => {
      const count = urls.length
      const cols = Math.min(count, 4)
      const rows = Math.ceil(count / cols)
      const cell = 200
      const c = document.createElement('canvas')
      c.width = cols * cell; c.height = rows * cell
      const ctx = c.getContext('2d')
      ctx.fillStyle = '#f5f5f5'; ctx.fillRect(0, 0, c.width, c.height)
      let loaded = 0
      for (let i = 0; i < count; i++) {
        const img = new Image()
        img.onload = () => {
          const x = (i % cols) * cell
          const y = Math.floor(i / cols) * cell
          const maxW = cell - 20, maxH = cell - 20
          const s = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight)
          ctx.drawImage(img, x + 10 + (maxW - img.naturalWidth * s) / 2, y + 10 + (maxH - img.naturalHeight * s) / 2, img.naturalWidth * s, img.naturalHeight * s)
          if (++loaded === count) {
            const d = ctx.getImageData(0, 0, c.width, c.height)
            for (let i = 0; i < d.data.length; i += 4) {
              d.data[i] = Math.max(0, Math.min(255, d.data[i] + ((Math.random() * 14 - 7) | 0)))
              d.data[i + 1] = Math.max(0, Math.min(255, d.data[i + 1] + ((Math.random() * 14 - 7) | 0)))
              d.data[i + 2] = Math.max(0, Math.min(255, d.data[i + 2] + ((Math.random() * 14 - 7) | 0)))
            }
            ctx.putImageData(d, 0, 0)
            resolve([c.toDataURL('image/jpeg', 0.5)])
          }
        }
        img.onerror = () => { if (++loaded === count) resolve([c.toDataURL('image/jpeg', 0.5)]) }
        img.src = urls[i]
      }
    })
  }

  return (
    <div className="home-layout" style={{ display: 'flex', alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0, marginTop: -24, marginLeft: -32 }}>
        <input
          ref={excelInputRef}
          type="file"
          accept=".xlsx,.xls"
          style={{ display: 'none' }}
          onChange={e => { if (e.target.files[0]) onExcelFile(e.target.files[0]); e.target.value = '' }}
        />

        {/* Prompt & Config */}
        <div className="card">
          <div className="card-title">当前提示词</div>
          <div style={{ position: 'relative' }}>
            {!excelData && (
              <div
                onClick={() => excelInputRef.current?.click()}
                style={{
                  position: 'absolute', inset: 0, zIndex: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(255,255,255,0.85)',
                  cursor: 'pointer', fontSize: 15, color: '#666', fontWeight: 500,
                  borderRadius: 6,
                }}
                onDragOver={onExcelDragOver}
                onDragLeave={onExcelDragLeave}
                onDrop={onExcelDrop}
              >
                点击或拖拽导入 Excel 数据
                {excelError && <div style={{ color: '#e74c3c', fontSize: 13, marginTop: 8 }}>{excelError}</div>}
              </div>
            )}
            <textarea
            style={{
              width: '100%',
              height: 300,
              padding: 10,
              fontSize: 12,
              color: '#333',
              border: '1px solid #d9d9d9',
              borderRadius: 6,
              background: '#fff',
              resize: 'vertical',
              lineHeight: 1.6,
              boxSizing: 'border-box',
            }}
            value={promptText}
            onChange={e => setPromptText(e.target.value)}
          />

          <div style={{ marginTop: 16, borderTop: '1px solid #eee', paddingTop: 16 }}>
            <div className="config-row">
              <div className="config-item">
                <label>比例</label>
                <select value={size} onChange={e => setSize(e.target.value)}>
                  {RATIOS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="config-item">
                <label>分辨率</label>
                <select value={image_size} onChange={e => setImageSize(e.target.value)}>
                  <option value="1K">1K</option>
                  <option value="2K">2K</option>
                  <option value="4K">4K</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 6 }}>参考图片</div>
              {excelImages?.data ? (() => {
                const allRefs = Object.values(excelImages.data).flat().slice(0, 9)
                return allRefs.length > 0 ? (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {allRefs.map((img, i) => (
                      <img key={i} src={img.url} alt="" style={{ width: 60, height: 60, borderRadius: 4, objectFit: 'cover', border: '1px solid #e0e0e0' }} />
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: '#999' }}>暂无参考图片</div>
                )
              })() : (
                <div style={{ fontSize: 13, color: '#999' }}>导入 Excel 后自动提取</div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#555', display: 'block', marginBottom: 6 }}>选择模型 *</label>
                <select value={model} onChange={e => setModel(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: 6, fontSize: 14, background: '#fff' }}>
                <option value="maiziai-chatgpt-image-2">maiziai-chatgpt-image-2</option>
                <option value="gpt-image-2-official">gpt-image-2-official</option>
                <option value="wan2.7-image">wan2.7-image</option>
                <option value="wan2.7-image-pro">wan2.7-image-pro</option>
                </select>
              </div>
              <button
                className="btn btn-primary"
                disabled={!canGenerate || generating}
                onClick={handleGenerate}
                style={{ whiteSpace: 'nowrap' }}
              >
                {generating ? '信息提交中...' : '生成画册'}
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Right: Preview */}
      <div style={{ flex: 2, minWidth: 0 }}>
        {generations.length === 0 && (
          <div className="card" style={{ padding: 40, textAlign: 'center', color: '#999' }}>
            <div>配置完成后点击「生成画册」</div>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[...generations].reverse().map(item => (
            <div key={item.id} className="card" style={{ padding: 16 }}>
              {!item.finished && !item.error && (
                <div>
                  <div className="progress-bar-wrap" style={{ marginBottom: 8 }}>
                    <div className="progress-bar-fill" style={{ width: `${item.progress}%` }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#666' }}>
                    <span>{item.statusText}</span>
                    <span>{item.progress}%</span>
                  </div>
                </div>
              )}
              {item.error && (
                <div style={{ color: '#e74c3c', fontSize: 13 }}>{item.error}</div>
              )}
              {item.finished && item.imageUrl && (
                <div style={{ textAlign: 'center' }}>
                  <img src={item.imageUrl} alt="画册成品" style={{ maxWidth: '100%', borderRadius: 6, boxShadow: '0 1px 6px rgba(0,0,0,.1)' }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
