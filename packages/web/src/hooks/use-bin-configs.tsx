import { BIN_COUNT, BinConfig, BinRuleGroup, BinSet } from "@magic-vault/shared";

import {
  activateSet as activateSetAction,
  clearBinConfig as clearBinConfigAction,
  createSet as createSetAction,
  deleteSet as deleteSetAction,
  loadSets,
  renameSet as renameSetAction,
  saveBinConfig as saveBinConfigAction,
  saveSet as saveSetAction,
} from "@/lib/api-sort-bins";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

function emptyRules(): BinRuleGroup {
  return { id: crypto.randomUUID(), combinator: "and", conditions: [] };
}

function createEmptyConfig(binNumber: number): BinConfig {
  return { guid: crypto.randomUUID(), binNumber, rules: emptyRules() };
}

function configsFromSet(set: BinSet | undefined): BinConfig[] {
  const filled: BinConfig[] = [];
  for (let i = 1; i <= BIN_COUNT; i++) {
    const existing = set?.bins.find((c) => c.binNumber === i);
    filled.push(existing ?? createEmptyConfig(i));
  }
  return filled;
}

interface BinConfigsContextValue {
  configs: BinConfig[];
  sets: BinSet[];
  isPending: boolean;
  hasCatchAll: boolean;
  selectedBin: number;
  setSelectedBin: (bin: number) => void;
  selectedConfig: BinConfig;
  save: (binNumber: number, rules: BinRuleGroup, isCatchAll?: boolean) => void;
  clear: (binNumber: number) => void;
  activateSet: (guid: string) => Promise<void>;
  createSet: (name: string) => Promise<void>;
  saveSet: (name: string) => Promise<void>;
  renameSet: (guid: string, name: string) => Promise<void>;
  deleteSet: (guid: string) => Promise<void>;
}

const BinConfigsContext = createContext<BinConfigsContextValue | null>(null);

function applySets(
  sets: BinSet[],
  setSets: (s: BinSet[]) => void,
  setConfigs: (c: BinConfig[]) => void,
) {
  setSets(sets);
  const active = sets.find((s) => s.isActive);
  setConfigs(configsFromSet(active));
}

export function BinConfigsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [configs, setConfigs] = useState<BinConfig[]>(() => configsFromSet(undefined));
  const [sets, setSets] = useState<BinSet[]>([]);
  const [isPending, startTransition] = useTransition();
  const [selectedBin, setSelectedBin] = useState(1);

  const selectedConfig =
    configs.find((c) => c.binNumber === selectedBin) ?? configs[0];

  const hasCatchAll = useMemo(() => configs.some((c) => c.isCatchAll), [configs]);

  useEffect(() => {
    let cancelled = false;
    loadSets().then((result) => {
      if (!cancelled && result.success && result.data) {
        applySets(result.data, setSets, setConfigs);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = useCallback(
    (binNumber: number, rules: BinRuleGroup, isCatchAll?: boolean) => {
      setConfigs((prev) =>
        prev.map((c) =>
          c.binNumber === binNumber ? { ...c, rules, isCatchAll } : c,
        ),
      );

      startTransition(async () => {
        const result = await saveBinConfigAction({
          binNumber,
          rules,
          isCatchAll,
        });
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

  const activateSetFn = useCallback(async (guid: string) => {
    const result = await activateSetAction(guid);
    if (result.success && result.data) {
      setSelectedBin(1);
      applySets(result.data, setSets, setConfigs);
    }
  }, []);

  const createSetFn = useCallback(async (name: string) => {
    const result = await createSetAction(name);
    if (result.success && result.data) {
      setSelectedBin(1);
      applySets(result.data, setSets, setConfigs);
    }
  }, []);

  const saveSetFn = useCallback(async (name: string) => {
    const result = await saveSetAction(name);
    if (result.success && result.data) {
      applySets(result.data, setSets, setConfigs);
    }
  }, []);

  const renameSetFn = useCallback(async (guid: string, name: string) => {
    const result = await renameSetAction(guid, name);
    if (result.success && result.data) {
      applySets(result.data, setSets, setConfigs);
    }
  }, []);

  const deleteSetFn = useCallback(async (guid: string) => {
    const result = await deleteSetAction(guid);
    if (result.success && result.data) {
      setSelectedBin(1);
      applySets(result.data, setSets, setConfigs);
    }
  }, []);

  return (
    <BinConfigsContext
      value={{
        configs,
        sets,
        isPending,
        hasCatchAll,
        selectedBin,
        setSelectedBin,
        selectedConfig,
        save,
        clear,
        activateSet: activateSetFn,
        createSet: createSetFn,
        saveSet: saveSetFn,
        renameSet: renameSetFn,
        deleteSet: deleteSetFn,
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
