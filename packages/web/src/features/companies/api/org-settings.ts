import { apiGet, apiPut } from "@/lib/api/client";
import {
  DEFAULT_CAPTURE_SETTLE_DELAY_MS,
  DEFAULT_SCAN_REGION,
  type ScanRegion,
} from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

export interface OrgSettings {
  primaryColor: string | null;
  scannerLayout: "horizontal" | "vertical";
  discordWebhookUrl: string | null;
  discordNotifyOnScan: boolean;
  scanRegion: ScanRegion;
  captureSettleDelayMs: number;
}

export async function getOrgSettings(): Promise<{
  success: boolean;
  data?: OrgSettings;
}> {
  return apiGet("/api/org-settings");
}

export async function saveOrgSettings(
  patch: Partial<OrgSettings>,
): Promise<{ success: boolean; data?: OrgSettings }> {
  return apiPut("/api/org-settings", patch);
}

export const orgSettingsQueryOptions = (orgId: string | undefined) =>
  queryOptions({
    queryKey: ["org-settings", orgId],
    queryFn: () =>
      getOrgSettings().then(
        (r) =>
          r.data ?? {
            primaryColor: null,
            scannerLayout: "horizontal" as const,
            discordWebhookUrl: null,
            discordNotifyOnScan: false,
            scanRegion: DEFAULT_SCAN_REGION,
            captureSettleDelayMs: DEFAULT_CAPTURE_SETTLE_DELAY_MS,
          },
      ),
    staleTime: Infinity,
    enabled: !!orgId,
  });
