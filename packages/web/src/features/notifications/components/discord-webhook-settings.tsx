import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IconBrandDiscord } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import type { NotificationTestType } from "../api/notification-settings";
import { useNotificationSettings } from "../api/use-notification-settings";

const TEST_TYPES: { type: NotificationTestType; label: string }[] = [
  { type: "sorter-error", label: "Sorter Error" },
  { type: "feeder-empty", label: "Feeder Empty" },
  { type: "card-jam", label: "Card Jam" },
  { type: "card-search-error", label: "Card Search Error" },
  { type: "sync-failure", label: "Sync Failure" },
];

export function DiscordWebhookSettings() {
  const {
    settings,
    isLoading,
    save,
    isSaving,
    sendTest,
    isTesting,
    testingType,
  } = useNotificationSettings();
  const [webhookUrl, setWebhookUrl] = useState("");

  useEffect(() => {
    setWebhookUrl(settings.discordWebhookUrl ?? "");
  }, [settings.discordWebhookUrl]);

  const isDirty = webhookUrl !== (settings.discordWebhookUrl ?? "");
  const canTest = !isDirty && !!webhookUrl && !isTesting && !isLoading;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <IconBrandDiscord className="size-4" />
        <Label>Discord Webhook</Label>
      </div>
      <p className="text-sm text-muted-foreground">
        Receive a notification when card sorting fails, the device reports an
        error (jams, empty feeder, connection issues), a card search errors,
        or the sync job crashes.
      </p>
      <div className="flex gap-2">
        <Input
          placeholder="https://discord.com/api/webhooks/..."
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          disabled={isLoading}
          className="flex-1"
        />
        <Button
          onClick={() => save({ discordWebhookUrl: webhookUrl || null })}
          disabled={!isDirty || isSaving || isLoading}
        >
          Save
        </Button>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">
          {isDirty
            ? "Save webhook URL to enable test notifications"
            : "Send a test notification"}
        </Label>
        <div className="flex flex-wrap gap-2">
          {TEST_TYPES.map(({ type, label }) => (
            <Button
              key={type}
              variant="outline"
              size="sm"
              onClick={() => sendTest(type)}
              disabled={!canTest}
            >
              {isTesting && testingType === type ? "Sending…" : label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
