# Personal Cloud — 个人网盘

一个快速、自托管的个人云存储，完全基于 Cloudflare 边缘基础设施构建。零出站流量费、全球 CDN 加速、无服务器架构——几分钟即可部署你自己的网盘。

![Personal Cloud 截图](./docs/file-manager-list.png)

## 功能特性

- **文件管理** — 上传、下载、重命名、移动、删除、创建文件夹
- **拖拽上传** — 拖入文件即上传，大文件自动分片并显示实时进度
- **文件预览** — 图片、视频、音频、PDF、文本/代码在线预览
- **网格/列表视图** — 自由切换紧凑列表和可视化网格布局
- **文件搜索** — 按文件名模糊搜索
- **版本历史** — 同名文件重新上传自动创建版本，可回退到任意历史版本
- **回收站** — 软删除 + 30 天自动清理，随时恢复
- **分享链接** — 支持密码保护和过期时间的公开下载链接
- **快捷键** — Delete 删除、Ctrl+A 全选、F2 重命名
- **操作反馈** — 所有操作都有 loading → 成功/失败的 toast 通知
- **单用户设计** — 简单密码认证，为个人使用优化
- **完全无服务器** — 无需维护服务器，自动弹性伸缩


## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | [Hono](https://hono.dev)（运行在 Cloudflare Workers 上） |
| 前端 | React 18 + TypeScript + Vite + Tailwind CSS |
| 对象存储 | Cloudflare R2（S3 兼容，零出站费用） |
| 数据库 | Cloudflare D1（边缘 SQLite） |
| 图标 | Lucide React |
| 状态管理 | TanStack Query + Zustand |

## 系统架构

```
+-------------------+       +------------------------+       +---------------+
|  React SPA        |------>|  Hono Worker (API)     |------>|  Cloudflare   |
|  (CF Pages)       |       |                        |       |  R2           |
|                   |<------|  - File CRUD           |       +---------------+
|  - File Manager   |       |  - Auth (JWT)          |
|  - Preview        |       |  - Search              |       +---------------+
|  - Drag Upload    |       |  - Share Links         |------>|  Cloudflare   |
+-------------------+       |  - Versioning          |       |  D1           |
                            +------------------------+       +---------------+
                                     |
            +------------------------+
            |                        |
            v                        v
+--------------------+    +------------------------+
| Small files (<10MB)|    | Large files (>=10MB)   |
| via Worker proxy   |    | Multipart direct to R2 |
+--------------------+    +------------------------+
```

- **小文件 (<10MB)**：通过 Worker 代理上传，简单直接
- **大文件 (≥10MB)**：分片上传直接写入 R2（绕开 Worker 请求大小限制）
- **下载**：通过 Worker 流式传输，带认证头
- **元数据**：所有文件/目录结构存储在 D1 中；R2 只保存文件二进制内容

## 费用说明

### 免费额度（覆盖大部分个人使用）

| 资源 | 免费额度 | 足够用于... |
|------|---------|------------|
| R2 存储 | 10 GB/月 | 约 5,000 张照片或 200 个文档 |
| R2 写入 | 100 万次/月 | 每天上传 3.3 万次 |
| R2 读取 | 1000 万次/月 | 每天下载 33 万次 |
| R2 出站流量 | **永久免费** | 无限下载，零流量费 |
| D1 存储 | 5 GB | 百万级文件元数据 |
| D1 读取 | 500 万行/天 | 远超个人使用量 |
| D1 写入 | 10 万行/天 | 每天 10 万次文件操作 |
| Workers 请求 | 10 万次/天 | 每天 10 万次 API 调用 |

### 付费估算

| 存储量 | 月费用 | 说明 |
|--------|-------|------|
| 50 GB | ~¥4.3 ($0.60) | (50 - 10 免费) × $0.015/GB |
| 100 GB | ~¥9.7 ($1.35) | (100 - 10 免费) × $0.015/GB |
| 500 GB | ~¥53 ($7.35) | (500 - 10 免费) × $0.015/GB |
| 1 TB | ~¥109 ($15.21) | (1024 - 10 免费) × $0.015/GB |

**核心优势**：R2 **零出站流量费**。无论下载多少文件，都不会产生额外费用。

### 与其他方案对比

| 方案 | 100 GB 月费 | 1 TB 月费 | 出站流量 |
|------|-----------|---------|---------|
| **Personal Cloud (R2)** | ¥9.7 | ¥109 | 免费 |
| AWS S3 | ¥16.5 | ¥165 | ¥0.65/GB |
| 阿里云 OSS | ¥12 | ¥120 | ¥0.5/GB |
| 腾讯云 COS | ¥11.8 | ¥118 | ¥0.5/GB |
| Google Drive | ¥15 (100GB 套餐) | ¥65 (2TB 套餐) | N/A |

## 部署指南

### 前置条件

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)
- 一个 [Cloudflare 账号](https://dash.cloudflare.com/sign-up)（免费即可）

### 第一步：克隆并安装依赖

```bash
git clone https://github.com/Panmax/personal-cloud.git
cd personal-cloud
pnpm install
```

### 第二步：登录 Cloudflare

```bash
npx wrangler login
```

会自动打开浏览器进行 OAuth 授权。

### 第三步：创建 D1 数据库

```bash
cd packages/worker
npx wrangler d1 create personal-cloud-db
```

复制输出的 `database_id`，更新 `packages/worker/wrangler.toml`：

```toml
[[d1_databases]]
binding = "DB"
database_name = "personal-cloud-db"
database_id = "你的数据库ID"  # ← 粘贴到这里
```

### 第四步：执行数据库迁移

```bash
npx wrangler d1 migrations apply personal-cloud-db --remote
```

### 第五步：设置密钥

生成 JWT 密钥：
```bash
openssl rand -hex 32
```

生成登录密码的哈希：
```bash
echo -n "你的密码" | shasum -a 256 | cut -d' ' -f1
```

设置为 Worker Secrets：
```bash
npx wrangler secret put JWT_SECRET
# 粘贴上面生成的随机字符串

npx wrangler secret put AUTH_PASSWORD_HASH
# 粘贴密码的 SHA-256 哈希值
```

### 第六步：部署 API（Worker）

```bash
npx wrangler deploy
```

记下 Worker URL（如 `https://personal-cloud-api.your-subdomain.workers.dev`）。

### 第七步：配置前端 API 地址

编辑 `packages/web/.env.production`：
```
VITE_API_BASE=https://你的worker地址.workers.dev
```

如果使用自定义域名，填写 API 域名（如 `https://api.cloud.yourdomain.com`）。

### 第八步：部署前端（Pages）

```bash
cd packages/web
npx vite build
npx wrangler pages project create personal-cloud-web --production-branch main
npx wrangler pages deploy dist --project-name personal-cloud-web
```

### 第九步（可选）：自定义域名

**API（Worker）：**

在 `packages/worker/wrangler.toml` 中添加：
```toml
[[routes]]
pattern = "api.cloud.yourdomain.com"
custom_domain = true
```

然后重新部署：`npx wrangler deploy`

**前端（Pages）：**

进入 Cloudflare Dashboard → Workers & Pages → 你的 Pages 项目 → Custom domains → 添加域名

### 代码更新后重新部署

```bash
# 部署后端
cd packages/worker && npx wrangler deploy

# 部署前端
cd packages/web && npx vite build && npx wrangler pages deploy dist --project-name personal-cloud-web

# 如果有新的数据库迁移
cd packages/worker && npx wrangler d1 migrations apply personal-cloud-db --remote
```

## 本地开发

```bash
# 终端 1：启动 Worker（API 运行在 localhost:8787）
cd packages/worker
cp .dev.vars.example .dev.vars  # 编辑填入密码哈希和 JWT 密钥
pnpm db:migrate
pnpm dev

# 终端 2：启动前端（运行在 localhost:5173，自动代理请求到 Worker）
cd packages/web
pnpm dev
```

本地开发用的密码哈希：
```bash
echo -n "devpassword" | shasum -a 256 | cut -d' ' -f1
```

## 定时任务

每天 **UTC 03:00**（北京时间 11:00）自动执行维护任务：

| 任务 | 说明 | 规则 |
|------|------|------|
| 回收站清理 | 永久删除回收站中超过 30 天的文件 | `deleted_at < 当前时间 - 30天` |
| 版本清理 | 删除超过 90 天的旧版本（每个文件保留最新 10 个版本） | `created_at < 当前时间 - 90天 且不在最新10个版本内` |
| 分享链接过期 | 删除已过期的分享链接记录 | `expires_at < 当前时间` |
| 孤儿文件清理 | 检测并删除父目录已不存在的孤儿文件（处理历史数据和边缘情况） | `parent_id 指向不存在的记录` |

所有清理任务都会同时删除对应的 R2 对象，不会产生额外存储费用。

## 数据存储方式

**R2（对象存储）** — 仅存储文件二进制内容，key 格式为 `{文件ID}/{版本号}`。

**D1（SQLite 数据库）** — 存储所有元数据：

| 表 | 用途 |
|----|------|
| `files` | 文件/目录树结构、名称、大小、MIME 类型、软删除状态 |
| `file_versions` | 版本历史（每个历史版本的 R2 key + 大小） |
| `shares` | 分享链接配置（密码哈希、过期时间、下载次数） |

## 上传行为

| 场景 | 处理方式 |
|------|---------|
| 上传新文件 | 创建文件记录 + 存入 R2 |
| **同目录**下上传同名文件 | 自动创建新版本（旧内容保存在版本历史中） |
| **不同目录**下上传同名文件 | 创建独立文件（不跨目录去重） |
| 上传 ≥10MB 的文件 | 使用分片上传：分块直传 R2，完成后写入 D1 元数据 |

## API 接口

<details>
<summary>点击展开完整 API 参考</summary>

### 认证
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 密码登录，返回 JWT |

### 文件操作
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/files?parent_id=` | 列出目录内容 |
| POST | `/api/files` | 创建文件夹（JSON）或上传文件（multipart） |
| GET | `/api/files/:id` | 获取文件详情 |
| PATCH | `/api/files/:id` | 重命名或移动 |
| DELETE | `/api/files/:id` | 软删除（移到回收站） |
| GET | `/api/files/:id/download` | 下载文件 |
| POST | `/api/files/batch` | 批量删除或移动 |

### 大文件上传
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/upload/presign` | 初始化分片上传 |
| PUT | `/api/upload/part` | 上传分片 |
| POST | `/api/upload/complete` | 完成分片上传 |

### 版本管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/files/:id/versions` | 列出版本历史 |
| POST | `/api/files/:id/revert` | 回退到指定版本 |
| DELETE | `/api/files/:id/versions/:vid` | 删除指定版本 |

### 回收站
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/trash` | 列出回收站文件 |
| POST | `/api/trash/:id/restore` | 恢复文件 |
| DELETE | `/api/trash/:id` | 永久删除 |

### 搜索
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/search?q=` | 按文件名模糊搜索 |

### 分享
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/shares` | 创建分享链接 |
| GET | `/api/shares` | 列出所有分享 |
| DELETE | `/api/shares/:id` | 撤销分享链接 |

### 公开访问（无需认证）
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/s/:id` | 获取分享文件信息 |
| POST | `/s/:id/download` | 下载分享文件 |

</details>

## 截图

### 登录页
![登录页](./docs/login.png)

### 文件管理器（列表视图）
![列表视图](./docs/file-manager-list.png)

### 文件管理器（网格视图）
![网格视图](./docs/file-manager-grid.png)

### 文件预览
![预览](./docs/preview.png)

### 回收站
![回收站](./docs/trash.png)

### 分享链接管理
![分享管理](./docs/shares.png)

### 分享下载页
![分享下载](./docs/share-page.png)

## 测试

```bash
# 后端测试（35 个集成 + 单元测试）
cd packages/worker && pnpm test

# 前端测试（21 个组件 + store 测试）
cd packages/web && pnpm test
```

## 项目结构

```
personal-cloud/
├── packages/
│   ├── worker/              # Cloudflare Worker（API 后端）
│   │   ├── src/
│   │   │   ├── index.ts     # Hono 应用入口 + 路由挂载
│   │   │   ├── types.ts     # TypeScript 接口定义
│   │   │   ├── cron.ts      # 定时清理任务
│   │   │   ├── middleware/   # JWT 认证中间件
│   │   │   ├── routes/       # API 路由处理器
│   │   │   ├── db/          # D1 查询帮助函数
│   │   │   └── utils/       # JWT、nanoid 等工具
│   │   ├── migrations/      # D1 数据库 Schema
│   │   └── test/            # 集成测试
│   └── web/                 # React SPA（Cloudflare Pages 前端）
│       └── src/
│           ├── pages/       # 文件视图、回收站、分享管理、登录、分享页
│           ├── components/  # 可复用 UI 组件
│           ├── hooks/       # React Query hooks、上传、快捷键
│           ├── stores/      # Zustand 状态管理
│           └── utils/       # 文件图标工具
├── CLAUDE.md               # AI 助手上下文
├── README.md               # English
└── README_CN.md            # 中文文档
```

## 贡献

欢迎贡献！请先开 issue 讨论你想做的改动。

## 开源协议

MIT
