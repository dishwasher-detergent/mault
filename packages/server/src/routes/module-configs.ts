import { Hono } from "hono";
import { authQuery } from "../db";
import { moduleConfigAudit, moduleConfigs } from "../db/schema";
import {
  DEFAULT_CALIBRATION,
  type ModuleConfig,
  type ServoCalibration,
} from "@magic-vault/shared";
import { requireAuth, type AppEnv } from "../middleware/auth";

const router = new Hono<AppEnv>();

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
    moduleNumber: row.moduleNumber as 1 | 2 | 3,
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

function buildConfigs(
  rows: { moduleNumber: number; bottomClosed: number; bottomOpen: number; paddleClosed: number; paddleOpen: number; pusherLeft: number; pusherNeutral: number; pusherRight: number }[],
): ModuleConfig[] {
  return ([1, 2, 3] as const).map((n) => {
    const row = rows.find((r) => r.moduleNumber === n);
    return row ? toModuleConfig(row) : { moduleNumber: n, calibration: { ...DEFAULT_CALIBRATION } };
  });
}

// GET /api/modules
router.get("/", requireAuth, async (c) => {
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const rows = await tx.query.moduleConfigs.findMany();
      return {
        success: true,
        message: "Loaded module configs.",
        data: buildConfigs(rows),
      };
    });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

// PUT /api/modules/:moduleNumber
router.put("/:moduleNumber", requireAuth, async (c) => {
  const moduleNumber = parseInt(c.req.param("moduleNumber")) as 1 | 2 | 3;
  const calibration = await c.req.json<ServoCalibration>();

  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      await tx
        .insert(moduleConfigs)
        .values({ moduleNumber, ...calibration })
        .onConflictDoUpdate({
          target: [moduleConfigs.userId, moduleConfigs.moduleNumber],
          set: { ...calibration, updatedAt: new Date() },
        });

      await tx.insert(moduleConfigAudit).values({ moduleNumber, ...calibration });

      const rows = await tx.query.moduleConfigs.findMany();
      return {
        success: true,
        message: "Saved module config.",
        data: buildConfigs(rows),
      };
    });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

// GET /api/modules/history
router.get("/history", requireAuth, async (c) => {
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const rows = await tx.query.moduleConfigAudit.findMany({
        orderBy: (t, { desc }) => [desc(t.createdAt)],
        limit: 30,
      });
      return {
        success: true,
        message: "Loaded history.",
        data: rows.map((r) => ({
          guid: r.guid!,
          moduleNumber: r.moduleNumber as 1 | 2 | 3,
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

// POST /api/modules/history/:guid/revert
router.post("/history/:guid/revert", requireAuth, async (c) => {
  const guid = c.req.param("guid");
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const entry = await tx.query.moduleConfigAudit.findFirst({
        where: (t, { eq }) => eq(t.guid, guid),
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
        .values({ moduleNumber: entry.moduleNumber, ...calibration })
        .onConflictDoUpdate({
          target: [moduleConfigs.userId, moduleConfigs.moduleNumber],
          set: { ...calibration, updatedAt: new Date() },
        });

      await tx.insert(moduleConfigAudit).values({ moduleNumber: entry.moduleNumber, ...calibration });

      const rows = await tx.query.moduleConfigs.findMany();
      return {
        success: true,
        message: "Reverted module config.",
        data: buildConfigs(rows),
      };
    });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

export { router as moduleConfigsRouter };
