import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export const MIN_MODULES = 1;
export const MAX_MODULES = 5;
export const DEFAULT_MODULES = 3;

const MODULE_COUNT_STORAGE_KEY = "magic-vault:build-parts-module-count";

interface ModuleCountContextValue {
  moduleCount: number;
  setModuleCount: (value: number) => void;
}

const ModuleCountContext = createContext<ModuleCountContextValue | null>(
  null,
);

export function ModuleCountProvider({ children }: { children: ReactNode }) {
  const [moduleCount, setModuleCountState] = useState(DEFAULT_MODULES);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(MODULE_COUNT_STORAGE_KEY);
      const parsed = raw ? parseInt(raw, 10) : NaN;
      if (parsed >= MIN_MODULES && parsed <= MAX_MODULES) {
        setModuleCountState(parsed);
      }
    } catch {}
  }, []);

  const setModuleCount = (value: number) => {
    const clamped = Math.min(MAX_MODULES, Math.max(MIN_MODULES, value));
    setModuleCountState(clamped);
    try {
      localStorage.setItem(MODULE_COUNT_STORAGE_KEY, String(clamped));
    } catch {}
  };

  return (
    <ModuleCountContext value={{ moduleCount, setModuleCount }}>
      {children}
    </ModuleCountContext>
  );
}

export function useModuleCount() {
  const context = useContext(ModuleCountContext);
  if (!context) {
    throw new Error(
      "useModuleCount must be used within a ModuleCountProvider",
    );
  }
  return context;
}
