import { createLiveCountEventsSource } from "@/lib/api/session";
import { neon } from "@/lib/auth/client";
import { useEffect, useRef, useState } from "react";

export function useLiveSessionCounts(): Record<string, number> {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const { data: sessionData } = neon.auth.useSession();
  const session = sessionData as {
    session?: { activeOrganizationId?: string | null };
  } | null;
  const orgId =
    session?.session?.activeOrganizationId ??
    localStorage.getItem("activeOrgId");

  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!orgId) return;

    let cancelled = false;

    createLiveCountEventsSource()
      .then((es) => {
        if (cancelled) {
          es.close();
          return;
        }
        esRef.current = es;

        es.addEventListener("init", (e) => {
          const { counts: initial } = JSON.parse((e as MessageEvent).data) as {
            counts: Record<string, number>;
          };
          setCounts(initial);
        });

        es.addEventListener("live_count", (e) => {
          const { guid, count } = JSON.parse((e as MessageEvent).data) as {
            guid: string;
            count: number;
          };
          setCounts((prev) => {
            if (count <= 0) {
              const next = { ...prev };
              delete next[guid];
              return next;
            }
            return { ...prev, [guid]: count };
          });
        });
      })
      .catch(() => {
        /* silent - will degrade gracefully */
      });

    return () => {
      cancelled = true;
      esRef.current?.close();
      esRef.current = null;
    };
  }, [orgId]);

  return counts;
}
