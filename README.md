# Personal Cloud

A fast, self-hosted personal cloud storage built on Cloudflare's edge infrastructure. Zero egress fees, global CDN, serverless.

## Features

- **File Management** — Upload, download, rename, move, delete, folder hierarchy
- **Drag & Drop Upload** — Drop files anywhere, multipart upload for large files with progress tracking
- **File Preview** — Images, video, audio, PDF, text/code inline preview
- **Search** — Fuzzy search across all files
- **Version History** — Automatic versioning on re-upload, revert to any version
- **Trash & Recovery** — Soft delete with 30-day auto-purge
- **Share Links** — Password-protected, expiring share links for public download
- **Keyboard Shortcuts** — Delete, Ctrl+A, F2 rename

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | [Hono](https://hono.dev) on Cloudflare Workers |
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Storage | Cloudflare R2 (S3-compatible, zero egress) |
| Database | Cloudflare D1 (SQLite at the edge) |
| State | TanStack Query + Zustand |

## Getting Started

### Prerequisites

- Node.js 18+
- [pnpm](https://pnpm.io)
- [Cloudflare account](https://dash.cloudflare.com)

### Local Development

```bash
# Install dependencies
pnpm install

# Create local D1 database
cd packages/worker
cp .dev.vars.example .dev.vars  # Edit with your password hash
pnpm db:migrate

# Start backend (localhost:8787)
pnpm dev

# In another terminal — start frontend (localhost:5173)
cd packages/web
pnpm dev
```

Generate a password hash for `.dev.vars`:
```bash
echo -n "your-password" | shasum -a 256 | cut -d' ' -f1
```

### Deployment

1. **Create Cloudflare resources:**
```bash
cd packages/worker
npx wrangler d1 create personal-cloud-db
npx wrangler deploy
```

2. **Set secrets:**
```bash
npx wrangler secret put JWT_SECRET        # Random string: openssl rand -hex 32
npx wrangler secret put AUTH_PASSWORD_HASH # SHA-256 of your password
```

3. **Apply migrations:**
```bash
npx wrangler d1 migrations apply personal-cloud-db --remote
```

4. **Deploy frontend:**
```bash
cd packages/web
npx vite build
npx wrangler pages project create personal-cloud-web --production-branch main
npx wrangler pages deploy dist --project-name personal-cloud-web
```

5. **Custom domains (optional):**
   - Add custom domain to Worker in `wrangler.toml` or Cloudflare Dashboard
   - Add custom domain to Pages project in Dashboard
   - Set `VITE_API_BASE` in `packages/web/.env.production`

## Project Structure

```
personal-cloud/
├── packages/
│   ├── worker/           # API (Cloudflare Worker)
│   │   ├── src/
│   │   │   ├── routes/   # REST API handlers
│   │   │   ├── db/       # D1 query layer
│   │   │   └── utils/    # JWT, ID generation
│   │   ├── migrations/   # D1 schema
│   │   └── test/         # Integration tests
│   └── web/              # Frontend (React SPA)
│       └── src/
│           ├── pages/    # Login, FileManager, SharePage
│           ├── components/
│           └── hooks/    # Data fetching, upload, keyboard
├── CLAUDE.md
└── README.md
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login |
| GET | `/api/files` | List directory |
| POST | `/api/files` | Create folder / upload file |
| PATCH | `/api/files/:id` | Rename / move |
| DELETE | `/api/files/:id` | Soft delete |
| GET | `/api/files/:id/download` | Download file |
| POST | `/api/files/batch` | Batch delete / move |
| POST | `/api/upload/presign` | Initiate multipart upload |
| PUT | `/api/upload/part` | Upload part |
| POST | `/api/upload/complete` | Complete multipart upload |
| GET | `/api/files/:id/versions` | List versions |
| POST | `/api/files/:id/revert` | Revert to version |
| GET | `/api/trash` | List trash |
| POST | `/api/trash/:id/restore` | Restore from trash |
| GET | `/api/search?q=` | Search files |
| POST | `/api/shares` | Create share link |
| GET | `/s/:id` | Get share info (public) |
| POST | `/s/:id/download` | Download shared file (public) |

## License

MIT
