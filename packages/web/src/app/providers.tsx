import { SerialProvider } from "@/features/scanner/api/use-serial";
import { BinConfigsProvider } from "@/features/bins/api/use-bin-configs";
import { ModuleConfigsProvider } from "@/features/calibration/api/use-module-configs";
import { ScannedCardsProvider } from "@/features/scanner/api/use-scanned-cards";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SerialProvider>
      <BinConfigsProvider>
        <ModuleConfigsProvider>
          <ScannedCardsProvider>{children}</ScannedCardsProvider>
        </ModuleConfigsProvider>
      </BinConfigsProvider>
    </SerialProvider>
  );
}
