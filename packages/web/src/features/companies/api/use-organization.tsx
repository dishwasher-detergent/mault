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
  const [isRestoring, setIsRestoring] = useState(
    () => !!localStorage.getItem(ORG_KEY),
  );

  const setActiveOrg = useCallback(
    async (orgId: string) => {
      localStorage.setItem(ORG_KEY, orgId);
      await neon.auth.organization.setActive({ organizationId: orgId });
      queryClient.invalidateQueries({ queryKey: ["org-settings"] });
    },
    [queryClient],
  );

  if (activeOrg?.id) {
    localStorage.setItem(ORG_KEY, activeOrg.id);
  }

  useEffect(() => {
    if (orgLoading || orgsLoading) return;
    if (activeOrg || !orgs?.length) {
      setIsRestoring(false);
      return;
    }
    const lastOrgId = localStorage.getItem(ORG_KEY);
    if (lastOrgId && orgs.some((o) => o.id === lastOrgId)) {
      setActiveOrg(lastOrgId).finally(() => setIsRestoring(false));
    } else {
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
