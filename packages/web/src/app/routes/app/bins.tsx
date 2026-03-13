import { BinConfigPanel } from "@/features/bins/components/bin-config-panel";
import { BinList } from "@/features/bins/components/bin-list";
import { PresetSelector } from "@/features/bins/components/preset-selector";

export default function BinsPage() {
  return (
    <div className="grid grid-cols-12 flex-1 min-h-0 overflow-hidden">
      <section className="col-span-5 md:col-span-4 lg:col-span-3 overflow-hidden flex flex-col h-full border-r p-4 gap-2">
        <PresetSelector />
        <BinList />
      </section>
      <section className="col-span-7 md:col-span-8 lg:col-span-9 overflow-y-auto max-h-full @container p-4">
        <BinConfigPanel />
      </section>
    </div>
  );
}
