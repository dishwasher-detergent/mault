import { apiGet, apiPost, apiPut } from "@/lib/api/client";
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
  discordNotifyOnScan: boolean;
  discordGuildId: string | null;
  scanRegion: ScanRegion;
  captureSettleDelayMs: number;
  moduleCount: number;
  channelLayout: ChannelLayout;
}

export const DEFAULT_ORG_SETTINGS: OrgSettings = {
  primaryColor: null,
  scannerLayout: "horizontal",
  discordNotifyOnScan: false,
  discordGuildId: null,
  scanRegion: DEFAULT_SCAN_REGION,
  captureSettleDelayMs: DEFAULT_CAPTURE_SETTLE_DELAY_MS,
  moduleCount: DEFAULT_MODULE_COUNT,
  channelLayout: DEFAULT_CHANNEL_LAYOUT,
};

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

export async function generateDiscordLinkCode(): Promise<{
  success: boolean;
  message?: string;
  data?: { code: string; expiresAt: string };
}> {
  return apiPost("/api/org-settings/discord-link-code");
}

export async function unlinkDiscord(): Promise<{
  success: boolean;
  message?: string;
}> {
  return apiPost("/api/org-settings/discord-unlink");
}

export const orgSettingsQueryOptions = (orgId: string | undefined) =>
  queryOptions({
    queryKey: ["org-settings", orgId],
    queryFn: () => getOrgSettings().then((r) => r.data ?? DEFAULT_ORG_SETTINGS),
    staleTime: Infinity,
    enabled: !!orgId,
  });
