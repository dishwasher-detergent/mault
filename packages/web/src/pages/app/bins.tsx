import { BinConfigPanel } from "@/components/bins/bin-config-panel";
import { BinList } from "@/components/bins/bin-list";
import { PresetSelector } from "@/components/bins/preset-selector";
import { Button } from "@/components/ui/button";
import { DynamicPopover } from "@/components/ui/responsive-popover";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { IconMenu } from "@tabler/icons-react";

export default function BinsPage() {
  const isMobile = useIsMobile();

  return isMobile ? (
    <div className="h-full w-full relative overflow-y-auto">
      <nav className="sticky top-0 backdrop-blur-2xl bg-background/50 z-10 px-4 py-2">
        <DynamicPopover
          trigger={
            <Button size="icon-sm" variant="ghost">
              <IconMenu />
            </Button>
          }
        >
          <div className="overflow-y-auto min-h-0 mb-2">
            <PresetSelector />
          </div>
          <BinList />
        </DynamicPopover>
      </nav>
      <section className="w-full p-4">
        <BinConfigPanel />
      </section>
    </div>
  ) : (
    <div className="grid grid-cols-12 flex-1 min-h-0 overflow-hidden p-4 gap-4">
      <section className="col-span-5 md:col-span-4 lg:col-span-3 overflow-hidden flex flex-col h-full">
        <div className="w-full overflow-hidden flex flex-col border rounded-lg p-2 bg-sidebar">
          <div className="overflow-y-auto min-h-0 mb-2">
            <PresetSelector />
          </div>
          <BinList />
        </div>
      </section>
      <section className="col-span-7 md:col-span-8 lg:col-span-9 overflow-y-auto h-full @container">
        <BinConfigPanel />
      </section>
    </div>
  );
}
