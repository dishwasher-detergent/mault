# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Next.js dev server
npm run build        # Production build
npm run lint         # ESLint (flat config, ESLint 9)
npm run db:generate  # Generate Drizzle schema artifacts
npm run db:migrate   # Run Drizzle migrations
npm run db:push      # Push schema to database
npm run db:studio    # Open Drizzle Studio
```

No test runner is configured.

## Architecture

**Magic: The Gathering card scanner and sorter.** Users scan MTG cards via webcam, the app identifies them via vector similarity search, evaluates sorting rules, and communicates bin assignments to an Arduino over USB serial.

### Data Flow

Webcam → OpenCV.js card detection → image extraction → embedding search (Hugging Face SigLIP, 768-dim vectors) → card identification via PostgreSQL vector search → rule evaluation against bin configs → bin assignment → Arduino serial command → IndexedDB persistence

### Stack

- **Next.js 16** (App Router), **React 19**, **TypeScript 5** (strict)
- **Tailwind CSS 4** with oklch color variables, **Base UI** + **shadcn** component patterns, **CVA** for variants
- **Drizzle ORM** + **Neon PostgreSQL** (serverless driver), **idb** for client-side IndexedDB
- **@neondatabase/auth** for authentication
- **Web Serial API** (browser-native) for Arduino communication

### State Management

Three React context providers, nested in `app/app/layout.tsx`:

1. **SerialProvider** (`hooks/use-serial.tsx`) — Arduino USB connection, `sendBin()` command/response
2. **BinConfigsProvider** (`hooks/use-bin-configs.tsx`) — sort bin rules, synced to PostgreSQL
3. **ScannedCardsProvider** (`hooks/use-scanned-cards.tsx`) — scanned card list, synced to IndexedDB, triggers serial commands on bin match

### Rule Engine

`lib/evaluate-bin.ts` recursively evaluates `BinRuleGroup` trees (and/or combinators) with 13 operators across 8 card fields (rarity, color_identity, type_line, set, price_usd, cmc, name, oracle_text). `BIN_COUNT = 7` max bins.

### Server Functions

Located in `lib/db/*/`. Marked with `"use server"`. Return `{ success, message, data }` (see `interfaces/result.interface.ts`). Auth checked via `auth.getSession()`.

### Arduino Serial Protocol

JSON over USB serial at 9600 baud. Web app sends `{"bin": N}`, Arduino responds with routing sequence: `{"bin":3,"route":[{"module":1,"action":"DOWN","channel":1},{"module":2,"action":"LEFT","channel":2}]}`. Sketch at `arduino/main/main.ino` (requires ArduinoJson library).

## Conventions

- Import alias: `@/*` maps to project root
- All interactive components use `"use client"` directive
- Styling: Tailwind classes composed with `cn()` from `lib/utils.ts` (clsx + tailwind-merge)
- Custom rarity colors: `--common`, `--uncommon`, `--rare`, `--mythic` CSS variables
- `next.config.ts` externalizes `sharp`, `onnxruntime-node`, and `@huggingface/transformers` from server bundle
