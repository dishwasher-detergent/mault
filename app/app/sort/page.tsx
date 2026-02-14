import { BinConfigPanel } from "@/components/sort-bins/bin-config-panel";
import { BinList } from "@/components/sort-bins/bin-list";
import { PresetSelector } from "@/components/sort-bins/preset-selector";

export default function SortPage() {
  return (
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
