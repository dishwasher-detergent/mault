/**
 * One-off backfill: transforms collectionCards.card / .alternativeMatches
 * from the old Scryfall-mirror PlayingCard shape to the new slim uniform
 * shape (see packages/shared/src/interfaces/card.interface.ts).
 *
 * Every existing row predates the multi-TCG adapters, so they're all
 * MTG/Scryfall-shaped - this mapper mirrors the new Scryfall normalizer.
 *
 * Usage (from packages/server):
 *   tsx --env-file ../../.env scripts/backfill-card-shape.ts            # dry run, prints a report
 *   tsx --env-file ../../.env scripts/backfill-card-shape.ts --apply    # writes the changes
 */
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { collectionCards } from "../src/db/schema";

interface LegacyImageUris {
  small: string;
  normal: string;
}

interface LegacyCardFace {
  name?: string;
  mana_cost?: string;
  oracle_text?: string;
  power?: string;
  toughness?: string;
  artist?: string;
  image_uris?: LegacyImageUris;
}

interface LegacyPlayingCard {
  id: string;
  name: string;
  image_uris?: LegacyImageUris;
  card_faces?: LegacyCardFace[];
  mana_cost?: string;
  cmc?: number;
  type_line: string;
  oracle_text?: string;
  power?: string;
  toughness?: string;
  color_identity?: string[];
  set: string;
  set_name: string;
  collector_number: string;
  rarity: string;
  artist?: string;
  scryfall_uri?: string;
  prices?: { usd?: string | null };
  distance?: number;
}

interface NewPlayingCard {
  id: string;
  name: string;
  image: LegacyImageUris | null;
  set: string;
  setName: string;
  collectorNumber: string;
  rarity: string;
  typeLine: string;
  text?: string;
  manaCost?: string;
  power?: string;
  toughness?: string;
  colorIdentity: string[];
  artist?: string;
  price: number | null;
  sourceUrl?: string;
  cmc?: number;
  distance?: number;
}

function isOldShape(value: unknown): value is LegacyPlayingCard {
  return (
    !!value &&
    typeof value === "object" &&
    "id" in value &&
    !("colorIdentity" in value)
  );
}

function migrateCard(raw: LegacyPlayingCard): NewPlayingCard {
  const face = raw.card_faces?.[0];
  const imageUris = raw.image_uris ?? face?.image_uris;
  const usd = raw.prices?.usd;

  return {
    id: raw.id,
    name: face?.name ?? raw.name,
    image: imageUris
      ? { small: imageUris.small, normal: imageUris.normal }
      : null,
    set: raw.set,
    setName: raw.set_name,
    collectorNumber: raw.collector_number,
    rarity: raw.rarity,
    typeLine: raw.type_line,
    text: raw.oracle_text ?? face?.oracle_text,
    manaCost: raw.mana_cost ?? face?.mana_cost,
    power: raw.power ?? face?.power,
    toughness: raw.toughness ?? face?.toughness,
    colorIdentity: raw.color_identity ?? [],
    artist: raw.artist ?? face?.artist,
    price: usd != null ? Number.parseFloat(usd) : null,
    sourceUrl: raw.scryfall_uri,
    cmc: raw.cmc,
    ...(raw.distance != null ? { distance: raw.distance } : {}),
  };
}

async function main() {
  const apply = process.argv.includes("--apply");

  const rows = await db
    .select({
      id: collectionCards.id,
      guid: collectionCards.guid,
      card: collectionCards.card,
      alternativeMatches: collectionCards.alternativeMatches,
    })
    .from(collectionCards);

  let migrated = 0;
  let alreadyNew = 0;

  for (const row of rows) {
    const card = row.card as unknown;

    if (!isOldShape(card)) {
      alreadyNew++;
      continue;
    }

    const newCard = migrateCard(card);

    const rawAlts = Array.isArray(row.alternativeMatches)
      ? (row.alternativeMatches as unknown[])
      : [];
    const newAlts = rawAlts.map((alt) =>
      isOldShape(alt) ? migrateCard(alt) : alt,
    );

    if (migrated === 0) {
      console.log("Sample transform:");
      console.log("  before:", JSON.stringify(card).slice(0, 300));
      console.log("  after: ", JSON.stringify(newCard).slice(0, 300));
    }

    migrated++;

    if (apply) {
      await db
        .update(collectionCards)
        .set({
          card: newCard,
          cardId: newCard.id,
          alternativeMatches: newAlts.length ? newAlts : null,
        })
        .where(eq(collectionCards.id, row.id));
    }
  }

  console.log(
    `\n${apply ? "Applied" : "Dry run"}: ${migrated} row(s) to migrate, ${alreadyNew} already in the new shape, ${rows.length} total.`,
  );
  if (!apply && migrated > 0) {
    console.log("Re-run with --apply to write these changes.");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
