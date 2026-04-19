# Magic Vault

A Magic: The Gathering card scanner and physical sorter. Point a webcam at cards, identify them via AI image embeddings, and automatically route them into bins via an Arduino-controlled servo mechanism.

## How it works

1. Webcam captures card images using OpenCV.js detection
2. Card image is sent to the server for embedding search (Hugging Face SigLIP)
3. PostgreSQL vector similarity search identifies the card
4. Configurable bin rules determine which bin the card goes to
5. Arduino receives a serial command and physically routes the card

## Stack

- **Web** — React 19, Vite, React Router v7, Tailwind CSS 4
- **Server** — Hono 4, Drizzle ORM, Neon PostgreSQL (pgvector)
- **Auth** — Neon Auth (JWT)
- **Hardware** — Arduino via Web Serial API (9600 baud)
- **Monorepo** — Turborepo + pnpm workspaces

## Getting started

```bash
pnpm install
pnpm dev        # Vite on :5173, Hono on :3001
```

### Environment variables

Root `.env`:
```
DATABASE_URL=
DATABASE_AUTHENTICATED_URL=
NEON_AUTH_URL=
```

`packages/web/.env`:
```
VITE_API_URL=http://localhost:3001
```

## Database

```bash
pnpm --filter @magic-vault/server db:push     # push schema
pnpm --filter @magic-vault/server db:studio   # open Drizzle Studio
```

## Arduino

Upload `arduino/main/main.ino` (requires ArduinoJson library). Communicates via JSON over USB serial — web app sends `{"bin": N}`, Arduino routes the card.
