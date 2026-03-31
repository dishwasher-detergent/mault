import { Hono } from "hono";
import { authQuery } from "../db";
import { feederConfigs } from "../db/schema";
import {
  DEFAULT_FEEDER_CALIBRATION,
  type FeederCalibration,
} from "@magic-vault/shared";
import { requireAuth, type AppEnv } from "../middleware/auth";

const router = new Hono<AppEnv>();

// GET /feeder
router.get("/", requireAuth, async (c) => {
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const row = await tx.query.feederConfigs.findFirst();
      const calibration: FeederCalibration = row
        ? { speed: row.speed, duration: row.duration }
        : { ...DEFAULT_FEEDER_CALIBRATION };
      return { success: true, message: "Loaded feeder config.", data: calibration };
    });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

// PUT /feeder
router.put("/", requireAuth, async (c) => {
  const calibration = await c.req.json<FeederCalibration>();

  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      await tx
        .insert(feederConfigs)
        .values(calibration)
        .onConflictDoUpdate({
          target: [feederConfigs.userId],
          set: { ...calibration, updatedAt: new Date() },
        });

      const row = await tx.query.feederConfigs.findFirst();
      const saved: FeederCalibration = row
        ? { speed: row.speed, duration: row.duration }
        : calibration;
      return { success: true, message: "Saved feeder config.", data: saved };
    });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

export { router as feederRouter };
