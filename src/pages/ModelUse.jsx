import { useState, useEffect } from 'react'
import { API } from '../AuthContext'
import AdminSidebar from '../components/AdminSidebar'

const LS_TEMP = 'textTemperature'
const LS_MAX_TOKENS = 'textMaxTokens'

const MODELS = [
  {
    id: 'maiziai-chatgpt-image-2',
    name: 'MaiziAI GPT-Image-2',
    provider: 'MaiziAI (麦思科技)',
    usage: '画册图片生成、Banner生成',
    keyStatus: 'hasMaiziaiKey',
    keyLabel: 'MAIZIAI_API_KEY',
  },
  {
    id: 'ithinkai-gpt-image-2',
    name: 'iThinkAPI GPT-Image-2',
    provider: 'iThinkAPI',
    usage: '画册图片生成、Banner生成',
    keyStatus: 'hasIthinkaiKey',
    keyLabel: 'ITHINKAI_API_KEY',
  },
  {
    id: 'agnes-image-2.1-flash',
    name: 'Agnes Image 2.1 Flash',
    provider: 'Agnes AI',
    usage: '画册图片生成',
    keyStatus: 'hasAgnesKey',
    keyLabel: 'AGNES_API_KEY',
  },
  {
    id: 'qwen3.5-flash',
    name: 'Qwen3.5-Flash',
    provider: '阿里云 通义千问 (DashScope)',
    usage: 'AI文案策划、智能目录生成',
    keyStatus: 'hasQwenKey',
    keyLabel: 'QWEN_API_KEY',
  },
  {
    id: 'glm-4.6v-flashx',
    name: 'GLM-4.6V-FlashX',
    provider: '智谱 AI (BigModel)',
    usage: 'AI文案策划、智能目录生成',
    keyStatus: 'hasGlmKey',
    keyLabel: 'GLM_API_KEY',
  },
  {
    id: 'doubao-seed-2-0-mini-260428',
    name: 'Doubao-Seed-2.0-mini',
    provider: '字节跳动 豆包 (火山引擎)',
    usage: 'AI文案策划、智能目录生成',
    keyStatus: 'hasDoubaoKey',
    keyLabel: 'DOUBAO_API_KEY',
  },
]

const IMAGE_MODEL_IDS = ['maiziai-chatgpt-image-2', 'agnes-image-2.1-flash', 'ithinkai-gpt-image-2']
const TEXT_MODEL_IDS = ['qwen3.5-flash', 'glm-4.6v-flashx', 'doubao-seed-2-0-mini-260428']

function getDefaultImageModel(saved) {
  return IMAGE_MODEL_IDS.includes(saved) ? saved : 'maiziai-chatgpt-image-2'
}
function getDefaultTextModel(saved) {
  return TEXT_MODEL_IDS.includes(saved) ? saved : 'qwen3.5-flash'
}

export default function ModelUse() {
  const [keyStatus, setKeyStatus] = useState(null)
  const [defaultImageModel, setDefaultImageModel] = useState('maiziai-chatgpt-image-2')
  const [textModel, setTextModel] = useState('qwen3.5-flash')
  const [temperature, setTemperature] = useState(0.8)
  const [maxTokens, setMaxTokens] = useState(2000)
  const [modelSpeeds, setModelSpeeds] = useState({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const prev = document.title
    document.title = '礼企汇｜AI模型管理'
    return () => { document.title = prev }
  }, [])

  useEffect(() => {
    fetch(`${API}/api/ping`)
      .then(r => r.json())
      .then(data => {
        if (data.ok) setKeyStatus(data)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const fetchSpeeds = () => {
      fetch(`${API}/api/model-stats`).then(r => r.json()).then(setModelSpeeds).catch(() => {})
    }
    fetchSpeeds()
    const timer = setInterval(fetchSpeeds, 30000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    fetch(`${API}/api/global-config`)
      .then(r => r.json())
      .then(cfg => {
        const img = getDefaultImageModel(cfg.defaultImageModel)
        const txt = getDefaultTextModel(cfg.textGenerationModel)
        const temp = cfg.textTemperature ? parseFloat(cfg.textTemperature) : 0.8
        const tokens = cfg.textMaxTokens ? parseInt(cfg.textMaxTokens, 10) : 2000
        setDefaultImageModel(img)
        setTextModel(txt)
        setTemperature(temp)
        setMaxTokens(tokens)
        localStorage.setItem('defaultImageModel', img)
        localStorage.setItem('textGenerationModel', txt)
        localStorage.setItem(LS_TEMP, temp.toString())
        localStorage.setItem(LS_MAX_TOKENS, tokens.toString())
        setLoaded(true)
      })
      .catch(() => {
        setDefaultImageModel(getDefaultImageModel(localStorage.getItem('defaultImageModel')))
        setTextModel(getDefaultTextModel(localStorage.getItem('textGenerationModel')))
        setTemperature(parseFloat(localStorage.getItem(LS_TEMP) || '0.8'))
        setMaxTokens(parseInt(localStorage.getItem(LS_MAX_TOKENS) || '2000', 10))
        setLoaded(true)
      })
  }, [])

  const saveToApi = (data) => {
    const token = localStorage.getItem('token')
    if (!token) return
    fetch(`${API}/api/global-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    }).catch(() => {})
  }

  const handleImageModelChange = (val) => {
    setDefaultImageModel(val)
    localStorage.setItem('defaultImageModel', val)
    saveToApi({ defaultImageModel: val })
  }

  const handleTextModelChange = (val) => {
    setTextModel(val)
    localStorage.setItem('textGenerationModel', val)
    saveToApi({ textGenerationModel: val })
  }

  const handleTemperatureChange = (e) => {
    const v = parseFloat(e.target.value)
    setTemperature(v)
    localStorage.setItem(LS_TEMP, v.toString())
    saveToApi({ textTemperature: v.toString() })
  }

  const handleMaxTokensChange = (e) => {
    const v = parseInt(e.target.value, 10) || 2000
    setMaxTokens(v)
    localStorage.setItem(LS_MAX_TOKENS, v.toString())
    saveToApi({ textMaxTokens: v.toString() })
  }

  if (!loaded) {
    return (
      <div style={{ display: 'flex', height: '100%', background: '#f5f5f5' }}>
        <AdminSidebar />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>加载中...</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100%', background: '#f5f5f5' }}>
      <AdminSidebar />
      <div style={{ flex: 1, padding: 24, overflow: 'auto' }}>
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#333', marginBottom: 4 }}>AI 模型管理</h1>
        <p style={{ fontSize: 13, color: '#999', margin: 0 }}>管理项目中使用的大模型及 API 密钥状态</p>
      </div>

      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#333', marginBottom: 12 }}>图片生成模型</div>
        <div style={{ display: 'flex', gap: 12 }}>
          {MODELS.filter(m => IMAGE_MODEL_IDS.includes(m.id)).map(m => (
            <div
              key={m.id}
              onClick={() => handleImageModelChange(m.id)}
              style={{
                flex: 1, padding: 16, borderRadius: 12, cursor: 'pointer',
                border: defaultImageModel === m.id ? '2px solid #8b5cf6' : '2px solid #e8e8e8',
                background: defaultImageModel === m.id ? 'rgba(139,92,246,.04)' : '#fff',
                transition: 'all .2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', border: '2px solid',
                  borderColor: defaultImageModel === m.id ? '#8b5cf6' : '#d9d9d9',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {defaultImageModel === m.id && <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#8b5cf6' }} />}
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#333' }}>{m.name}</span>
              </div>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 4, lineHeight: 1.5 }}>{m.provider}</div>
              <div style={{ fontSize: 12, color: '#999', lineHeight: 1.5 }}>
                {modelSpeeds[m.id]
                  ? `成功率 ${modelSpeeds[m.id].successRate}% ｜ 速度 ${(modelSpeeds[m.id].avgMs / 1000).toFixed(1)}s`
                  : '暂无数据'}
              </div>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                  background: keyStatus?.[m.keyStatus] ? '#52c41a' : '#ff4d4f',
                }} />
                <span style={{ fontSize: 12, color: '#666' }}>{m.keyLabel} {keyStatus?.[m.keyStatus] ? '✓ 已配置' : '✗ 未配置'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#333', marginBottom: 12 }}>文案生成模型</div>
        <div style={{ display: 'flex', gap: 12 }}>
          {MODELS.filter(m => TEXT_MODEL_IDS.includes(m.id)).map(m => (
            <div
              key={m.id}
              onClick={() => handleTextModelChange(m.id)}
              style={{
                flex: 1, padding: 16, borderRadius: 12, cursor: 'pointer',
                border: textModel === m.id ? '2px solid #8b5cf6' : '2px solid #e8e8e8',
                background: textModel === m.id ? 'rgba(139,92,246,.04)' : '#fff',
                transition: 'all .2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', border: '2px solid',
                  borderColor: textModel === m.id ? '#8b5cf6' : '#d9d9d9',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {textModel === m.id && <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#8b5cf6' }} />}
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#333' }}>{m.name}</span>
              </div>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 4, lineHeight: 1.5 }}>{m.provider}</div>
              <div style={{ fontSize: 12, color: '#999', lineHeight: 1.5 }}>
                {modelSpeeds[m.id]
                  ? `成功率 ${modelSpeeds[m.id].successRate}% ｜ 速度 ${(modelSpeeds[m.id].avgMs / 1000).toFixed(1)}s`
                  : '暂无数据'}
              </div>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                  background: keyStatus?.[m.keyStatus] ? '#52c41a' : '#ff4d4f',
                }} />
                <span style={{ fontSize: 12, color: '#666' }}>{m.keyLabel} {keyStatus?.[m.keyStatus] ? '✓ 已配置' : '✗ 未配置'}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16, padding: '12px 16px', background: '#fafafa', borderRadius: 8, marginLeft: 4 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#999', marginBottom: 10 }}>参数调节</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: '#666' }}>温度 (Temperature)</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#333' }}>{temperature.toFixed(1)}</span>
              </div>
              <input type="range" min="0" max="2" step="0.1" value={temperature}
                onChange={handleTemperatureChange}
                style={{ width: '100%', accentColor: '#8b5cf6' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#bbb' }}>
                <span>0.0 精确</span>
                <span>1.0 平衡</span>
                <span>2.0 创意</span>
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: '#666' }}>最大 Token 数 (Max Tokens)</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#333' }}>{maxTokens}</span>
              </div>
              <input type="range" min="256" max="4096" step="128" value={maxTokens}
                onChange={handleMaxTokensChange}
                style={{ width: '100%', accentColor: '#8b5cf6' }} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: 16, background: '#fffbe6', borderRadius: 12, border: '1px solid #ffe58f' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#ad8b00', marginBottom: 4 }}>说明</div>
        <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: '#8c7a0a', lineHeight: 2 }}>
          <li>图片生成模型可切换默认使用哪个服务商（MaiziAI / iThinkAPI / Agnes AI）</li>
          <li>文案策划和智能目录可在 Qwen / GLM / Doubao 间切换</li>
          <li>温度和 Token 数在"文案生成参数"中调节，控制生成结果的随机性和长度</li>
          <li>API 密钥在 <code style={{ background: '#fff2cc', padding: '1px 4px', borderRadius: 3 }}>.env</code> 文件中配置</li>
          <li>模型选择将同步到服务端，所有用户共享同一套配置</li>
        </ul>
      </div>
      </div>
      </div>
    </div>
  )
}
