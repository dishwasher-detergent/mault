import { CardGrid } from "@/components/card-grid";
import { CardScanner } from "@/components/card-scanner";
import { ScanStats } from "@/components/scan-stats";

export default function App() {
  return (
    <div className="grid grid-cols-12 flex-1 min-h-0 overflow-hidden p-4 gap-4">
      <section className="col-span-5 md:col-span-4 lg:col-span-3 overflow-hidden flex h-full">
        <div className="h-full w-full overflow-hidden flex flex-col border rounded-lg p-2 bg-sidebar">
          <CardScanner className="flex-none mb-2" />
          <div className="flex-1 overflow-y-auto min-h-0">
            <ScanStats />
          </div>
        </div>
      </section>
      <section className="col-span-7 md:col-span-8 lg:col-span-9 overflow-y-auto h-full">
        <CardGrid />
      </section>
    </div>
  );
}
