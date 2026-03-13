import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRole } from "@/hooks/use-role";
import { UserButton } from "@neondatabase/neon-js/auth/react";
import {
  IconAdjustments,
  IconCamera,
  IconDatabase,
  IconLayoutGrid,
} from "@tabler/icons-react";
import { NavLink } from "react-router-dom";

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
                variant: isActive ? "secondary" : "ghost",
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

export function AppNav() {
  const { isAdmin } = useRole();

  const navItems: NavItemDef[] = [
    { to: "/app", icon: <IconCamera />, label: "Scanner", end: true },
    { to: "/app/bins", icon: <IconLayoutGrid />, label: "Sort Bins" },
    { to: "/app/calibrate", icon: <IconAdjustments />, label: "Calibrate" },
    ...(isAdmin
      ? [{ to: "/app/admin", icon: <IconDatabase />, label: "Admin" }]
      : []),
  ];

  return (
    <aside className="flex-none h-full flex flex-col items-center border-r bg-sidebar p-2 gap-2">
      <TooltipProvider>
        <div className="w-full aspect-square bg-primary grid place-items-center rounded-lg">
          M
        </div>
        <Separator orientation="horizontal" />
        <nav className="flex flex-col items-center gap-2 flex-1">
          {navItems.map((item) => (
            <SideNavItem key={item.to} {...item} />
          ))}
        </nav>
        <Separator orientation="horizontal" />
        <div>
          <UserButton size="icon" side="right" />
        </div>
      </TooltipProvider>
    </aside>
  );
}
