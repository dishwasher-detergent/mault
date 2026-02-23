"use server";

import { authQuery } from "@/db";
import { moduleConfigs } from "@/db/schema";
import {
  DEFAULT_CALIBRATION,
  ModuleConfig,
  ServoCalibration,
} from "@/interfaces/module-configs.interface";
import { Result } from "@/interfaces/result.interface";

function toModuleConfig(row: {
  moduleNumber: number;
  bottomClosed: number;
  bottomOpen: number;
  paddleClosed: number;
  paddleOpen: number;
  pusherLeft: number;
  pusherNeutral: number;
  pusherRight: number;
}): ModuleConfig {
  return {
    moduleNumber: row.moduleNumber as 1 | 2 | 3,
    calibration: {
      bottomClosed: row.bottomClosed,
      bottomOpen: row.bottomOpen,
      paddleClosed: row.paddleClosed,
      paddleOpen: row.paddleOpen,
      pusherLeft: row.pusherLeft,
      pusherNeutral: row.pusherNeutral,
      pusherRight: row.pusherRight,
    },
  };
}

function buildConfigs(
  rows: { moduleNumber: number; bottomClosed: number; bottomOpen: number; paddleClosed: number; paddleOpen: number; pusherLeft: number; pusherNeutral: number; pusherRight: number }[],
): ModuleConfig[] {
  return ([1, 2, 3] as const).map((n) => {
    const row = rows.find((r) => r.moduleNumber === n);
    return row ? toModuleConfig(row) : { moduleNumber: n, calibration: { ...DEFAULT_CALIBRATION } };
  });
}

export async function getModuleConfigs(): Promise<Result<ModuleConfig[]>> {
  return authQuery(async (tx) => {
    const rows = await tx.query.moduleConfigs.findMany();
    return {
      success: true,
      message: "Loaded module configs.",
      data: buildConfigs(rows),
    };
  });
}

export async function saveModuleConfig(
  moduleNumber: 1 | 2 | 3,
  calibration: ServoCalibration,
): Promise<Result<ModuleConfig[]>> {
  return authQuery(async (tx) => {
    await tx
      .insert(moduleConfigs)
      .values({ moduleNumber, ...calibration })
      .onConflictDoUpdate({
        target: [moduleConfigs.userId, moduleConfigs.moduleNumber],
        set: { ...calibration, updatedAt: new Date() },
      });

    const rows = await tx.query.moduleConfigs.findMany();
    return {
      success: true,
      message: "Saved module config.",
      data: buildConfigs(rows),
    };
  });
}
