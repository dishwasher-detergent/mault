import {
  modulesQueryOptions,
  saveModuleConfig,
} from "@/features/calibration/api/module-configs";
import { useSerial } from "@/features/scanner/api/use-serial";
import {
  DEFAULT_CALIBRATION,
  ModuleConfig,
  ServoCalibration,
} from "@magic-vault/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import { toast } from "sonner";
import type { ModuleConfigsContextValue } from "../types";

const ModuleConfigsContext = createContext<ModuleConfigsContextValue | null>(
  null,
);

function defaultConfigs(): ModuleConfig[] {
  return ([1, 2, 3] as const).map((n) => ({
    moduleNumber: n,
    calibration: { ...DEFAULT_CALIBRATION },
  }));
}

export function ModuleConfigsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const { isReady, sendCommand } = useSerial();

  const { data: configs = defaultConfigs() } = useQuery(modulesQueryOptions);

  const configsRef = useRef(configs);
  useEffect(() => {
    configsRef.current = configs;
  }, [configs]);

  useEffect(() => {
    if (!isReady) return;
    (async () => {
      for (const config of configsRef.current) {
        await sendCommand(
          JSON.stringify({
            setConfig: { module: config.moduleNumber, ...config.calibration },
          }),
        );
      }
    })();
  }, [isReady, sendCommand]);

  const saveConfigMutation = useMutation({
    mutationFn: ({
      moduleNumber,
      calibration,
    }: {
      moduleNumber: 1 | 2 | 3;
      calibration: ServoCalibration;
    }) => saveModuleConfig(moduleNumber, calibration),
    onMutate: async ({ moduleNumber, calibration }) => {
      await queryClient.cancelQueries({ queryKey: ["modules"] });
      const previous = queryClient.getQueryData<ModuleConfig[]>(["modules"]);
      queryClient.setQueryData<ModuleConfig[]>(
        ["modules"],
        (old = defaultConfigs()) =>
          old.map((c) =>
            c.moduleNumber === moduleNumber ? { ...c, calibration } : c,
          ),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous)
        queryClient.setQueryData(["modules"], context.previous);
      toast.error("Failed to save module config");
    },
    onSuccess: (result, { moduleNumber, calibration }) => {
      if (result.success && result.data) {
        queryClient.setQueryData(["modules"], result.data);
      }
      sendCommand(
        JSON.stringify({ setConfig: { module: moduleNumber, ...calibration } }),
      );
    },
  });

  const saveConfig = useCallback(
    async (moduleNumber: 1 | 2 | 3, calibration: ServoCalibration) => {
      await saveConfigMutation.mutateAsync({ moduleNumber, calibration });
    },
    [saveConfigMutation],
  );

  const moveServo = useCallback(
    (
      module: 1 | 2 | 3,
      servo: "bottom" | "paddle" | "pusher",
      value: number,
    ) => {
      sendCommand(JSON.stringify({ servo, module, value }));
    },
    [sendCommand],
  );

  return (
    <ModuleConfigsContext value={{ configs, saveConfig, moveServo }}>
      {children}
    </ModuleConfigsContext>
  );
}

export function useModuleConfigs() {
  const context = useContext(ModuleConfigsContext);
  if (!context) {
    throw new Error(
      "useModuleConfigs must be used within a ModuleConfigsProvider",
    );
  }
  return context;
}
