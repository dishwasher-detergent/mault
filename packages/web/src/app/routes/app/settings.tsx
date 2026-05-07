import { DiscordWebhookSettings } from "@/features/notifications/components/discord-webhook-settings";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6 p-4 overflow-y-auto">
      <div className="flex flex-col gap-2 max-w-lg">
        <h2 className="text-base font-semibold">Notifications</h2>
        <DiscordWebhookSettings />
      </div>
    </div>
  );
}
