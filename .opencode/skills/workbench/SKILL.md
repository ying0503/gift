---
name: workbench
description: 礼品图片生成工作台（Home.jsx），支持多提示词编辑、AI文案生成、参考图上传、多模型批量生成、进度轮询、全屏预览
license: MIT
compatibility: opencode
---

## 路由
- `/workbench` — 礼品图片生成工作台

## 核心功能

### 提示词编辑
- 多行 textarea，支持多个提示词（白底图/场景图 1 个，详情图 3 个）
- 图片类型选择（白底图/场景图/详情图），要把对应提示词提交并触发AI自动生成文案
    - 白底图 对应提示词是 把主图抠出来
    - 场景图 对应提示词是 使用场景图
    - 详情图 对应提示词是 总共3张图，第1张白底图，后2张场景图
- textarea 使用 `ref` + `useEffect` 自动撑高（`scrollHeight`）
- 节日选择触发 `generatePrompts()` AI 生成提示词
- 图片类型切换时：若已选节日则重新生成，否则保持已有提示词

### 参考图上传
- 单张参考图（`uploadedRef`），hover 预览大图
- 上传时若已有非空提示词且已选节日 → 自动重新生成提示词
- 点击 × 移除参考图

### 模板（已隐藏）
- `TEMPLATES` 数组定义 3 个内置模板，点击"做同款"填充首个提示词
- 模板按钮已在 UI 中移除（保留代码以备后续启用）

### 批量图片生成
- 调用 `POST /api/generate/batch`，传入 `prompts` 数组和 `festival`
- 支持 MaiziAI GPT-Image-2 和 Agnes Image 2.1 Flash
- 生成条目创建后立即启动全局模拟进度
- `/api/generate/batch-status` 轮询真实进度（`res.progress > 0` 时覆盖模拟值）
- 成功后从 `generations` 移除并刷新 `albums`

### 布局
- 三栏等宽布局（`gridTemplateColumns: '1fr 1fr 1fr'`）
  - 桌面端（`desktop-only`）：左栏上传参考图 / 中栏参数配置 / 右栏当前生成图片
- 生成面板样式：`border-radius: 16`, `box-shadow`, purple 渐变主题
- 移动端不单独渲染（由 CSS `.desktop-only`/`.mobile-only` 控制）

### 历史画册查看
- 画册列表已移至独立页面 `/image-list`（`ImageList.jsx`）
- 工作台仅保留生成功能，不再展示历史画册列表

## 状态管理
```js
const [generations, setGenerations] = useState([])   // 当前正在生成的批次
const [prompts, setPrompts] = useState([''])           // 提示词数组
const [festival, setFestival] = useState('')           // 已选节日
const [imageType, setImageType] = useState('白底图')    // 白底图/场景图/详情图
const [uploadedRef, setUploadedRef] = useState(null)   // 上传的参考图
const [viewAlbum, setViewAlbum] = useState(null)        // 全屏预览的画册
const [generating, setGenerating] = useState(false)      // 生成中
const [generatingPrompts, setGeneratingPrompts] = useState(false) // AI文案生成中
```

## 关键 API 调用
- `POST /api/generate/prompts` — AI 文案生成（支持 refImage 参考图）
- `POST /api/generate/batch` — 批量图片生成（body: config + prompts + images）
- `GET /api/generate/batch-status?batchId=` — 进度轮询

## 模型选择
- 图片模型: `localStorage.getItem('defaultImageModel')` → `maiziai-chatgpt-image-2` / `agnes-image-2.1-flash`
- 文案模型: `localStorage.getItem('textGenerationModel')` → `qwen3.5-flash` / `glm-4.6v-flashx` / `doubao-seed-2-0-mini-260428`

## 进度轮询机制
- 全局 `useEffect`（依赖 `generations.length`）每 800ms 递增 1-2%，到 95% 停止
- `startBatchPolling` 的 `poll` 函数只读取 API 真实进度（`res.progress > 0` 才覆盖），`res.status === 'SUCCEEDED'` 移除条目
- `res.status === 'FAILED'` 设置错误信息
- 本地 `localStorage('pendingBatches')` 持久化未完成任务，页面刷新后恢复轮询

## 样式要点
- 主题色：`#8B5CF6`（紫色），`#EC4899`（粉色）渐变
- 卡片：`border-radius: 10/16`, `box-shadow`, 圆角输入框
- textarea：`background: #fafafa`, `border-radius: 10`, focus 时紫色边框 + 阴影
- 生成按钮：渐变背景 + 阴影 + hover 上移效果
- loading 状态：`loading-spinner` CSS 类 + 进度百分比
- 错误色：`#FF4D4F`
