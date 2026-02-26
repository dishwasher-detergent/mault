import { PresetSelector } from "@/features/bins/components/preset-selector";
import { CardGrid } from "@/features/cards/components/card-grid";
import { CardScanner } from "@/features/scanner/components/card-scanner";
import { ScanStats } from "@/features/scanner/components/scan-stats";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { IconCategory2, IconChartAreaLine } from "@tabler/icons-react";

export default function App() {
  const isMobile = useIsMobile();

  return isMobile ? (
    <div className="flex-1 relative overflow-y-auto flex flex-col p-4">
      <section className="w-full flex-1 mb-2">
        <CardScanner className="w-full h-full" />
      </section>
      <nav className="w-full flex items-center justify-center">
        <ButtonGroup>
          <DynamicDialog
            title="Statistics"
            trigger={
              <Button size="icon-lg">
                <IconChartAreaLine />
              </Button>
            }
          >
            <PresetSelector readOnly />
            <div className="overflow-y-auto min-h-0">
              <ScanStats />
            </div>
          </DynamicDialog>
          <DynamicDialog
            title="Scanned Cards"
            trigger={
              <Button size="icon-lg">
                <IconCategory2 />
              </Button>
            }
          >
            <div className="overflow-y-auto h-full">
              <CardGrid />
            </div>
          </DynamicDialog>
        </ButtonGroup>
      </nav>
    </div>
  ) : (
    <div className="grid grid-cols-12 flex-1 min-h-0 overflow-hidden p-4 gap-2">
      <section className="col-span-5 md:col-span-5 lg:col-span-4 xl:col-span-3 overflow-hidden flex flex-col h-full">
        <div className="w-full overflow-hidden flex flex-col border rounded-lg p-2 bg-sidebar">
          <PresetSelector readOnly />
          <CardScanner className="flex-none mt-2" />
          <div className="overflow-y-auto min-h-0">
            <ScanStats />
          </div>
        </div>
      </section>
      <section className="col-span-7 md:col-span-7 lg:col-span-8 xl:col-span-9 overflow-y-auto h-full @container">
        <div className="border rounded-lg bg-sidebar">
          <CardGrid />
        </div>
      </section>
    </div>
  );
}
