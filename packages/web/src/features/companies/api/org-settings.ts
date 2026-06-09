import { apiGet, apiPut } from "@/lib/api/client";
import { queryOptions } from "@tanstack/react-query";

export interface OrgSettings {
  primaryColor: string | null;
}

export async function getOrgSettings(): Promise<{ success: boolean; data?: OrgSettings }> {
  return apiGet("/api/org-settings");
}

export async function saveOrgSettings(settings: OrgSettings): Promise<{ success: boolean; data?: OrgSettings }> {
  return apiPut("/api/org-settings", settings);
}

export const orgSettingsQueryOptions = (orgId: string | undefined) =>
  queryOptions({
    queryKey: ["org-settings", orgId],
    queryFn: () => getOrgSettings().then((r) => r.data ?? { primaryColor: null }),
    staleTime: Infinity,
    enabled: !!orgId,
  });
