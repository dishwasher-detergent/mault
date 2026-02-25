import type { Response } from "express";
import { Router } from "express";
import { authQuery } from "../db";
import { bins, binSets } from "../db/schema";
import { BIN_COUNT, type BinConfig, type BinRuleGroup, type BinSet } from "@magic-vault/shared";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth";
import type { Transaction } from "../db";

const router = Router();

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
  columns: {
    guid: true,
    name: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
  },
  with: {
    bins: {
      columns: {
        guid: true,
        binNumber: true,
        rules: true,
        isCatchAll: true,
      },
    },
  },
} as const;

async function _loadSets(tx: Transaction) {
  const rows = await tx.query.binSets.findMany({
    ...binSetQuery,
    orderBy: (binSets, { desc }) => [desc(binSets.updatedAt)],
  });
  return {
    message: "Loaded sets.",
    success: true,
    data: rows.map(toBinSet),
  };
}

// GET /api/sort-bins
router.get("/", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await authQuery(req.jwtClaims!, _loadSets);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Database error." });
  }
});

// POST /api/sort-bins/activate/:guid
router.post("/activate/:guid", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { guid } = req.params;
  try {
    const result = await authQuery(req.jwtClaims!, async (tx) => {
      const target = await tx.query.binSets.findFirst({
        where: (binSets, { eq }) => eq(binSets.guid, guid),
        columns: { id: true },
      });

      if (!target) {
        return { message: "Set not found.", success: false };
      }

      await tx.update(binSets).set({ isActive: false }).where(eq(binSets.isActive, true));
      await tx.update(binSets).set({ isActive: true }).where(eq(binSets.id, target.id));

      return _loadSets(tx);
    });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Database error." });
  }
});

// POST /api/sort-bins/create
router.post("/create", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { name } = req.body as { name: string };
  try {
    const result = await authQuery(req.jwtClaims!, async (tx) => {
      const [newBinSet] = await tx
        .insert(binSets)
        .values({ name, isActive: false })
        .returning({ id: binSets.id });

      await tx.insert(bins).values(
        Array.from({ length: BIN_COUNT }, (_, i) => ({
          binNumber: i + 1,
          rules: emptyRules(),
          isCatchAll: false,
          binSet: newBinSet.id,
        })),
      );

      return _loadSets(tx);
    });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Database error." });
  }
});

// POST /api/sort-bins/save-as
router.post("/save-as", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { name } = req.body as { name: string };
  try {
    const result = await authQuery(req.jwtClaims!, async (tx) => {
      const active = await tx.query.binSets.findFirst({
        where: (binSets, { eq }) => eq(binSets.isActive, true),
        columns: { id: true },
        with: {
          bins: {
            columns: { binNumber: true, rules: true, isCatchAll: true },
          },
        },
      });

      const activeBins = active?.bins ?? [];

      const [newBinSet] = await tx
        .insert(binSets)
        .values({ name, isActive: false })
        .returning({ id: binSets.id });

      if (activeBins.length > 0) {
        await tx.insert(bins).values(
          activeBins.map((bin) => ({
            binNumber: bin.binNumber,
            rules: bin.rules,
            isCatchAll: bin.isCatchAll,
            binSet: newBinSet.id,
          })),
        );
      }

      return _loadSets(tx);
    });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Database error." });
  }
});

// DELETE /api/sort-bins/:guid
router.delete("/:guid", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { guid } = req.params;
  try {
    const result = await authQuery(req.jwtClaims!, async (tx) => {
      const target = await tx.query.binSets.findFirst({
        where: (binSets, { eq }) => eq(binSets.guid, guid),
        columns: { id: true },
      });

      if (!target) {
        return { message: "Set not found.", success: false };
      }

      await tx.delete(bins).where(eq(bins.binSet, target.id));
      await tx.delete(binSets).where(eq(binSets.id, target.id));

      return _loadSets(tx);
    });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Database error." });
  }
});

// PUT /api/sort-bins/bin/:binNumber
router.put("/bin/:binNumber", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const binNumber = parseInt(req.params.binNumber);
  const { rules, isCatchAll } = req.body as { rules: BinRuleGroup; isCatchAll?: boolean };

  try {
    const result = await authQuery(req.jwtClaims!, async (tx) => {
      const activeBinSet = await tx.query.binSets.findFirst({
        where: (binSets, { eq }) => eq(binSets.isActive, true),
        columns: { id: true },
        with: {
          bins: {
            columns: { id: true, binNumber: true },
          },
        },
      });

      if (!activeBinSet) {
        return { message: "No active set found.", success: false };
      }

      const existing = activeBinSet.bins.find((b) => b.binNumber === binNumber);

      if (existing) {
        const [updated] = await tx
          .update(bins)
          .set({ rules, isCatchAll: isCatchAll ?? false, updatedAt: new Date() })
          .where(eq(bins.id, existing.id))
          .returning({
            guid: bins.guid,
            binNumber: bins.binNumber,
            rules: bins.rules,
            isCatchAll: bins.isCatchAll,
          });

        return {
          message: "Successfully saved bin config.",
          success: true,
          data: {
            guid: updated.guid!,
            binNumber: updated.binNumber,
            rules: updated.rules as BinRuleGroup,
            isCatchAll: updated.isCatchAll,
          } as BinConfig,
        };
      }

      const [inserted] = await tx
        .insert(bins)
        .values({ binNumber, rules, isCatchAll: isCatchAll ?? false, binSet: activeBinSet.id })
        .returning({
          guid: bins.guid,
          binNumber: bins.binNumber,
          rules: bins.rules,
          isCatchAll: bins.isCatchAll,
        });

      return {
        message: "Successfully saved bin config.",
        success: true,
        data: {
          guid: inserted.guid!,
          binNumber: inserted.binNumber,
          rules: inserted.rules as BinRuleGroup,
          isCatchAll: inserted.isCatchAll,
        } as BinConfig,
      };
    });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Database error." });
  }
});

// DELETE /api/sort-bins/bin/:binNumber
router.delete("/bin/:binNumber", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const binNumber = parseInt(req.params.binNumber);
  try {
    const result = await authQuery(req.jwtClaims!, async (tx) => {
      const activeBinSet = await tx.query.binSets.findFirst({
        where: (binSets, { eq }) => eq(binSets.isActive, true),
        columns: { id: true },
        with: {
          bins: {
            columns: { id: true, binNumber: true },
          },
        },
      });

      if (!activeBinSet) {
        return { message: "No active set found.", success: false };
      }

      const existing = activeBinSet.bins.find((b) => b.binNumber === binNumber);
      if (existing) {
        await tx.delete(bins).where(eq(bins.id, existing.id));
      }

      return { message: "Successfully cleared bin config.", success: true, data: null };
    });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Database error." });
  }
});

export { router as sortBinsRouter };
