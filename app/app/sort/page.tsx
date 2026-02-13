import { BinConfigPanel } from "@/components/sort-bins/bin-config-panel";
import { BinList } from "@/components/sort-bins/bin-list";
import { PresetSelector } from "@/components/sort-bins/preset-selector";

export default function SortPage() {
  return (
    <div className="grid grid-cols-12 h-full w-full">
      <div className="col-span-3 border-r flex flex-col h-full">
        <div className="px-4 py-2">
          <h1 className="font-semibold">Sort Bins</h1>
          <p className="text-muted-foreground text-sm">
            Configure sorting rules for each bin.
          </p>
        </div>
        <div className="flex flex-col flex-1">
          <BinList />
          <div className="p-2 pb-4 border-t">
            <PresetSelector />
          </div>
        </div>
      </div>
      <div className="col-span-9">
        <BinConfigPanel />
      </div>
    </div>
  );
}
