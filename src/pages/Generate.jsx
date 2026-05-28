import { useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

export default function Generate() {
  const location = useLocation()
  const navigate = useNavigate()
  const data = location.state

  const [progress, setProgress] = useState(0)
  const [statusText, setStatusText] = useState('准备中...')
  const [finished, setFinished] = useState(false)
  const [error, setError] = useState(null)

  const simulateGeneration = useCallback(async () => {
    const stages = [
      { pct: 10, text: '正在解析图片素材...' },
      { pct: 25, text: '正在处理 Excel 数据...' },
      { pct: 40, text: '正在排版画册布局...' },
      { pct: 55, text: '正在应用模板样式...' },
      { pct: 70, text: '正在渲染页面内容...' },
      { pct: 85, text: '正在生成最终效果...' },
      { pct: 95, text: '即将完成...' },
      { pct: 100, text: '生成完成！' },
    ]

    for (const stage of stages) {
      await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 400))

      setProgress(stage.pct)
      setStatusText(stage.text)
    }

    setFinished(true)
  }, [])

  useEffect(() => {
    if (!data) return

    const timer = setTimeout(() => simulateGeneration(), 500)
    return () => clearTimeout(timer)
  }, [data, simulateGeneration])

  if (!data) {
    return (
      <div className="error-card card">
        <h2>数据丢失</h2>
        <p>未接收到首页传入的数据，请返回首页重新操作</p>
        <button className="btn btn-primary" onClick={() => navigate('/')}>返回首页</button>
      </div>
    )
  }

  return (
    <div className="generate-page">
      {!finished && !error && (
        <div className="card progress-card">
          <h2 style={{ fontSize: 18, marginBottom: 4 }}>正在生成画册</h2>
          <div className="progress-bar-wrap">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="progress-pct">{progress}%</div>
          <div className="progress-status">{statusText}</div>
        </div>
      )}

      {error && (
        <div className="card error-card">
          <h2>生成失败</h2>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>返回首页</button>
        </div>
      )}

      {finished && (
        <div className="card result-wrap" style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 18, marginBottom: 16, color: '#27ae60' }}>画册生成成功 ✓</h2>

          <div style={{
            background: '#f9f9f9',
            borderRadius: 8,
            padding: 24,
            marginBottom: 20,
            textAlign: 'left',
            fontSize: 13,
            color: '#666',
          }}>
            <p><strong>画册模板：</strong>{data.config.template}</p>
            <p><strong>画册尺寸：</strong>{data.config.size}</p>
            <p><strong>画册色调：</strong>{data.config.color}</p>
            <p><strong>上传图片：</strong>{data.images.length} 张</p>
            <p><strong>Excel 数据：</strong>{data.excel.length} 行</p>
          </div>

          <div style={{
            width: '100%',
            aspectRatio: data.config.size.includes('A4') ? '210/297' : data.config.size.includes('方形') ? '1/1' : '4/3',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 14,
            boxShadow: '0 2px 12px rgba(0,0,0,.15)',
            marginBottom: 24,
          }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📖</div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>礼品画册</div>
            <div style={{ opacity: .8, marginTop: 4 }}>{data.config.template} · {data.config.color}</div>
          </div>

          <button className="btn btn-primary" onClick={() => navigate('/')}>返回首页重新制作</button>
        </div>
      )}
    </div>
  )
}
