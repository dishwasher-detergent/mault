import { Hono } from "hono";
import { authQuery } from "../db";
import { feederConfigAudit, feederConfigs } from "../db/schema";
import { DEFAULT_FEEDER_CALIBRATION, type FeederCalibration } from "@magic-vault/shared";
import { requireAuth, requireOrg, type AppEnv } from "../middleware/auth";

const router = new Hono<AppEnv>();

router.get("/", requireAuth, requireOrg, async (c) => {
  const orgId = c.get("orgId");
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const row = await tx.query.feederConfigs.findFirst({
        where: (t, { eq }) => eq(t.orgId, orgId),
      });
      const calibration: FeederCalibration = row
        ? {
            speed: row.speed,
            duration: row.duration,
            pulseDuration: row.pulseDuration,
            pauseDuration: row.pauseDuration,
            settleDuration: row.settleDuration,
          }
        : { ...DEFAULT_FEEDER_CALIBRATION };
      return { success: true, message: "Loaded feeder config.", data: calibration };
    });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

router.put("/", requireAuth, requireOrg, async (c) => {
  const orgId = c.get("orgId");
  const calibration = await c.req.json<FeederCalibration>();
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      await tx
        .insert(feederConfigs)
        .values({ ...calibration, orgId })
        .onConflictDoUpdate({
          target: [feederConfigs.orgId],
          set: { ...calibration, updatedAt: new Date() },
        });

      await tx.insert(feederConfigAudit).values({ ...calibration, orgId });

      const row = await tx.query.feederConfigs.findFirst({
        where: (t, { eq }) => eq(t.orgId, orgId),
      });
      const saved: FeederCalibration = row
        ? {
            speed: row.speed,
            duration: row.duration,
            pulseDuration: row.pulseDuration,
            pauseDuration: row.pauseDuration,
            settleDuration: row.settleDuration,
          }
        : calibration;
      return { success: true, message: "Saved feeder config.", data: saved };
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
      const rows = await tx.query.feederConfigAudit.findMany({
        where: (t, { eq }) => eq(t.orgId, orgId),
        orderBy: (t, { desc }) => [desc(t.createdAt)],
        limit: 20,
      });
      return {
        success: true,
        message: "Loaded history.",
        data: rows.map((r) => ({
          guid: r.guid!,
          calibration: {
            speed: r.speed,
            duration: r.duration,
            pulseDuration: r.pulseDuration,
            pauseDuration: r.pauseDuration,
            settleDuration: r.settleDuration,
          } satisfies FeederCalibration,
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
      const entry = await tx.query.feederConfigAudit.findFirst({
        where: (t, { eq, and }) => and(eq(t.guid, guid), eq(t.orgId, orgId)),
      });
      if (!entry) return { success: false, message: "Audit record not found." };

      const calibration: FeederCalibration = {
        speed: entry.speed,
        duration: entry.duration,
        pulseDuration: entry.pulseDuration,
        pauseDuration: entry.pauseDuration,
        settleDuration: entry.settleDuration,
      };

      await tx
        .insert(feederConfigs)
        .values({ ...calibration, orgId })
        .onConflictDoUpdate({
          target: [feederConfigs.orgId],
          set: { ...calibration, updatedAt: new Date() },
        });

      await tx.insert(feederConfigAudit).values({ ...calibration, orgId });
      return { success: true, message: "Reverted feeder config.", data: calibration };
    });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

export { router as feederRouter };
