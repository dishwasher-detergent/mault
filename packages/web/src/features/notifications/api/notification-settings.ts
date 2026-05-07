import { apiGet, apiPost, apiPut } from "@/lib/api/client";
import type {
  NotificationSettings,
  Response,
  Result,
} from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

export async function getNotificationSettings(): Promise<
  Result<NotificationSettings>
> {
  return apiGet<Result<NotificationSettings>>("/api/notifications");
}

export async function saveNotificationSettings(
  settings: NotificationSettings,
): Promise<Result<NotificationSettings>> {
  return apiPut<Result<NotificationSettings>>("/api/notifications", settings);
}

export type NotificationTestType = "sort-error" | "card-search-error" | "sync-failure";

export async function sendTestNotification(type: NotificationTestType): Promise<Response> {
  return apiPost<Response>("/api/notifications/test", { type });
}

export async function reportSortError(
  cardName: string,
  binNumber: number,
  error: string,
): Promise<void> {
  await apiPost("/api/notifications/sort-error", {
    cardName,
    binNumber,
    error,
  }).catch(() => {});
}

export const notificationSettingsQueryOptions = queryOptions({
  queryKey: ["notification-settings"],
  queryFn: getNotificationSettings,
});
