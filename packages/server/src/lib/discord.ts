import type { PlayingCard } from "@magic-vault/shared";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { orgSettings } from "../db/schema";

type DiscordEmbed = {
  title: string;
  description: string;
  color: number;
  timestamp: string;
  url?: string;
  image?: { url: string };
};

const CARD_SCANNED_COLOR = 0x5865f2; // Discord blurple

function resolveImageUrl(url: string): string {
  const proxied = url.match(/\/cards\/image-proxy\?url=([^&]+)/);
  if (proxied) {
    try {
      return decodeURIComponent(proxied[1]);
    } catch {
      // malformed encoding - fall through to the raw url below
    }
  }
  if (/^https?:\/\//i.test(url)) return url;
  const base = process.env.WEB_URL ?? "http://localhost:5173";
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}

export interface CardScannedEmbedOptions {
  isFoil?: boolean;
  collectionName?: string;
  gameName?: string;
  collectionGuid?: string;
}

export function buildCardScannedEmbed(
  card: PlayingCard,
  options: CardScannedEmbedOptions = {},
): DiscordEmbed {
  const { isFoil, collectionName, gameName, collectionGuid } = options;

  const lines = [];
  if (card.price != null) {
    lines.push(`**Price:** $${card.price.toFixed(2)} USD`);
  }
  if (card.priceFoil != null) {
    lines.push(`**Foil Price:** $${card.priceFoil.toFixed(2)} USD`);
  }
  if (lines.length === 0) lines.push("**Price:** N/A");
  if (isFoil) lines.push("**Foil**");
  if (collectionName) lines.push(`**Collection:** ${collectionName}`);
  if (gameName) lines.push(`**Game:** ${gameName}`);

  const imageUrl = card.image?.normal;
  const monitorUrl = collectionGuid
    ? `${process.env.WEB_URL ?? "http://localhost:5173"}/app/monitor/${collectionGuid}`
    : undefined;

  return {
    title: card.name,
    description: lines.join("\n"),
    color: CARD_SCANNED_COLOR,
    timestamp: new Date().toISOString(),
    ...(monitorUrl ? { url: monitorUrl } : {}),
    ...(imageUrl ? { image: { url: resolveImageUrl(imageUrl) } } : {}),
  };
}

async function getWebhookUrl(orgId: string): Promise<string | null> {
  const rows = await db
    .select({ discordWebhookUrl: orgSettings.discordWebhookUrl })
    .from(orgSettings)
    .where(eq(orgSettings.orgId, orgId))
    .limit(1);
  return rows[0]?.discordWebhookUrl ?? null;
}

export async function sendDiscordNotification(
  orgId: string,
  embed: DiscordEmbed,
): Promise<void> {
  const webhookUrl = await getWebhookUrl(orgId);
  if (!webhookUrl) return;

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });
    if (!res.ok) {
      console.error(`[discord] Webhook POST failed: ${res.status}`);
    }
  } catch (err) {
    console.error("[discord] Failed to send notification:", err);
  }
}
