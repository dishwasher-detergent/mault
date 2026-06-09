import { getInitials, InitialsAvatar } from "@/components/ui/initials-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { WatcherStack } from "@/components/ui/watcher-stack";
import {
  collectionsQueryOptions,
  getAllSessionViewers,
  releaseScanLock,
} from "@/features/collections/api/collections";
import type { ScanLockInfo } from "@/features/collections/api/use-collection-locks";
import { useCollectionLocks } from "@/features/collections/api/use-collection-locks";
import { useOrg } from "@/features/companies/api/use-organization";
import { IconLoader2, IconLockOpen, IconWifi } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

function ScanningPill({ isOwn }: { isOwn?: boolean }) {
  return (
    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/10 ring-1 ring-amber-500/20 text-amber-500">
      <span className="size-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
      <span className="text-[10px] font-medium">
        {isOwn ? "Your session" : "Scanning"}
      </span>
    </span>
  );
}

function StatusIcon({
  scannerLock,
  watcherCount,
}: {
  scannerLock?: ScanLockInfo;
  watcherCount: number;
}) {
  if (scannerLock) {
    return (
      <div className="size-8 rounded-md flex items-center justify-center shrink-0 bg-amber-500/10 border border-amber-500/30">
        <span className="text-[11px] font-bold text-amber-500">
          {getInitials(scannerLock.displayName)}
        </span>
      </div>
    );
  }
  if (watcherCount > 0) {
    return (
      <div className="size-8 rounded-md flex items-center justify-center shrink-0 bg-green-500/10 border border-green-500/30">
        <span className="text-[11px] font-bold text-green-500">
          {watcherCount}
        </span>
      </div>
    );
  }
  return (
    <div className="size-8 rounded-md border flex items-center justify-center shrink-0">
      <span className="size-2 rounded-full bg-muted-foreground/30" />
    </div>
  );
}

function ReleaseButton({ guid }: { guid: string }) {
  const [releasing, setReleasing] = useState(false);

  const handleRelease = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setReleasing(true);
    try {
      await releaseScanLock(guid);
      toast.success("Session released");
    } catch {
      toast.error("Failed to release session");
    } finally {
      setReleasing(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleRelease}
      disabled={releasing}
      title="Leave session"
      className="flex items-center justify-center size-7 rounded-md border border-amber-500/30 text-amber-500 hover:bg-amber-500/10 transition-colors disabled:opacity-50 shrink-0"
    >
      {releasing ? (
        <IconLoader2 className="size-3.5 animate-spin" />
      ) : (
        <IconLockOpen className="size-3.5" />
      )}
    </button>
  );
}

export default function MonitorSessionsPage() {
  const { activeOrg } = useOrg();
  const { data: collections, isLoading } = useQuery({
    ...collectionsQueryOptions,
    refetchInterval: 8000,
    enabled: !!activeOrg,
  });
  const { data: allViewers } = useQuery({
    queryKey: ["session-viewers-all"],
    queryFn: getAllSessionViewers,
    refetchInterval: 5000,
    enabled: !!activeOrg,
  });
  const { locks, currentUserId } = useCollectionLocks();
  const navigate = useNavigate();

  const sorted = [...(collections ?? [])].sort((a, b) => {
    const aOwn = locks[a.guid]?.userId === currentUserId;
    const bOwn = locks[b.guid]?.userId === currentUserId;
    if (aOwn !== bOwn) return aOwn ? -1 : 1;
    const aScanning = !!locks[a.guid];
    const bScanning = !!locks[b.guid];
    if (aScanning !== bScanning) return aScanning ? -1 : 1;
    const aViewers = (allViewers?.[a.guid]?.length ?? 0) > 0;
    const bViewers = (allViewers?.[b.guid]?.length ?? 0) > 0;
    if (aViewers !== bViewers) return aViewers ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return (
    <div className="flex flex-col p-4 md:p-6 max-w-4xl mx-auto w-full gap-4">
      <div>
        <h1 className="text-lg font-semibold font-heading">Session Monitor</h1>
        <p className="text-xs text-muted-foreground">
          Join a live scanning session
        </p>
      </div>

      <div className="rounded-lg border divide-y overflow-hidden">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="size-8 rounded-md shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-2.5 w-20" />
              </div>
            </div>
          ))}

        {!isLoading && sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
            <IconWifi className="size-8" />
            <p className="text-sm font-medium">No sessions found</p>
            <p className="text-xs">Active sessions will appear here</p>
          </div>
        )}

        {sorted.map((collection) => {
          const rawViewers = allViewers?.[collection.guid] ?? [];
          const scannerLock = locks[collection.guid];
          const isOwn = scannerLock?.userId === currentUserId;
          const watchers = rawViewers.filter(
            (v) => v.userId !== scannerLock?.userId,
          );

          return (
            <div
              key={collection.guid}
              className={`flex items-center gap-3 px-4 py-3 ${isOwn ? "bg-amber-500/5" : ""}`}
            >
              <button
                type="button"
                onClick={() => navigate(`/app/monitor/${collection.guid}`)}
                className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
              >
                <StatusIcon
                  scannerLock={scannerLock}
                  watcherCount={watchers.length}
                />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {collection.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {collection.cardCount}{" "}
                    {collection.cardCount === 1 ? "card" : "cards"} ·{" "}
                    {new Date(collection.updatedAt).toLocaleDateString(
                      undefined,
                      {
                        month: "short",
                        day: "numeric",
                      },
                    )}
                  </p>
                </div>
              </button>

              <div className="flex items-center gap-1.5 shrink-0">
                {scannerLock && (
                  <>
                    {!isOwn && (
                      <InitialsAvatar
                        name={scannerLock.displayName}
                        variant="scanner"
                        size="sm"
                        tooltip={`${scannerLock.displayName} is scanning`}
                      />
                    )}
                    <ScanningPill isOwn={isOwn} />
                  </>
                )}
                {watchers.length > 0 && <WatcherStack watchers={watchers} />}
                {isOwn && <ReleaseButton guid={collection.guid} />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
