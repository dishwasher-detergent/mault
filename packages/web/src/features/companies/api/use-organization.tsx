import { neon } from "@/lib/auth/client";
import { useCallback, useEffect, useState } from "react";

const ORG_KEY = "activeOrgId";

export function useOrg() {
  const { data: orgs, isPending: orgsLoading } =
    neon.auth.useListOrganizations();
  const { data: activeOrg, isPending: orgLoading } =
    neon.auth.useActiveOrganization();
  const [isRestoring, setIsRestoring] = useState(
    () => !!localStorage.getItem(ORG_KEY),
  );

  const setActiveOrg = useCallback(async (orgId: string) => {
    await neon.auth.organization.setActive({ organizationId: orgId });
    localStorage.setItem(ORG_KEY, orgId);
  }, []);

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
