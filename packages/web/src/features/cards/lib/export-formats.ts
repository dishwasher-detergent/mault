import type { ScannedCard, ScryfallCardWithDistance } from "@magic-vault/shared";

function csvEscape(val: string): string {
  return val.includes(",") || val.includes('"')
    ? `"${val.replace(/"/g, '""')}"`
    : val;
}

function groupByCardId(
  cards: ScannedCard[],
): Map<string, { card: ScryfallCardWithDistance; quantity: number }> {
  const grouped = new Map<
    string,
    { card: ScryfallCardWithDistance; quantity: number }
  >();
  for (const entry of cards) {
    const existing = grouped.get(entry.card.id);
    if (existing) existing.quantity++;
    else grouped.set(entry.card.id, { card: entry.card, quantity: 1 });
  }
  return grouped;
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const dateSuffix = () => new Date().toISOString().slice(0, 10);

export function exportToManabox(cards: ScannedCard[], collection: string) {
  if (cards.length === 0) return;
  const grouped = groupByCardId(cards);
  const headers = [
    "Name", "Set code", "Set name", "Collector number",
    "Foil", "Quantity", "Scryfall ID", "Condition", "Language", "Purchase price",
  ];
  const rows = Array.from(grouped.values()).map(({ card, quantity }) => [
    csvEscape(card.name),
    card.set.toUpperCase(),
    csvEscape(card.set_name),
    card.collector_number,
    "",
    String(quantity),
    card.id,
    "Near Mint",
    card.lang,
    card.prices.usd ?? "",
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  downloadCsv(csv, `magic-vault-manabox-${dateSuffix()}-${collection}.csv`);
}

export function exportToMoxfield(cards: ScannedCard[], collection: string) {
  if (cards.length === 0) return;
  const grouped = groupByCardId(cards);
  const headers = [
    "Count", "Name", "Edition", "Condition", "Language",
    "Foil", "Collector Number", "Alter", "Proxy", "Purchase Price",
  ];
  const rows = Array.from(grouped.values()).map(({ card, quantity }) => [
    String(quantity),
    csvEscape(card.name),
    card.set.toUpperCase(),
    "Near Mint",
    card.lang?.toUpperCase() ?? "EN",
    "",
    card.collector_number,
    "False",
    "False",
    card.prices.usd ?? "",
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  downloadCsv(csv, `magic-vault-moxfield-${dateSuffix()}-${collection}.csv`);
}

export function exportToTcgplayer(cards: ScannedCard[], collection: string) {
  if (cards.length === 0) return;
  const grouped = groupByCardId(cards);
  const headers = [
    "Quantity", "Name", "Set Name", "Number", "Condition", "Printing", "Language",
  ];
  const rows = Array.from(grouped.values()).map(({ card, quantity }) => [
    String(quantity),
    csvEscape(card.name),
    csvEscape(card.set_name),
    card.collector_number,
    "Near Mint",
    "Normal",
    "English",
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  downloadCsv(csv, `magic-vault-tcgplayer-${dateSuffix()}-${collection}.csv`);
}
