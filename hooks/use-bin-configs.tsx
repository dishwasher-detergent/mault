"use client";

import { BIN_COUNT } from "@/constants/sort-bins.constant";
import {
  BinConfig,
  BinPreset,
  BinRuleGroup,
} from "@/interfaces/sort-bins.interface";
import {
  clearBinConfig as clearBinConfigAction,
  loadBinConfigs,
  saveBinConfig as saveBinConfigAction,
} from "@/lib/db/sort-bins";
import {
  deletePreset as deletePresetAction,
  listPresets as listPresetsAction,
  loadPreset as loadPresetAction,
  savePreset as savePresetAction,
  updatePreset as updatePresetAction,
} from "@/lib/db/sort-bins/presets";
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
  presets: BinPreset[];
  isPending: boolean;
  selectedBin: number;
  setSelectedBin: (bin: number) => void;
  selectedConfig: BinConfig;
  save: (binNumber: number, label: string, rules: BinRuleGroup, isCatchAll?: boolean) => void;
  clear: (binNumber: number) => void;
  saveAsPreset: (name: string) => Promise<void>;
  updatePreset: (presetId: number, name: string) => Promise<void>;
  loadPreset: (presetId: number) => Promise<void>;
  deletePreset: (presetId: number) => Promise<void>;
  refreshPresets: () => Promise<void>;
}

const BinConfigsContext = createContext<BinConfigsContextValue | null>(null);

export function BinConfigsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [configs, setConfigs] = useState<BinConfig[]>(createEmptyConfigs);
  const [presets, setPresets] = useState<BinPreset[]>([]);
  const [isPending, startTransition] = useTransition();
  const [selectedBin, setSelectedBin] = useState(1);

  const selectedConfig =
    configs.find((c) => c.binNumber === selectedBin) ?? configs[0];

  const refreshPresets = useCallback(async () => {
    const result = await listPresetsAction();
    if (result.success && result.data) {
      setPresets(result.data);
    }
  }, []);

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
    refreshPresets();
    return () => {
      cancelled = true;
    };
  }, [refreshPresets]);

  const save = useCallback(
    (binNumber: number, label: string, rules: BinRuleGroup, isCatchAll?: boolean) => {
      setConfigs((prev) =>
        prev.map((c) =>
          c.binNumber === binNumber ? { ...c, label, rules, isCatchAll } : c,
        ),
      );

      startTransition(async () => {
        const result = await saveBinConfigAction({ binNumber, label, rules, isCatchAll });
        if (result.success && result.data) {
          setConfigs((prev) =>
            prev.map((c) => (c.binNumber === binNumber ? result.data! : c)),
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

  const saveAsPreset = useCallback(
    async (name: string) => {
      const result = await savePresetAction(name);
      if (result.success) {
        await refreshPresets();
      }
    },
    [refreshPresets],
  );

  const updatePresetFn = useCallback(
    async (presetId: number, name: string) => {
      const result = await updatePresetAction(presetId, name);
      if (result.success) {
        await refreshPresets();
      }
    },
    [refreshPresets],
  );

  const loadPresetFn = useCallback(async (presetId: number) => {
    const result = await loadPresetAction(presetId);
    if (result.success && result.data) {
      const filled: BinConfig[] = [];
      for (let i = 1; i <= BIN_COUNT; i++) {
        const existing = result.data.find((c) => c.binNumber === i);
        filled.push(existing ?? createEmptyConfig(i));
      }
      setConfigs(filled);
    }
  }, []);

  const deletePresetFn = useCallback(
    async (presetId: number) => {
      const result = await deletePresetAction(presetId);
      if (result.success) {
        await refreshPresets();
      }
    },
    [refreshPresets],
  );

  return (
    <BinConfigsContext
      value={{
        configs,
        presets,
        isPending,
        selectedBin,
        setSelectedBin,
        selectedConfig,
        save,
        clear,
        saveAsPreset,
        updatePreset: updatePresetFn,
        loadPreset: loadPresetFn,
        deletePreset: deletePresetFn,
        refreshPresets,
      }}
    >
      {children}
    </BinConfigsContext>
  );
}

export function useBinConfigs() {
  const context = useContext(BinConfigsContext);
  if (!context) {
    throw new Error("useBinConfigs must be used within a BinConfigsProvider");
  }
  return context;
}
