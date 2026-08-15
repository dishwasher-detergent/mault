import { apiGet, apiPut } from "@/lib/api/client";
import {
  DEFAULT_CAPTURE_SETTLE_DELAY_MS,
  DEFAULT_CHANNEL_LAYOUT,
  DEFAULT_MODULE_COUNT,
  DEFAULT_SCAN_REGION,
  type ChannelLayout,
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
  moduleCount: number;
  channelLayout: ChannelLayout;
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
            moduleCount: DEFAULT_MODULE_COUNT,
            channelLayout: DEFAULT_CHANNEL_LAYOUT,
          },
      ),
    staleTime: Infinity,
    enabled: !!orgId,
  });
