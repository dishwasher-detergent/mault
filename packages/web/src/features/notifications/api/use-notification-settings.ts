import type { NotificationSettings } from "@magic-vault/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  type NotificationTestType,
  notificationSettingsQueryOptions,
  saveNotificationSettings,
  sendTestNotification,
} from "./notification-settings";

export function useNotificationSettings() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery(notificationSettingsQueryOptions);
  const settings = data?.data ?? { discordWebhookUrl: null };

  const saveMutation = useMutation({
    mutationFn: (s: NotificationSettings) => saveNotificationSettings(s),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.setQueryData(notificationSettingsQueryOptions.queryKey, result);
        toast.success("Notification settings saved.");
      } else {
        toast.error("Failed to save notification settings.");
      }
    },
    onError: () => toast.error("Failed to save notification settings."),
  });

  const testMutation = useMutation({
    mutationFn: (type: NotificationTestType) => sendTestNotification(type),
    onSuccess: () => toast.success("Test notification sent."),
    onError: () => toast.error("Failed to send test notification."),
  });

  return {
    settings,
    isLoading,
    save: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    sendTest: testMutation.mutate,
    isTesting: testMutation.isPending,
    testingType: testMutation.variables,
  };
}
