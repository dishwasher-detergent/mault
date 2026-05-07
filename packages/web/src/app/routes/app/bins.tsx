import { BinConfigPanel } from "@/features/bins/components/bin-config-panel";
import { BinList } from "@/features/bins/components/bin-list";
import { PresetSelector } from "@/features/bins/components/preset-selector";

export default function BinsPage() {
  return (
    <div className="flex flex-col md:grid md:grid-cols-12 flex-1 min-h-0 overflow-hidden">
      <section className="flex-1 min-h-0 md:flex-none md:col-span-4 lg:col-span-3 overflow-y-auto flex flex-col border-b md:border-b-0 md:border-r p-2 gap-2 bg-sidebar">
        <PresetSelector />
        <BinList />
      </section>
      <section className="flex-1 min-h-0 md:col-span-8 lg:col-span-9 overflow-y-auto @container p-4">
        <BinConfigPanel />
      </section>
    </div>
  );
}
