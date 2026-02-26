import { SerialProvider } from "@/features/scanner/api/use-serial";
import { BinConfigsProvider } from "@/features/bins/api/use-bin-configs";
import { ModuleConfigsProvider } from "@/features/calibration/api/use-module-configs";
import { ScannedCardsProvider } from "@/features/scanner/api/use-scanned-cards";
import { CameraProvider } from "@/features/scanner/api/use-camera";
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
            <ModuleConfigsProvider>
              <ScannedCardsProvider>{children}</ScannedCardsProvider>
            </ModuleConfigsProvider>
          </BinConfigsProvider>
        </SerialProvider>
      </CameraProvider>
    </QueryClientProvider>
  );
}
