# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Root (Turborepo)
pnpm dev          # Start all packages (Vite on :5173, Express on :3001)
pnpm build        # Build all packages

# packages/web (React SPA)
pnpm --filter @magic-vault/web dev
pnpm --filter @magic-vault/web build

# packages/server (Express API)
pnpm --filter @magic-vault/server dev
pnpm --filter @magic-vault/server db:generate
pnpm --filter @magic-vault/server db:migrate
pnpm --filter @magic-vault/server db:push
pnpm --filter @magic-vault/server db:studio
```

No test runner is configured.

## Architecture

**Magic: The Gathering card scanner and sorter.** Monorepo with:
- **`packages/web`** — React 19 + Vite SPA (React Router)
- **`packages/server`** — Express + TypeScript API
- **`packages/shared`** — Pure TS types, interfaces, and shared logic

### Data Flow

Webcam → OpenCV.js card detection → image extraction → POST /api/card/search → embedding search (Hugging Face SigLIP, 768-dim vectors) → card identification via PostgreSQL vector search → rule evaluation against bin configs → bin assignment → Arduino serial command → IndexedDB persistence

### Stack

- **React 19** + **Vite 6** + **React Router v7** (SPA)
- **Tailwind CSS 4** with oklch color variables, **Base UI** + **shadcn** component patterns, **CVA** for variants
- **Express 4** API server with **Better Auth** for authentication
- **Drizzle ORM** + **Neon PostgreSQL** (serverless driver), **idb** for client-side IndexedDB
- **Web Serial API** (browser-native) for Arduino communication
- **Turborepo** + **pnpm workspaces** for monorepo orchestration

### Package Structure

```
packages/
├── shared/       @magic-vault/shared — interfaces, constants, evaluate-bin
├── server/       @magic-vault/server — Express API, db, auth, routes
└── web/          @magic-vault/web    — React SPA, components, hooks, pages
```

### State Management (packages/web)

Three React context providers nested in `src/pages/app/layout.tsx`:

1. **SerialProvider** (`hooks/use-serial.tsx`) — Arduino USB connection, `sendBin()` command/response
2. **BinConfigsProvider** (`hooks/use-bin-configs.tsx`) — sort bin rules, synced via `/api/sort-bins/*`
3. **ScannedCardsProvider** (`hooks/use-scanned-cards.tsx`) — scanned card list, synced to IndexedDB, triggers serial commands on bin match
4. **ModuleConfigsProvider** (`hooks/use-module-configs.tsx`) — servo calibration, synced via `/api/modules/*`

### Rule Engine

`packages/shared/src/evaluate-bin.ts` recursively evaluates `BinRuleGroup` trees (and/or combinators) with 13 operators across 8 card fields. `BIN_COUNT = 7` max bins.

### Server API Routes

- `POST /api/auth/*` — Better Auth handler
- `POST /api/card/search` — vector similarity search (multer file upload)
- `GET /api/card/scryfall/search?q=` — Scryfall card search
- `GET /api/card/scryfall/:id` — Scryfall card by ID
- `GET/POST/DELETE /api/sort-bins/*` — Sort bin CRUD
- `GET/PUT /api/modules/:moduleNumber` — Module calibration

### Arduino Serial Protocol

JSON over USB serial at 9600 baud. Web app sends `{"bin": N}`, Arduino responds with routing sequence. Sketch at `arduino/main/main.ino` (requires ArduinoJson library).

## Conventions

- Import alias: `@/*` maps to `packages/web/src/` (web package)
- `@magic-vault/shared` for shared types/constants/utils
- Styling: Tailwind classes composed with `cn()` from `lib/utils.ts` (clsx + tailwind-merge)
- Custom rarity colors: `--common`, `--uncommon`, `--rare`, `--mythic` CSS variables
- Auth: Better Auth (email+password), JWT session set as `request.jwt.claims` PostgreSQL config for Neon RLS

## Environment Variables

Root `.env` (read by server):
- `DATABASE_URL` — Neon connection string (pooled)
- `DATABASE_AUTHENTICATED_URL` — Neon authenticated role URL
- `BETTER_AUTH_SECRET` — Random secret for Better Auth
- `BETTER_AUTH_URL` — Server URL (default: http://localhost:3001)
- `WEB_URL` — Web SPA URL for CORS (default: http://localhost:5173)

`packages/web/.env`:
- `VITE_API_URL` — API server URL (default: http://localhost:3001)
