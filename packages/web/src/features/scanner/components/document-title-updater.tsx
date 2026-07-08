import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { formatUsd } from "@/features/scanner/components/scan-stats";
import { computeStats } from "@/features/scanner/lib/compute-stats";
import { useEffect, useMemo, useState } from "react";

const BASE_TITLE = "MAULT";
const CYCLE_MS = 4000;
const PRICE_EVERY_N = 4;

export function DocumentTitleUpdater() {
  const { cards } = useScannedCards();
  const stats = useMemo(() => computeStats(cards), [cards]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!stats) return;
    const interval = setInterval(() => setTick((t) => t + 1), CYCLE_MS);
    return () => clearInterval(interval);
  }, [stats]);

  useEffect(() => {
    if (!stats) {
      document.title = BASE_TITLE;
      return;
    }

    const showPrice =
      stats.mostValuable && tick % PRICE_EVERY_N === PRICE_EVERY_N - 1;
    document.title =
      showPrice && stats.mostValuable
        ? `${formatUsd(stats.mostValuable.price)} · ${stats.mostValuable.name} — ${BASE_TITLE}`
        : `${stats.totalCount} card${stats.totalCount === 1 ? "" : "s"} scanned — ${BASE_TITLE}`;
  }, [stats, tick]);

  useEffect(
    () => () => {
      document.title = BASE_TITLE;
    },
    [],
  );

  return null;
}
