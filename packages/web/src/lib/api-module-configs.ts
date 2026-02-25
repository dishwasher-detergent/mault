import type { Result, ModuleConfig, ServoCalibration } from "@magic-vault/shared";
import { apiGet, apiPut } from "./api";

export async function getModuleConfigs(): Promise<Result<ModuleConfig[]>> {
  return apiGet<Result<ModuleConfig[]>>("/api/modules");
}

export async function saveModuleConfig(
  moduleNumber: 1 | 2 | 3,
  calibration: ServoCalibration,
): Promise<Result<ModuleConfig[]>> {
  return apiPut<Result<ModuleConfig[]>>(`/api/modules/${moduleNumber}`, calibration);
}
