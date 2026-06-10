import {
  orgSettingsQueryOptions,
  saveOrgSettings,
} from "@/features/companies/api/org-settings";
import { useOrg } from "@/features/companies/api/use-organization";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { NotificationTestType } from "./notification-settings";
import { sendTestNotification } from "./notification-settings";

export function useNotificationSettings() {
  const queryClient = useQueryClient();
  const { activeOrg } = useOrg();
  const queryOpts = orgSettingsQueryOptions(activeOrg?.id);

  const { data, isLoading } = useQuery(queryOpts);
  const settings = { discordWebhookUrl: data?.discordWebhookUrl ?? null };

  const saveMutation = useMutation({
    mutationFn: (discordWebhookUrl: string | null) =>
      saveOrgSettings({ discordWebhookUrl }),
    onMutate: async (discordWebhookUrl) => {
      await queryClient.cancelQueries({ queryKey: queryOpts.queryKey });
      const previous = queryClient.getQueryData(queryOpts.queryKey);
      queryClient.setQueryData(queryOpts.queryKey, (old: typeof data): typeof data => ({
        primaryColor: old?.primaryColor ?? null,
        scannerLayout: old?.scannerLayout ?? "horizontal",
        discordWebhookUrl,
      }));
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(queryOpts.queryKey, ctx.previous);
      toast.error("Failed to save notification settings.");
    },
    onSuccess: (result) => {
      if (result.success && result.data) {
        queryClient.setQueryData(queryOpts.queryKey, result.data);
        toast.success("Notification settings saved.");
      } else {
        toast.error("Failed to save notification settings.");
      }
    },
  });

  const testMutation = useMutation({
    mutationFn: (type: NotificationTestType) => sendTestNotification(type),
    onSuccess: () => toast.success("Test notification sent."),
    onError: () => toast.error("Failed to send test notification."),
  });

  return {
    settings,
    isLoading,
    save: (s: { discordWebhookUrl: string | null }) =>
      saveMutation.mutateAsync(s.discordWebhookUrl),
    isSaving: saveMutation.isPending,
    sendTest: testMutation.mutate,
    isTesting: testMutation.isPending,
    testingType: testMutation.variables,
  };
}
