import { SyncIndicator } from "@/components/sync-indicator";
import { BinConfigsProvider } from "@/features/bins/api/use-bin-configs";
import { OrgPickerModal } from "@/features/companies/components/org-picker-modal";
import { FeederConfigProvider } from "@/features/calibration/api/use-feeder-config";
import { ModuleConfigsProvider } from "@/features/calibration/api/use-module-configs";
import { CollectionLocksProvider } from "@/features/collections/api/use-collection-locks";
import { CollectionsProvider } from "@/features/collections/api/use-collections";
import { CameraProvider } from "@/features/scanner/api/use-camera";
import { ScannedCardsProvider } from "@/features/scanner/api/use-scanned-cards";
import { SerialProvider } from "@/features/scanner/api/use-serial";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      retry: 1,
    },
  },
});

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <CameraProvider>
        <SerialProvider>
          <BinConfigsProvider>
            <CollectionsProvider>
              <CollectionLocksProvider>
              <ModuleConfigsProvider>
                <FeederConfigProvider>
                  <ScannedCardsProvider>
                    {children}
                    <SyncIndicator />
                    <OrgPickerModal />
                  </ScannedCardsProvider>
                </FeederConfigProvider>
              </ModuleConfigsProvider>
              </CollectionLocksProvider>
            </CollectionsProvider>
          </BinConfigsProvider>
        </SerialProvider>
      </CameraProvider>
    </QueryClientProvider>
  );
}
