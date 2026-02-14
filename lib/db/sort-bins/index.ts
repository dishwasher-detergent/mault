"use server";

import { db } from "@/db";
import { sortBinPresets } from "@/db/schema";
import { Result } from "@/interfaces/result.interface";
import { BinConfig, BinRuleGroup } from "@/interfaces/sort-bins.interface";
import { auth } from "@/lib/auth/server";
import { and, eq } from "drizzle-orm";

type BinEntry = Omit<BinConfig, "id">;

async function getOrCreateActivePreset(userId: string) {
  const [existing] = await db
    .select()
    .from(sortBinPresets)
    .where(
      and(eq(sortBinPresets.userId, userId), eq(sortBinPresets.isActive, true)),
    );

  if (existing) return existing;

  const [created] = await db
    .insert(sortBinPresets)
    .values({ userId, name: "__active__", bins: [], isActive: true })
    .returning();

  return created;
}

export async function loadBinConfigs(): Promise<Result<BinConfig[]>> {
  const { data: session } = await auth.getSession();

  if (!session) {
    return { message: "Unauthorized", success: false };
  }

  const preset = await getOrCreateActivePreset(session.session.userId);
  const bins = preset.bins as BinEntry[];

  const configs: BinConfig[] = bins.map((bin) => ({
    binNumber: bin.binNumber,
    rules: bin.rules,
    isCatchAll: bin.isCatchAll,
  }));

  return {
    message: "Successfully loaded bin configs.",
    success: true,
    data: configs,
  };
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
  const { data: session } = await auth.getSession();

  if (!session) {
    return { message: "Unauthorized", success: false };
  }

  const userId = session.session.userId;
  const preset = await getOrCreateActivePreset(userId);
  const bins = (preset.bins as BinEntry[]).slice();

  const entry: BinEntry = { binNumber, rules, isCatchAll: isCatchAll ?? false };
  const idx = bins.findIndex((b) => b.binNumber === binNumber);
  if (idx >= 0) {
    bins[idx] = entry;
  } else {
    bins.push(entry);
  }

  await db
    .update(sortBinPresets)
    .set({ bins, updatedAt: new Date() })
    .where(eq(sortBinPresets.id, preset.id));

  return {
    message: "Successfully saved bin config.",
    success: true,
    data: {
      binNumber: entry.binNumber,
      rules: entry.rules,
      isCatchAll: entry.isCatchAll,
    },
  };
}

export async function clearBinConfig(binNumber: number): Promise<Result<null>> {
  const { data: session } = await auth.getSession();

  if (!session) {
    return { message: "Unauthorized", success: false };
  }

  const userId = session.session.userId;
  const preset = await getOrCreateActivePreset(userId);
  const bins = (preset.bins as BinEntry[]).filter(
    (b) => b.binNumber !== binNumber,
  );

  await db
    .update(sortBinPresets)
    .set({ bins, updatedAt: new Date() })
    .where(eq(sortBinPresets.id, preset.id));

  return {
    message: "Successfully cleared bin config.",
    success: true,
    data: null,
  };
}
