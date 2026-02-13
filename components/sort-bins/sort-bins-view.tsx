"use client";

import { useCallback, useState } from "react";
import { BinConfig, BinRuleGroup } from "@/interfaces/sort-bins.interface";
import { useBinConfigs } from "@/hooks/use-bin-configs";
import { BinCard } from "./bin-card";
import { BinConfigDialog } from "./bin-config-dialog";

interface SortBinsViewProps {
  initialConfigs: BinConfig[];
}

export function SortBinsView({ initialConfigs }: SortBinsViewProps) {
  const { configs, save, clear } = useBinConfigs(initialConfigs);
  const [openBin, setOpenBin] = useState<number | null>(null);

  const handleSave = useCallback(
    (binNumber: number, label: string, rules: BinRuleGroup) => {
      save(binNumber, label, rules);
    },
    [save],
  );

  const handleClear = useCallback(
    (binNumber: number) => {
      clear(binNumber);
    },
    [clear],
  );

  const openConfig = openBin
    ? configs.find((c) => c.binNumber === openBin) ?? null
    : null;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h1 className="text-sm font-semibold">Sort Bins</h1>
        <p className="text-muted-foreground text-xs">
          Configure sorting rules for each bin. Cards matching a bin&apos;s
          rules will be sorted into that bin.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {configs.map((config) => (
          <BinCard
            key={config.binNumber}
            config={config}
            onClick={() => setOpenBin(config.binNumber)}
          />
        ))}
      </div>

      <BinConfigDialog
        config={openConfig}
        open={openBin !== null}
        onOpenChange={(open) => {
          if (!open) setOpenBin(null);
        }}
        onSave={handleSave}
        onClear={handleClear}
      />
    </div>
  );
}
