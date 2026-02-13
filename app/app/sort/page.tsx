import { SortBinsView } from "@/components/sort-bins/sort-bins-view";
import { loadBinConfigs } from "@/lib/db/sort-bins";

export default async function SortPage() {
  const result = await loadBinConfigs();
  const configs = result.success && result.data ? result.data : [];

  return <SortBinsView initialConfigs={configs} />;
}
