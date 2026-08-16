import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import type { Transaction } from "../db";
import { authQuery } from "../db";
import { binRouteAudit, binRoutes } from "../db/schema";
import {
  createDefaultBinRoutes,
  DEFAULT_MODULE_COUNT,
  type BinDirection,
  type BinRoute,
} from "@magic-vault/shared";
import { requireAuth, requireOrg, type AppEnv } from "../middleware/auth";

const router = new Hono<AppEnv>();

type RouteRow = {
  binNumber: number;
  module: number;
  direction: string;
};

function toBinRoute(row: RouteRow): BinRoute {
  return {
    binNumber: row.binNumber,
    module: row.module,
    direction: row.direction as BinDirection,
  };
}

async function _getModuleCount(tx: Transaction, orgId: string): Promise<number> {
  const row = await tx.query.orgSettings.findFirst({
    where: (t, { eq }) => eq(t.orgId, orgId),
    columns: { moduleCount: true },
  });
  return row?.moduleCount ?? DEFAULT_MODULE_COUNT;
}

async function _buildRoutes(
  tx: Transaction,
  orgId: string,
  rows: RouteRow[],
): Promise<BinRoute[]> {
  const moduleCount = await _getModuleCount(tx, orgId);
  const defaults = createDefaultBinRoutes(moduleCount);
  return defaults.map((def) => {
    const row = rows.find((r) => r.binNumber === def.binNumber);
    return row ? toBinRoute(row) : def;
  });
}

router.get("/", requireAuth, requireOrg, async (c) => {
  const orgId = c.get("orgId");
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const rows = await tx.query.binRoutes.findMany({
        where: (t, { eq }) => eq(t.orgId, orgId),
      });
      return { success: true, message: "Loaded bin routes.", data: await _buildRoutes(tx, orgId, rows) };
    });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

router.put("/:binNumber", requireAuth, requireOrg, async (c) => {
  const orgId = c.get("orgId");
  const binNumber = parseInt(c.req.param("binNumber"));
  const route = await c.req.json<BinRoute>();
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const values = { binNumber, module: route.module, direction: route.direction, orgId };

      await tx
        .insert(binRoutes)
        .values(values)
        .onConflictDoUpdate({
          target: [binRoutes.orgId, binRoutes.binNumber],
          set: { ...values, updatedAt: new Date() },
        });

      await tx.insert(binRouteAudit).values(values);

      const rows = await tx.query.binRoutes.findMany({
        where: (t, { eq }) => eq(t.orgId, orgId),
      });
      return { success: true, message: "Saved bin route.", data: await _buildRoutes(tx, orgId, rows) };
    });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

router.delete("/:binNumber", requireAuth, requireOrg, async (c) => {
  const orgId = c.get("orgId");
  const binNumber = parseInt(c.req.param("binNumber"));
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      await tx
        .delete(binRoutes)
        .where(and(eq(binRoutes.orgId, orgId), eq(binRoutes.binNumber, binNumber)));

      const rows = await tx.query.binRoutes.findMany({
        where: (t, { eq }) => eq(t.orgId, orgId),
      });
      return { success: true, message: "Reset bin route.", data: await _buildRoutes(tx, orgId, rows) };
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
      const rows = await tx.query.binRouteAudit.findMany({
        where: (t, { eq }) => eq(t.orgId, orgId),
        orderBy: (t, { desc }) => [desc(t.createdAt)],
        limit: 30,
      });
      return {
        success: true,
        message: "Loaded history.",
        data: rows.map((r) => ({
          guid: r.guid!,
          route: toBinRoute(r),
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
      const entry = await tx.query.binRouteAudit.findFirst({
        where: (t, { eq, and }) => and(eq(t.guid, guid), eq(t.orgId, orgId)),
      });
      if (!entry) return { success: false, message: "Audit record not found." };

      const values = {
        binNumber: entry.binNumber,
        module: entry.module,
        direction: entry.direction,
        orgId,
      };

      await tx
        .insert(binRoutes)
        .values(values)
        .onConflictDoUpdate({
          target: [binRoutes.orgId, binRoutes.binNumber],
          set: { ...values, updatedAt: new Date() },
        });

      await tx.insert(binRouteAudit).values(values);

      const rows = await tx.query.binRoutes.findMany({
        where: (t, { eq }) => eq(t.orgId, orgId),
      });
      return { success: true, message: "Reverted bin route.", data: await _buildRoutes(tx, orgId, rows) };
    });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

export { router as binRoutesRouter };
