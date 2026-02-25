import { Hono } from "hono";
import { authQuery } from "../db";
import { moduleConfigs } from "../db/schema";
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

export { router as moduleConfigsRouter };
