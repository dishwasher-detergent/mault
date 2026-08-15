import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { zodResolver } from "@hookform/resolvers/zod";
import type { FieldMeta, Game } from "@magic-vault/shared";
import { TFunction } from "i18next";
import { useEffect } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { DEFAULT_OPERATORS_BY_TYPE } from "../constants/field-operators";
import { GameFieldDefinitionsEditor } from "./game-field-definitions-editor";

function createGameFormSchema(t: TFunction<"games">) {
  const fieldMetaFormSchema = z.object({
    field: z.string().min(1, t("gameFormDialog.validation.required")),
    label: z.string().min(1, t("gameFormDialog.validation.required")),
    type: z.enum(["string", "numeric", "enum", "set"]),
    path: z.string().min(1, t("gameFormDialog.validation.required")),
    optionsText: z.string().optional(),
  });

  return z.object({
    key: z
      .string()
      .min(1, t("gameFormDialog.validation.required"))
      .regex(/^[a-z0-9-]+$/, t("gameFormDialog.validation.keyFormat")),
    name: z.string().min(1, t("gameFormDialog.validation.required")),
    dataSourceUrl: z
      .string()
      .min(1, t("gameFormDialog.validation.required"))
      .url(t("gameFormDialog.validation.invalidUrl")),
    isActive: z.boolean(),
    fieldDefinitions: z
      .array(fieldMetaFormSchema)
      .min(1, t("gameFormDialog.validation.minFields")),
  });
}

export type GameFormValues = z.infer<ReturnType<typeof createGameFormSchema>>;

function toFormValues(game?: Game | null): GameFormValues {
  if (!game) {
    return {
      key: "",
      name: "",
      dataSourceUrl: "",
      isActive: true,
      fieldDefinitions: [],
    };
  }
  return {
    key: game.key,
    name: game.name,
    dataSourceUrl: game.dataSourceUrl,
    isActive: game.isActive,
    fieldDefinitions: game.fieldDefinitions.map((f) => ({
      field: f.field,
      label: f.label,
      type: f.type,
      path: f.path,
      optionsText: f.options?.map((o) => o.value).join(", ") ?? "",
    })),
  };
}

export function toFieldDefinitions(
  values: GameFormValues["fieldDefinitions"],
): FieldMeta[] {
  return values.map((f) => {
    const options = f.optionsText
      ?.split(",")
      .map((v) => v.trim())
      .filter(Boolean)
      .map((v) => ({
        value: v,
        label: v.charAt(0).toUpperCase() + v.slice(1),
      }));

    return {
      field: f.field.trim(),
      label: f.label.trim(),
      type: f.type,
      path: f.path.trim(),
      operators: DEFAULT_OPERATORS_BY_TYPE[f.type],
      ...(options?.length ? { options } : {}),
    };
  });
}

interface GameFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  game?: Game | null;
  onSubmit: (values: GameFormValues) => Promise<void>;
}

export function GameFormDialog({
  open,
  onOpenChange,
  game,
  onSubmit,
}: GameFormDialogProps) {
  const { t } = useTranslation("games");
  const gameFormSchema = createGameFormSchema(t);
  const form = useForm<GameFormValues>({
    resolver: zodResolver(gameFormSchema),
    defaultValues: toFormValues(game),
  });
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  useEffect(() => {
    if (open) reset(toFormValues(game));
  }, [open, game, reset]);

  async function handleFormSubmit(values: GameFormValues) {
    await onSubmit(values);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <FormProvider {...form}>
          <form
            onSubmit={handleSubmit(handleFormSubmit)}
            className="flex flex-col min-h-0 flex-1 overflow-hidden"
          >
            <DialogHeader>
              <DialogTitle>
                {game
                  ? t("gameFormDialog.editTitle", { name: game.name })
                  : t("gameFormDialog.addTitle")}
              </DialogTitle>
              <DialogDescription>
                {t("gameFormDialog.description")}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 px-4 shrink-0">
              <div className="grid grid-cols-2 gap-3">
                <Field data-invalid={!!errors.key}>
                  <FieldLabel>{t("gameFormDialog.keyLabel")}</FieldLabel>
                  <Input
                    placeholder={t("gameFormDialog.keyPlaceholder")}
                    {...register("key")}
                    disabled={!!game}
                  />
                  <FieldError errors={[errors.key]} />
                </Field>
                <Field data-invalid={!!errors.name}>
                  <FieldLabel>{t("gameFormDialog.nameLabel")}</FieldLabel>
                  <Input
                    placeholder={t("gameFormDialog.namePlaceholder")}
                    {...register("name")}
                  />
                  <FieldError errors={[errors.name]} />
                </Field>
              </div>

              <Field data-invalid={!!errors.dataSourceUrl}>
                <FieldLabel>
                  {t("gameFormDialog.dataSourceUrlLabel")}
                </FieldLabel>
                <Input
                  placeholder={t("gameFormDialog.dataSourceUrlPlaceholder")}
                  {...register("dataSourceUrl")}
                />
                <FieldError errors={[errors.dataSourceUrl]} />
              </Field>

              <Field orientation="horizontal">
                <FieldLabel>{t("gameFormDialog.activeLabel")}</FieldLabel>
                <Controller
                  control={control}
                  name="isActive"
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </Field>
            </div>

            <ScrollArea className="flex-1 min-h-0 overflow-y-auto px-4 mt-4">
              <GameFieldDefinitionsEditor />
            </ScrollArea>

            <DialogFooter className="shrink-0 flex-row justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t("gameFormDialog.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? t("gameFormDialog.saving")
                  : game
                    ? t("gameFormDialog.saveChanges")
                    : t("gameFormDialog.createGame")}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
