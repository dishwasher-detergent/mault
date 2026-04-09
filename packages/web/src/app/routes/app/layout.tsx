import { AppProviders } from "@/app/providers";
import { AppNav } from "@/app/routes/app/nav";
import { EnvBanner } from "@/components/env-banner";
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
            <EnvBanner />
            <Outlet />
          </main>
          <AppNav />
        </div>
      ) : (
        <div className="h-dvh w-dvw overflow-hidden p-2 bg-muted dark:bg-black">
          <div className="flex flex-row bg-background border rounded-lg size-full overflow-hidden">
            <AppNav />
            <main className="flex-1 min-w-0 overflow-hidden flex flex-col">
              <EnvBanner />
              <Outlet />
            </main>
          </div>
        </div>
      )}
      <SyncIndicator />
      <Toaster />
    </AppProviders>
  );
}
