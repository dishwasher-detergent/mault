import { UserButton } from "@neondatabase/auth/react";
import { IconBox } from "@tabler/icons-react";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="h-dvh w-full overflow-hidden flex flex-col">
      <nav className="h-12 flex-none w-full p-1 px-4 border border-b bg-background/50 backdrop-blur-sm flex flex-row justify-between items-center">
        <p className="flex flex-row items-center gap-2 font-bold">
          <IconBox /> MTG Vault
        </p>
        <div className="flex items-center gap-2">
          <UserButton size="icon" />
        </div>
      </nav>
      <main className="w-full flex-1 min-h-0 overflow-hidden flex flex-col">
        {children}
      </main>
    </div>
  );
}
