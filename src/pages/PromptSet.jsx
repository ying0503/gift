import { useState, useEffect } from 'react'
import { message } from 'antd'
import { API } from '../AuthContext'
import AdminSidebar from '../components/AdminSidebar'

const SCENE_DEFAULT = '锁定原始产品主体，保持产品100%真实一致：严格保留产品原有的外观设计、产品结构、尺寸比例、颜色、材质纹理、零部件组合方式、品牌标识位置（如原图存在）。禁止改变产品形态，不重新设计，不增加或删除任何部件，不改变产品功能结构。将产品自然融入真实生活使用场景中，打造高级商业产品摄影效果。根据产品属性匹配合理环境：家居用品→温馨现代家庭空间，小家电→干净整洁的厨房客厅办公空间，电子产品→桌面办公居家娱乐科技生活场景，家具→高端室内空间自然光环境，日用品→日常生活使用环境。场景需要真实自然，符合产品实际使用逻辑，空间比例合理，光线符合真实摄影效果，产品与环境自然融合。生成超写实商业产品摄影图：2K高清分辨率，细节锐利清晰，专业摄影棚级画质，真实镜头景深效果，柔和自然光照，高级但真实的色彩表现，材质纹理清晰可见，产品边缘清晰立体，保留真实阴影和空间层次。产品作为画面视觉中心，保持居中或黄金比例构图，占据主要视觉区域，突出产品质感和功能特点，保持真实大小比例，不被环境遮挡。打造高端品牌广告摄影风格：干净自然的生活环境，简洁高级背景，温暖真实氛围，无杂乱物品，无过度装饰，无夸张特效。禁止：不改变产品颜色、结构、组合方式，不增加不存在的功能，不添加文字水印广告语，不生成虚假材质，不改变品牌Logo，不让场景抢占产品主体视觉。最终生成一张真实、高端、自然的商业产品场景摄影照片，类似品牌官网和电商详情页展示图'

const TYPES = [
  { key: 'prompt_mockup', label: '样机图', default: '生成一个3d效果图，真实立体包装' },
  { key: 'prompt_whitebg', label: '白底图', default: '生成白底图' },
  { key: 'prompt_scene', label: '场景图', default: SCENE_DEFAULT },
]

export default function PromptSet() {
  const [config, setConfig] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchConfig = () => {
    setLoading(true)
    fetch(`${API}/api/global-config`)
      .then(r => r.json())
      .then(data => setConfig(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchConfig() }, [])

  const save = async () => {
    setSaving(true)
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`${API}/api/global-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(config),
      })
      if (!res.ok) throw new Error('保存失败')
      message.success('保存成功')
    } catch (e) {
      message.error(e.message)
    }
    setSaving(false)
  }

  return (
    <div style={{ display: 'flex', height: '100%', background: '#f5f5f5', borderRadius: 8 }}>
      <AdminSidebar />
      <div style={{ flex: 1, padding: 24, overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'rgba(0,0,0,.88)' }}>生图提示词</div>
          <button className="btn btn-primary" onClick={save} disabled={saving}
            style={{ fontSize: 13, height: 34, padding: '0 16px', borderRadius: 8, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? .6 : 1 }}
          >{saving ? '保存中...' : '保存'}</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', paddingTop: 60, color: '#94a3b8', fontSize: 14 }}>加载中...</div>
        ) : (
          <div style={{ maxWidth: 800 }}>
            {TYPES.map(t => (
              <div key={t.key} style={{ marginBottom: 24, background: '#fff', borderRadius: 10, padding: 20, border: '1px solid #e8e8e8' }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'rgba(0,0,0,.88)', marginBottom: 10 }}>{t.label}</div>
                <textarea
                  value={config[t.key] !== undefined ? config[t.key] : t.default}
                  onChange={e => setConfig(prev => ({ ...prev, [t.key]: e.target.value }))}
                  placeholder={t.default}
                  rows={t.key === 'prompt_scene' ? 12 : 4}
                  style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid #d9d9d9', borderRadius: 6, outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6, boxSizing: 'border-box' }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
