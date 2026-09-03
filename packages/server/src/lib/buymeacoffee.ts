import { createHmac, timingSafeEqual } from "node:crypto";
import type { DiscordEmbed } from "./discord";

const BMC_COLOR = 0xffdd00; // Buy Me a Coffee yellow

// Per Buy Me a Coffee's webhook docs: HMAC-SHA256 hex digest of the raw
// (unparsed) request body, keyed by the signing secret from the BMC
// dashboard, sent in the `x-signature-sha256` header. Must run on the raw
// body text, not a re-serialized JSON.parse of it - re-stringifying can
// reorder keys/whitespace and break the digest.
export function verifyBuyMeACoffeeSignature(
  rawBody: string,
  signature: string | null,
): boolean {
  const secret = process.env.BUY_ME_A_COFFEE_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signature);
  return (
    expectedBuf.length === actualBuf.length &&
    timingSafeEqual(expectedBuf, actualBuf)
  );
}

interface BuyMeACoffeeWebhookEnvelope {
  event_id?: number;
  type?: string;
  live_mode?: boolean;
  created?: number;
  attempt?: number;
  data?: Record<string, unknown>;
}

export function parseBuyMeACoffeeWebhook(
  rawBody: string,
): BuyMeACoffeeWebhookEnvelope | null {
  try {
    return JSON.parse(rawBody);
  } catch {
    return null;
  }
}

function firstString(
  data: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function firstNumber(
  data: Record<string, unknown>,
  keys: string[],
): number | undefined {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "number" && !Number.isNaN(value)) return value;
    if (
      typeof value === "string" &&
      value.trim() &&
      !Number.isNaN(Number(value))
    ) {
      return Number(value);
    }
  }
  return undefined;
}

// BMC's public docs describe the outer envelope (event_id/type/live_mode/data)
// and the HMAC signing scheme, but not the exact field names inside `data`
// for a donation.created event - the field list below covers both their
// current and legacy webhook formats. If BMC changes the shape again, this
// degrades to "Someone bought a coffee!" with no amount/note rather than
// throwing, so a webhook retry storm can't come from a parsing error here.
export function buildDonationEmbed(
  data: Record<string, unknown>,
  liveMode: boolean,
): DiscordEmbed {
  const name =
    firstString(data, ["supporter_name", "payer_name", "name"]) ?? "Someone";
  const note = firstString(data, ["support_note", "note", "message"]);
  const coffees = firstNumber(data, [
    "support_coffees",
    "number_of_coffees",
    "coffees",
  ]);
  const amount = firstNumber(data, ["amount", "total_amount"]);
  const currency =
    firstString(data, ["currency", "support_currency"]) ?? "USD";

  const summary = [
    amount != null ? `**${amount.toFixed(2)} ${currency}**` : undefined,
    coffees != null
      ? `${coffees} coffee${coffees === 1 ? "" : "s"}`
      : undefined,
  ]
    .filter(Boolean)
    .join(" — ");

  return {
    title: `☕ ${name} bought a coffee!`,
    description: [summary || "New donation", note ? `> ${note}` : undefined]
      .filter(Boolean)
      .join("\n\n"),
    color: BMC_COLOR,
    timestamp: new Date().toISOString(),
    ...(liveMode ? {} : { footer: { text: "TEST EVENT" } }),
  };
}
