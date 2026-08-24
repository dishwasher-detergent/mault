import { ChangeEmailForm } from "@/features/account/components/change-email-form";
import { ChangePasswordForm } from "@/features/account/components/change-password-form";
import { SessionsList } from "@/features/account/components/sessions-list";
import { UpdateNameForm } from "@/features/account/components/update-name-form";
import { useTranslation } from "react-i18next";

export default function AccountPage() {
  const { t } = useTranslation("account");

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 md:p-6">
        <div>
          <h1 className="font-heading text-lg font-semibold">{t("title")}</h1>
          <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
        </div>

        <div className="flex flex-col gap-4 rounded-lg border p-4">
          <h2 className="font-heading text-sm font-semibold">
            {t("profile.heading")}
          </h2>
          <UpdateNameForm />
        </div>

        <div className="flex flex-col gap-4 rounded-lg border p-4">
          <h2 className="font-heading text-sm font-semibold">
            {t("email.heading")}
          </h2>
          <ChangeEmailForm />
        </div>

        <div className="flex flex-col gap-4 rounded-lg border p-4">
          <h2 className="font-heading text-sm font-semibold">
            {t("password.heading")}
          </h2>
          <ChangePasswordForm />
        </div>

        <div className="flex flex-col gap-4 rounded-lg border p-4">
          <h2 className="font-heading text-sm font-semibold">
            {t("sessions.heading")}
          </h2>
          <SessionsList />
        </div>
      </div>
    </div>
  );
}
