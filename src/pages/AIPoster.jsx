import { useState } from 'react'
import { Input, Button, Select, Space, Spin, message } from 'antd'

const { TextArea } = Input

export default function AIPoster() {
  const [prompt, setPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState(null)
  const [size, setSize] = useState('1024x1024')

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    setGenerating(true)
    setResult(null)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://localhost:3000/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt: prompt.trim(), size }),
      })
      const data = await res.json()
      if (data.success) {
        setResult(data)
      } else {
        message.error(data.error || '生成失败')
      }
    } catch (e) {
      message.error('网络错误')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div style={{ padding: '32px 40px', maxWidth: 900 }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 24 }}>AI 海报</div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#334155', marginBottom: 8 }}>海报描述</div>
        <TextArea
          rows={4}
          placeholder="描述你想要的海报内容，例如：一张高端商务礼品海报，金色背景，礼盒居中，简约大气"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          style={{ borderRadius: 8, resize: 'none' }}
        />
      </div>

      <Space style={{ marginBottom: 24 }}>
        <Select value={size} onChange={setSize} style={{ width: 140 }}
          options={[
            { value: '1024x1024', label: '方形 1024×1024' },
            { value: '1024x1792', label: '竖版 1024×1792' },
            { value: '1792x1024', label: '横版 1792×1024' },
          ]}
        />
        <Button type="primary" onClick={handleGenerate} loading={generating}
          style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)', border: 'none', borderRadius: 8, height: 40, paddingInline: 28, fontSize: 14 }}>
          生成海报
        </Button>
      </Space>

      {generating && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
          <div style={{ color: '#94a3b8', marginTop: 16 }}>正在生成中…</div>
        </div>
      )}

      {result && result.imageUrl && (
        <div style={{ marginTop: 16 }}>
          <img src={result.imageUrl} alt="海报" style={{ maxWidth: '100%', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,.1)' }} />
        </div>
      )}
    </div>
  )
}
