import type { HealthCheck, HealthCheckResponse } from "@magic-vault/shared";
import { count, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db";
import { cardImageVectors, games } from "../db/schema";
import { fetchCardApi } from "../lib/card-search/fetch";
import { FAB_DEFAULT_URL } from "../lib/fab/search";
import { GUNDAM_DEFAULT_URL } from "../lib/gundam/search";
import { LORCANA_DEFAULT_URL } from "../lib/lorcana/search";
import { ONE_PIECE_DEFAULT_URL } from "../lib/onepiece/search";
import { POKEMON_DEFAULT_URL } from "../lib/pokemon/search";
import { SCRYFALL_DEFAULT_URL } from "../lib/scryfall/search";
import type { AppEnv } from "../middleware/auth";
import pkg from "../../package.json";

const router = new Hono<AppEnv>();

// GET /public/version — unauthenticated, polled by the web client to prompt a refresh on deploy.
router.get("/version", (c) => {
  return c.json({ success: true, data: { version: pkg.version } });
});

// GET /public/games — unauthenticated, for the marketing/landing page.
router.get("/games", async (c) => {
  try {
    const rows = await db
      .select({ key: games.key, name: games.name })
      .from(games)
      .where(eq(games.isActive, true))
      .orderBy(games.name);

    const countRows = await db
      .select({ gameKey: cardImageVectors.gameKey, count: count() })
      .from(cardImageVectors)
      .groupBy(cardImageVectors.gameKey);
    const countByKey = new Map(countRows.map((r) => [r.gameKey, r.count]));

    const data = rows.map((row) => ({
      ...row,
      cardCount: countByKey.get(row.key) ?? 0,
    }));

    return c.json({ success: true, data });
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

// External card-search APIs checked by GET /public/health below - kept in
// sync with resolve.ts's ADAPTERS_BY_GAME_KEY (one entry per adapter, not
// per Game row, since a Game's existence is admin-configurable/DB-driven
// but which upstream APIs this deployment depends on is not).
const EXTERNAL_API_CHECKS: { name: string; url: string }[] = [
  { name: "Scryfall (Magic: The Gathering)", url: SCRYFALL_DEFAULT_URL },
  { name: "TCGdex (Pokémon)", url: POKEMON_DEFAULT_URL },
  { name: "Gundam Card Game API", url: GUNDAM_DEFAULT_URL },
  { name: "Lorcast (Disney Lorcana)", url: LORCANA_DEFAULT_URL },
  { name: "OPTCGAPI (One Piece)", url: ONE_PIECE_DEFAULT_URL },
  { name: "Flesh and Blood API", url: FAB_DEFAULT_URL },
];

async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    await db.execute(sql`select 1`);
    return { name: "Database", status: "ok", latencyMs: Date.now() - start };
  } catch {
    return {
      name: "Database",
      status: "error",
      latencyMs: Date.now() - start,
      message: "Connection failed.",
    };
  }
}

// Only checks that the upstream responds at all (any status code) - a
// reachability check, not a check that a real search would succeed. This
// mirrors exactly the failure mode card-search/fetch.ts's fetchCardApi
// guards against (DNS/connection/timeout failures throwing instead of
// resolving), which is what actually took the Pokémon adapter down.
async function checkExternalApi(name: string, url: string): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const response = await fetchCardApi(url, { method: "GET" });
    await response.body?.cancel();
    return { name, status: "ok", latencyMs: Date.now() - start };
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    return {
      name,
      status: "error",
      latencyMs: Date.now() - start,
      message: timedOut ? "Timed out." : "Unreachable.",
    };
  }
}

// Every open tab (footer + the health page itself) polls this on its own
// timer - without sharing a result, each poll would hit all 6 third-party
// card APIs again, multiplied by however many tabs/users happen to have
// the app open. A short-lived cache collapses concurrent/near-concurrent
// polls into one real round of checks.
const HEALTH_CACHE_TTL_MS = 20_000;
let cachedHealth: { data: HealthCheckResponse; expiresAt: number } | null =
  null;

// GET /public/health — unauthenticated. Polled by the app footer and the
// dedicated health page to surface upstream card-API/DB outages instead of
// letting them show up only as a failed search with no context.
router.get("/health", async (c) => {
  if (cachedHealth && cachedHealth.expiresAt > Date.now()) {
    return c.json({ success: true, data: cachedHealth.data });
  }

  const [database, ...externalApis] = await Promise.all([
    checkDatabase(),
    ...EXTERNAL_API_CHECKS.map((api) => checkExternalApi(api.name, api.url)),
  ]);
  const checks = [database, ...externalApis];

  const data: HealthCheckResponse = {
    healthy: checks.every((check) => check.status === "ok"),
    checkedAt: new Date().toISOString(),
    checks,
  };
  cachedHealth = { data, expiresAt: Date.now() + HEALTH_CACHE_TTL_MS };
  return c.json({ success: true, data });
});

export { router as publicRouter };
