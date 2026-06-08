import { AppProviders } from "@/app/providers";
import { AppNav } from "@/app/routes/app/nav";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { EnvBanner } from "@/components/env-banner";
import { RequireCollectionDialog } from "@/components/require-collection-dialog";
import { StatusFooter } from "@/components/status-footer";
import { useOrg } from "@/features/companies/api/use-organization";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { Outlet } from "react-router-dom";

export default function AppLayout() {
  const isMobile = useIsMobile();
  const { activeOrg } = useOrg();

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
        <div className="h-dvh w-dvw overflow-hidden px-2 pt-6 pb-6 bg-muted dark:bg-black relative">
          <div className="absolute top-0 left-0 px-4 text-xs h-6 flex items-center w-full">
            <AppBreadcrumb />
          </div>
          <div className="flex flex-row bg-background border rounded-lg size-full overflow-hidden">
            <AppNav />
            <main className="flex-1 min-w-0 overflow-hidden flex flex-col">
              <Outlet />
            </main>
          </div>
          <div className="absolute bottom-0 left-0 px-4 text-xs h-6 flex items-center justify-between w-full">
            <EnvBanner />
            <StatusFooter />
            <p className="text-muted-foreground">
              {activeOrg && <span>{activeOrg.name} · </span>}
              v{__APP_VERSION__}
            </p>
          </div>
        </div>
      )}
    </AppProviders>
  );
}
