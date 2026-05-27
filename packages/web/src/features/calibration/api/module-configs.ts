import { apiGet, apiPost, apiPut } from "@/lib/api/client";
import type {
  ModuleConfig,
  Result,
  ServoCalibration,
} from "@magic-vault/shared";
import { DEFAULT_CALIBRATION } from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

function defaultModuleConfigs(): ModuleConfig[] {
  return ([1, 2, 3] as const).map((n) => ({
    moduleNumber: n,
    calibration: { ...DEFAULT_CALIBRATION },
  }));
}

export const modulesQueryOptions = queryOptions({
  queryKey: ["modules"] as const,
  queryFn: () =>
    getModuleConfigs().then((r) => r.data ?? defaultModuleConfigs()),
  staleTime: Infinity,
});

export async function getModuleConfigs(): Promise<Result<ModuleConfig[]>> {
  return apiGet<Result<ModuleConfig[]>>("/api/modules");
}

export async function saveModuleConfig(
  moduleNumber: 1 | 2 | 3,
  calibration: ServoCalibration,
): Promise<Result<ModuleConfig[]>> {
  return apiPut<Result<ModuleConfig[]>>(
    `/api/modules/${moduleNumber}`,
    calibration,
  );
}

export interface ModuleConfigAuditEntry {
  guid: string;
  moduleNumber: 1 | 2 | 3;
  calibration: ServoCalibration;
  createdAt: string;
}

export async function getModuleHistory(): Promise<
  Result<ModuleConfigAuditEntry[]>
> {
  return apiGet<Result<ModuleConfigAuditEntry[]>>("/api/modules/history");
}

export async function revertModuleConfig(
  guid: string,
): Promise<Result<ModuleConfig[]>> {
  return apiPost<Result<ModuleConfig[]>>(`/api/modules/history/${guid}/revert`);
}
