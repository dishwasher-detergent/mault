import type { NotificationSettings } from "@magic-vault/shared";
import { Hono } from "hono";
import { authQuery } from "../db";
import { notificationSettings } from "../db/schema";
import { sendDiscordNotification } from "../lib/discord";
import { requireAuth, type AppEnv } from "../middleware/auth";

const router = new Hono<AppEnv>();

// GET /notifications
router.get("/", requireAuth, async (c) => {
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const row = await tx.query.notificationSettings.findFirst();
      const settings: NotificationSettings = {
        discordWebhookUrl: row?.discordWebhookUrl ?? null,
      };
      return { success: true, message: "Loaded notification settings.", data: settings };
    });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

// PUT /notifications
router.put("/", requireAuth, async (c) => {
  const body = await c.req.json<NotificationSettings>();
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      await tx
        .insert(notificationSettings)
        .values({ discordWebhookUrl: body.discordWebhookUrl })
        .onConflictDoUpdate({
          target: [notificationSettings.userId],
          set: { discordWebhookUrl: body.discordWebhookUrl, updatedAt: new Date() },
        });
      const row = await tx.query.notificationSettings.findFirst();
      const saved: NotificationSettings = {
        discordWebhookUrl: row?.discordWebhookUrl ?? null,
      };
      return { success: true, message: "Saved notification settings.", data: saved };
    });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

const TEST_EMBEDS: Record<string, { title: string; description: string }> = {
  "sort-error": {
    title: "Magic Vault — Sort Error [TEST]",
    description:
      "**Card:** Lightning Bolt\n**Bin:** 3\n**Error:** No response from sorter for bin 3.",
  },
  "card-search-error": {
    title: "Magic Vault — Card Search Error [TEST]",
    description: "A database error occurred while searching for a card.",
  },
  "sync-failure": {
    title: "Magic Vault — Sync Failed [TEST]",
    description:
      "The card database sync job encountered a fatal error.\n\n**Error:** Scryfall catalog fetch failed: 503",
  },
};

// POST /notifications/test
router.post("/test", requireAuth, async (c) => {
  const { type } = await c.req.json<{ type: string }>();
  const embed = TEST_EMBEDS[type];
  if (!embed) {
    return c.json({ success: false, message: "Unknown notification type." }, 400);
  }
  const userId = c.get("userId");
  await sendDiscordNotification(userId, {
    ...embed,
    color: 0xed4245,
    timestamp: new Date().toISOString(),
  });
  return c.json({ success: true, message: "Test notification sent." });
});

// POST /notifications/sort-error
router.post("/sort-error", requireAuth, async (c) => {
  const { cardName, binNumber, error } = await c.req.json<{
    cardName: string;
    binNumber: number;
    error: string;
  }>();
  const userId = c.get("userId");
  void sendDiscordNotification(userId, {
    title: "Magic Vault — Sort Error",
    description: `**Card:** ${cardName}\n**Bin:** ${binNumber}\n**Error:** ${error}`,
    color: 0xed4245,
    timestamp: new Date().toISOString(),
  });
  return c.json({ success: true, message: "Sort error reported." });
});

export { router as notificationsRouter };
