"use client";

import { BIN_COUNT } from "@/constants/sort-bins.constant";
import { BinConfig, BinRuleGroup } from "@/interfaces/sort-bins.interface";
import {
  saveBinConfig as saveBinConfigAction,
  clearBinConfig as clearBinConfigAction,
  loadBinConfigs,
} from "@/lib/db/sort-bins";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useTransition,
} from "react";

function emptyRules(): BinRuleGroup {
  return { id: crypto.randomUUID(), combinator: "and", conditions: [] };
}

function createEmptyConfig(binNumber: number): BinConfig {
  return { binNumber, label: "", rules: emptyRules() };
}

function createEmptyConfigs(): BinConfig[] {
  return Array.from({ length: BIN_COUNT }, (_, i) => createEmptyConfig(i + 1));
}

interface BinConfigsContextValue {
  configs: BinConfig[];
  isPending: boolean;
  save: (binNumber: number, label: string, rules: BinRuleGroup) => void;
  clear: (binNumber: number) => void;
}

const BinConfigsContext = createContext<BinConfigsContextValue | null>(null);

export function BinConfigsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [configs, setConfigs] = useState<BinConfig[]>(createEmptyConfigs);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    loadBinConfigs().then((result) => {
      if (!cancelled && result.success && result.data) {
        setConfigs(() => {
          const filled: BinConfig[] = [];
          for (let i = 1; i <= BIN_COUNT; i++) {
            const existing = result.data!.find((c) => c.binNumber === i);
            filled.push(existing ?? createEmptyConfig(i));
          }
          return filled;
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

  return (
    <BinConfigsContext value={{ configs, isPending, save, clear }}>
      {children}
    </BinConfigsContext>
  );
}

export function useBinConfigs() {
  const context = useContext(BinConfigsContext);
  if (!context) {
    throw new Error(
      "useBinConfigs must be used within a BinConfigsProvider",
    );
  }
  return context;
}
