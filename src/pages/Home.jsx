import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import { API } from '../AuthContext'

const SIZES = ['768×1024', '1200×1600']
const COLORS = ['暖色调', '冷色调', '黑白灰', '红金搭配', '蓝白搭配']
const LAYOUTS = ['顶通+礼品列表']

export default function Home() {
  const navigate = useNavigate()

  const [size, setSize] = useState('')
  const [color, setColor] = useState('')
  const [layout, setLayout] = useState('')
  const [model, setModel] = useState('wan2.7-image')
  const [excelData, setExcelData] = useState(null)
  const [excelFileName, setExcelFileName] = useState('')
  const [excelError, setExcelError] = useState('')
  const [excelImages, setExcelImages] = useState(null)
  const [excelMerges, setExcelMerges] = useState(null)
  const [generating, setGenerating] = useState(false)

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
    e.currentTarget.classList.remove('dragover')
    const file = e.dataTransfer.files[0]
    if (file) onExcelFile(file)
  }

  const clearExcel = () => {
    setExcelData(null)
    setExcelFileName('')
    setExcelError('')
    setExcelImages(null)
    setExcelMerges(null)
  }

  const canGenerate = size && color && layout && model && excelData

  const handleGenerate = async () => {
    if (!size) return alert('请选择画册尺寸')
    if (!color) return alert('请选择画册色调')
    if (!layout) return alert('请选择画册版式')
    if (!model) return alert('请选择模型')
    if (!excelData) return alert('请导入 Excel 数据')

    setGenerating(true)

    const token = localStorage.getItem('token')
    if (!token) {
      alert('请先登录')
      setGenerating(false)
      return
    }

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
          config: { size, color, layout, model },
          excel: excelData,
          images: sendImages.length ? sendImages : undefined,
        }),
      })

      const r = await res.json()
      if (!res.ok) throw new Error(r.error || '请求失败')

      navigate('/generate', {
        state: {
          taskId: r.taskId,
          config: { size, color, layout, model },
          excel: excelData,
        },
      })
    } catch (err) {
      alert('生成失败：' + err.message)
      setGenerating(false)
    }
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
    <div className="home-layout">
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Excel */}
        <div className="card">
          <div className="card-title">导入 Excel 数据</div>
        <div
          className="excel-zone"
          onClick={() => excelInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragover') }}
          onDragLeave={(e) => e.currentTarget.classList.remove('dragover')}
          onDrop={onExcelDrop}
        >
          <p>点击或拖拽 Excel 文件到此处</p>
          <div className="upload-hint">支持 .xlsx / .xls 格式</div>
          <input
            ref={excelInputRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={e => { if (e.target.files[0]) onExcelFile(e.target.files[0]); e.target.value = '' }}
          />
        </div>
        {excelError && <div className="excel-error">{excelError}</div>}

        {excelData && (
          <>
            <div className="excel-actions">
              <span style={{ fontSize: 13, color: '#666' }}>已导入：{excelFileName}（共 {excelData.length} 行）</span>
              {excelImages?.data && (
                <span style={{ fontSize: 12, color: '#27ae60' }}>（已提取 {Object.values(excelImages.data).flat().length} 张嵌入图片）</span>
              )}
              <button className="btn btn-danger" onClick={clearExcel}>清空数据</button>
            </div>
            <div className="excel-table-wrap">
              <table className="excel-table">
                <thead>
                  <tr>
                    {excelData[0].map((h, ci) => {
                      const mk = `0:${ci}`
                      const m = excelMerges?.[mk]
                      if (m && !m.anchor) return null
                      return (
                        <th key={ci} colSpan={m?.colSpan || 1} rowSpan={m?.rowSpan || 1}>
                          {h || `列${ci + 1}`}
                        </th>
                      )
                    })}
                    {excelImages?.data && <th style={{ width: 100 }}>图片</th>}
                  </tr>
                </thead>
                <tbody>
                  {excelData.slice(1).map((row, ri) => {
                    const dataRow = ri + 1
                    const imgs = excelImages?.data?.[dataRow]
                    const allImgs = excelImages?.data?._all
                    return (
                      <tr key={ri}>
                        {row.map((cell, ci) => {
                          const mk = `${dataRow}:${ci}`
                          const m = excelMerges?.[mk]
                          if (m && !m.anchor) return null
                          return (
                            <td key={ci} colSpan={m?.colSpan || 1} rowSpan={m?.rowSpan || 1}>
                              {String(cell)}
                            </td>
                          )
                        })}
                        {excelImages?.data && (
                          <td>
                            {imgs?.map((img, ii) => (
                              <img
                                key={ii}
                                src={img.url}
                                style={{ maxWidth: 80, maxHeight: 60, borderRadius: 4, margin: '2px 0', display: 'block', objectFit: 'contain' }}
                                alt=""
                              />
                            ))}
                            {allImgs && !imgs && (
                              <span style={{ fontSize: 11, color: '#999' }}>（未匹配行位置）</span>
                            )}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {/* Fallback: show unmatched images as gallery */}
            {excelImages?.data?._all && excelImages.data._all.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>嵌入图片（未匹配到具体行）：</div>
                <div className="thumb-grid">
                  {excelImages.data._all.map((img, i) => (
                    <div className="thumb-item" key={i}>
                      <img src={img.url} alt="" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Config */}
      <div className="card">
        <div className="card-title">画册配置</div>
        <div className="config-row">
          <div className="config-item">
            <label>画册尺寸 *</label>
            <select value={size} onChange={e => setSize(e.target.value)}>
              <option value="">请选择尺寸</option>
              {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="config-item">
            <label>画册色调 *</label>
            <select value={color} onChange={e => setColor(e.target.value)}>
              <option value="">请选择色调</option>
              {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="config-item">
            <label>画册版式 *</label>
            <select value={layout} onChange={e => setLayout(e.target.value)}>
              <option value="">请选择版式</option>
              {LAYOUTS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>
        </div>
      </div>

      {/* Right: Generate */}
      <div className="home-sidebar">
        <div className="card">
          <div className="card-title">生成画册</div>

        {/* Prompt preview */}
        {(size || color || excelData) && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 6 }}>当前提示词（预览）：</div>
            <textarea
              readOnly
              rows={4}
              style={{
                width: '100%',
                padding: 10,
                fontSize: 12,
                color: '#666',
                border: '1px solid #e8e8e8',
                borderRadius: 6,
                background: '#fafafa',
                resize: 'none',
                lineHeight: 1.6,
              }}
              value={(() => {
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
                 return `版式：顶通+礼品列表
模型：${model}
色调：${color || '（请选择）'}
尺寸：${size || '（请选择）'}
说明：顶部生成一个通栏，选取3个产品生成顶部广告位。
顶部广告位下是所有上传的产品列表，一行3个，上下结构。
每个礼品展示：礼品图 + 品名 + 产品介绍文案。

礼品列表：
${products}`
              })()}
              onChange={() => {}}
            />
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: '#555', display: 'block', marginBottom: 6 }}>选择模型 *</label>
          <select value={model} onChange={e => setModel(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: 6, fontSize: 14, background: '#fff' }}>
            <option value="wan2.7-image">wan2.7-image</option>
            <option value="wan2.7-image-pro">wan2.7-image-pro</option>
          </select>
        </div>

        <div className="generate-bar">
          <button
            className="btn btn-primary"
            disabled={!canGenerate || generating}
            onClick={handleGenerate}
          >
            {generating ? '信息提交中...' : '生成画册'}
          </button>
        </div>
      </div>
    </div>
  </div>
  )
}
