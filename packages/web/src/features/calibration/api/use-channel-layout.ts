import { orgSettingsQueryOptions } from "@/features/companies/api/org-settings";
import { useOrg } from "@/features/companies/api/use-organization";
import { DEFAULT_CHANNEL_LAYOUT, type ChannelLayout } from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";

export function useChannelLayout(): ChannelLayout {
  const { activeOrg } = useOrg();
  const { data } = useQuery(orgSettingsQueryOptions(activeOrg?.id));
  return data?.channelLayout ?? DEFAULT_CHANNEL_LAYOUT;
}
