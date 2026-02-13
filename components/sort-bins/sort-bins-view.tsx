"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
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
    (binNumber: number, label: string, rules: BinRuleGroup, isCatchAll?: boolean) => {
      save(binNumber, label, rules, isCatchAll);
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
    <div className="grid grid-cols-12 h-full w-full">
      <div className="col-span-3 border-r flex flex-col h-full">
        <div className="px-4 py-2">
          <h1 className="font-semibold">Sort Bins</h1>
          <p className="text-muted-foreground text-sm">
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
          </div>
        </ScrollArea>
        <div className="p-2 pb-4 border-t">
          <PresetSelector />
        </div>
      </div>
      <div className="col-span-9">
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
