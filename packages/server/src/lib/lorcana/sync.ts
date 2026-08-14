import type { SyncSource, SyncSourceCard } from "../card-search/sync-types";
import {
  LORCANA_DEFAULT_URL,
  LORCANA_HEADERS,
  type LorcastCard,
  lorcanaCardId,
  lorcanaCardName,
  parseLorcanaCardId,
} from "./search";

interface LorcastSet {
  id: string;
  code: string;
  name: string;
}

function apiRoot(baseUrl: string): string {
  try {
    return new URL(baseUrl).href.replace(/\/cards\/?$/, "");
  } catch {
    return new URL(LORCANA_DEFAULT_URL).href.replace(/\/cards\/?$/, "");
  }
}

function toSyncCard(raw: LorcastCard): SyncSourceCard {
  const image = raw.image_uris?.digital;
  return {
    id: lorcanaCardId(raw.set.code, raw.collector_number),
    name: lorcanaCardName(raw),
    setCode: raw.set.code,
    imageUrl: image?.large ?? image?.normal,
  };
}

async function fetchCards(
  baseUrl: string,
  addLog: (msg: string) => void,
  lang: string = "en",
  signal?: AbortSignal,
): Promise<SyncSourceCard[]> {
  const root = apiRoot(baseUrl);

  addLog("Fetching Lorcast set list...");
  const setsRes = await fetch(`${root}/sets`, {
    headers: LORCANA_HEADERS,
    signal,
  });
  if (!setsRes.ok)
    throw new Error(`Lorcast set list fetch failed: ${setsRes.status}`);
  const setsData = (await setsRes.json()) as { results: LorcastSet[] };

  const all: SyncSourceCard[] = [];
  for (const set of setsData.results) {
    if (signal?.aborted) break;

    const res = await fetch(`${root}/sets/${set.code}/cards`, {
      headers: LORCANA_HEADERS,
      signal,
    });
    if (!res.ok) {
      addLog(`Failed to fetch ${set.name}: ${res.status}`);
      continue;
    }

    const data = (await res.json()) as LorcastCard[];

    const kept = data.filter((c) => c.lang === lang);
    all.push(...kept.map(toSyncCard));
    addLog(
      `Fetched ${set.name}: ${kept.length} cards (${all.length} total so far)...`,
    );
  }

  return all;
}

async function fetchOne(id: string, baseUrl: string) {
  const parsed = parseLorcanaCardId(id);
  if (!parsed) return null;

  const res = await fetch(`${baseUrl}/${parsed.setCode}/${parsed.number}`, {
    headers: LORCANA_HEADERS,
  });
  if (!res.ok) return null;

  const raw = (await res.json()) as LorcastCard;
  return toSyncCard(raw);
}

export const lorcanaSyncSource: SyncSource = {
  gameKey: "lorcana",
  label: "Disney Lorcana (Lorcast)",
  defaultUrl: LORCANA_DEFAULT_URL,
  fetchHeaders: LORCANA_HEADERS,
  languages: ["en"],
  fetchCards,
  fetchOne,
};
