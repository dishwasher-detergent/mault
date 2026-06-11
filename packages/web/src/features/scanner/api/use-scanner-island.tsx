import type { ScannerStatus } from "@magic-vault/shared";
import {
  createContext,
  useContext,
  useMemo,
  useState,
} from "react";

export interface ScannerIslandState {
  status: ScannerStatus;
  isCameraActive: boolean;
  isConnected: boolean;
  isReady: boolean;
  isFeeding: boolean;
  handleForceAddDuplicate: () => void;
  handleForceScan: () => void;
  handlePause: () => void;
  handleResume: () => void;
  handleFeed: () => void;
}

type ContextValue = {
  state: ScannerIslandState | null;
  setState: (s: ScannerIslandState | null) => void;
};

const ScannerIslandContext = createContext<ContextValue | null>(null);

export function ScannerIslandProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<ScannerIslandState | null>(null);
  const value = useMemo(() => ({ state, setState }), [state]);
  return (
    <ScannerIslandContext.Provider value={value}>
      {children}
    </ScannerIslandContext.Provider>
  );
}

export function useScannerIsland(): ScannerIslandState | null {
  return useContext(ScannerIslandContext)?.state ?? null;
}

export function useRegisterScannerIsland(): (
  s: ScannerIslandState | null,
) => void {
  const ctx = useContext(ScannerIslandContext);
  return ctx?.setState ?? (() => {});
}
