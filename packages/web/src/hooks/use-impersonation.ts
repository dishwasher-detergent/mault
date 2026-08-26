import { startImpersonation, stopImpersonation } from "@/lib/api/admin";
import {
  beginImpersonation,
  clearImpersonation,
  getImpersonationState,
  setImpersonationOrgId,
  subscribeImpersonation,
} from "@/lib/auth/impersonation";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useSyncExternalStore } from "react";

const AUDIT_QUERY_KEY = ["admin", "impersonation-audit"];

export function useImpersonation() {
  const state = useSyncExternalStore(
    subscribeImpersonation,
    getImpersonationState,
  );
  const queryClient = useQueryClient();

  const start = useCallback(
    async (userId: string) => {
      const result = await startImpersonation(userId);
      if (!result.success || !result.data) {
        throw new Error(result.message || "Failed to start impersonation.");
      }
      beginImpersonation(result.data);
      queryClient.invalidateQueries({ queryKey: AUDIT_QUERY_KEY });
    },
    [queryClient],
  );

  const stop = useCallback(async () => {
    if (!getImpersonationState()) return;
    try {
      await stopImpersonation();
    } catch (err) {
      // Best-effort - the audit row just won't get an endedAt if this fails,
      // but the admin's own session must be restored regardless.
      console.error("Failed to close out impersonation session:", err);
    } finally {
      clearImpersonation();
      queryClient.invalidateQueries({ queryKey: AUDIT_QUERY_KEY });
    }
  }, [queryClient]);

  return {
    isImpersonating: !!state,
    impersonatedUser: state?.user ?? null,
    orgs: state?.orgs ?? [],
    activeOrgId: state?.activeOrgId ?? null,
    setActiveOrgId: setImpersonationOrgId,
    start,
    stop,
  };
}
