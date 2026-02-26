import type { SyncState } from "@magic-vault/shared";

export const DEFAULT_SYNC_STATE: SyncState = {
  status: "idle",
  total: 0,
  processed: 0,
  skipped: 0,
  errors: 0,
  startedAt: null,
  logs: [],
};

export const STATUS_COLORS: Record<SyncState["status"], string> = {
  idle: "var(--muted-foreground)",
  running: "oklch(0.623 0.214 259.815)",
  completed: "oklch(0.696 0.17 162.48)",
  failed: "oklch(0.637 0.237 25.331)",
  cancelled: "oklch(0.795 0.184 86.047)",
};
