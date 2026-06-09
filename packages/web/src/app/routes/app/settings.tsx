import { PrimaryColorPicker } from "@/components/primary-color-picker";
import { OrgSettings } from "@/features/companies/components/org-settings";
import { DiscordWebhookSettings } from "@/features/notifications/components/discord-webhook-settings";

export default function SettingsPage() {
  return (
    <div className="flex flex-col p-4 md:p-6 max-w-4xl mx-auto w-full h-full overflow-y-auto gap-4">
      <div className="rounded-lg border p-4 flex flex-col gap-4">
        <h2 className="text-base font-semibold">Organizations</h2>
        <OrgSettings />
      </div>
      <div className="rounded-lg border p-4 flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold">Appearance</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Customize the app's accent color.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium">Primary color</p>
          <PrimaryColorPicker />
        </div>
      </div>
      <div className="rounded-lg border p-4 flex flex-col gap-4">
        <h2 className="text-base font-semibold">Notifications</h2>
        <DiscordWebhookSettings />
      </div>
    </div>
  );
}
