import type { ScannedCard } from "@/interfaces/scanner.interface";
import type { ScryfallCardWithDistance } from "@/interfaces/scryfall.interface";

function csvEscape(val: string): string {
  return val.includes(",") || val.includes('"')
    ? `"${val.replace(/"/g, '""')}"`
    : val;
}

export function exportToManabox(cards: ScannedCard[]) {
  if (cards.length === 0) return;

  const grouped = new Map<
    string,
    { card: ScryfallCardWithDistance; quantity: number }
  >();
  for (const entry of cards) {
    const existing = grouped.get(entry.card.id);
    if (existing) {
      existing.quantity++;
    } else {
      grouped.set(entry.card.id, { card: entry.card, quantity: 1 });
    }
  }

  const headers = [
    "Name",
    "Set code",
    "Set name",
    "Collector number",
    "Foil",
    "Quantity",
    "Scryfall ID",
    "Condition",
    "Language",
    "Purchase price",
  ];

  const rows = Array.from(grouped.values()).map(({ card, quantity }) => [
    csvEscape(card.name),
    card.set.toUpperCase(),
    csvEscape(card.set_name),
    card.collector_number,
    card.foil ? "foil" : "",
    String(quantity),
    card.id,
    "Near Mint",
    card.lang,
    card.prices.usd ?? "",
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mtg-vault-manabox-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
