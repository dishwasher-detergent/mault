"use server";

import { db } from "@/db";
import { sortBins } from "@/db/schema";
import { Result } from "@/interfaces/result.interface";
import { BinConfig, BinRuleGroup } from "@/interfaces/sort-bins.interface";
import { auth } from "@/lib/auth/server";
import { and, eq } from "drizzle-orm";

export async function loadBinConfigs(): Promise<Result<BinConfig[]>> {
  const { data: session } = await auth.getSession();

  if (!session) {
    return { message: "Unauthorized", success: false };
  }

  const rows = await db
    .select()
    .from(sortBins)
    .where(eq(sortBins.userId, session.session.userId));

  const configs: BinConfig[] = rows.map((row) => ({
    id: row.id,
    binNumber: row.binNumber,
    label: row.label,
    rules: row.rules as BinRuleGroup,
    isCatchAll: row.isCatchAll,
  }));

  return {
    message: "Successfully loaded bin configs.",
    success: true,
    data: configs,
  };
}

export async function saveBinConfig({
  binNumber,
  label,
  rules,
  isCatchAll,
}: {
  binNumber: number;
  label: string;
  rules: BinRuleGroup;
  isCatchAll?: boolean;
}): Promise<Result<BinConfig>> {
  const { data: session } = await auth.getSession();

  if (!session) {
    return { message: "Unauthorized", success: false };
  }

  const userId = session.session.userId;

  const existing = await db
    .select()
    .from(sortBins)
    .where(and(eq(sortBins.userId, userId), eq(sortBins.binNumber, binNumber)));

  let row;
  if (existing.length > 0) {
    const updated = await db
      .update(sortBins)
      .set({ label, rules, isCatchAll: isCatchAll ?? false, updatedAt: new Date() })
      .where(
        and(eq(sortBins.userId, userId), eq(sortBins.binNumber, binNumber)),
      )
      .returning();
    row = updated[0];
  } else {
    const inserted = await db
      .insert(sortBins)
      .values({ userId, binNumber, label, rules, isCatchAll: isCatchAll ?? false })
      .returning();
    row = inserted[0];
  }

  return {
    message: "Successfully saved bin config.",
    success: true,
    data: {
      id: row.id,
      binNumber: row.binNumber,
      label: row.label,
      rules: row.rules as BinRuleGroup,
      isCatchAll: row.isCatchAll,
    },
  };
}

export async function clearBinConfig(
  binNumber: number,
): Promise<Result<null>> {
  const { data: session } = await auth.getSession();

  if (!session) {
    return { message: "Unauthorized", success: false };
  }

  await db
    .delete(sortBins)
    .where(
      and(
        eq(sortBins.userId, session.session.userId),
        eq(sortBins.binNumber, binNumber),
      ),
    );

  return {
    message: "Successfully cleared bin config.",
    success: true,
    data: null,
  };
}
