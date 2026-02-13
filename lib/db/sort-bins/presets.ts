"use server";

import { db } from "@/db";
import { sortBinPresets, sortBins } from "@/db/schema";
import { Result } from "@/interfaces/result.interface";
import {
  BinConfig,
  BinPreset,
  BinRuleGroup,
} from "@/interfaces/sort-bins.interface";
import { auth } from "@/lib/auth/server";
import { and, desc, eq } from "drizzle-orm";

export async function listPresets(): Promise<Result<BinPreset[]>> {
  const { data: session } = await auth.getSession();
  if (!session) return { message: "Unauthorized", success: false };

  const rows = await db
    .select()
    .from(sortBinPresets)
    .where(eq(sortBinPresets.userId, session.session.userId))
    .orderBy(desc(sortBinPresets.updatedAt));

  const presets: BinPreset[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    bins: row.bins as BinPreset["bins"],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));

  return { message: "Loaded presets.", success: true, data: presets };
}

export async function savePreset(name: string): Promise<Result<BinPreset>> {
  const { data: session } = await auth.getSession();
  if (!session) return { message: "Unauthorized", success: false };

  const userId = session.session.userId;

  // Load current active bins
  const activeBins = await db
    .select()
    .from(sortBins)
    .where(eq(sortBins.userId, userId));

  const bins: BinPreset["bins"] = activeBins.map((row) => ({
    binNumber: row.binNumber,
    label: row.label,
    rules: row.rules as BinRuleGroup,
  }));

  const [row] = await db
    .insert(sortBinPresets)
    .values({ userId, name, bins })
    .returning();

  return {
    message: "Preset saved.",
    success: true,
    data: {
      id: row.id,
      name: row.name,
      bins: row.bins as BinPreset["bins"],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    },
  };
}

export async function updatePreset(
  presetId: number,
  name: string,
): Promise<Result<BinPreset>> {
  const { data: session } = await auth.getSession();
  if (!session) return { message: "Unauthorized", success: false };

  const userId = session.session.userId;

  // Load current active bins
  const activeBins = await db
    .select()
    .from(sortBins)
    .where(eq(sortBins.userId, userId));

  const bins: BinPreset["bins"] = activeBins.map((row) => ({
    binNumber: row.binNumber,
    label: row.label,
    rules: row.rules as BinRuleGroup,
  }));

  const [row] = await db
    .update(sortBinPresets)
    .set({ name, bins, updatedAt: new Date() })
    .where(
      and(eq(sortBinPresets.id, presetId), eq(sortBinPresets.userId, userId)),
    )
    .returning();

  if (!row) return { message: "Preset not found.", success: false };

  return {
    message: "Preset updated.",
    success: true,
    data: {
      id: row.id,
      name: row.name,
      bins: row.bins as BinPreset["bins"],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    },
  };
}

export async function loadPreset(
  presetId: number,
): Promise<Result<BinConfig[]>> {
  const { data: session } = await auth.getSession();
  if (!session) return { message: "Unauthorized", success: false };

  const userId = session.session.userId;

  const [preset] = await db
    .select()
    .from(sortBinPresets)
    .where(
      and(eq(sortBinPresets.id, presetId), eq(sortBinPresets.userId, userId)),
    );

  if (!preset) return { message: "Preset not found.", success: false };

  const bins = preset.bins as BinPreset["bins"];

  // Clear existing active bins
  await db.delete(sortBins).where(eq(sortBins.userId, userId));

  // Insert preset bins as active
  if (bins.length > 0) {
    await db.insert(sortBins).values(
      bins.map((bin) => ({
        userId,
        binNumber: bin.binNumber,
        label: bin.label,
        rules: bin.rules,
      })),
    );
  }

  // Reload active bins to return with IDs
  const activeBins = await db
    .select()
    .from(sortBins)
    .where(eq(sortBins.userId, userId));

  const configs: BinConfig[] = activeBins.map((row) => ({
    id: row.id,
    binNumber: row.binNumber,
    label: row.label,
    rules: row.rules as BinRuleGroup,
  }));

  return { message: "Preset loaded.", success: true, data: configs };
}

export async function deletePreset(presetId: number): Promise<Result<null>> {
  const { data: session } = await auth.getSession();
  if (!session) return { message: "Unauthorized", success: false };

  await db
    .delete(sortBinPresets)
    .where(
      and(
        eq(sortBinPresets.id, presetId),
        eq(sortBinPresets.userId, session.session.userId),
      ),
    );

  return { message: "Preset deleted.", success: true, data: null };
}
