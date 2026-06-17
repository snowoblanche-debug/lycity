# LY.city — 歌回點歌系統

A VTuber livestreamer song request system. Viewers browse a song library and queue requests; the streamer sees an OBS overlay showing current/next song. Fully rebranded via DB-driven settings — no hardcoded branding.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/linying run dev` — run the frontend (auto-assigned port)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `SUPABASE_URL`, `SUPABASE_ANON_KEY` — Supabase credentials (stored as secrets)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, shadcn/ui, wouter (routing)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM (Replit managed)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Style: Morandi grey-blue glassmorphism, dark mode default, Noto Sans TC font

## Where things live

- `lib/api-spec/openapi.yaml` — single source of truth for all API contracts
- `lib/db/src/schema/` — Drizzle table definitions (songs, categories, queue, settings)
- `artifacts/api-server/src/routes/` — Express route handlers (songs, queue, categories, settings, stats)
- `artifacts/linying/src/` — React frontend (pages: Home, OBS, Admin)
- `lib/api-client-react/src/generated/` — generated React Query hooks (do not edit)
- `lib/api-zod/src/generated/` — generated Zod schemas for server validation (do not edit)

## Architecture decisions

- Contract-first API: OpenAPI spec gates codegen which gates the frontend — always update spec first, then run codegen
- Supabase credentials stored in Replit Secrets (SUPABASE_URL, SUPABASE_ANON_KEY); actual DB is Replit PostgreSQL
- Queue `position` field is manually managed (not auto-increment) to support drag-to-reorder
- OBS page uses `background: transparent` — must be set as a browser source in OBS with "Allow transparency" checked
- Google Sheet import expects columns: 歌名/title, 歌手/artist, optional: 語種/language, youtube/url, 修練/practice, 破音/pitch, 分類/category
- **Branding is DB-driven**: `site_name` and `site_subtitle` in the settings table control all display names. To rebrand, update those fields in Admin → 系統設定. No code changes needed.

## Product

- **Homepage** (`/`): Banner with settings-driven site name/subtitle, 70% song library with search + language/category filters, 30% live queue panel (auto-refreshes)
- **OBS Overlay** (`/obs`): Transparent background, shows current + next song with artist and requester name (auto-refreshes every 5s)
- **Admin Panel** (`/admin`): Overview stats, song CRUD + Google Sheet import, category management, queue management, requester leaderboard, site settings

## User preferences

- Morandi grey-blue palette, glassmorphism UI, dark mode by default
- Chinese labels throughout the UI
- No pink/girly style, no imitation of other song request sites
- Premium, high-end aesthetic

## Gotchas

- After any OpenAPI spec change: run `pnpm --filter @workspace/api-spec run codegen` then `pnpm run typecheck:libs`
- Google Sheet must be publicly accessible (File → Share → Anyone with the link can view)
- OBS page: in OBS, add as Browser Source, check "Allow transparency", set width/height to match stream resolution
- Songs table uses JSONB for `categories` array — filter uses `@>` operator

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
