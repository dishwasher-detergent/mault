import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { neon } from "@/lib/auth/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconBuilding, IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";
import { useOrg } from "../api/use-organization";

const createSchema = z.object({ name: z.string().min(1) });
type CreateValues = z.infer<typeof createSchema>;

export function OrgPickerModal() {
  const { t } = useTranslation("companies");
  const [showCreate, setShowCreate] = useState(false);
  const { orgs, activeOrg, isLoading, setActiveOrg } = useOrg();

  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "" },
  });

  async function handlePick(id: string) {
    await setActiveOrg(id);
  }

  async function handleCreate({ name }: CreateValues) {
    const slug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    try {
      const { data, error } = await neon.auth.organization.create({
        name: name.trim(),
        slug,
      });
      if (error) throw new Error(error.message);
      if (data) await handlePick(data.id);
      form.reset();
      setShowCreate(false);
    } catch (e: unknown) {
      toast.error(
        e instanceof Error ? e.message : t("orgPickerModal.failedToCreate"),
      );
    }
  }

  return (
    <DynamicDialog
      open={!isLoading && !activeOrg}
      dismissible={false}
      title={t("orgPickerModal.title")}
      description={
        orgs.length === 0
          ? t("orgPickerModal.createToGetStarted")
          : t("orgPickerModal.selectOrCreate")
      }
    >
      <div className="flex flex-col gap-2">
        {orgs.map((org) => (
          <Button
            key={org.id}
            variant="outline"
            className="justify-start"
            onClick={() => handlePick(org.id)}
          >
            <IconBuilding size={14} />
            {org.name}
          </Button>
        ))}

        {!showCreate ? (
          <Button
            variant="ghost"
            className="justify-start"
            onClick={() => setShowCreate(true)}
          >
            <IconPlus size={14} />
            {t("orgPickerModal.newOrganization")}
          </Button>
        ) : (
          <form
            onSubmit={form.handleSubmit(handleCreate)}
            className="flex gap-2"
          >
            <Input
              placeholder={t("orgPickerModal.organizationNamePlaceholder")}
              {...form.register("name")}
              autoFocus
            />
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting
                ? t("orgPickerModal.creating")
                : t("orgPickerModal.create")}
            </Button>
          </form>
        )}
      </div>
    </DynamicDialog>
  );
}
