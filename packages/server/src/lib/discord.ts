import { eq } from "drizzle-orm";
import { db } from "../db";
import { notificationSettings } from "../db/schema";

type DiscordEmbed = {
  title: string;
  description: string;
  color: number;
  timestamp: string;
};

async function getWebhookUrl(orgId: string): Promise<string | null> {
  const rows = await db
    .select({ discordWebhookUrl: notificationSettings.discordWebhookUrl })
    .from(notificationSettings)
    .where(eq(notificationSettings.orgId, orgId))
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
