import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cancelSync, createSyncEventSource, dumpCards, startSync } from "@/lib/api/admin";
import type { SyncState } from "@magic-vault/shared";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { DEFAULT_SYNC_STATE, STATUS_COLORS } from "./admin.constants";

export default function AdminPage() {
  const [syncState, setSyncState] = useState<SyncState>(DEFAULT_SYNC_STATE);
  const [dumpOpen, setDumpOpen] = useState(false);
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

        es.addEventListener("log", (e: MessageEvent) => {
          const { line } = JSON.parse(e.data) as { line: string };
          setSyncState((prev) => ({
            ...prev,
            logs: [...prev.logs.slice(-199), line],
          }));
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

  const startSyncMutation = useMutation({ mutationFn: startSync });
  const cancelSyncMutation = useMutation({ mutationFn: cancelSync });
  const dumpMutation = useMutation({
    mutationFn: dumpCards,
    onSuccess: () => {
      setDumpOpen(false);
      toast.success("Card database cleared");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to dump database");
    },
  });

  const total = syncState.total;
  const done = syncState.processed + syncState.skipped;
  const progress = total > 0 ? Math.min(100, (done / total) * 100) : 0;
  const isRunning = syncState.status === "running";

  return (
    <div className="flex flex-col p-6 max-w-4xl mx-auto w-full h-full overlflow-hidden">
      <div className="rounded-lg rounded-b-none border p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-medium">Card Image Vectors</p>
            <p
              className="text-xs font-medium"
              style={{ color: STATUS_COLORS[syncState.status] }}
            >
              {syncState.status.charAt(0).toUpperCase() +
                syncState.status.slice(1)}
            </p>
          </div>
          {isRunning ? (
            <Button
              variant="outline"
              disabled={cancelSyncMutation.isPending}
              onClick={() => cancelSyncMutation.mutate()}
            >
              {cancelSyncMutation.isPending ? "Cancelling..." : "Cancel"}
            </Button>
          ) : (
            <Button
              disabled={isRunning || startSyncMutation.isPending}
              onClick={() => startSyncMutation.mutate()}
            >
              {startSyncMutation.isPending ? "Starting..." : "Start Sync"}
            </Button>
          )}
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
            {isRunning && syncState.currentCard && (
              <p className="text-xs text-muted-foreground truncate">
                {syncState.currentCard}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="rounded-lg rounded-t-none border border-t-0 overflow-hidden">
        <div className="px-3 py-2 border-b bg-muted/30">
          <p className="text-xs font-medium text-muted-foreground">Log</p>
        </div>
        <div
          ref={logRef}
          className="max-h-full overflow-y-auto p-3 font-mono text-xs leading-relaxed space-y-0.5"
        >
          {syncState.logs.length > 0 ? (
            syncState.logs.map((line, i) => (
              <p
                key={i}
                className="text-muted-foreground whitespace-pre-wrap break-all"
              >
                {line}
              </p>
            ))
          ) : (
            <p className="text-muted-foreground whitespace-pre-wrap break-all">
              No Logs
            </p>
          )}
        </div>
      </div>

      <div className="rounded-lg border p-4 flex items-center justify-between mt-4">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium">Dump Card Database</p>
          <p className="text-xs text-muted-foreground">
            Permanently delete all card image vectors
          </p>
        </div>
        <Dialog open={dumpOpen} onOpenChange={setDumpOpen}>
          <DialogTrigger render={<Button variant="destructive" disabled={isRunning} />}>
            Dump
          </DialogTrigger>
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>Dump card database</DialogTitle>
              <DialogDescription>
                This will permanently delete all card image vectors and cannot
                be undone. Are you sure?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter showCloseButton>
              <Button
                variant="destructive"
                disabled={dumpMutation.isPending}
                onClick={() => dumpMutation.mutate()}
              >
                {dumpMutation.isPending ? "Dumping..." : "Dump"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
