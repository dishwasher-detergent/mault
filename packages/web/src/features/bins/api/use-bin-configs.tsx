import {
  BIN_COUNT,
  BinConfig,
  BinRuleGroup,
  BinSet,
} from "@magic-vault/shared";

import {
  activateSet as activateSetAction,
  binsQueryOptions,
  clearBinConfig as clearBinConfigAction,
  createSet as createSetAction,
  deleteSet as deleteSetAction,
  renameSet as renameSetAction,
  saveBinConfig as saveBinConfigAction,
  saveSet as saveSetAction,
} from "./sort-bins";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

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
  isActivating: boolean;
  isPresetMutating: boolean;
  hasCatchAll: boolean;
  selectedBin: number;
  selectedSet?: BinSet;
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

export function BinConfigsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const [selectedBin, setSelectedBin] = useState(1);

  const { data: sets = [] } = useQuery(binsQueryOptions);

  const selectedSet = useMemo(
    () => sets.find((s) => s.isActive) ?? sets[0],
    [sets],
  );

  const configs = useMemo(() => configsFromSet(selectedSet), [selectedSet]);

  const hasCatchAll = useMemo(
    () => configs.some((c) => c.isCatchAll),
    [configs],
  );

  const selectedConfig =
    configs.find((c) => c.binNumber === selectedBin) ?? configs[0];

  // --- Bin-level mutations ---

  const saveBinMutation = useMutation({
    mutationFn: saveBinConfigAction,
    onMutate: async ({ binNumber, rules, isCatchAll }) => {
      await queryClient.cancelQueries({ queryKey: ["bins"] });
      const previous = queryClient.getQueryData<BinSet[]>(["bins"]);
      queryClient.setQueryData<BinSet[]>(["bins"], (old = []) =>
        old.map((set) => {
          if (!set.isActive) return set;
          const idx = set.bins.findIndex((b) => b.binNumber === binNumber);
          const updated: BinConfig = {
            guid: idx >= 0 ? set.bins[idx].guid : crypto.randomUUID(),
            binNumber,
            rules: rules!,
            isCatchAll,
          };
          return {
            ...set,
            bins:
              idx >= 0
                ? set.bins.map((b, i) => (i === idx ? updated : b))
                : [...set.bins, updated],
          };
        }),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous)
        queryClient.setQueryData(["bins"], context.previous);
      toast.error("Failed to save bin config");
    },
    onSuccess: (result) => {
      if (!result.success) {
        queryClient.invalidateQueries({ queryKey: ["bins"] });
        return;
      }
      if (result.data) {
        const confirmed = result.data;
        queryClient.setQueryData<BinSet[]>(["bins"], (old = []) =>
          old.map((set) =>
            set.isActive
              ? {
                  ...set,
                  bins: set.bins.map((b) =>
                    b.binNumber === confirmed.binNumber ? confirmed : b,
                  ),
                }
              : set,
          ),
        );
      }
    },
  });

  const clearBinMutation = useMutation({
    mutationFn: clearBinConfigAction,
    onMutate: async (binNumber) => {
      await queryClient.cancelQueries({ queryKey: ["bins"] });
      const previous = queryClient.getQueryData<BinSet[]>(["bins"]);
      queryClient.setQueryData<BinSet[]>(["bins"], (old = []) =>
        old.map((set) =>
          set.isActive
            ? { ...set, bins: set.bins.filter((b) => b.binNumber !== binNumber) }
            : set,
        ),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous)
        queryClient.setQueryData(["bins"], context.previous);
      toast.error("Failed to clear bin config");
    },
  });

  // --- Set-level mutations ---

  const activateSetMutation = useMutation({
    mutationFn: activateSetAction,
    onSuccess: (result) => {
      if (result.success && result.data) {
        setSelectedBin(1);
        queryClient.setQueryData(["bins"], result.data);
      }
    },
    onError: () => toast.error("Failed to activate set"),
  });

  const createSetMutation = useMutation({
    mutationFn: createSetAction,
    onSuccess: (result) => {
      if (result.success && result.data) {
        setSelectedBin(1);
        queryClient.setQueryData(["bins"], result.data);
      }
    },
    onError: () => toast.error("Failed to create set"),
  });

  const saveSetMutation = useMutation({
    mutationFn: saveSetAction,
    onSuccess: (result) => {
      if (result.success && result.data) {
        queryClient.setQueryData(["bins"], result.data);
      }
    },
    onError: () => toast.error("Failed to save set"),
  });

  const renameSetMutation = useMutation({
    mutationFn: ({ guid, name }: { guid: string; name: string }) =>
      renameSetAction(guid, name),
    onSuccess: (result) => {
      if (result.success && result.data) {
        queryClient.setQueryData(["bins"], result.data);
      }
    },
    onError: () => toast.error("Failed to rename set"),
  });

  const deleteSetMutation = useMutation({
    mutationFn: deleteSetAction,
    onSuccess: (result) => {
      if (result.success && result.data) {
        setSelectedBin(1);
        queryClient.setQueryData(["bins"], result.data);
      }
    },
    onError: () => toast.error("Failed to delete set"),
  });

  const isPending = saveBinMutation.isPending || clearBinMutation.isPending;
  const isActivating = activateSetMutation.isPending;
  const isPresetMutating =
    activateSetMutation.isPending ||
    createSetMutation.isPending ||
    saveSetMutation.isPending ||
    renameSetMutation.isPending ||
    deleteSetMutation.isPending;

  const save = useCallback(
    (binNumber: number, rules: BinRuleGroup, isCatchAll?: boolean) => {
      saveBinMutation.mutate({ binNumber, rules, isCatchAll });
    },
    [saveBinMutation],
  );

  const clear = useCallback(
    (binNumber: number) => {
      clearBinMutation.mutate(binNumber);
    },
    [clearBinMutation],
  );

  const activateSetFn = useCallback(
    async (guid: string) => {
      await activateSetMutation.mutateAsync(guid);
    },
    [activateSetMutation],
  );

  const createSetFn = useCallback(
    async (name: string) => {
      await createSetMutation.mutateAsync(name);
    },
    [createSetMutation],
  );

  const saveSetFn = useCallback(
    async (name: string) => {
      await saveSetMutation.mutateAsync(name);
    },
    [saveSetMutation],
  );

  const renameSetFn = useCallback(
    async (guid: string, name: string) => {
      await renameSetMutation.mutateAsync({ guid, name });
    },
    [renameSetMutation],
  );

  const deleteSetFn = useCallback(
    async (guid: string) => {
      await deleteSetMutation.mutateAsync(guid);
    },
    [deleteSetMutation],
  );

  return (
    <BinConfigsContext
      value={{
        configs,
        sets,
        isPending,
        isActivating,
        isPresetMutating,
        hasCatchAll,
        selectedBin,
        setSelectedBin,
        selectedConfig,
        selectedSet,
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
