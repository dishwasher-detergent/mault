"use server";

import { BIN_COUNT } from "@/constants/sort-bins.constant";
import { db } from "@/db";
import { bins, binSets } from "@/db/schema";
import { Result } from "@/interfaces/result.interface";
import { BinConfig, BinRuleGroup, BinSet } from "@/interfaces/sort-bins.interface";
import { eq } from "drizzle-orm";

function emptyRules() {
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

export async function loadSets(): Promise<Result<BinSet[]>> {
  const rows = await db.query.binSets.findMany({
    ...binSetQuery,
    orderBy: (binSets, { desc }) => [desc(binSets.updatedAt)],
  });

  return {
    message: "Loaded sets.",
    success: true,
    data: rows.map(toBinSet),
  };
}

export async function activateSet(guid: string): Promise<Result<BinSet[]>> {
  const target = await db.query.binSets.findFirst({
    where: (binSets, { eq }) => eq(binSets.guid, guid),
    columns: { id: true },
  });

  if (!target) {
    return { message: "Set not found.", success: false };
  }

  // Deactivate all, then activate target
  await db.update(binSets).set({ isActive: false }).where(eq(binSets.isActive, true));
  await db.update(binSets).set({ isActive: true }).where(eq(binSets.id, target.id));

  return loadSets();
}

export async function createSet(name: string): Promise<Result<BinSet[]>> {
  const [newBinSet] = await db
    .insert(binSets)
    .values({ name, isActive: false })
    .returning({ id: binSets.id });

  await db.insert(bins).values(
    Array.from({ length: BIN_COUNT }, (_, i) => ({
      binNumber: i + 1,
      rules: emptyRules(),
      isCatchAll: false,
      binSet: newBinSet.id,
    })),
  );

  return loadSets();
}

export async function saveSet(name: string): Promise<Result<BinSet[]>> {
  const active = await db.query.binSets.findFirst({
    where: (binSets, { eq }) => eq(binSets.isActive, true),
    columns: { id: true },
    with: {
      bins: {
        columns: { binNumber: true, rules: true, isCatchAll: true },
      },
    },
  });

  const activeBins = active?.bins ?? [];

  const [newBinSet] = await db
    .insert(binSets)
    .values({ name, isActive: false })
    .returning({ id: binSets.id });

  if (activeBins.length > 0) {
    await db.insert(bins).values(
      activeBins.map((bin) => ({
        binNumber: bin.binNumber,
        rules: bin.rules,
        isCatchAll: bin.isCatchAll,
        binSet: newBinSet.id,
      })),
    );
  }

  return loadSets();
}

export async function deleteSet(guid: string): Promise<Result<BinSet[]>> {
  const target = await db.query.binSets.findFirst({
    where: (binSets, { eq }) => eq(binSets.guid, guid),
    columns: { id: true },
  });

  if (!target) {
    return { message: "Set not found.", success: false };
  }

  await db.delete(bins).where(eq(bins.binSet, target.id));
  await db.delete(binSets).where(eq(binSets.id, target.id));

  return loadSets();
}

export async function saveBinConfig({
  binNumber,
  rules,
  isCatchAll,
}: {
  binNumber: number;
  rules: BinRuleGroup;
  isCatchAll?: boolean;
}): Promise<Result<BinConfig>> {
  const activeBinSet = await db.query.binSets.findFirst({
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
    const [updated] = await db
      .update(bins)
      .set({
        rules,
        isCatchAll: isCatchAll ?? false,
        updatedAt: new Date(),
      })
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
      },
    };
  }

  const [inserted] = await db
    .insert(bins)
    .values({
      binNumber,
      rules,
      isCatchAll: isCatchAll ?? false,
      binSet: activeBinSet.id,
    })
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
    },
  };
}

export async function clearBinConfig(binNumber: number): Promise<Result<null>> {
  const activeBinSet = await db.query.binSets.findFirst({
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
    await db.delete(bins).where(eq(bins.id, existing.id));
  }

  return {
    message: "Successfully cleared bin config.",
    success: true,
    data: null,
  };
}
