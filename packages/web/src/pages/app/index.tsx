import { PresetSelector } from "@/components/bins/preset-selector";
import { CardGrid } from "@/components/cards/card-grid";
import { CardScanner } from "@/components/scanner/card-scanner";
import { ScanStats } from "@/components/scanner/scan-stats";

export default function App() {
  return (
    <div className="grid grid-cols-12 flex-1 min-h-0 overflow-hidden p-4 gap-4">
      <section className="col-span-5 md:col-span-4 lg:col-span-3 overflow-hidden flex flex-col h-full">
        <div className="w-full overflow-hidden flex flex-col border rounded-lg p-2 bg-sidebar">
          <PresetSelector readOnly />
          <CardScanner className="flex-none mt-2" />
          <div className="overflow-y-auto min-h-0">
            <ScanStats />
          </div>
        </div>
      </section>
      <section className="col-span-7 md:col-span-8 lg:col-span-9 overflow-y-auto h-full @container">
        <CardGrid />
      </section>
    </div>
  );
}
