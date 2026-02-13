"use client";

import { useCallback, useState, useTransition } from "react";
import { BIN_COUNT } from "@/constants/sort-bins.constant";
import { BinConfig, BinRuleGroup } from "@/interfaces/sort-bins.interface";
import {
  saveBinConfig as saveBinConfigAction,
  clearBinConfig as clearBinConfigAction,
} from "@/lib/db/sort-bins";

function emptyRules(): BinRuleGroup {
  return { id: crypto.randomUUID(), combinator: "and", conditions: [] };
}

function createEmptyConfig(binNumber: number): BinConfig {
  return { binNumber, label: "", rules: emptyRules() };
}

export function useBinConfigs(initialConfigs: BinConfig[]) {
  const [configs, setConfigs] = useState<BinConfig[]>(() => {
    const filled: BinConfig[] = [];
    for (let i = 1; i <= BIN_COUNT; i++) {
      const existing = initialConfigs.find((c) => c.binNumber === i);
      filled.push(existing ?? createEmptyConfig(i));
    }
    return filled;
  });

  const [isPending, startTransition] = useTransition();

  const save = useCallback(
    (binNumber: number, label: string, rules: BinRuleGroup) => {
      setConfigs((prev) =>
        prev.map((c) =>
          c.binNumber === binNumber ? { ...c, label, rules } : c,
        ),
      );

      startTransition(async () => {
        const result = await saveBinConfigAction({ binNumber, label, rules });
        if (result.success && result.data) {
          setConfigs((prev) =>
            prev.map((c) =>
              c.binNumber === binNumber ? result.data! : c,
            ),
          );
        }
      });
    },
    [],
  );

  const clear = useCallback((binNumber: number) => {
    setConfigs((prev) =>
      prev.map((c) =>
        c.binNumber === binNumber ? createEmptyConfig(binNumber) : c,
      ),
    );

    startTransition(async () => {
      await clearBinConfigAction(binNumber);
    });
  }, []);

  return { configs, save, clear, isPending };
}
