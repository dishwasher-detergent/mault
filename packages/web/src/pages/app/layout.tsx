import { Button } from "@/components/ui/button";
import { SyncIndicator } from "@/components/sync-indicator";
import { Toaster } from "@/components/ui/sonner";
import { BinConfigsProvider } from "@/hooks/use-bin-configs";
import { ModuleConfigsProvider } from "@/hooks/use-module-configs";
import { ScannedCardsProvider } from "@/hooks/use-scanned-cards";
import { SerialProvider } from "@/hooks/use-serial";
import { UserButton } from "@neondatabase/neon-js/auth/react";
import { Link, Outlet } from "react-router-dom";

export default function AppLayout() {
  return (
    <SerialProvider>
      <BinConfigsProvider>
        <ModuleConfigsProvider>
          <ScannedCardsProvider>
            <div className="h-dvh w-dvw overflow-hidden flex flex-col">
              <nav className="h-12 flex-none w-full p-1 px-4 flex flex-row justify-between items-center">
                <Link
                  to="/app"
                  className="flex flex-row items-center gap-2 font-bold"
                >
                  Mault
                </Link>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    nativeButton={false}
                    render={<Link to="/app/admin" />}
                  >
                    Admin
                  </Button>
                  <UserButton size="icon" />
                </div>
              </nav>
              <main className="w-full flex-1 min-h-0 overflow-hidden flex flex-col">
                <Outlet />
              </main>
              <SyncIndicator />
              <Toaster />
            </div>
          </ScannedCardsProvider>
        </ModuleConfigsProvider>
      </BinConfigsProvider>
    </SerialProvider>
  );
}
