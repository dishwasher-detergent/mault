import { AppProviders } from "@/app/providers";
import { AppNav } from "@/app/routes/app/nav";
import { SyncIndicator } from "@/components/sync-indicator";
import { Toaster } from "@/components/ui/sonner";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { Outlet } from "react-router-dom";

export default function AppLayout() {
  const isMobile = useIsMobile();

  return (
    <AppProviders>
      {isMobile ? (
        <div className="h-dvh w-dvw overflow-hidden flex flex-col">
          <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <Outlet />
          </main>
          <AppNav />
        </div>
      ) : (
        <div className="h-dvh w-dvw overflow-hidden flex flex-row p-4 gap-2">
          <AppNav />
          <main className="flex-1 min-w-0 overflow-hidden flex flex-col">
            <Outlet />
          </main>
        </div>
      )}
      <SyncIndicator />
      <Toaster />
    </AppProviders>
  );
}
