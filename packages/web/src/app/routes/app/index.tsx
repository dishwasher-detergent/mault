import { PresetSelector } from "@/features/bins/components/preset-selector";
import { CardGrid } from "@/features/cards/components/card-grid";
import { CardScanner } from "@/features/scanner/components/card-scanner";
import { ScanStats } from "@/features/scanner/components/scan-stats";

export default function App() {
  return (
    <div className="grid grid-cols-12 flex-1 min-h-0 overflow-hidden">
      <section className="col-span-5 md:col-span-5 lg:col-span-4 xl:col-span-3 2xl:col-span-2 3xl:col-span-1 overflow-hidden flex flex-col h-full p-4 border-r gap-2">
        <PresetSelector readOnly />
        <CardScanner className="flex-none" />
        <ScanStats />
      </section>
      <section className="col-span-7 md:col-span-7 lg:col-span-8 xl:col-span-9 2xl:col-span-10 3xl:col-span-11 overflow-y-auto h-full @container">
        <CardGrid />
      </section>
    </div>
  );
}
