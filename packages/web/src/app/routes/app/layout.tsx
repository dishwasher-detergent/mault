import { AppProviders } from "@/app/providers";
import { AppNav } from "@/app/routes/app/nav";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { EnvBanner } from "@/components/env-banner";
import { RequireCollectionDialog } from "@/components/require-collection-dialog";
import { StatusFooter } from "@/components/status-footer";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { Outlet } from "react-router-dom";

export default function AppLayout() {
  const isMobile = useIsMobile();

  return (
    <AppProviders>
      <RequireCollectionDialog />
      {isMobile ? (
        <div className="h-dvh w-dvw overflow-hidden flex flex-col">
          <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <Outlet />
          </main>
          <AppNav />
        </div>
      ) : (
        <div className="h-dvh w-dvw overflow-hidden p-2 pb-6 bg-muted dark:bg-black relative text-muted-foreground">
          <div
            aria-hidden
            className="pointer-events-none absolute top-8 left-8 -translate-x-1/2 -translate-y-1/2 size-60 rounded-full bg-primary/50 blur-[60px]"
          />
          <div className="flex flex-row border rounded-lg size-full overflow-hidden relative">
            <AppNav />
            <main className="flex-1 min-w-0 overflow-hidden flex flex-col bg-background/70 dark:bg-background/60">
              <Outlet />
            </main>
          </div>
          <div className="absolute bottom-0 left-0 px-4 h-6 flex items-center w-full gap-2 text-xs">
            <AppBreadcrumb />
            <div className="ml-auto flex items-center gap-2 shrink-0">
              <StatusFooter />
              <span>v{__APP_VERSION__}</span>
              <EnvBanner />
            </div>
          </div>
        </div>
      )}
    </AppProviders>
  );
}
