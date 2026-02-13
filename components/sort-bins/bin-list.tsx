"use client";

import { BinCard } from "@/components/sort-bins/bin-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBinConfigs } from "@/hooks/use-bin-configs";

export function BinList() {
  const { configs, selectedBin, setSelectedBin } = useBinConfigs();

  return (
    <ScrollArea>
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
  );
}
