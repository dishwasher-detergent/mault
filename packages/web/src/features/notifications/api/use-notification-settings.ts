import {
  orgSettingsQueryOptions,
  saveOrgSettings,
  type OrgSettings,
} from "@/features/companies/api/org-settings";
import { useOrg } from "@/features/companies/api/use-organization";
import {
  DEFAULT_CAPTURE_SETTLE_DELAY_MS,
  DEFAULT_CHANNEL_LAYOUT,
  DEFAULT_MODULE_COUNT,
  DEFAULT_SCAN_REGION,
} from "@magic-vault/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { NotificationTestType } from "./notification-settings";
import { sendTestNotification } from "./notification-settings";

type NotificationSettingsPatch = Pick<
  OrgSettings,
  "discordWebhookUrl" | "discordNotifyOnScan"
>;

export function useNotificationSettings() {
  const { t } = useTranslation("notifications");
  const queryClient = useQueryClient();
  const { activeOrg } = useOrg();
  const queryOpts = orgSettingsQueryOptions(activeOrg?.id);

  const { data, isLoading } = useQuery(queryOpts);
  const settings = {
    discordWebhookUrl: data?.discordWebhookUrl ?? null,
    discordNotifyOnScan: data?.discordNotifyOnScan ?? false,
  };

  const saveMutation = useMutation({
    mutationFn: (patch: Partial<NotificationSettingsPatch>) =>
      saveOrgSettings(patch),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: queryOpts.queryKey });
      const previous = queryClient.getQueryData(queryOpts.queryKey);
      queryClient.setQueryData(
        queryOpts.queryKey,
        (old: typeof data): typeof data => ({
          primaryColor: old?.primaryColor ?? null,
          scannerLayout: old?.scannerLayout ?? "horizontal",
          scanRegion: old?.scanRegion ?? DEFAULT_SCAN_REGION,
          discordWebhookUrl: old?.discordWebhookUrl ?? null,
          discordNotifyOnScan: old?.discordNotifyOnScan ?? false,
          captureSettleDelayMs:
            old?.captureSettleDelayMs ?? DEFAULT_CAPTURE_SETTLE_DELAY_MS,
          moduleCount: old?.moduleCount ?? DEFAULT_MODULE_COUNT,
          channelLayout: old?.channelLayout ?? DEFAULT_CHANNEL_LAYOUT,
          ...patch,
        }),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous)
        queryClient.setQueryData(queryOpts.queryKey, ctx.previous);
      toast.error(t("toasts.saveError"));
    },
    onSuccess: (result) => {
      if (result.success && result.data) {
        queryClient.setQueryData(queryOpts.queryKey, result.data);
        toast.success(t("toasts.saveSuccess"));
      } else {
        toast.error(t("toasts.saveError"));
      }
    },
  });

  const testMutation = useMutation({
    mutationFn: (type: NotificationTestType) => sendTestNotification(type),
    onSuccess: () => toast.success(t("toasts.testSuccess")),
    onError: () => toast.error(t("toasts.testError")),
  });

  return {
    settings,
    isLoading,
    save: (patch: Partial<NotificationSettingsPatch>) =>
      saveMutation.mutateAsync(patch),
    isSaving: saveMutation.isPending,
    sendTest: testMutation.mutate,
    isTesting: testMutation.isPending,
    testingType: testMutation.variables,
  };
}
