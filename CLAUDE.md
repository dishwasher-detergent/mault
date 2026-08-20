# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install
pnpm dev                                      # turbo dev: Vite :5173 + Hono :3001, in parallel
pnpm --filter @magic-vault/server dev          # server only
pnpm --filter @magic-vault/web dev             # web only

pnpm build                                    # turbo build (tsup for server, tsc -b + vite build for web)
pnpm --filter @magic-vault/web lint            # eslint — the only package with a lint script

pnpm --filter @magic-vault/server db:generate  # generate a migration from schema.ts changes
pnpm --filter @magic-vault/server db:migrate   # apply migrations
pnpm --filter @magic-vault/server db:push      # push schema directly, no migration file (fast local iteration only)
pnpm --filter @magic-vault/server db:studio    # open Drizzle Studio
```

There is no automated test suite in this repo. `packages/server`/`packages/shared` have no lint script either — rely on the `web` build (`tsc -b`) and editor TypeScript diagnostics as the type-check gate for the other two packages.

See `CONTRIBUTING.md` for the full database-migration workflow and `README.md` for environment/Neon setup.

## Architecture

pnpm workspace + Turborepo, three packages: `shared` (framework-agnostic types/constants/rule engine, no build step — resolved straight to `src/index.ts`), `server` (Hono 4 API + Drizzle ORM + Neon), `web` (React 19 SPA). A single root `.env` is read by both the server (`tsx --env-file ../../.env`) and Vite (configured to read up from `packages/web`).

### Auth & RLS

- Neon Auth issues JWTs; the server verifies them via JWKS (`middleware/auth.ts`). Middleware chain on org-scoped routes: `requireAuth` (verifies the `Authorization: Bearer` JWT, sets `userId`/`userRole`) → `requireOrg` (reads the `X-Org-Id` header, checks `neon_auth.member`, sets `orgId`/`orgRole`, and rebuilds `jwtClaims` to include `org_id`) → `requireRole`/`requireOrgRole` for authorization gates.
- Two DB access paths: `db` (`db/index.ts`, plain pool, no RLS) and `authQuery(jwtClaims, tx => ...)` (wraps a transaction, sets `request.jwt.claims` and does `SET LOCAL ROLE authenticated` so Postgres RLS policies actually apply). Use `db` directly only for intentional RLS-bypass work (the sync job, Discord webhook lookups, `neon_auth.*` bootstrap). New tables holding user/org data should follow the existing `.enableRLS()` + `crudPolicy({ role: authenticatedRole, ... })` pattern in `db/schema.ts`.
- The web client (`@neondatabase/neon-js`'s `BetterAuthReactAdapter`) is a client-side convenience wrapper — the actual identity provider is Neon Auth, not a standalone Better Auth server.

### Multi-TCG card search & sync

- Each supported game is a pluggable adapter under `packages/server/src/lib/<game>/` (currently `scryfall`, `gundam`, `pokemon`, `lorcana`, `onepiece`, `fab`): a `search.ts` exporting a `CardSearchAdapter` (`search`/`searchById` → `PlayingCard`) and a `sync.ts` exporting a `SyncSource` (`fetchCards`/`fetchOne` → `SyncSourceCard`, for the admin bulk image-vectorization job).
- `card-search/resolve.ts` maps a `Game.key` to its `CardSearchAdapter` (`ADAPTERS_BY_GAME_KEY`); `lib/sync-job.ts` maps it to its `SyncSource` (`SYNC_SOURCES`). Adding a new TCG means adding both, then creating a `Game` row (via the in-app Games Manager, not a code seed) with that key.
- Every adapter normalizes into the same `PlayingCard` shape (`shared/interfaces/card.interface.ts`) regardless of the source API's own shape — that's the app's canonical card schema. `PlayingCard.id` is always per-printing/per-art granularity (not per card name), since that's what gets vectorized and matched against a scan.
- Each `Game` carries its own admin-configurable `fieldDefinitions: FieldMeta[]`, read generically via `getByPath()` to drive bin rules, card-grid sorting, and Discord notifications. Don't hardcode source-specific fields (e.g. Scryfall's `prices.usd`) in anything meant to work across games.
- Search results are wrapped in an in-memory TTL cache (`card-search/cache.ts`'s `withCache`).

### Bulk sync job

- `lib/sync-job.ts` runs a single global in-memory job (one sync at a time), streamed to the admin UI over SSE (`routes/admin.ts`'s `/sync/stream`, via `hono/streaming`'s `streamSSE`). The JWT is passed as a `?token=` query param since `EventSource` can't set custom headers.
- Cards are fetched, vectorized (SigLIP, `lib/vectorize.ts`) across `VECTORIZE_CONCURRENCY` parallel workers, and inserted in batches (`SYNC_INSERT_BATCH_SIZE`). `processed`/`errors` counts only advance once a batch insert is confirmed — never when a card is merely queued into a pending batch — since several cards can share one batch's outcome.
- Job state lives in server process memory, not the DB, so it survives a page refresh but not a server restart; reconnecting SSE just flushes current state.

### Scanning & hardware routing

- The physical sorter's serial protocol is documented standalone in `arduino/PROTOCOL.md` — read that rather than re-deriving it from the web client.
- Scanning is desktop-only; `DesktopOnlyGuard` in `app/router.tsx` redirects mobile clients to `/app/monitor` for live remote viewing of an in-progress session over SSE (`lib/session-stream.ts`).
- `lib/scan-lock.ts` prevents two concurrent scan sessions against the same collection.
- The firmware has no concept of a "bin" — the web app owns the bin→(module, direction) mapping (`shared/interfaces/bin-routes.interface.ts`) and resolves it before ever sending a serial `route` command.

### Web structure

- Bulletproof React, feature-first: `features/<name>/{api,components,lib}` (current features: `bins`, `calibration`, `cards`, `collections`, `companies`, `games`, `notifications`, `scanner`). Cross-feature code only belongs in the top-level `components/`, `hooks/`, `lib/` — not a feature folder.
- Routing is React Router v7 under `app/routes/` (`app/*` for the authenticated app shell, `build/*` for the in-app hardware build guide, plus `landing`/`auth`).
- `@/*` resolves to `packages/web/src/*`.
- All API calls go through `lib/api/client.ts` (`apiGet`/`Post`/`Put`/`Delete`/`PostForm`) or feature-specific wrappers under `features/*/api/`, always with `Authorization: Bearer <token>` — never cookies.
- Forms always use React Hook Form + a Zod resolver — never a hand-rolled `useState`-per-field form.
- The Vite dev proxy rewrites `/api/*` → `http://localhost:3001/*`; server routes are registered without an `/api` prefix to match (`app.route("/collections", ...)`, not `/api/collections`).

## Code style

Don't write excessive comments — code should be self-documenting through clear naming and structure. Only add a comment when it explains something the code itself can't: a non-obvious constraint, a workaround for a specific external system's quirk, or an invariant that would surprise a reader. Don't restate what the code already makes obvious.
