import { Hono } from "hono";
import { authQuery } from "../db";
import { orgSettings } from "../db/schema";
import { requireAuth, requireOrg, type AppEnv } from "../middleware/auth";

const router = new Hono<AppEnv>();

router.get("/", requireAuth, requireOrg, async (c) => {
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const row = await tx.query.orgSettings.findFirst();
      return {
        success: true,
        message: "Loaded.",
        data: { primaryColor: row?.primaryColor ?? null },
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
  const { primaryColor } = await c.req.json<{ primaryColor: string | null }>();
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      await tx
        .insert(orgSettings)
        .values({ orgId, primaryColor })
        .onConflictDoUpdate({
          target: [orgSettings.orgId],
          set: { primaryColor, updatedAt: new Date() },
        });
      return {
        success: true,
        message: "Saved.",
        data: { primaryColor: primaryColor ?? null },
      };
    });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

export { router as orgSettingsRouter };
