---
name: V3 static serving via API server
description: Why V3 (linying-v3) is served as static files from the API server, not as a live vite dev server, and how to rebuild after changes.
---

## Rule
V3 (`artifacts/linying-v3`) is served as **static files** from the API server (`artifacts/api-server`) at the `/v3/` path, not via its own vite dev server workflow.

## Why
The Replit workflow monitoring system cannot detect ports opened by artifact-managed workflows whose preview path is NOT `/` (root). Only the first-registered artifact at `/` (linying v2) gets `openPorts: [3000]` via the devBanner plugin. Any non-root artifact workflow that starts a vite dev server will always show `openPorts: null` and be killed after the timeout, even though vite genuinely binds to the port (confirmed via /proc/net/tcp and curl). The monitoring system uses an internal Replit registration mechanism, not raw TCP port scanning.

## How to apply
- `artifacts/api-server/src/app.ts` serves V3 static files:
  - `app.use("/v3", express.static(v3Dist))` 
  - `app.use("/v3/*path", ...)` → sends `index.html` (SPA fallback)
  - `v3Dist` = `path.resolve(import.meta.dirname, "../../../artifacts/linying-v3/dist/public")`
- V3 artifact.toml routes `/v3/` to `localPort = 8080` (the API server's port)
- V3 workflow runs `build:watch` but shows as "failed" — ignore this, the static files are served correctly
- **After any code change to V3**: rebuild with `pnpm --filter @workspace/linying-v3 run build`, then restart the API server workflow to pick up new files (or just wait — express.static serves from disk on each request, so a rebuild is sufficient without API server restart)
- V3's `vite.config.ts` still has `PORT`/`BASE_PATH` guards and the `healthCheckPlugin` — these are harmless for production builds
