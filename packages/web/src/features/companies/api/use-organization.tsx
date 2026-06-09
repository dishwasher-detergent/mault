import { neon } from "@/lib/auth/client";
import { useCallback } from "react";

const ORG_KEY = "activeOrgId";

export function useOrg() {
  const { data: orgs, isPending: orgsLoading } = neon.auth.useListOrganizations();
  const { data: activeOrg, isPending: orgLoading } = neon.auth.useActiveOrganization();

  const setActiveOrg = useCallback(async (orgId: string) => {
    await neon.auth.organization.setActive({ organizationId: orgId });
    localStorage.setItem(ORG_KEY, orgId);
  }, []);

  if (activeOrg?.id) {
    localStorage.setItem(ORG_KEY, activeOrg.id);
  }

  return {
    orgs: orgs ?? [],
    activeOrg: activeOrg ?? null,
    isLoading: orgsLoading || orgLoading,
    setActiveOrg,
  };
}
