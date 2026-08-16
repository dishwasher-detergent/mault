import { LanguageSwitcher } from "@/components/language-switcher";
import { PrimaryColorPicker } from "@/components/primary-color-picker";
import { ScannerLayoutToggle } from "@/components/scanner-layout-toggle";
import { OrgSettings } from "@/features/companies/components/org-settings";
import { DiscordWebhookSettings } from "@/features/notifications/components/discord-webhook-settings";
import { useTranslation } from "react-i18next";

export default function SettingsPage() {
  const { t } = useTranslation("settings");

  return (
    <div className="flex flex-col p-4 md:p-6 max-w-4xl mx-auto w-full h-full overflow-y-auto gap-4">
      <div>
        <h1 className="text-lg font-semibold font-heading">{t("title")}</h1>
        <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
      </div>
      <div className="rounded-lg border p-4 flex flex-col gap-4">
        <h2 className="text-sm font-semibold font-heading">
          {t("organizations.heading")}
        </h2>
        <OrgSettings />
      </div>
      <div className="rounded-lg border p-4 flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold font-heading">
            {t("appearance.heading")}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("appearance.description")}
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium">{t("appearance.primaryColor")}</p>
          <PrimaryColorPicker />
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium">{t("appearance.scannerLayout")}</p>
          <ScannerLayoutToggle />
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium">{t("appearance.language")}</p>
          <LanguageSwitcher />
        </div>
      </div>
      <div className="rounded-lg border p-4 flex flex-col gap-4">
        <h2 className="text-sm font-semibold font-heading">
          {t("notifications.heading")}
        </h2>
        <DiscordWebhookSettings />
      </div>
    </div>
  );
}
