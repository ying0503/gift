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

## Deploy Panel（部署控制台）

**地址：** `http://192.168.31.113:1000`  
**位置：** Mac Mini（192.168.31.113），独立项目 `~/deploy-panel`  
**仓库：** `git@github.com:ying0503/gift-deploy.git`

**所有部署操作均通过面板页面进行，不再使用 CLI 命令：**

| 操作 | 面板路径 | 说明 |
|------|----------|------|
| 部署测试 | `http://192.168.31.113:1000/deploy` | 点"部署测试"→ 从 GitHub 拉最新代码 → Mac Mini 本地构建 → 重启 gift-album（端口 3000） |
| 部署生产 | `http://192.168.31.113:1000/deploy` | 点"部署生产"→ SSH 到 ECS → ECS 从 GitHub 拉代码 → 构建 → pm2 重启 |
| 测试任务 | `http://192.168.31.113:1000/tasks` | CRUD 管理测试用例，一键执行，查看结果 |

**测试环境地址：** `http://192.168.31.113:3000`（Mac Mini 本机 gift-album）

**常规操作：**
- 本地开发 `npm run dev`，推送代码到 GitHub
- 需要部署时打开面板点按钮，无需 SSH 或终端命令

**规则红线：**
没有明确指令不能部署到ECS
没有明确指令不能push代码到github仓库
push 和 deploy 均需通过 macOS `osascript` 弹窗确认（AI 无法点击按钮，必须用户手动确认）

---

## 重启流程（仅当面板不可用时备用）

```bash
# 1. 停旧进程
kill $(lsof -ti:3000) 2>/dev/null
sleep 1

# 2. 启动新进程
nohup node server.js > /tmp/gift-album-server.log 2>&1 &
sleep 2

# 3. 验证服务在线
curl -s http://localhost:3000/api/ping
# 应返回 JSON 包含 ok:true

# 4. 验证登录（注册临时账户并登录）
curl -s -X POST http://localhost:3000/api/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"restart-verify@test.com","password":"verify123"}'
curl -s -X POST http://localhost:3000/api/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"restart-verify@test.com","password":"verify123"}'
# 应返回 success:true + token

# 5. 清理临时账户
mysql -h localhost -u gift_album -p'GiftAlbum@1d6ee11a' gift_album \
  -e "DELETE FROM users WHERE email LIKE 'restart-verify%@test.com'"
```

每次重启后端必须执行上述验证，确认登录可用。