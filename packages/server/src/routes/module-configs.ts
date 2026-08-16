import { Hono } from "hono";
import type { Transaction } from "../db";
import { authQuery } from "../db";
import { moduleConfigAudit, moduleConfigs } from "../db/schema";
import {
  DEFAULT_CALIBRATION,
  DEFAULT_MODULE_COUNT,
  type ModuleConfig,
  type ServoCalibration,
} from "@magic-vault/shared";
import { requireAuth, requireOrg, type AppEnv } from "../middleware/auth";

const router = new Hono<AppEnv>();

async function _getModuleCount(tx: Transaction, orgId: string): Promise<number> {
  const row = await tx.query.orgSettings.findFirst({
    where: (t, { eq }) => eq(t.orgId, orgId),
    columns: { moduleCount: true },
  });
  return row?.moduleCount ?? DEFAULT_MODULE_COUNT;
}

function toModuleConfig(row: {
  moduleNumber: number;
  bottomClosed: number;
  bottomOpen: number;
  paddleClosed: number;
  paddleOpen: number;
  pusherLeft: number;
  pusherNeutral: number;
  pusherRight: number;
}): ModuleConfig {
  return {
    moduleNumber: row.moduleNumber,
    calibration: {
      bottomClosed: row.bottomClosed,
      bottomOpen: row.bottomOpen,
      paddleClosed: row.paddleClosed,
      paddleOpen: row.paddleOpen,
      pusherLeft: row.pusherLeft,
      pusherNeutral: row.pusherNeutral,
      pusherRight: row.pusherRight,
    },
  };
}

type CalibRow = { moduleNumber: number; bottomClosed: number; bottomOpen: number; paddleClosed: number; paddleOpen: number; pusherLeft: number; pusherNeutral: number; pusherRight: number };
function buildConfigs(rows: CalibRow[], moduleCount: number): ModuleConfig[] {
  return Array.from({ length: moduleCount }, (_, i) => i + 1).map((n) => {
    const row = rows.find((r) => r.moduleNumber === n);
    return row ? toModuleConfig(row) : { moduleNumber: n, calibration: { ...DEFAULT_CALIBRATION } };
  });
}

router.get("/", requireAuth, requireOrg, async (c) => {
  const orgId = c.get("orgId");
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const rows = await tx.query.moduleConfigs.findMany({
        where: (t, { eq }) => eq(t.orgId, orgId),
      });
      const moduleCount = await _getModuleCount(tx, orgId);
      return { success: true, message: "Loaded module configs.", data: buildConfigs(rows, moduleCount) };
    });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

router.put("/:moduleNumber", requireAuth, requireOrg, async (c) => {
  const orgId = c.get("orgId");
  const moduleNumber = parseInt(c.req.param("moduleNumber"));
  const calibration = await c.req.json<ServoCalibration>();
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      await tx
        .insert(moduleConfigs)
        .values({ moduleNumber, ...calibration, orgId })
        .onConflictDoUpdate({
          target: [moduleConfigs.orgId, moduleConfigs.moduleNumber],
          set: { ...calibration, updatedAt: new Date() },
        });

      await tx.insert(moduleConfigAudit).values({ moduleNumber, ...calibration, orgId });

      const rows = await tx.query.moduleConfigs.findMany({
        where: (t, { eq }) => eq(t.orgId, orgId),
      });
      const moduleCount = await _getModuleCount(tx, orgId);
      return { success: true, message: "Saved module config.", data: buildConfigs(rows, moduleCount) };
    });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

router.get("/history", requireAuth, requireOrg, async (c) => {
  const orgId = c.get("orgId");
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const rows = await tx.query.moduleConfigAudit.findMany({
        where: (t, { eq }) => eq(t.orgId, orgId),
        orderBy: (t, { desc }) => [desc(t.createdAt)],
        limit: 30,
      });
      return {
        success: true,
        message: "Loaded history.",
        data: rows.map((r) => ({
          guid: r.guid!,
          moduleNumber: r.moduleNumber,
          calibration: {
            bottomClosed: r.bottomClosed,
            bottomOpen: r.bottomOpen,
            paddleClosed: r.paddleClosed,
            paddleOpen: r.paddleOpen,
            pusherLeft: r.pusherLeft,
            pusherNeutral: r.pusherNeutral,
            pusherRight: r.pusherRight,
          } satisfies ServoCalibration,
          createdAt: r.createdAt.toISOString(),
        })),
      };
    });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

router.post("/history/:guid/revert", requireAuth, requireOrg, async (c) => {
  const orgId = c.get("orgId");
  const guid = c.req.param("guid");
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const entry = await tx.query.moduleConfigAudit.findFirst({
        where: (t, { eq, and }) => and(eq(t.guid, guid), eq(t.orgId, orgId)),
      });
      if (!entry) return { success: false, message: "Audit record not found." };

      const calibration: ServoCalibration = {
        bottomClosed: entry.bottomClosed,
        bottomOpen: entry.bottomOpen,
        paddleClosed: entry.paddleClosed,
        paddleOpen: entry.paddleOpen,
        pusherLeft: entry.pusherLeft,
        pusherNeutral: entry.pusherNeutral,
        pusherRight: entry.pusherRight,
      };

      await tx
        .insert(moduleConfigs)
        .values({ moduleNumber: entry.moduleNumber, ...calibration, orgId })
        .onConflictDoUpdate({
          target: [moduleConfigs.orgId, moduleConfigs.moduleNumber],
          set: { ...calibration, updatedAt: new Date() },
        });

      await tx.insert(moduleConfigAudit).values({ moduleNumber: entry.moduleNumber, ...calibration, orgId });

      const rows = await tx.query.moduleConfigs.findMany({
        where: (t, { eq }) => eq(t.orgId, orgId),
      });
      const moduleCount = await _getModuleCount(tx, orgId);
      return { success: true, message: "Reverted module config.", data: buildConfigs(rows, moduleCount) };
    });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

export { router as moduleConfigsRouter };
