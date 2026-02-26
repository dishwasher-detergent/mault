import { BinCard } from "./bin-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useBinConfigs } from "../api/use-bin-configs";
import { binsQueryOptions } from "../api/sort-bins";
import { ButtonGroup } from "../../../components/ui/button-group";
import { useQuery } from "@tanstack/react-query";

export function BinList() {
  const { configs, selectedBin, setSelectedBin, hasCatchAll } = useBinConfigs();
  const { isLoading } = useQuery(binsQueryOptions);

  if (isLoading) {
    return (
      <ScrollArea>
        <div className="flex flex-col rounded-lg overflow-hidden border">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-[52px] rounded-none border-b last:border-b-0"
            />
          ))}
        </div>
      </ScrollArea>
    );
  }

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
