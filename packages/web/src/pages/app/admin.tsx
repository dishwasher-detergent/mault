import { Button } from "@/components/ui/button";
import { cancelSync, createSyncEventSource, startSync } from "@/lib/api-admin";
import { cn } from "@/lib/utils";
import type { SyncState } from "@magic-vault/shared";
import { useEffect, useRef, useState } from "react";

const DEFAULT_SYNC_STATE: SyncState = {
  status: "idle",
  total: 0,
  processed: 0,
  skipped: 0,
  errors: 0,
  startedAt: null,
  logs: [],
};

const STATUS_COLORS: Record<SyncState["status"], string> = {
  idle: "text-muted-foreground",
  running: "text-blue-500",
  completed: "text-green-500",
  failed: "text-red-500",
  cancelled: "text-yellow-500",
};

export default function AdminPage() {
  const [syncState, setSyncState] = useState<SyncState>(DEFAULT_SYNC_STATE);
  const [isStarting, setIsStarting] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

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
          const update = JSON.parse(e.data) as Partial<SyncState>;
          setSyncState((prev) => ({ ...prev, ...update }));
        });

        es.addEventListener("done", (e: MessageEvent) => {
          const update = JSON.parse(e.data) as Partial<SyncState>;
          setSyncState((prev) => ({ ...prev, ...update }));
        });

        es.addEventListener("error", (e: MessageEvent) => {
          if (e.data) {
            const update = JSON.parse(e.data) as { message: string };
            setSyncState((prev) => ({
              ...prev,
              status: "failed",
              logs: [...prev.logs.slice(-199), `Error: ${update.message}`],
            }));
          }
        });
      } catch {
        // ignore connection errors
      }
    }

    connect();

    return () => {
      cancelled = true;
      es?.close();
    };
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [syncState.logs]);

  const handleStart = async () => {
    setIsStarting(true);
    try {
      await startSync();
    } finally {
      setIsStarting(false);
    }
  };

  const total = syncState.total;
  const done = syncState.processed + syncState.skipped;
  const progress = total > 0 ? Math.min(100, (done / total) * 100) : 0;
  const isRunning = syncState.status === "running";

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      <div className="rounded-lg border p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-medium">Card Image Vectors</p>
            <p
              className={cn(
                "text-xs font-medium",
                STATUS_COLORS[syncState.status],
              )}
            >
              {syncState.status.charAt(0).toUpperCase() +
                syncState.status.slice(1)}
            </p>
          </div>
          <div className="flex gap-2">
            {isRunning && (
              <Button variant="outline" size="sm" onClick={() => cancelSync()}>
                Cancel
              </Button>
            )}
            <Button
              size="sm"
              disabled={isRunning || isStarting}
              onClick={handleStart}
            >
              {isStarting ? "Starting..." : "Start Sync"}
            </Button>
          </div>
        </div>

        {total > 0 && (
          <div className="flex flex-col gap-1.5">
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-foreground transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground tabular-nums">
              <span>
                {done} / {total}
              </span>
              <span>{syncState.processed} vectorized</span>
              <span>{syncState.skipped} skipped</span>
              {syncState.errors > 0 && (
                <span className="text-red-500">{syncState.errors} errors</span>
              )}
            </div>
          </div>
        )}
      </div>

      {syncState.logs.length > 0 && (
        <div className="rounded-lg border overflow-hidden">
          <div className="px-3 py-2 border-b bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground">Log</p>
          </div>
          <div
            ref={logRef}
            className="h-64 overflow-y-auto p-3 font-mono text-xs leading-relaxed space-y-0.5"
          >
            {syncState.logs.map((line, i) => (
              <p
                key={i}
                className="text-muted-foreground whitespace-pre-wrap break-all"
              >
                {line}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
