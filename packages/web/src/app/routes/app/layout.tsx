import { AppProviders } from "@/app/providers";
import { SyncIndicator } from "@/components/sync-indicator";
import { buttonVariants } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useRole } from "@/hooks/use-role";
import { UserButton } from "@neondatabase/neon-js/auth/react";
import {
  IconAdjustments,
  IconCamera,
  IconDatabase,
  IconLayoutGrid,
} from "@tabler/icons-react";
import { NavLink, Outlet } from "react-router-dom";

interface NavItemDef {
  to: string;
  icon: React.ReactNode;
  label: string;
  end?: boolean;
}

function SideNavItem({ to, icon, label, end }: NavItemDef) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <NavLink
            to={to}
            end={end}
            className={({ isActive }) =>
              buttonVariants({
                variant: isActive ? "default" : "ghost",
                size: "icon-lg",
              })
            }
          />
        }
      >
        {icon}
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function BottomNavItem({ to, icon, label, end }: NavItemDef) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        buttonVariants({
          variant: isActive ? "default" : "ghost",
          size: "icon-lg",
        })
      }
    >
      {icon}
    </NavLink>
  );
}

export default function AppLayout() {
  const { isAdmin } = useRole();
  const isMobile = useIsMobile();

  const navItems: NavItemDef[] = [
    {
      to: "/app",
      icon: <IconCamera />,
      label: "Scanner",
      end: true,
    },
    {
      to: "/app/bins",
      icon: <IconLayoutGrid />,
      label: "Sort Bins",
    },
    {
      to: "/app/calibrate",
      icon: <IconAdjustments />,
      label: "Calibrate",
    },
    ...(isAdmin
      ? [
          {
            to: "/app/admin",
            icon: <IconDatabase />,
            label: "Admin",
          },
        ]
      : []),
  ];

  return (
    <AppProviders>
      {isMobile ? (
        <div className="h-dvh w-dvw overflow-hidden flex flex-col">
          <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <Outlet />
          </main>
          <nav className="flex-none border-t bg-sidebar flex flex-row items-stretch h-14">
            {navItems.map((item) => (
              <BottomNavItem key={item.to} {...item} />
            ))}
            <div className="flex items-center justify-center flex-1 py-2">
              <UserButton size="icon" />
            </div>
          </nav>
        </div>
      ) : (
        <div className="h-dvh w-dvw overflow-hidden flex flex-row p-4 gap-2">
          <aside className="flex-none">
            <div className="flex flex-col items-center border bg-sidebar rounded-lg p-2">
              <TooltipProvider>
                <nav className="flex flex-col items-center gap-1 flex-1">
                  {navItems.map((item) => (
                    <SideNavItem key={item.to} {...item} />
                  ))}
                </nav>
                <div className="mt-3">
                  <UserButton size="icon" side="right" />
                </div>
              </TooltipProvider>
            </div>
          </aside>
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
