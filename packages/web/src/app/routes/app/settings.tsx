import { DiscordWebhookSettings } from "@/features/notifications/components/discord-webhook-settings";

export default function SettingsPage() {
  return (
    <div className="flex flex-col p-4 md:p-6 max-w-4xl mx-auto w-full h-full overflow-hidden">
      <div className="rounded-lg border p-4 flex flex-col gap-4">
        <h2 className="text-base font-semibold">Notifications</h2>
        <DiscordWebhookSettings />
      </div>
    </div>
  );
}
