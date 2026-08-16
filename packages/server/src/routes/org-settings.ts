import {
  DEFAULT_CAPTURE_SETTLE_DELAY_MS,
  DEFAULT_CHANNEL_LAYOUT,
  DEFAULT_MODULE_COUNT,
  maxModulesForLayout,
  type ChannelLayout,
} from "@magic-vault/shared";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery, type Transaction } from "../db";
import { orgSettings } from "../db/schema";
import { requireAuth, requireOrg, type AppEnv } from "../middleware/auth";

const router = new Hono<AppEnv>();

const DEFAULT_SCAN_REGION = { coverage: 0.85, offsetX: 0, offsetY: 0 };

function toScanRegion(row?: {
  scanCoverage: number | null;
  scanOffsetX: number | null;
  scanOffsetY: number | null;
}) {
  return {
    coverage:
      row?.scanCoverage != null
        ? row.scanCoverage / 100
        : DEFAULT_SCAN_REGION.coverage,
    offsetX:
      row?.scanOffsetX != null
        ? row.scanOffsetX / 100
        : DEFAULT_SCAN_REGION.offsetX,
    offsetY:
      row?.scanOffsetY != null
        ? row.scanOffsetY / 100
        : DEFAULT_SCAN_REGION.offsetY,
  };
}

async function _detectDefaultChannelLayout(
  tx: Transaction,
  orgId: string,
): Promise<ChannelLayout> {
  const existing = await tx.query.moduleConfigs.findFirst({
    where: (t, { eq }) => eq(t.orgId, orgId),
    columns: { id: true },
  });
  return existing ? "legacy" : DEFAULT_CHANNEL_LAYOUT;
}

router.get("/", requireAuth, requireOrg, async (c) => {
  const orgId = c.get("orgId");
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const row = await tx.query.orgSettings.findFirst({
        where: eq(orgSettings.orgId, orgId),
      });

      let channelLayout = row?.channelLayout as
        | ChannelLayout
        | null
        | undefined;
      if (!channelLayout) {
        channelLayout = await _detectDefaultChannelLayout(tx, orgId);
        await tx
          .insert(orgSettings)
          .values({ orgId, channelLayout })
          .onConflictDoUpdate({
            target: [orgSettings.orgId],
            set: { channelLayout, updatedAt: new Date() },
          });
      }

      const moduleCount = Math.min(
        row?.moduleCount ?? DEFAULT_MODULE_COUNT,
        maxModulesForLayout(channelLayout),
      );

      return {
        success: true,
        message: "Loaded.",
        data: {
          primaryColor: row?.primaryColor ?? null,
          scannerLayout:
            (row?.scannerLayout as "horizontal" | "vertical") ?? "horizontal",
          discordWebhookUrl: row?.discordWebhookUrl ?? null,
          discordNotifyOnScan: row?.discordNotifyOnScan ?? false,
          scanRegion: toScanRegion(row),
          captureSettleDelayMs:
            row?.captureSettleDelayMs ?? DEFAULT_CAPTURE_SETTLE_DELAY_MS,
          moduleCount,
          channelLayout,
        },
      };
    });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

router.put("/", requireAuth, requireOrg, async (c) => {
  const orgId = c.get("orgId");
  const body = await c.req.json<{
    primaryColor?: string | null;
    scannerLayout?: string | null;
    discordWebhookUrl?: string | null;
    discordNotifyOnScan?: boolean;
    scanRegion?: { coverage: number; offsetX: number; offsetY: number } | null;
    captureSettleDelayMs?: number | null;
    moduleCount?: number;
    channelLayout?: ChannelLayout;
  }>();
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const existing = await tx.query.orgSettings.findFirst({
        where: eq(orgSettings.orgId, orgId),
      });

      const channelLayout: ChannelLayout =
        "channelLayout" in body && body.channelLayout
          ? body.channelLayout
          : ((existing?.channelLayout as ChannelLayout | null) ??
            (await _detectDefaultChannelLayout(tx, orgId)));

      const merged = {
        primaryColor:
          "primaryColor" in body
            ? (body.primaryColor ?? null)
            : (existing?.primaryColor ?? null),
        scannerLayout:
          "scannerLayout" in body
            ? (body.scannerLayout ?? null)
            : (existing?.scannerLayout ?? null),
        discordWebhookUrl:
          "discordWebhookUrl" in body
            ? (body.discordWebhookUrl ?? null)
            : (existing?.discordWebhookUrl ?? null),
        discordNotifyOnScan:
          "discordNotifyOnScan" in body
            ? (body.discordNotifyOnScan ?? false)
            : (existing?.discordNotifyOnScan ?? false),
        scanCoverage:
          "scanRegion" in body
            ? body.scanRegion
              ? Math.round(body.scanRegion.coverage * 100)
              : null
            : (existing?.scanCoverage ?? null),
        scanOffsetX:
          "scanRegion" in body
            ? body.scanRegion
              ? Math.round(body.scanRegion.offsetX * 100)
              : null
            : (existing?.scanOffsetX ?? null),
        scanOffsetY:
          "scanRegion" in body
            ? body.scanRegion
              ? Math.round(body.scanRegion.offsetY * 100)
              : null
            : (existing?.scanOffsetY ?? null),
        captureSettleDelayMs:
          "captureSettleDelayMs" in body
            ? (body.captureSettleDelayMs ?? null)
            : (existing?.captureSettleDelayMs ?? null),
        channelLayout,
        moduleCount:
          "moduleCount" in body && body.moduleCount != null
            ? Math.min(
                Math.max(Math.round(body.moduleCount), 1),
                maxModulesForLayout(channelLayout),
              )
            : Math.min(
                existing?.moduleCount ?? DEFAULT_MODULE_COUNT,
                maxModulesForLayout(channelLayout),
              ),
      };
      await tx
        .insert(orgSettings)
        .values({ orgId, ...merged })
        .onConflictDoUpdate({
          target: [orgSettings.orgId],
          set: { ...merged, updatedAt: new Date() },
        });
      return {
        success: true,
        message: "Saved.",
        data: {
          primaryColor: merged.primaryColor,
          scannerLayout:
            (merged.scannerLayout as "horizontal" | "vertical") ?? "horizontal",
          discordWebhookUrl: merged.discordWebhookUrl,
          discordNotifyOnScan: merged.discordNotifyOnScan,
          scanRegion: toScanRegion(merged),
          captureSettleDelayMs:
            merged.captureSettleDelayMs ?? DEFAULT_CAPTURE_SETTLE_DELAY_MS,
          moduleCount: merged.moduleCount,
          channelLayout: merged.channelLayout,
        },
      };
    });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

export { router as orgSettingsRouter };
