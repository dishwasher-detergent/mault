import {
  orgSettingsQueryOptions,
  saveOrgSettings,
} from "@/features/companies/api/org-settings";
import { useOrg } from "@/features/companies/api/use-organization";
import { cn } from "@/lib/utils";
import {
  DEFAULT_CAPTURE_SETTLE_DELAY_MS,
  DEFAULT_CHANNEL_LAYOUT,
  DEFAULT_MODULE_COUNT,
  DEFAULT_SCAN_REGION,
  maxModulesForLayout,
  type ChannelLayout,
} from "@magic-vault/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export function ChannelLayoutToggle() {
  const { t } = useTranslation("calibration");
  const { activeOrg } = useOrg();

  const OPTIONS: {
    value: ChannelLayout;
    label: string;
    description: string;
  }[] = [
    {
      value: "standard",
      label: t("channelLayoutToggle.standard"),
      description: t("channelLayoutToggle.standardDescription"),
    },
    {
      value: "legacy",
      label: t("channelLayoutToggle.legacy"),
      description: t("channelLayoutToggle.legacyDescription"),
    },
  ];

  const queryClient = useQueryClient();
  const queryOpts = orgSettingsQueryOptions(activeOrg?.id);
  const { data } = useQuery(queryOpts);
  const current = data?.channelLayout ?? DEFAULT_CHANNEL_LAYOUT;

  const mutation = useMutation({
    mutationFn: (channelLayout: ChannelLayout) =>
      saveOrgSettings({
        channelLayout,
        moduleCount: Math.min(
          data?.moduleCount ?? DEFAULT_MODULE_COUNT,
          maxModulesForLayout(channelLayout),
        ),
      }),
    onMutate: async (channelLayout) => {
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
          channelLayout,
          moduleCount: Math.min(
            old?.moduleCount ?? DEFAULT_MODULE_COUNT,
            maxModulesForLayout(channelLayout),
          ),
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
    },
  });

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        {OPTIONS.map((opt) => {
          const isSelected = current === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => mutation.mutate(opt.value)}
              className={cn(
                "flex flex-col items-start gap-0.5 rounded-lg border p-3 flex-1 transition-all text-left",
                isSelected
                  ? "border-primary bg-primary/5 text-foreground"
                  : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
              )}
            >
              <span className="text-xs font-medium">{opt.label}</span>
              <span className="text-[10px] leading-tight text-muted-foreground">
                {opt.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
