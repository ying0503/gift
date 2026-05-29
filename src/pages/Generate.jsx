import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { API } from '../AuthContext'

export default function Generate() {
  const location = useLocation()
  const navigate = useNavigate()
  const data = location.state

  const [progress, setProgress] = useState(0)
  const [statusText, setStatusText] = useState('准备中...')
  const [finished, setFinished] = useState(false)
  const [error, setError] = useState(null)
  const [imageUrl, setImageUrl] = useState(null)

  const pollRef = useRef(null)
  const simRef = useRef(null)

  useEffect(() => {
    if (!data || !data.taskId) return
    const token = localStorage.getItem('token')
    if (!token) { setError('请先登录'); return }

    let cancelled = false, realDone = false

    simRef.current = setInterval(() => {
      if (cancelled || realDone) return
      setProgress(p => {
        if (p >= 95) return p
        const n = Math.min(p + Math.floor(Math.random() * 5) + 1, 95)
        if (n < 20) setStatusText('正在提交任务...')
        else if (n < 40) setStatusText('AI 模型加载中...')
        else if (n < 60) setStatusText('正在生成画册...')
        else if (n < 80) setStatusText('正在优化画面细节...')
        else setStatusText('即将完成...')
        return n
      })
    }, 800)

    const poll = async () => {
      try {
        const r = await fetch(`${API}/api/generate/status?taskId=${data.taskId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const res = await r.json()
        if (!r.ok || cancelled) return

        if (res.progress === -1) { realDone = true; clearInterval(simRef.current); setError(res.statusText || '生成失败'); return }
        if (res.imageUrl) {
          realDone = true; clearInterval(simRef.current)
          setProgress(100)
          setImageUrl(res.imageUrl)
          setStatusText('生成完成！')
          setTimeout(() => setFinished(true), 300)
          return
        }
        if (res.taskStatus === 'FAILED') { realDone = true; clearInterval(simRef.current); setError(res.statusText || '生成失败'); return }
        pollRef.current = setTimeout(poll, 2000)
      } catch (e) { if (!cancelled) setError(e.message) }
    }

    poll()
    return () => { cancelled = true; clearInterval(simRef.current); clearTimeout(pollRef.current) }
  }, [data])

  if (!data || !data.taskId) {
    return (
      <div className="error-card card">
        <h2>数据丢失</h2>
        <p>未接收到任务信息，请返回首页重新操作</p>
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
        <div className="card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, marginBottom: 20, color: '#27ae60', textAlign: 'center' }}>画册生成成功 ✓</h2>
          <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start' }}>
            <div style={{ flex: '0 0 auto' }}>
              {imageUrl && <img src={imageUrl} alt="画册成品" style={{ maxWidth: 1000, borderRadius: 8, boxShadow: '0 2px 12px rgba(0,0,0,.12)' }} />}
            </div>
            <div style={{ flex: 1, fontSize: 14, color: '#444', lineHeight: 2.2 }}>
              <div style={{ borderBottom: '1px solid #eee', paddingBottom: 14, marginBottom: 18 }}>
                <div><strong>版式：</strong>{data.config.layout || '顶通+礼品列表'}</div>
                <div><strong>尺寸：</strong>{data.config.size}</div>
                <div><strong>色调：</strong>{data.config.color}</div>
                <div><strong>礼品数：</strong>{data.excel?.length - 1 || 0} 件</div>
              </div>
              <div style={{ maxHeight: 280, overflow: 'auto', background: '#fafafa', borderRadius: 6, padding: '8px 12px' }}>
                {(data.excel || []).slice(1).map((row, i) => (
                  <div key={i} style={{ padding: '6px 0', borderBottom: i < (data.excel?.length || 1) - 2 ? '1px solid #eee' : 'none', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ color: '#999', flexShrink: 0, width: 24 }}>{i + 1}.</span>
                    <span>{row[1] || row[0] || ''}</span>
                  </div>
                ))}
              </div>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 20 }} onClick={() => navigate('/')}>返回首页</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

