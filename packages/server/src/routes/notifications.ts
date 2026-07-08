import type {
  NotificationSettings,
  SerialEventReport,
} from "@magic-vault/shared";
import { Hono } from "hono";
import { authQuery } from "../db";
import { notificationSettings } from "../db/schema";
import { sendDiscordNotification } from "../lib/discord";
import { classifySerialEvent } from "../lib/serial-events";
import { requireAuth, requireOrg, type AppEnv } from "../middleware/auth";

const router = new Hono<AppEnv>();

// GET /notifications
router.get("/", requireAuth, requireOrg, async (c) => {
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const row = await tx.query.notificationSettings.findFirst();
      const settings: NotificationSettings = {
        discordWebhookUrl: row?.discordWebhookUrl ?? null,
      };
      return {
        success: true,
        message: "Loaded notification settings.",
        data: settings,
      };
    });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

// PUT /notifications
router.put("/", requireAuth, requireOrg, async (c) => {
  const orgId = c.get("orgId");
  const body = await c.req.json<NotificationSettings>();
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      await tx
        .insert(notificationSettings)
        .values({ discordWebhookUrl: body.discordWebhookUrl, orgId })
        .onConflictDoUpdate({
          target: [notificationSettings.orgId],
          set: {
            discordWebhookUrl: body.discordWebhookUrl,
            updatedAt: new Date(),
          },
        });
      const row = await tx.query.notificationSettings.findFirst();
      const saved: NotificationSettings = {
        discordWebhookUrl: row?.discordWebhookUrl ?? null,
      };
      return {
        success: true,
        message: "Saved notification settings.",
        data: saved,
      };
    });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

const TEST_EMBEDS: Record<string, { title: string; description: string }> = {
  "sorter-error": {
    title: "Magic Vault — Sorter Error [TEST]",
    description:
      "**Card:** Lightning Bolt\n**Bin:** 3\n**Error:** No response from the device in time.",
  },
  "feeder-empty": {
    title: "Magic Vault — Feeder Empty [TEST]",
    description:
      "No cards remaining in the hopper. Add more cards to continue.",
  },
  "card-jam": {
    title: "Magic Vault — Card Jam Detected [TEST]",
    description:
      "Card stuck at module 2 (heading to bin 5). Check the sorter and resume.",
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
router.post("/test", requireAuth, requireOrg, async (c) => {
  const { type } = await c.req.json<{ type: string }>();
  const embed = TEST_EMBEDS[type];
  if (!embed) {
    return c.json(
      { success: false, message: "Unknown notification type." },
      400,
    );
  }
  const orgId = c.get("orgId");
  await sendDiscordNotification(orgId, {
    ...embed,
    color: 0xed4245,
    timestamp: new Date().toISOString(),
  });
  return c.json({ success: true, message: "Test notification sent." });
});

// POST /notifications/serial-event — raw serial command/response pair reported
router.post("/serial-event", requireAuth, requireOrg, async (c) => {
  const event = await c.req.json<SerialEventReport>();
  const classified = classifySerialEvent(event);
  if (classified) {
    const orgId = c.get("orgId");
    void sendDiscordNotification(orgId, {
      title: `Magic Vault — ${classified.title}`,
      description: classified.description,
      color: 0xed4245,
      timestamp: new Date().toISOString(),
    });
  }
  return c.json({ success: true, message: "Serial event reported." });
});

export { router as notificationsRouter };
