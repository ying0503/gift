# gift-album 项目概览

**品牌名：** 礼企汇（Ligent，礼企AI智能体）  
**定位：** 礼品行业 AI 智能设计系统，支持 AI 礼品图生成 + 电子画册编辑与管理。

---

## 技术栈

| 层面 | 技术 |
|------|------|
| 前端框架 | React 19 + Vite 8 |
| 路由 | react-router-dom v7 |
| UI | Ant Design 6 + 内联样式 |
| 构建 | Vite + @vitejs/plugin-react |
| 后端 | Express 5 + MySQL2 + 阿里云 OSS（自托管 ECS） |
| 数据库 | MySQL |
| 图片存储 | 阿里云 OSS |
| 图片存储 | 阿里云 OSS |
| 图片处理 | sharp（WebP 转换） |

---

## 目录结构

```
gift-album/
├── src/
│   ├── main.jsx               # 应用入口，BrowserRouter
│   ├── App.jsx                # 根组件：路由、全局布局、预览弹窗
│   ├── AuthContext.jsx         # 认证上下文（登录/注册/用户状态）
│   ├── index.css              # 全局样式
│   ├── components/
│   │   ├── AuthModal.jsx       # 登录/注册弹窗（Antd Modal）
│   │   └── ErrorBoundary.jsx   # 错误边界
│   ├── pages/
│   │   ├── LandingPage.jsx     # 首页落地页（未登录用户）
│   │   ├── Home.jsx            # /workbench — 礼品生成工作台
│   │   ├── DigitalAlbum.jsx    # /digital-album — 电子画册编辑器（核心）
│   │   ├── DigitalAlbumList.jsx# 电子画册列表
│   │   ├── Preview.jsx         # 公开预览/分享页
│   │   ├── ModelUse.jsx        # AI 模型管理
│   │   └── ...
│   └── assets/
├── server.js                   # Express 后端（生产/自托管）
│   └── src/server/
│       ├── auth.js             # 密码哈希与 Token
│       └── db.js               # 数据库操作
├── package.json
├── vite.config.js
└── .env                        # 环境变量（DB/API Key/OSS）
```

---

## 页面路由

| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | LandingPage | 品牌首页，未登录用户的落地页 |
| `/workbench` | Home | 礼品图片生成工作台 |
| `/digital-album/:albumId?/:catId?/:itemId?/:albumDtlId?` | DigitalAlbum | 电子画册编辑器（核心） |
| `/digital-album` | DigitalAlbumList | 电子画册列表 |
| `/preview/:userId/:albumId?/:catId?/:itemAlbumId?` | Preview | 公开预览/分享 |
| `/model-use` | ModelUse | AI 模型参数管理 |
| `/my-albums` | MyAlbums | 旧版画册列表 |
| `*` | → `/workbench` | 默认重定向 |

---

## API 端点

### 认证
- `POST /api/register` — 注册
- `POST /api/login` — 登录（返回 token）
- `GET /api/me` — 当前用户信息
- `POST /api/logout` — 登出

### AI 生成
- `POST /api/generate` — 单任务图片生成
- `POST /api/generate/batch` — 批量图片生成（返回 batchId）
- `GET /api/generate/status?taskId=` — 单任务状态查询
- `GET /api/generate/batch-status?batchId=` — 批量任务进度轮询
- `POST /api/generate/prompts` — AI 文案生成
- `POST /api/generate/categories` — AI 分类名称生成

### 画册管理
- `GET /api/albums` — 获取所有生成画册
- `DELETE /api/albums/:id` — 删除画册
- `GET /api/digital-album?id=` — 获取电子画册数据
- `POST /api/digital-album` — 创建/保存电子画册
- `GET /api/album/list` — 列出所有电子画册
- `DELETE /api/album/:id` — 删除电子画册
- `GET /api/album?id=&userId=` — 公开获取画册（无需 token）

### 其他
- `POST /api/upload` — 上传图片到 OSS
- `GET /api/ping` — 健康检查 + API Key 配置状态
- `GET /api/model-stats` — 模型成功率与速度统计

---

## AI 模型

**图片生成：**
- MaiziAI GPT-Image-2（异步，轮询结果）
- Agnes Image 2.1 Flash（同步）

**文案生成：**
- Qwen3.5-Flash（阿里云 DashScope）
- GLM-4.6V-FlashX（智谱 BigModel）
- Doubao-Seed-2.0-mini（字节豆包火山引擎）

---

## 核心功能

### 1. 礼品图片生成工作台（Home）
- 提示词编辑（支持多模板）
- 节日选择触发 AI 自动文案生成
- 参考图上传（hover 预览）
- 白底图/场景图/详情图切换
- 批量调用 AI 模型生成礼品宣传图
- 进度轮询（模拟进度兜底 + API 真实进度覆盖）
- 历史画册分页查看与删除

### 2. 电子画册编辑器（DigitalAlbum — 核心）
- 左栏：树形目录（分类/页面），支持增删改
- AI 智能分类生成（一键生成 6-8 个节日礼品分类）
- Banner 管理（AI 生成 / 本地上传 / 重新生成）
- 画册挑选器（弹窗多选，按 createdAt 倒序）
- 单品/组合布局（组合最多 12 件）
- 产品参数编辑（规格/保质期/重量/温馨提示）
- 产品名称编辑（点击直接编辑）
- 组合 Banner 生成
- 公开预览 + 二维码分享

### 3. 公开预览（Preview）
- URL 路径 `/preview/:userId/:albumId?/:catId?/:itemAlbumId?`
- 左侧绿色分类导航 + 右侧内容展示
- 无 token 公开访问（通过 userId 参数）
- 产品参数展示

### 4. AI 模型管理（ModelUse）
- 选择图片/文案生成模型
- 调节温度与 Max Tokens
- 查看各模型成功率和速度

---

## 模型生成进度

- Agnes 模型（`agnes-image-2.1-flash`）和 ChatGPT 模型（`maiziai-chatgpt-image-2`）均通过 `/api/generate/batch-status` 轮询进度
- 后端返回的 `res.progress`（0-100 数值）和 `res.statusText`（文字描述）会实时更新到 `generations` 状态中
- 同时前端有模拟进度（`sim` 定时器）兜底，每 800ms 递增 1-2%，到 95% 停止
- API 返回的 `res.progress` 会覆盖模拟进度，确保真实进度优先显示
- 生成完成后（`res.status === 'SUCCEEDED'`）该条目从 `generations` 中移除并刷新画册列表
- 模拟进度在 `useEffect` 中全局运行，独立于 `startBatchPolling`，确保条目创建后立即开始递增
- `startBatchPolling` 中的 `poll` 只负责读取 API 返回的真实进度（`res.progress > 0` 才覆盖），避免后端返回 `progress: 0` 把模拟进度重置回 0%
- Claude 模型（如 `claude-sonnet-4-image`）也走相同流程
