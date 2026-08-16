import { orgSettingsQueryOptions } from "@/features/companies/api/org-settings";
import { useOrg } from "@/features/companies/api/use-organization";
import { DEFAULT_MODULE_COUNT } from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";

export function useModuleCount(): number {
  const { activeOrg } = useOrg();
  const { data } = useQuery(orgSettingsQueryOptions(activeOrg?.id));
  return data?.moduleCount ?? DEFAULT_MODULE_COUNT;
}
