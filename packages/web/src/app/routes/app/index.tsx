import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { PresetSelector } from "@/features/bins/components/preset-selector";
import { CardGrid } from "@/features/cards/components/card-grid";
import { CollectionSwitcher } from "@/features/collections/components/collection-switcher";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { CardScanner } from "@/features/scanner/components/card-scanner";
import { ScanStats } from "@/features/scanner/components/scan-stats";
import { ScannerDebug } from "@/features/scanner/components/scanner-debug";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { IconCards } from "@tabler/icons-react";

function MobileScanner() {
  const { cards } = useScannedCards();

  return (
    <div className="flex-1 min-h-0 relative overflow-hidden">
      <div className="p-2 size-full bg-sidebar">
        <CardScanner className="size-full" />
      </div>
      <Drawer>
        <DrawerTrigger asChild>
          <button
            type="button"
            className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-background/90 backdrop-blur-sm border rounded-full px-4 py-2 text-sm font-medium shadow-lg"
          >
            <IconCards size={16} />
            {cards.length} {cards.length === 1 ? "card" : "cards"}
          </button>
        </DrawerTrigger>
        <DrawerContent>
          <div className="overflow-y-auto p-4 flex flex-col gap-4 max-h-[calc(80vh-2rem)]">
            <div className="flex flex-col gap-2">
              <CollectionSwitcher />
              <PresetSelector readOnly />
            </div>
            <ScannerDebug />
            <ScanStats />
            <div className="@container">
              <CardGrid />
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

export default function App() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileScanner />;
  }

  return (
    <div className="grid grid-cols-12 flex-1 min-h-0 overflow-hidden">
      <section className="col-span-5 md:col-span-5 lg:col-span-4 xl:col-span-3 2xl:col-span-2 overflow-hidden flex flex-col h-full p-2 border-r gap-2 bg-sidebar">
        <CollectionSwitcher />
        <PresetSelector readOnly />
        <CardScanner className="flex-none" />
        <ScannerDebug />
        <ScanStats />
      </section>
      <section className="col-span-7 md:col-span-7 lg:col-span-8 xl:col-span-9 2xl:col-span-10 overflow-y-auto h-full @container">
        <CardGrid />
      </section>
    </div>
  );
}
