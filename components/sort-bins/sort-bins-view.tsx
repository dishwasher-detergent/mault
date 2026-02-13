"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useBinConfigs } from "@/hooks/use-bin-configs";
import { BinRuleGroup } from "@/interfaces/sort-bins.interface";
import { useCallback, useState } from "react";
import { BinCard } from "./bin-card";
import { BinConfigPanel } from "./bin-config-panel";
import { PresetSelector } from "./preset-selector";

export function SortBinsView() {
  const { configs, save, clear } = useBinConfigs();
  const [selectedBin, setSelectedBin] = useState<number>(1);

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

  const selectedConfig =
    configs.find((c) => c.binNumber === selectedBin) ?? configs[0];

  return (
    <div className="flex h-full">
      {/* Bins list – left side */}
      <div className="w-64 shrink-0 border-r flex flex-col">
        <div className="px-4 py-3 border-b">
          <h1 className="text-sm font-semibold">Sort Bins</h1>
          <p className="text-muted-foreground text-xs">
            Configure sorting rules for each bin.
          </p>
        </div>
        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-2 p-3">
            {configs.map((config) => (
              <BinCard
                key={config.binNumber}
                config={config}
                active={config.binNumber === selectedBin}
                onClick={() => setSelectedBin(config.binNumber)}
              />
            ))}
            <Separator className="my-1" />
            <PresetSelector />
          </div>
        </ScrollArea>
      </div>

      {/* Bin config – right side */}
      <div className="flex-1 min-w-0">
        <BinConfigPanel
          key={selectedConfig.binNumber}
          config={selectedConfig}
          onSave={handleSave}
          onClear={handleClear}
        />
      </div>
    </div>
  );
}
