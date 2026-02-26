import type { Result, ModuleConfig, ServoCalibration } from "@magic-vault/shared";
import { DEFAULT_CALIBRATION } from "@magic-vault/shared";
import { apiGet, apiPut } from "@/lib/api/client";
import { queryOptions } from "@tanstack/react-query";

function defaultModuleConfigs(): ModuleConfig[] {
  return ([1, 2, 3] as const).map((n) => ({
    moduleNumber: n,
    calibration: { ...DEFAULT_CALIBRATION },
  }));
}

export const modulesQueryOptions = queryOptions({
  queryKey: ["modules"] as const,
  queryFn: () => getModuleConfigs().then((r) => r.data ?? defaultModuleConfigs()),
  staleTime: Infinity,
});

export async function getModuleConfigs(): Promise<Result<ModuleConfig[]>> {
  return apiGet<Result<ModuleConfig[]>>("/api/modules");
}

export async function saveModuleConfig(
  moduleNumber: 1 | 2 | 3,
  calibration: ServoCalibration,
): Promise<Result<ModuleConfig[]>> {
  return apiPut<Result<ModuleConfig[]>>(`/api/modules/${moduleNumber}`, calibration);
}
