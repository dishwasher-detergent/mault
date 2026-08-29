import { apiGet } from "@/lib/api/client";
import type { HealthCheckResponse, Result } from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

export async function getHealth(): Promise<Result<HealthCheckResponse>> {
  return apiGet<Result<HealthCheckResponse>>("/api/public/health");
}

// Unauthenticated endpoint - refetchInterval keeps both the footer
// indicator and the dedicated health page current without a manual
// refresh, since an outage is exactly the kind of thing a user won't
// think to refresh for.
export const healthQueryOptions = queryOptions({
  queryKey: ["health"] as const,
  queryFn: () => getHealth().then((r) => r.data ?? null),
  refetchInterval: 60_000,
});
