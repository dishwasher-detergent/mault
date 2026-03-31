import type { FeederCalibration, Result } from "@magic-vault/shared";
import { DEFAULT_FEEDER_CALIBRATION } from "@magic-vault/shared";
import { apiGet, apiPut } from "@/lib/api/client";
import { queryOptions } from "@tanstack/react-query";

export const feederQueryOptions = queryOptions({
  queryKey: ["feeder"] as const,
  queryFn: () =>
    getFeederConfig().then((r) => r.data ?? { ...DEFAULT_FEEDER_CALIBRATION }),
  staleTime: Infinity,
});

export async function getFeederConfig(): Promise<Result<FeederCalibration>> {
  return apiGet<Result<FeederCalibration>>("/api/feeder");
}

export async function saveFeederConfig(
  calibration: FeederCalibration,
): Promise<Result<FeederCalibration>> {
  return apiPut<Result<FeederCalibration>>("/api/feeder", calibration);
}
