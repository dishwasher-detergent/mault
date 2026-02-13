import { Button } from "@/components/ui/button";
import { BinConfigsProvider } from "@/hooks/use-bin-configs";
import { ScannedCardsProvider } from "@/hooks/use-scanned-cards";
import { SerialProvider } from "@/hooks/use-serial";
import { UserButton } from "@neondatabase/auth/react";
import Link from "next/link";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SerialProvider>
    <BinConfigsProvider>
      <ScannedCardsProvider>
        <div className="h-dvh w-dvw overflow-hidden flex flex-col">
          <nav className="h-12 flex-none w-full p-1 px-4 border border-b bg-background/50 backdrop-blur-sm flex flex-row justify-between items-center">
            <p className="flex flex-row items-center gap-2 font-bold">Mault</p>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                render={<Link href="/app">Scanner</Link>}
              />
              <Button
                variant="ghost"
                render={<Link href="/app/sort">Sort Bins</Link>}
              />
              <UserButton size="icon" />
            </div>
          </nav>
          <main className="w-full flex-1 min-h-0 overflow-hidden flex flex-col">
            {children}
          </main>
        </div>
      </ScannedCardsProvider>
    </BinConfigsProvider>
    </SerialProvider>
  );
}
