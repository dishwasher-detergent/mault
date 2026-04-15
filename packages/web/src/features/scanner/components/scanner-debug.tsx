import { Button } from "@/components/ui/button";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { useRole } from "@/hooks/use-role";
import type { ScryfallCardWithDistance } from "@magic-vault/shared";
import { IconBug, IconCards } from "@tabler/icons-react";

const MOCK_CARDS: ScryfallCardWithDistance[] = [
  {
    object: "card",
    id: "e3285e6b-3e79-4d7c-bf96-d920f973b122",
    oracle_id: "e3285e6b-0000-0000-0000-000000000000",
    name: "Lightning Bolt",
    lang: "en",
    released_at: "2010-07-16",
    uri: "",
    scryfall_uri: "",
    layout: "normal",
    highres_image: true,
    image_status: "highres_scan",
    image_uris: {
      small:
        "https://cards.scryfall.io/small/front/e/3/e3285e6b-3e79-4d7c-bf96-d920f973b122.jpg",
      normal:
        "https://cards.scryfall.io/normal/front/e/3/e3285e6b-3e79-4d7c-bf96-d920f973b122.jpg",
      large:
        "https://cards.scryfall.io/large/front/e/3/e3285e6b-3e79-4d7c-bf96-d920f973b122.jpg",
      png: "https://cards.scryfall.io/png/front/e/3/e3285e6b-3e79-4d7c-bf96-d920f973b122.png",
      art_crop:
        "https://cards.scryfall.io/art_crop/front/e/3/e3285e6b-3e79-4d7c-bf96-d920f973b122.jpg",
      border_crop:
        "https://cards.scryfall.io/border_crop/front/e/3/e3285e6b-3e79-4d7c-bf96-d920f973b122.jpg",
    },
    mana_cost: "{R}",
    cmc: 1,
    type_line: "Instant",
    oracle_text: "Lightning Bolt deals 3 damage to any target.",
    colors: ["R"],
    color_identity: ["R"],
    set: "m11",
    set_name: "Magic 2011",
    collector_number: "149",
    rarity: "common",
    artist: "Christopher Moeller",
    border_color: "black",
    frame: "2015",
    reserved: false,
    foil: true,
    nonfoil: true,
    legalities: {} as never,
    prices: {
      usd: "1.20",
      usd_foil: null,
      usd_etched: null,
      eur: null,
      eur_foil: null,
      tix: null,
    },
    distance: 0.03,
    games: [],
    game_changer: false,
    finishes: [],
    oversized: false,
    promo: false,
    reprint: false,
    variation: false,
    set_id: "",
    set_type: "",
    set_uri: "",
    set_search_uri: "",
    scryfall_set_uri: "",
    rulings_uri: "",
    prints_search_uri: "",
    digital: false,
    artist_ids: [],
    full_art: false,
    textless: false,
    booster: false,
    story_spotlight: false,
    related_uris: undefined,
    purchase_uris: undefined,
  },
];

let mockCardIndex = 0;

export function ScannerDebug() {
  const { isAdmin } = useRole();
  const { addCard } = useScannedCards();

  if (!isAdmin) return null;

  const handleSimulateScan = () => {
    const card = MOCK_CARDS[mockCardIndex % MOCK_CARDS.length];
    mockCardIndex++;
    addCard(card);
  };

  return (
    <div className="border border-dashed border-yellow-500/40 rounded-lg p-2 bg-yellow-500/5 flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-yellow-500/70">
        <IconBug className="size-3" />
        <span className="text-xs font-mono font-semibold uppercase tracking-wide">
          Debug
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-full text-xs border-yellow-500/30 hover:bg-yellow-500/10"
        onClick={handleSimulateScan}
      >
        <IconCards className="size-3.5" />
        Simulate Scan
      </Button>
    </div>
  );
}
