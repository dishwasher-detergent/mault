import type { Response } from "express";
import { Router } from "express";
import { authQuery } from "../db";
import { moduleConfigs } from "../db/schema";
import {
  DEFAULT_CALIBRATION,
  type ModuleConfig,
  type ServoCalibration,
} from "@magic-vault/shared";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth";

const router = Router();

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
router.get("/", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await authQuery(req.jwtClaims!, async (tx) => {
      const rows = await tx.query.moduleConfigs.findMany();
      return {
        success: true,
        message: "Loaded module configs.",
        data: buildConfigs(rows),
      };
    });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Database error." });
  }
});

// PUT /api/modules/:moduleNumber
router.put("/:moduleNumber", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const moduleNumber = parseInt(req.params.moduleNumber) as 1 | 2 | 3;
  const calibration = req.body as ServoCalibration;

  try {
    const result = await authQuery(req.jwtClaims!, async (tx) => {
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
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Database error." });
  }
});

export { router as moduleConfigsRouter };
