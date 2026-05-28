import { neon } from "@/lib/auth/client";
import { useCallback } from "react";

const ORG_KEY = "activeOrgId";

export function useOrg() {
  const { data: orgs } = neon.auth.useListOrganizations();
  const { data: activeOrg } = neon.auth.useActiveOrganization();

  const setActiveOrg = useCallback(async (orgId: string) => {
    await neon.auth.organization.setActive({ organizationId: orgId });
    localStorage.setItem(ORG_KEY, orgId);
  }, []);

  // Sync localStorage whenever Better Auth changes the active org
  if (activeOrg?.id) {
    localStorage.setItem(ORG_KEY, activeOrg.id);
  }

  return {
    orgs: orgs ?? [],
    activeOrg: activeOrg ?? null,
    setActiveOrg,
  };
}
