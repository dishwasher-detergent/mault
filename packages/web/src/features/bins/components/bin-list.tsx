import { BinCard } from "./bin-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBinConfigs } from "../api/use-bin-configs";
import { ButtonGroup } from "../../../components/ui/button-group";

export function BinList() {
  const { configs, selectedBin, setSelectedBin, hasCatchAll } = useBinConfigs();

  return (
    <div className="flex flex-col gap-2">
      <ScrollArea>
        <ButtonGroup orientation="vertical" className="w-full">
          {configs.map((config) => (
            <BinCard
              key={config.binNumber}
              config={config}
              active={config.binNumber === selectedBin}
              onClick={() => setSelectedBin(config.binNumber)}
            />
          ))}
        </ButtonGroup>
      </ScrollArea>
      {!hasCatchAll && (
        <p className="text-xs text-destructive">
          One bin must be set as catch-all.
        </p>
      )}
    </div>
  );
}
