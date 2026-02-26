import { createSyncEventSource } from "@/lib/api-admin";
import { cn } from "@/lib/utils";
import type { SyncState } from "@magic-vault/shared";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const DEFAULT: SyncState = {
  status: "idle",
  total: 0,
  processed: 0,
  skipped: 0,
  errors: 0,
  startedAt: null,
  logs: [],
};

export function SyncIndicator() {
  const [syncState, setSyncState] = useState<SyncState>(DEFAULT);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    let es: EventSource | null = null;
    let cancelled = false;

    async function connect() {
      try {
        es = await createSyncEventSource();
        if (cancelled) {
          es.close();
          return;
        }

        es.addEventListener("status", (e: MessageEvent) => {
          setSyncState(JSON.parse(e.data) as SyncState);
        });
        es.addEventListener("progress", (e: MessageEvent) => {
          setSyncState((prev) => ({ ...prev, ...JSON.parse(e.data) }));
        });
        es.addEventListener("done", (e: MessageEvent) => {
          setSyncState((prev) => ({ ...prev, ...JSON.parse(e.data) }));
        });
        es.addEventListener("error", (e: MessageEvent) => {
          if (e.data) setSyncState((prev) => ({ ...prev, status: "failed" }));
        });
      } catch {
        // ignore
      }
    }

    connect();
    return () => {
      cancelled = true;
      es?.close();
    };
  }, []);

  const { status, total, processed, skipped } = syncState;
  const done = processed + skipped;
  const progress = total > 0 ? Math.min(100, (done / total) * 100) : 0;

  const visible =
    status !== "idle" && status !== "cancelled" && pathname !== "/app/admin";
  if (!visible) return null;

  const dotColor: Record<SyncState["status"], string> = {
    idle: "",
    running: "bg-blue-500",
    completed: "bg-green-500",
    failed: "bg-red-500",
    cancelled: "bg-yellow-500",
  };

  const label =
    status === "running" && total > 0
      ? `${done.toLocaleString()} / ${total.toLocaleString()}`
      : status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <button
      onClick={() => navigate("/app/admin")}
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 rounded-lg border bg-popover text-popover-foreground shadow-lg p-3 w-64 text-left hover:bg-accent transition-colors"
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "size-2 rounded-full flex-none",
            dotColor[status],
            status === "running" && "animate-pulse",
          )}
        />
        <span className="text-xs font-medium flex-1 truncate">
          Card Image Vectors
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {label}
        </span>
      </div>
      {total > 0 && (
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-foreground transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </button>
  );
}
