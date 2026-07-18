import { apiGet, apiPost, apiPut } from "@/lib/api/client";
import type {
  NotificationSettings,
  Response,
  Result,
  SerialEventReport,
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

export type NotificationTestType =
  | "sorter-error"
  | "feeder-empty"
  | "card-jam"
  | "card-search-error"
  | "sync-failure";

export async function sendTestNotification(
  type: NotificationTestType,
): Promise<Response> {
  return apiPost<Response>("/api/notifications/test", { type });
}

// Reports the raw command/response pair from a serial exchange as-is. The
// backend decides whether it's notification-worthy and what it says - this
// function never interprets the outcome.
export async function reportSerialEvent(
  event: SerialEventReport,
): Promise<void> {
  await apiPost("/api/notifications/serial-event", event).catch(() => {});
}

export const notificationSettingsQueryOptions = queryOptions({
  queryKey: ["notification-settings"],
  queryFn: getNotificationSettings,
});
