import {
  orgSettingsQueryOptions,
  saveOrgSettings,
} from "@/features/companies/api/org-settings";
import { useOrg } from "@/features/companies/api/use-organization";
import { cn } from "@/lib/utils";
import { IconLayoutColumns, IconLayoutRows } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const OPTIONS = [
  {
    value: "horizontal" as const,
    label: "Horizontal",
    description: "Scanner in sidebar, cards on the right",
    icon: IconLayoutColumns,
  },
  {
    value: "vertical" as const,
    label: "Vertical",
    description: "Scanner on top, card grid below",
    icon: IconLayoutRows,
  },
];

export function ScannerLayoutToggle() {
  const { activeOrg } = useOrg();
  const queryClient = useQueryClient();
  const queryOpts = orgSettingsQueryOptions(activeOrg?.id);
  const { data } = useQuery(queryOpts);
  const current = data?.scannerLayout ?? "horizontal";

  const mutation = useMutation({
    mutationFn: (scannerLayout: "horizontal" | "vertical") =>
      saveOrgSettings({ scannerLayout }),
    onMutate: async (scannerLayout) => {
      await queryClient.cancelQueries({ queryKey: queryOpts.queryKey });
      const previous = queryClient.getQueryData(queryOpts.queryKey);
      queryClient.setQueryData(queryOpts.queryKey, (old: typeof data): typeof data => ({
        primaryColor: old?.primaryColor ?? null,
        scannerLayout,
        discordWebhookUrl: old?.discordWebhookUrl ?? null,
      }));
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
    <div className="flex gap-2">
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const isSelected = current === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => mutation.mutate(opt.value)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-lg border p-3 w-36 transition-all text-left",
              isSelected
                ? "border-primary bg-primary/5 text-foreground"
                : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
            )}
          >
            <Icon size={20} className={isSelected ? "text-primary" : ""} />
            <span className="text-xs font-medium">{opt.label}</span>
            <span className="text-[10px] leading-tight text-muted-foreground">
              {opt.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
