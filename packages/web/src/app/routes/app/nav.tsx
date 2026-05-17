import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useRole } from "@/hooks/use-role";
import { cn } from "@/lib/utils";
import { UserButton } from "@neondatabase/neon-js/auth/react";
import {
  IconAdjustments,
  IconCamera,
  IconDatabase,
  IconFolders,
  IconLayoutGrid,
  IconSettings,
} from "@tabler/icons-react";
import { NavLink } from "react-router-dom";

interface NavItemDef {
  to: string;
  icon: React.ReactNode;
  label: string;
  mobileLabel?: string;
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

function BottomNavItem({ to, icon, label, mobileLabel, end }: NavItemDef) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "flex flex-col items-center gap-0.5 px-2 py-1 rounded-md transition-colors text-muted-foreground",
          isActive && "text-foreground",
        )
      }
    >
      {icon}
      <span className="text-[10px] leading-none font-medium">
        {mobileLabel ?? label}
      </span>
    </NavLink>
  );
}

export function AppNav() {
  const { isAdmin } = useRole();
  const isMobile = useIsMobile();

  const navItems: NavItemDef[] = [
    {
      to: "/app",
      icon: <IconCamera size={20} />,
      label: "Scanner",
      end: true,
    },
    {
      to: "/app/collections",
      icon: <IconFolders size={20} />,
      label: "Collections",
    },
    {
      to: "/app/bins",
      icon: <IconLayoutGrid size={20} />,
      label: "Sorting Logic",
      mobileLabel: "Bins",
    },
    {
      to: "/app/calibrate",
      icon: <IconAdjustments size={20} />,
      label: "Calibrate",
    },
    {
      to: "/app/settings",
      icon: <IconSettings size={20} />,
      label: "Settings",
    },
    ...(isAdmin
      ? [
          {
            to: "/app/admin",
            icon: <IconDatabase size={20} />,
            label: "Admin",
          },
        ]
      : []),
  ];

  if (isMobile) {
    return (
      <nav className="flex-none flex flex-row items-center justify-around bg-sidebar border-t px-1 py-1">
        {navItems.map((item) => (
          <BottomNavItem key={item.to} {...item} />
        ))}
        <div className="flex flex-col items-center gap-0.5 px-2 py-1">
          <UserButton size="icon" side="top" />
        </div>
      </nav>
    );
  }

  return (
    <aside className="flex-none flex flex-col items-center bg-secondary p-2 gap-2 h-full border-r">
      <Tooltip>
        <TooltipTrigger className="w-full aspect-square bg-primary grid place-items-center rounded-lg text-primary-foreground font-bold cursor-default">
          M
        </TooltipTrigger>
        <TooltipContent side="right">v{__APP_VERSION__}</TooltipContent>
      </Tooltip>
      <Separator orientation="horizontal" />
      <nav className="flex flex-col items-center gap-2 flex-1">
        {navItems.map((item) => (
          <SideNavItem key={item.to} {...item} />
        ))}
      </nav>
      <Separator orientation="horizontal" />
      <div className="flex flex-col items-center gap-2">
        <ThemeToggle />
        <UserButton size="icon" side="right" />
      </div>
    </aside>
  );
}
