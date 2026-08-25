import { neon } from "@/lib/auth/client";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

const ORG_KEY = "activeOrgId";

export function useOrg() {
  const queryClient = useQueryClient();
  const { data: orgs, isPending: orgsLoading } =
    neon.auth.useListOrganizations();
  const { data: activeOrg, isPending: orgLoading } =
    neon.auth.useActiveOrganization();
  const { refetch: refetchActiveMember } = neon.auth.useActiveMember();
  const [isRestoring, setIsRestoring] = useState(
    () => !!localStorage.getItem(ORG_KEY),
  );

  const setActiveOrg = useCallback(
    async (orgId: string) => {
      localStorage.setItem(ORG_KEY, orgId);
      await neon.auth.organization.setActive({ organizationId: orgId });
      await Promise.all([
        refetchActiveMember(),
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey[0] !== "games",
        }),
      ]);
    },
    [queryClient, refetchActiveMember],
  );

  if (activeOrg?.id) {
    localStorage.setItem(ORG_KEY, activeOrg.id);
  }

  useEffect(() => {
    if (orgLoading || orgsLoading) return;
    if (activeOrg) {
      setIsRestoring(false);
      return;
    }
    const lastOrgId = localStorage.getItem(ORG_KEY);
    if (lastOrgId && orgs?.some((o) => o.id === lastOrgId)) {
      setActiveOrg(lastOrgId).finally(() => setIsRestoring(false));
    } else {
      if (lastOrgId) localStorage.removeItem(ORG_KEY);
      setIsRestoring(false);
    }
  }, [orgLoading, orgsLoading, activeOrg, orgs, setActiveOrg]);

  return {
    orgs: orgs ?? [],
    activeOrg: activeOrg ?? null,
    isLoading: orgsLoading || orgLoading || isRestoring,
    setActiveOrg,
  };
}
