# CLAUDE.md

## Project Overview

Personal cloud storage web app built entirely on Cloudflare (Workers + Pages + R2 + D1). Single-user, password-protected, with file sharing capabilities.

## Architecture

- **Backend**: Hono on Cloudflare Workers, D1 for metadata, R2 for object storage
- **Frontend**: React 18 SPA on Cloudflare Pages
- **Monorepo**: pnpm workspaces (`packages/worker` and `packages/web`)

## Commands

### Development

```bash
# Worker (API) — runs on localhost:8787
pnpm --filter worker dev

# Web (Frontend) — runs on localhost:5173, proxies /api and /s to worker
pnpm --filter web dev

# Run tests (worker only)
pnpm --filter worker test

# Apply D1 migrations locally
pnpm --filter worker db:migrate
```

### Deployment

```bash
# Deploy Worker
cd packages/worker && npx wrangler deploy

# Deploy Frontend
cd packages/web && npx vite build && npx wrangler pages deploy dist --project-name personal-cloud-web

# Apply D1 migrations to production
cd packages/worker && npx wrangler d1 migrations apply personal-cloud-db --remote
```

## Project Structure

```
packages/
├── worker/              # Cloudflare Worker (Hono API)
│   ├── src/
│   │   ├── index.ts     # App entry, route mounting
│   │   ├── types.ts     # Env bindings, DB record types
│   │   ├── cron.ts      # Scheduled cleanup handler
│   │   ├── middleware/   # Auth JWT verification
│   │   ├── routes/       # Route handlers (auth, files, upload, versions, trash, search, shares, public)
│   │   ├── db/           # D1 query helpers
│   │   └── utils/        # JWT, nanoid, R2 helpers
│   ├── migrations/       # D1 SQL migrations
│   └── test/             # Vitest tests (cloudflare:test)
└── web/                 # React SPA (Vite + Tailwind)
    └── src/
        ├── api/          # Fetch wrapper with auth
        ├── stores/       # Zustand state
        ├── hooks/        # React Query hooks, upload, keyboard
        ├── pages/        # Login, FileManager, SharePage
        └── components/   # UI components
```

## Key Design Decisions

- Small files (<10MB) upload through Worker; large files use multipart direct-to-R2
- Soft delete (trash) with 30-day auto-purge via Cron Trigger
- File versioning: same-name upload creates a new version automatically
- JWT auth with SHA-256 password hashing (single user)
- `VITE_API_BASE` env var separates frontend/backend domains in production

## Environment

- Production API: `api.cloud.jiapan.me`
- Production Frontend: `cloud.jiapan.me`
- Secrets (set via `wrangler secret put`): `JWT_SECRET`, `AUTH_PASSWORD_HASH`

## Testing

Tests use `@cloudflare/vitest-pool-workers` with in-memory D1/R2. Run with `pnpm --filter worker test`.
