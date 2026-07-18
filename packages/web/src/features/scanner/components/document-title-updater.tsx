import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { useCollections } from "@/features/collections/api/use-collections";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { formatUsd } from "@/features/scanner/components/scan-stats";
import { computeStats } from "@/features/scanner/lib/compute-stats";
import { useEffect, useMemo, useState } from "react";

const BASE_TITLE = "MAULT";
const CYCLE_MS = 4000;

export function DocumentTitleUpdater() {
  const { cards } = useScannedCards();
  const { activeCollection } = useCollections();
  const { selectedSet } = useBinConfigs();
  const stats = useMemo(() => computeStats(cards), [cards]);

  const slides = useMemo(() => {
    const result: string[] = [];
    if (activeCollection) result.push(activeCollection.name);
    if (selectedSet) result.push(`Sorting: ${selectedSet.name}`);
    result.push(
      stats
        ? `${stats.totalCount} card${stats.totalCount === 1 ? "" : "s"} scanned`
        : "No cards scanned",
    );
    if (stats?.mostValuable) {
      result.push(
        `${formatUsd(stats.mostValuable.price)} · ${stats.mostValuable.name}`,
      );
    }
    return result;
  }, [activeCollection, selectedSet, stats]);

  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(
      () => setIndex((i) => (i + 1) % slides.length),
      CYCLE_MS,
    );
    return () => clearInterval(interval);
  }, [slides.length]);

  useEffect(() => {
    const slide = slides[index % slides.length];
    document.title = slide ? `${slide} - ${BASE_TITLE}` : BASE_TITLE;
  }, [slides, index]);

  useEffect(
    () => () => {
      document.title = BASE_TITLE;
    },
    [],
  );

  return null;
}
