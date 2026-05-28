import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'

const TEMPLATES = ['经典商务', '清新简约', '中国风韵', '节日喜庆', '高端轻奢']
const SIZES = ['A4（210×297mm）', 'A5（148×210mm）', '方形（200×200mm）', '长方形（200×150mm）']
const COLORS = ['暖色调', '冷色调', '黑白灰', '红金搭配', '蓝白搭配']

export default function Home() {
  const navigate = useNavigate()

  const [images, setImages] = useState([])
  const [template, setTemplate] = useState('')
  const [size, setSize] = useState('')
  const [color, setColor] = useState('')
  const [excelData, setExcelData] = useState(null)
  const [excelFileName, setExcelFileName] = useState('')
  const [excelError, setExcelError] = useState('')
  const [excelImages, setExcelImages] = useState(null)
  const [uploadError, setUploadError] = useState('')
  const [generating, setGenerating] = useState(false)

  const fileInputRef = useRef()
  const excelInputRef = useRef()

  const ALLOWED_IMG_TYPES = ['image/jpeg', 'image/png']

  const handleImageFiles = useCallback((files) => {
    setUploadError('')
    const valid = []
    for (const f of files) {
      if (!ALLOWED_IMG_TYPES.includes(f.type)) {
        setUploadError(`不支持的格式：${f.name}，仅允许 JPG/PNG`)
        continue
      }
      valid.push(f)
    }
    if (valid.length) {
      setImages(prev => [...prev, ...valid])
    }
  }, [])

  const onImageInputChange = (e) => {
    if (e.target.files.length) handleImageFiles([...e.target.files])
    e.target.value = ''
  }

  const onImageDrop = (e) => {
    e.preventDefault()
    e.currentTarget.classList.remove('dragover')
    if (e.dataTransfer.files.length) handleImageFiles([...e.dataTransfer.files])
  }

  const removeImage = (idx) => {
    setImages(prev => prev.filter((_, i) => i !== idx))
  }

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
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

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
                return { url: URL.createObjectURL(blob), col: item.col }
              })
            )
          }
          imageMap._mapped = Object.keys(rowToImages).length > 0 && !rowToImages._all
          imageMap.data = resolved
        }
      }

      setExcelImages(imageMap)
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
  }

  const canGenerate = images.length > 0 && template && size && color && excelData

  const handleGenerate = () => {
    if (!template) return alert('请选择画册模板')
    if (!size) return alert('请选择画册尺寸')
    if (!color) return alert('请选择画册色调')
    if (images.length === 0) return alert('请上传至少一张图片')
    if (!excelData) return alert('请导入 Excel 数据')

    setGenerating(true)

    const payload = {
      images: images.map(f => ({
        name: f.name,
        size: f.size,
        type: f.type,
      })),
      config: { template, size, color },
      excel: excelData,
    }

    setTimeout(() => {
      setGenerating(false)
      navigate('/generate', { state: payload })
    }, 300)
  }

  return (
    <div>
      {/* Image Upload */}
      <div className="card">
        <div className="card-title">上传图片</div>
        <div
          className="upload-zone"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragover') }}
          onDragLeave={(e) => e.currentTarget.classList.remove('dragover')}
          onDrop={onImageDrop}
        >
          <p>点击或拖拽图片到此处上传</p>
          <div className="upload-hint">支持 JPG / PNG 格式，可多选</div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png"
            multiple
            style={{ display: 'none' }}
            onChange={onImageInputChange}
          />
        </div>
        {uploadError && <div className="upload-error">{uploadError}</div>}
        {images.length > 0 && (
          <div className="thumb-grid">
            {images.map((f, i) => (
              <div className="thumb-item" key={`${f.name}-${i}`}>
                <img src={URL.createObjectURL(f)} alt={f.name} />
                <button className="thumb-del" onClick={() => removeImage(i)}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Config */}
      <div className="card">
        <div className="card-title">画册配置</div>
        <div className="config-row">
          <div className="config-item">
            <label>画册模板 *</label>
            <select value={template} onChange={e => setTemplate(e.target.value)}>
              <option value="">请选择模板</option>
              {TEMPLATES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
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
        </div>
      </div>

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
                    {excelData[0].map((h, i) => (
                      <th key={i}>{h || `列${i + 1}`}</th>
                    ))}
                    {excelImages?.data && <th style={{ width: 100 }}>图片</th>}
                  </tr>
                </thead>
                <tbody>
                  {excelData.slice(1).map((row, ri) => {
                    const rowIndex = ri + 1
                    const imgs = excelImages?.data?.[rowIndex]
                    const allImgs = excelImages?.data?._all
                    return (
                      <tr key={ri}>
                        {row.map((cell, ci) => (
                          <td key={ci}>{String(cell)}</td>
                        ))}
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

      {/* Generate */}
      <div className="card">
        <div className="card-title" style={{ border: 'none', marginBottom: 0 }}>生成画册</div>
        <div className="generate-bar">
          <button
            className="btn btn-primary"
            disabled={!canGenerate || generating}
            onClick={handleGenerate}
          >
            {generating ? '处理中...' : '生成画册'}
          </button>
        </div>
      </div>
    </div>
  )
}
