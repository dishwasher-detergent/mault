import { neon } from "@/lib/auth/client";

export type AuthSession = {
  token?: string;
  activeOrganizationId?: string | null;
};

export async function getAuthSession(): Promise<AuthSession | null> {
  const { data } = await neon.auth.getSession();
  return (data as { session?: AuthSession } | null)?.session ?? null;
}

export function getOrgId(session: AuthSession | null): string | null {
  return session?.activeOrganizationId ?? localStorage.getItem("activeOrgId");
}
