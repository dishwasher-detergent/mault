import { AppProviders } from "@/app/providers";
import { SyncIndicator } from "@/components/sync-indicator";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { useRole } from "@/hooks/use-role";
import { UserButton } from "@neondatabase/neon-js/auth/react";
import { Link, Outlet } from "react-router-dom";

export default function AppLayout() {
  const { isAdmin } = useRole();

  return (
    <AppProviders>
      <div className="h-dvh w-dvw overflow-hidden flex flex-col">
        <nav className="h-12 flex-none w-full p-1 px-4 flex flex-row justify-between items-center">
          <Link
            to="/app"
            className="flex flex-row items-center gap-2 font-bold"
          >
            Mault
          </Link>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                variant="ghost"
                nativeButton={false}
                render={<Link to="/app/admin" />}
              >
                Admin
              </Button>
            )}
            <UserButton size="icon" />
          </div>
        </nav>
        <main className="w-full flex-1 min-h-0 overflow-hidden flex flex-col">
          <Outlet />
        </main>
        <SyncIndicator />
        <Toaster />
      </div>
    </AppProviders>
  );
}
