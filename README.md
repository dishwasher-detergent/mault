# Magic Vault

A TCG card scanner and physical sorter. A webcam identifies cards via AI image embeddings, a rule engine decides which bin each card belongs in, and an Arduino-driven feeder and servo mechanism physically routes the card there.

## MakerWorld

https://makerworld.com/en/models/3066180-tcg-card-sorting-machine#profileId-3451252

## How it works

1. A feeder mechanism (continuous-rotation servo + roller) pulls a card from the hopper into view of the webcam, into a fixed, per-camera-calibrated scan region (see calibration screen)
2. The browser crops that region to a straightened card image (plain Canvas 2D, no computer vision needed, since the camera mounting and card size are fixed and calibrated ahead of time)
3. The image is sent to the server for embedding search (Hugging Face SigLIP)
4. PostgreSQL vector similarity search (pgvector) identifies the card
5. Configurable, per-collection bin rules decide which bin the card should go to
6. The web app sends a serial command to the Arduino, which drives the trapdoor/paddle/pusher servos to route the card into that bin

## Features

- Live webcam scanning with automatic card detection and identification; captures wait for the card to physically settle at the sensor before the shot is taken
- Multi-TCG support: pluggable card-search adapters per game (Scryfall/MTG built in, plus Gundam Card Game), with each game's own admin-configurable field definitions driving sorting, filtering, and bin rules
- Rule-based sort bins, grouped by collection, with and/or rule trees across each game's own card fields (color, rarity, price, set, etc.)
- Card grid sorting (by name, price, rarity, etc.) adapts automatically to whichever game a collection uses
- Multiple collections per organization, each with their own bin configuration and card history
- Remote monitoring: watch an in-progress scan session live from another device
- Discord notifications for sorter errors/jams, plus an optional per-card-scanned notification with the card's image, name, price, collection/game, and a link to watch the session live
- Per-organization branding and scanner layout settings
- Feeder, servo, and camera scan-region calibration tools: the camera's capture region can be dragged/resized live against the feed to match different webcam mountings and fields of view
- In-app hardware build guide (`/build`) with bill of materials, wiring diagrams, and assembly instructions

## Stack

- **Web**: React 19, Vite, React Router v7, Tailwind CSS 4, TanStack Query
- **Server**: Hono 4, Drizzle ORM, Neon PostgreSQL (pgvector)
- **Auth**: Neon Auth (JWT), backed by Better Auth on the client
- **Hardware**: Arduino Uno R4 via Web Serial API (9600 baud), PCA9685 servo driver
- **Monorepo**: Turborepo + pnpm workspaces

## Project structure

```
packages/
├── shared/   @magic-vault/shared - types, constants, evaluate-bin rule engine
├── server/   @magic-vault/server - Hono API, Drizzle schema/db, auth middleware
└── web/      @magic-vault/web    - React SPA (scanner, bins, collections, admin, build guide)
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

Everything lives in a single root `.env` (Vite is configured to read up from `packages/web`, so there's no separate `packages/web/.env`). Copy `.env.example` to `.env` and fill it in:

```bash
cp .env.example .env
```

```
# Server
DATABASE_URL=                 # Neon Postgres connection string
NEON_AUTH_URL=                # Neon Auth JWKS/auth endpoint
PORT=                         # optional, defaults to 3001
WEB_URL=                      # optional, used for CORS and to build absolute links (Discord monitor-page links) - must be publicly reachable for those links/images to work outside your own machine

# Public variables for the React app (baked into the client bundle at build time)
VITE_API_URL=                 # base URL of the Hono API, e.g. http://localhost:3001
VITE_APP_ENV=                 # local/developement/QA/production
VITE_NEON_AUTH_URL=
VITE_NEON_DATA_API_URL=
VITE_LATEST_ARDUINO_VERSION=  # keep in sync with FIRMWARE_VERSION in arduino/main/main.ino - shows an outdated-firmware banner when a connected device reports an older version
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
- 3 positional SG90 servos per sorting module (trapdoor, paddle gate, pusher) plus 1 continuous-rotation SG90 for the feeder — module count is configurable (up to 5 on a single PCA9685) in Calibration
- IR sensor for card-feed detection
- Enclosure and module parts are in `3d model/` (Fusion 360 source + printable `.3mf`)

Upload `arduino/main/main.ino` (requires the ArduinoJson library). The sketch is always compiled for the full module ceiling a single PCA9685 supports — it doesn't need to match how many modules you've actually built, since the app already knows each org's real module count and only ever sends route commands for modules that exist, so you can add modules later without reflashing. It communicates via JSON over USB serial: the web app sends `{"route": {"module": N, "direction": "left"|"right"|"bottom"}}`, resolved from the bin's routing assignment in Calibration, and the Arduino runs the routing sequence. `"bottom"` drops the card straight through the whole mechanism (any bin can be assigned to any module's bottom output — there's no single fixed catch-all bin).

Where module 1 starts on the PCA9685 is also runtime-configurable, not baked into the firmware: a "PCA9685 channel layout" toggle in Calibration (Standard = channel 0, up to 5 modules; Legacy = channel 4, reserving 0-3 for the status LEDs older firmware drove, up to 3 modules) sends `{"setChannelOffset": N}` once per connection. Orgs with pre-existing module calibration data default to Legacy so already-wired hardware keeps working unchanged; new orgs default to Standard.

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

## Licensing

This repository contains multiple components with different licenses.

| Component               | License         |
| ----------------------- | --------------- |
| Software source code    | MIT License     |
| 3D models (`/3d model`) | CC BY-NC-SA 4.0 |

See the `LICENSE` file in each directory for the complete license terms.
