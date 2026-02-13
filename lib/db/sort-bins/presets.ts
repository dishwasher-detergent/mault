"use server";

import { db } from "@/db";
import { sortBinPresets } from "@/db/schema";
import { Result } from "@/interfaces/result.interface";
import {
  BinConfig,
  BinPreset,
} from "@/interfaces/sort-bins.interface";
import { auth } from "@/lib/auth/server";
import { and, desc, eq } from "drizzle-orm";

export async function listPresets(): Promise<Result<BinPreset[]>> {
  const { data: session } = await auth.getSession();
  if (!session) return { message: "Unauthorized", success: false };

  const rows = await db
    .select()
    .from(sortBinPresets)
    .where(
      and(
        eq(sortBinPresets.userId, session.session.userId),
        eq(sortBinPresets.isActive, false),
      ),
    )
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

  // Get active preset's bins
  const [active] = await db
    .select()
    .from(sortBinPresets)
    .where(
      and(
        eq(sortBinPresets.userId, userId),
        eq(sortBinPresets.isActive, true),
      ),
    );

  const bins = active ? (active.bins as BinPreset["bins"]) : [];

  const [row] = await db
    .insert(sortBinPresets)
    .values({ userId, name, bins, isActive: false })
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

  // Get active preset's bins
  const [active] = await db
    .select()
    .from(sortBinPresets)
    .where(
      and(
        eq(sortBinPresets.userId, userId),
        eq(sortBinPresets.isActive, true),
      ),
    );

  const bins = active ? (active.bins as BinPreset["bins"]) : [];

  const [row] = await db
    .update(sortBinPresets)
    .set({ name, bins, updatedAt: new Date() })
    .where(
      and(
        eq(sortBinPresets.id, presetId),
        eq(sortBinPresets.userId, userId),
        eq(sortBinPresets.isActive, false),
      ),
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
      and(
        eq(sortBinPresets.id, presetId),
        eq(sortBinPresets.userId, userId),
        eq(sortBinPresets.isActive, false),
      ),
    );

  if (!preset) return { message: "Preset not found.", success: false };

  const bins = preset.bins as BinPreset["bins"];

  // Copy preset bins into the active preset
  await db
    .update(sortBinPresets)
    .set({ bins, updatedAt: new Date() })
    .where(
      and(
        eq(sortBinPresets.userId, userId),
        eq(sortBinPresets.isActive, true),
      ),
    );

  const configs: BinConfig[] = bins.map((bin) => ({
    binNumber: bin.binNumber,
    label: bin.label,
    rules: bin.rules,
    isCatchAll: bin.isCatchAll,
  }));

  return { message: "Preset loaded.", success: true, data: configs };
}

export async function deletePreset(presetId: number): Promise<Result<null>> {
  const { data: session } = await auth.getSession();
  if (!session) return { message: "Unauthorized", success: false };

  // Guard against deleting the active preset
  const [target] = await db
    .select({ isActive: sortBinPresets.isActive })
    .from(sortBinPresets)
    .where(
      and(
        eq(sortBinPresets.id, presetId),
        eq(sortBinPresets.userId, session.session.userId),
      ),
    );

  if (target?.isActive) {
    return { message: "Cannot delete the active configuration.", success: false };
  }

  await db
    .delete(sortBinPresets)
    .where(
      and(
        eq(sortBinPresets.id, presetId),
        eq(sortBinPresets.userId, session.session.userId),
        eq(sortBinPresets.isActive, false),
      ),
    );

  return { message: "Preset deleted.", success: true, data: null };
}
