import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { BinConfigPanel } from "@/features/bins/components/bin-config-panel";
import { BinList } from "@/features/bins/components/bin-list";
import { PresetSelector } from "@/features/bins/components/preset-selector";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { IconLayoutGrid } from "@tabler/icons-react";

function MobileBins() {
  const { selectedBin } = useBinConfigs();

  return (
    <div className="flex-1 min-h-0 relative overflow-hidden">
      <div className="size-full overflow-y-auto @container p-4">
        <BinConfigPanel />
      </div>
      <Drawer>
        <DrawerTrigger asChild>
          <button
            type="button"
            className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-background/90 backdrop-blur-sm border rounded-full px-4 py-2 text-sm font-medium shadow-lg"
          >
            <IconLayoutGrid size={16} />
            Bin {selectedBin}
          </button>
        </DrawerTrigger>
        <DrawerContent>
          <div className="overflow-y-auto p-4 flex flex-col gap-4 max-h-[calc(80vh-2rem)]">
            <PresetSelector />
            <BinList />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

export default function BinsPage() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileBins />;
  }

  return (
    <div className="grid grid-cols-12 flex-1 min-h-0 overflow-hidden">
      <section className="col-span-4 lg:col-span-3 overflow-hidden flex flex-col h-full border-r p-2 gap-2 bg-sidebar/70">
        <PresetSelector />
        <BinList />
      </section>
      <section className="col-span-8 lg:col-span-9 overflow-y-auto max-h-full @container p-4">
        <BinConfigPanel />
      </section>
    </div>
  );
}
