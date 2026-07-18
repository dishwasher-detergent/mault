# Magic Vault

A Magic: The Gathering card scanner and physical sorter. A webcam identifies cards via AI image embeddings, a rule engine decides which bin each card belongs in, and an Arduino-driven feeder and servo mechanism physically routes the card there.

## How it works

1. A feeder mechanism (continuous-rotation servo + roller) pulls a card from the hopper into view of the webcam
2. OpenCV.js detects and extracts the card image in-browser
3. The image is sent to the server for embedding search (Hugging Face SigLIP)
4. PostgreSQL vector similarity search (pgvector) identifies the card
5. Configurable, per-collection bin rules decide which bin the card should go to
6. The web app sends a serial command to the Arduino, which drives the trapdoor/paddle/pusher servos to route the card into that bin

## Features

- Live webcam scanning with automatic card detection and identification
- Rule-based sort bins, grouped by collection, with and/or rule trees across card fields (color, rarity, price, set, etc.)
- Multiple collections per organization, each with their own bin configuration and card history
- Remote monitoring — watch an in-progress scan session live from another device
- Discord notifications for scan events, configurable per organization
- Per-organization branding and scanner layout settings
- Feeder and servo calibration tools
- In-app hardware build guide (`/build`) with bill of materials, wiring diagrams, and assembly instructions

## Stack

- **Web** — React 19, Vite, React Router v7, Tailwind CSS 4, TanStack Query
- **Server** — Hono 4, Drizzle ORM, Neon PostgreSQL (pgvector)
- **Auth** — Neon Auth (JWT), backed by Better Auth on the client
- **Hardware** — Arduino Uno R4 via Web Serial API (9600 baud), PCA9685 servo driver
- **Monorepo** — Turborepo + pnpm workspaces

## Project structure

```
packages/
├── shared/   @magic-vault/shared — types, constants, evaluate-bin rule engine
├── server/   @magic-vault/server — Hono API, Drizzle schema/db, auth middleware
└── web/      @magic-vault/web    — React SPA (scanner, bins, collections, admin, build guide)
arduino/      Arduino sketch (arduino/main/main.ino)
"3d model"/   Printable enclosure/module design (Fusion 360 + .3mf)
drizzle/      Generated SQL migrations
scripts/      Release/version-bump helpers
```

## Getting started

```bash
pnpm install
pnpm dev        # Vite on :5173, Hono on :3001
```

### Environment variables

Root `.env` (read by the server):

```
DATABASE_URL=
NEON_AUTH_URL=
PORT=            # optional, defaults to 3001
WEB_URL=         # optional, used for CORS
```

`packages/web/.env`:

```
VITE_API_URL=
VITE_APP_ENV=
VITE_NEON_AUTH_URL=
VITE_NEON_DATA_API_URL=
```

## Database

```bash
pnpm --filter @magic-vault/server db:generate  # generate a migration from schema changes
pnpm --filter @magic-vault/server db:migrate   # apply migrations
pnpm --filter @magic-vault/server db:push      # push schema directly (dev)
pnpm --filter @magic-vault/server db:studio    # open Drizzle Studio
```

## Deployment

`Dockerfile.server` builds the Hono API (and pre-downloads the SigLIP model at build time). `Dockerfile.web` builds the Vite SPA and serves it with nginx (`nginx.conf`); `VITE_API_URL` must be supplied as a build arg since it's baked into the client bundle.

## Hardware

The full bill of materials, wiring diagrams, and assembly instructions live in the app at `/build`. In short:

- Arduino Uno R4 Minima, driving a PCA9685 servo controller over I2C
- 9 positional SG90 servos (3 per module: trapdoor, paddle gate, pusher) plus 1 continuous-rotation SG90 for the feeder
- IR sensor for card-feed detection
- Enclosure and module parts are in `3d model/` (Fusion 360 source + printable `.3mf`)

Upload `arduino/main/main.ino` (requires the ArduinoJson library). It communicates via JSON over USB serial — the web app sends `{"bin": N}` and the Arduino runs the routing sequence.

## Webcam

Using a Logitech C920, these settings worked best:

Auto Focus: Off
Focus: 50%
Auto Exposure: On
Low Light Compensation: On
Auto White Balance: On
Brightness: 140
Contrast: 140
Saturation: 160
Sharpness: 130
