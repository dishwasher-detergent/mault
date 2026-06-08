import { Hono } from "hono";
import { authQuery } from "../db";
import { binSetAudit, bins, binSets } from "../db/schema";
import { BIN_COUNT, type BinConfig, type BinRuleGroup, type BinSet, type DefaultBinInit } from "@magic-vault/shared";
import { eq } from "drizzle-orm";
import { requireAuth, requireOrg, type AppEnv } from "../middleware/auth";
import type { Transaction } from "../db";

const router = new Hono<AppEnv>();

function emptyRules(): BinRuleGroup {
  return {
    id: crypto.randomUUID(),
    combinator: "and" as const,
    conditions: [],
  };
}

function toBinSet(row: {
  guid: string | null;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  bins: { guid: string | null; binNumber: number; rules: unknown; isCatchAll: boolean }[];
}): BinSet {
  return {
    guid: row.guid!,
    name: row.name,
    isActive: row.isActive,
    bins: row.bins.map((bin) => ({
      guid: bin.guid!,
      binNumber: bin.binNumber,
      rules: bin.rules as BinRuleGroup,
      isCatchAll: bin.isCatchAll,
    })),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const binSetQuery = {
  columns: { guid: true, name: true, isActive: true, createdAt: true, updatedAt: true },
  with: { bins: { columns: { guid: true, binNumber: true, rules: true, isCatchAll: true } } },
} as const;

async function _loadSets(tx: Transaction) {
  const rows = await tx.query.binSets.findMany({
    ...binSetQuery,
    orderBy: (binSets, { desc }) => [desc(binSets.updatedAt)],
  });
  return { message: "Loaded sets.", success: true, data: rows.map(toBinSet) };
}

async function _snapshotBinSet(tx: Transaction, binSetId: number, binSetGuid: string, orgId: number) {
  const rows = await tx.query.bins.findMany({
    where: (bins, { eq }) => eq(bins.binSet, binSetId),
    columns: { guid: true, binNumber: true, rules: true, isCatchAll: true },
  });
  const snapshot: BinConfig[] = rows.map((r) => ({
    guid: r.guid!,
    binNumber: r.binNumber,
    rules: r.rules as BinRuleGroup,
    isCatchAll: r.isCatchAll,
  }));
  await tx.insert(binSetAudit).values({ binSetGuid, snapshot, orgId });
}

// GET /bins
router.get("/", requireAuth, requireOrg, async (c) => {
  try {
    const result = await authQuery(c.get("jwtClaims"), _loadSets);
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

// PUT /bins/:guid/active
router.put("/:guid/active", requireAuth, requireOrg, async (c) => {
  const guid = c.req.param("guid");
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const target = await tx.query.binSets.findFirst({
        where: (binSets, { eq }) => eq(binSets.guid, guid),
        columns: { id: true },
      });
      if (!target) return { message: "Set not found.", success: false };
      await tx.update(binSets).set({ isActive: false }).where(eq(binSets.isActive, true));
      await tx.update(binSets).set({ isActive: true }).where(eq(binSets.id, target.id));
      return _loadSets(tx);
    });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

// POST /bins
router.post("/", requireAuth, requireOrg, async (c) => {
  const orgId = c.get("orgId");
  const { name, initialBins } = await c.req.json<{ name: string; initialBins?: DefaultBinInit[] }>();
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      await tx.update(binSets).set({ isActive: false }).where(eq(binSets.isActive, true));
      const [newBinSet] = await tx.insert(binSets).values({ name, isActive: true, orgId }).returning({ id: binSets.id });
      const binsToInsert = Array.isArray(initialBins) ? initialBins : Array.from({ length: BIN_COUNT }, (_, i) => ({
        binNumber: i + 1,
        rules: emptyRules(),
        isCatchAll: false,
      }));
      await tx.insert(bins).values(
        binsToInsert.map((b) => ({
          binNumber: b.binNumber,
          rules: b.rules,
          isCatchAll: b.isCatchAll,
          binSet: newBinSet.id,
          orgId,
        })),
      );
      return _loadSets(tx);
    });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

// POST /bins/copies
router.post("/copies", requireAuth, requireOrg, async (c) => {
  const orgId = c.get("orgId");
  const { name } = await c.req.json<{ name: string }>();
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const active = await tx.query.binSets.findFirst({
        where: (binSets, { eq }) => eq(binSets.isActive, true),
        columns: { id: true },
        with: { bins: { columns: { binNumber: true, rules: true, isCatchAll: true } } },
      });
      const activeBins = active?.bins ?? [];
      const [newBinSet] = await tx.insert(binSets).values({ name, isActive: false, orgId }).returning({ id: binSets.id });
      if (activeBins.length > 0) {
        await tx.insert(bins).values(
          activeBins.map((bin) => ({
            binNumber: bin.binNumber,
            rules: bin.rules,
            isCatchAll: bin.isCatchAll,
            binSet: newBinSet.id,
            orgId,
          })),
        );
      }
      return _loadSets(tx);
    });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

// PUT /bins/bins/:binNumber
router.put("/bins/:binNumber", requireAuth, requireOrg, async (c) => {
  const orgId = c.get("orgId");
  const binNumber = parseInt(c.req.param("binNumber"));
  const { rules, isCatchAll } = await c.req.json<{ rules: BinRuleGroup; isCatchAll?: boolean }>();
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const activeBinSet = await tx.query.binSets.findFirst({
        where: (binSets, { eq }) => eq(binSets.isActive, true),
        columns: { id: true, guid: true },
        with: { bins: { columns: { id: true, binNumber: true } } },
      });
      if (!activeBinSet) return { message: "No active set found.", success: false };

      const existing = activeBinSet.bins.find((b) => b.binNumber === binNumber);
      let savedBin: BinConfig;

      if (existing) {
        const [updated] = await tx
          .update(bins)
          .set({ rules, isCatchAll: isCatchAll ?? false, updatedAt: new Date() })
          .where(eq(bins.id, existing.id))
          .returning({ guid: bins.guid, binNumber: bins.binNumber, rules: bins.rules, isCatchAll: bins.isCatchAll });
        savedBin = { guid: updated.guid!, binNumber: updated.binNumber, rules: updated.rules as BinRuleGroup, isCatchAll: updated.isCatchAll };
      } else {
        const [inserted] = await tx
          .insert(bins)
          .values({ binNumber, rules, isCatchAll: isCatchAll ?? false, binSet: activeBinSet.id, orgId })
          .returning({ guid: bins.guid, binNumber: bins.binNumber, rules: bins.rules, isCatchAll: bins.isCatchAll });
        savedBin = { guid: inserted.guid!, binNumber: inserted.binNumber, rules: inserted.rules as BinRuleGroup, isCatchAll: inserted.isCatchAll };
      }

      await _snapshotBinSet(tx, activeBinSet.id, activeBinSet.guid!, orgId);
      return { message: "Successfully saved bin config.", success: true, data: savedBin };
    });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

// DELETE /bins/bins/:binNumber
router.delete("/bins/:binNumber", requireAuth, requireOrg, async (c) => {
  const binNumber = parseInt(c.req.param("binNumber"));
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const activeBinSet = await tx.query.binSets.findFirst({
        where: (binSets, { eq }) => eq(binSets.isActive, true),
        columns: { id: true },
        with: { bins: { columns: { id: true, binNumber: true } } },
      });
      if (!activeBinSet) return { message: "No active set found.", success: false };
      const existing = activeBinSet.bins.find((b) => b.binNumber === binNumber);
      if (existing) await tx.delete(bins).where(eq(bins.id, existing.id));
      return { message: "Successfully cleared bin config.", success: true, data: null };
    });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

// PUT /bins/:guid
router.put("/:guid", requireAuth, requireOrg, async (c) => {
  const guid = c.req.param("guid");
  const { name } = await c.req.json<{ name: string }>();
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const target = await tx.query.binSets.findFirst({
        where: (binSets, { eq }) => eq(binSets.guid, guid),
        columns: { id: true },
      });
      if (!target) return { message: "Set not found.", success: false };
      await tx.update(binSets).set({ name, updatedAt: new Date() }).where(eq(binSets.id, target.id));
      return _loadSets(tx);
    });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

// DELETE /bins/:guid
router.delete("/:guid", requireAuth, requireOrg, async (c) => {
  const guid = c.req.param("guid");
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const target = await tx.query.binSets.findFirst({
        where: (binSets, { eq }) => eq(binSets.guid, guid),
        columns: { id: true },
      });
      if (!target) return { message: "Set not found.", success: false };
      await tx.delete(bins).where(eq(bins.binSet, target.id));
      await tx.delete(binSets).where(eq(binSets.id, target.id));
      return _loadSets(tx);
    });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

// GET /bins/history?setGuid=
router.get("/history", requireAuth, requireOrg, async (c) => {
  const setGuid = c.req.query("setGuid");
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const rows = await tx.query.binSetAudit.findMany({
        where: setGuid ? (t, { eq }) => eq(t.binSetGuid, setGuid) : undefined,
        columns: { guid: true, binSetGuid: true, snapshot: true, createdAt: true },
        orderBy: (t, { desc }) => [desc(t.createdAt)],
        limit: 20,
      });
      return {
        success: true,
        message: "Loaded history.",
        data: rows.map((r) => ({
          guid: r.guid!,
          binSetGuid: r.binSetGuid,
          snapshot: r.snapshot as BinConfig[],
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

// POST /bins/history/:guid/revert
router.post("/history/:guid/revert", requireAuth, requireOrg, async (c) => {
  const orgId = c.get("orgId");
  const guid = c.req.param("guid");
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const entry = await tx.query.binSetAudit.findFirst({
        where: (t, { eq }) => eq(t.guid, guid),
      });
      if (!entry) return { success: false, message: "Audit record not found." };

      const binSet = await tx.query.binSets.findFirst({
        where: (t, { eq }) => eq(t.guid, entry.binSetGuid),
        columns: { id: true, guid: true },
        with: { bins: { columns: { id: true, binNumber: true } } },
      });
      if (!binSet) return { success: false, message: "Bin set not found." };

      const snapshot = entry.snapshot as BinConfig[];
      for (const config of snapshot) {
        const existing = binSet.bins.find((b) => b.binNumber === config.binNumber);
        if (existing) {
          await tx.update(bins).set({ rules: config.rules, isCatchAll: config.isCatchAll, updatedAt: new Date() }).where(eq(bins.id, existing.id));
        } else {
          await tx.insert(bins).values({ binNumber: config.binNumber, rules: config.rules, isCatchAll: config.isCatchAll, binSet: binSet.id, orgId });
        }
      }

      await tx.insert(binSetAudit).values({ binSetGuid: entry.binSetGuid, snapshot: entry.snapshot, orgId });
      return _loadSets(tx);
    });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

export { router as sortBinsRouter };
