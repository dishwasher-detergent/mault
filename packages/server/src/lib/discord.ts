import { eq } from "drizzle-orm";
import { db } from "../db";
import { notificationSettings } from "../db/schema";

type DiscordEmbed = {
  title: string;
  description: string;
  color: number;
  timestamp: string;
};

async function getWebhookUrl(userId: string): Promise<string | null> {
  const rows = await db
    .select({ discordWebhookUrl: notificationSettings.discordWebhookUrl })
    .from(notificationSettings)
    .where(eq(notificationSettings.userId, userId))
    .limit(1);
  return rows[0]?.discordWebhookUrl ?? null;
}

export async function sendDiscordNotification(
  userId: string,
  embed: DiscordEmbed,
): Promise<void> {
  const webhookUrl = await getWebhookUrl(userId);
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
