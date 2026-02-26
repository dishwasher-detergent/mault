import { neon } from "@/lib/auth/client";

export function useRole() {
  const { data, isPending } = neon.auth.useSession();
  const role = data?.user?.role ?? null;

  return {
    role,
    isPending,
    isAdmin: role === "admin",
    hasRole: (...roles: string[]) => role !== null && roles.includes(role),
  };
}
