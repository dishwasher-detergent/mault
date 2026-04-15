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
      small: "https://cards.scryfall.io/small/front/e/3/e3285e6b-3e79-4d7c-bf96-d920f973b122.jpg",
      normal: "https://cards.scryfall.io/normal/front/e/3/e3285e6b-3e79-4d7c-bf96-d920f973b122.jpg",
      large: "https://cards.scryfall.io/large/front/e/3/e3285e6b-3e79-4d7c-bf96-d920f973b122.jpg",
      png: "https://cards.scryfall.io/png/front/e/3/e3285e6b-3e79-4d7c-bf96-d920f973b122.png",
      art_crop: "https://cards.scryfall.io/art_crop/front/e/3/e3285e6b-3e79-4d7c-bf96-d920f973b122.jpg",
      border_crop: "https://cards.scryfall.io/border_crop/front/e/3/e3285e6b-3e79-4d7c-bf96-d920f973b122.jpg",
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
    prices: { usd: "1.20", usd_foil: null, usd_etched: null, eur: null, eur_foil: null, tix: null },
    distance: 0.03,
  },
  {
    object: "card",
    id: "bd8fa327-dd41-4737-8f19-2cf5eb1f7cdd",
    oracle_id: "bd8fa327-0000-0000-0000-000000000000",
    name: "Black Lotus",
    lang: "en",
    released_at: "1993-08-05",
    uri: "",
    scryfall_uri: "",
    layout: "normal",
    highres_image: true,
    image_status: "highres_scan",
    image_uris: {
      small: "https://cards.scryfall.io/small/front/b/d/bd8fa327-dd41-4737-8f19-2cf5eb1f7cdd.jpg",
      normal: "https://cards.scryfall.io/normal/front/b/d/bd8fa327-dd41-4737-8f19-2cf5eb1f7cdd.jpg",
      large: "https://cards.scryfall.io/large/front/b/d/bd8fa327-dd41-4737-8f19-2cf5eb1f7cdd.jpg",
      png: "https://cards.scryfall.io/png/front/b/d/bd8fa327-dd41-4737-8f19-2cf5eb1f7cdd.png",
      art_crop: "https://cards.scryfall.io/art_crop/front/b/d/bd8fa327-dd41-4737-8f19-2cf5eb1f7cdd.jpg",
      border_crop: "https://cards.scryfall.io/border_crop/front/b/d/bd8fa327-dd41-4737-8f19-2cf5eb1f7cdd.jpg",
    },
    mana_cost: "{0}",
    cmc: 0,
    type_line: "Artifact",
    oracle_text: "{T}, Sacrifice Black Lotus: Add three mana of any one color.",
    colors: [],
    color_identity: [],
    set: "lea",
    set_name: "Limited Edition Alpha",
    collector_number: "232",
    rarity: "rare",
    artist: "Christopher Rush",
    border_color: "black",
    frame: "1993",
    reserved: true,
    foil: false,
    nonfoil: true,
    legalities: {} as never,
    prices: { usd: "35000.00", usd_foil: null, usd_etched: null, eur: null, eur_foil: null, tix: null },
    distance: 0.08,
  },
  {
    object: "card",
    id: "1d0e82f0-1b5e-4831-9df0-5d2dda5c8769",
    oracle_id: "1d0e82f0-0000-0000-0000-000000000000",
    name: "Teferi, Hero of Dominaria",
    lang: "en",
    released_at: "2018-04-27",
    uri: "",
    scryfall_uri: "",
    layout: "normal",
    highres_image: true,
    image_status: "highres_scan",
    image_uris: {
      small: "https://cards.scryfall.io/small/front/1/d/1d0e82f0-1b5e-4831-9df0-5d2dda5c8769.jpg",
      normal: "https://cards.scryfall.io/normal/front/1/d/1d0e82f0-1b5e-4831-9df0-5d2dda5c8769.jpg",
      large: "https://cards.scryfall.io/large/front/1/d/1d0e82f0-1b5e-4831-9df0-5d2dda5c8769.jpg",
      png: "https://cards.scryfall.io/png/front/1/d/1d0e82f0-1b5e-4831-9df0-5d2dda5c8769.png",
      art_crop: "https://cards.scryfall.io/art_crop/front/1/d/1d0e82f0-1b5e-4831-9df0-5d2dda5c8769.jpg",
      border_crop: "https://cards.scryfall.io/border_crop/front/1/d/1d0e82f0-1b5e-4831-9df0-5d2dda5c8769.jpg",
    },
    mana_cost: "{3}{W}{U}",
    cmc: 5,
    type_line: "Legendary Planeswalker — Teferi",
    oracle_text: "+1: Draw a card. At the beginning of the next end step, untap two lands.\n−3: Put target nonland permanent into its owner's library third from the top.\n−8: You get an emblem with \"Whenever you draw a card, exile target permanent an opponent controls.\"",
    colors: ["W", "U"],
    color_identity: ["W", "U"],
    set: "dom",
    set_name: "Dominaria",
    collector_number: "207",
    rarity: "mythic",
    artist: "Chris Rallis",
    border_color: "black",
    frame: "2015",
    reserved: false,
    foil: true,
    nonfoil: true,
    legalities: {} as never,
    prices: { usd: "12.50", usd_foil: null, usd_etched: null, eur: null, eur_foil: null, tix: null },
    distance: 0.05,
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
