import { CardGrid } from "@/components/card-grid";
import { CardScanner } from "@/components/card-scanner";
import { ScanStats } from "@/components/scan-stats";

export default function App() {
  return (
    <div className="grid grid-cols-12 flex-1 min-h-0 overflow-hidden">
      <section className="col-span-3 border-r flex flex-col overflow-hidden p-2">
        <CardScanner className="shrink-0 mb-2" />
        <div className="flex-1 overflow-y-auto min-h-0">
          <ScanStats />
        </div>
      </section>
      <section className="col-span-9 overflow-y-auto h-full">
        <CardGrid />
      </section>
    </div>
  );
}
