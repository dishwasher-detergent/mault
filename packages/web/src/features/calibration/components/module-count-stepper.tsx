import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  orgSettingsQueryOptions,
  saveOrgSettings,
} from "@/features/companies/api/org-settings";
import { useOrg } from "@/features/companies/api/use-organization";
import {
  DEFAULT_CAPTURE_SETTLE_DELAY_MS,
  DEFAULT_CHANNEL_LAYOUT,
  DEFAULT_MODULE_COUNT,
  DEFAULT_SCAN_REGION,
  maxModulesForLayout,
} from "@magic-vault/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export function ModuleCountStepper() {
  const { t } = useTranslation("calibration");
  const { activeOrg } = useOrg();
  const queryClient = useQueryClient();
  const queryOpts = orgSettingsQueryOptions(activeOrg?.id);
  const { data } = useQuery(queryOpts);
  const current = data?.moduleCount ?? DEFAULT_MODULE_COUNT;
  const channelLayout = data?.channelLayout ?? DEFAULT_CHANNEL_LAYOUT;
  const maxModules = maxModulesForLayout(channelLayout);
  const moduleCountOptions = Array.from({ length: maxModules }, (_, i) => i + 1);

  const mutation = useMutation({
    mutationFn: (moduleCount: number) => saveOrgSettings({ moduleCount }),
    onMutate: async (moduleCount) => {
      await queryClient.cancelQueries({ queryKey: queryOpts.queryKey });
      const previous = queryClient.getQueryData(queryOpts.queryKey);
      queryClient.setQueryData(
        queryOpts.queryKey,
        (old: typeof data): typeof data => ({
          primaryColor: old?.primaryColor ?? null,
          scannerLayout: old?.scannerLayout ?? "horizontal",
          discordWebhookUrl: old?.discordWebhookUrl ?? null,
          discordNotifyOnScan: old?.discordNotifyOnScan ?? false,
          scanRegion: old?.scanRegion ?? DEFAULT_SCAN_REGION,
          captureSettleDelayMs:
            old?.captureSettleDelayMs ?? DEFAULT_CAPTURE_SETTLE_DELAY_MS,
          channelLayout: old?.channelLayout ?? DEFAULT_CHANNEL_LAYOUT,
          moduleCount,
        }),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous)
        queryClient.setQueryData(queryOpts.queryKey, ctx.previous);
    },
    onSuccess: (result) => {
      if (result.success && result.data)
        queryClient.setQueryData(queryOpts.queryKey, result.data);
      queryClient.invalidateQueries({ queryKey: ["modules"] });
    },
  });

  return (
    <div className="flex flex-col gap-1.5">
      <Select
        value={String(current)}
        onValueChange={(value) => mutation.mutate(Number(value))}
      >
        <SelectTrigger className="w-40">
          <SelectValue>
            {t("moduleCountStepper.value", { count: current })}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {moduleCountOptions.map((n) => (
            <SelectItem key={n} value={String(n)}>
              {t("moduleCountStepper.value", { count: n })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-[10px] leading-tight text-muted-foreground">
        {t("moduleCountStepper.description")}
      </p>
    </div>
  );
}
