import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getLiveSessionCounts } from "@/features/collections/api/collections";
import { useCollectionLocks } from "@/features/collections/api/use-collection-locks";
import { useCollections } from "@/features/collections/api/use-collections";
import { useOrg } from "@/features/companies/api/use-organization";
import { OrgSwitcher } from "@/features/companies/components/org-switcher";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useRole } from "@/hooks/use-role";
import { cn } from "@/lib/utils";
import { UserButton } from "@neondatabase/neon-js/auth/react";
import {
  IconAdjustments,
  IconCamera,
  IconDatabase,
  IconFolders,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconSettings,
  IconWifi,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { NavLink } from "react-router-dom";

const EXPANDED_KEY = "sidebarExpanded";

interface NavItemDef {
  to: string;
  icon: React.ReactNode;
  label: string;
  end?: boolean;
  badge?: boolean;
  desktopOnly?: boolean;
}

function CollapsedNavItem({ to, icon, label, end, badge }: NavItemDef) {
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
        <span className="relative">
          {icon}
          {badge && (
            <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-green-500 ring-1 ring-background" />
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function ExpandedNavItem({ to, icon, label, end, badge }: NavItemDef) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          buttonVariants({ variant: isActive ? "secondary" : "ghost" }),
          "w-full justify-start gap-2.5 px-2.5 border-0",
        )
      }
    >
      <span className="relative shrink-0">
        {icon}
        {badge && (
          <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-green-500 ring-1 ring-background" />
        )}
      </span>
      <span className="truncate text-sm">{label}</span>
    </NavLink>
  );
}

function SubItem({
  to,
  label,
  badge,
}: {
  to: string;
  label: string;
  badge?: boolean;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2 pl-9 pr-2 py-1 rounded-md text-xs transition-colors",
          isActive
            ? "text-foreground bg-secondary"
            : "text-muted-foreground hover:text-foreground",
        )
      }
    >
      <span className="truncate flex-1">{label}</span>
      {badge && (
        <span className="shrink-0 size-1.5 rounded-full bg-green-500" />
      )}
    </NavLink>
  );
}

function BottomNavItem({ to, icon, label, end, badge }: NavItemDef) {
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
      <span className="relative">
        {icon}
        {badge && (
          <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-green-500 ring-1 ring-background" />
        )}
      </span>
      <span className="text-[10px] leading-none font-medium">{label}</span>
    </NavLink>
  );
}

export function AppNav() {
  const { isAdmin } = useRole();
  const isMobile = useIsMobile();
  const { activeOrg } = useOrg();
  const { collections } = useCollections();
  const { locks, currentUserId } = useCollectionLocks();

  const [expanded, setExpanded] = useState(
    () => localStorage.getItem(EXPANDED_KEY) === "true",
  );

  const toggle = useCallback(() => {
    setExpanded((prev) => {
      const next = !prev;
      localStorage.setItem(EXPANDED_KEY, String(next));
      return next;
    });
  }, []);

  const { data: liveCounts } = useQuery({
    queryKey: ["live-sessions"],
    queryFn: () => getLiveSessionCounts().then((r) => r.data ?? {}),
    refetchInterval: 10000,
    enabled: !!activeOrg,
  });

  const hasLiveSessions = !!(
    currentUserId &&
    Object.entries(liveCounts ?? {}).some(
      ([guid, count]) => locks[guid]?.userId === currentUserId && count > 0,
    )
  );

  const topCollections = collections.slice(0, 5);

  const topMonitor = [...collections]
    .sort((a, b) => {
      const aLive = !!locks[a.guid];
      const bLive = !!locks[b.guid];
      if (aLive !== bLive) return aLive ? -1 : 1;
      return 0;
    })
    .slice(0, 5);

  const navItems: NavItemDef[] = [
    {
      to: "/app",
      icon: <IconCamera size={20} />,
      label: "Scanner",
      end: true,
      desktopOnly: true,
    },
    {
      to: "/app/collections",
      icon: <IconFolders size={20} />,
      label: "Collections",
      desktopOnly: true,
    },
    {
      to: "/app/monitor",
      icon: <IconWifi size={20} />,
      label: "Monitor",
      badge: hasLiveSessions,
    },
    {
      to: "/app/calibrate",
      icon: <IconAdjustments size={20} />,
      label: "Calibrate",
      desktopOnly: true,
    },
    {
      to: "/app/settings",
      icon: <IconSettings size={20} />,
      label: "Settings",
      desktopOnly: true,
    },
    ...(isAdmin
      ? [
          {
            to: "/app/admin",
            icon: <IconDatabase size={20} />,
            label: "Admin",
            desktopOnly: true,
          },
        ]
      : []),
  ];

  if (isMobile) {
    const mobileItems = navItems.filter((item) => !item.desktopOnly);
    return (
      <nav className="flex-none flex flex-row items-center justify-around bg-sidebar border-t px-1 py-1">
        {mobileItems.map((item) => (
          <BottomNavItem key={item.to} {...item} />
        ))}
        <div className="flex flex-col items-center gap-0.5 px-2 py-1">
          <UserButton size="icon" side="top" />
        </div>
      </nav>
    );
  }

  return (
    <aside
      className={cn(
        "flex-none flex flex-col bg-secondary h-full border-r p-2 gap-2 overflow-hidden transition-[width] duration-200",
        expanded ? "w-55 items-stretch" : "w-14 items-center",
      )}
    >
      {/* Logo */}
      <Tooltip>
        <TooltipTrigger
          className={cn(
            "bg-primary grid place-items-center rounded-lg text-primary-foreground font-bold font-heading cursor-default text-sm shrink-0",
            expanded ? "w-full h-8" : "w-full aspect-square",
          )}
        >
          {expanded ? "MAULT" : "M"}
        </TooltipTrigger>
        <TooltipContent side="right">v{__APP_VERSION__}</TooltipContent>
      </Tooltip>

      <Separator />

      {/* Nav items */}
      <nav
        className={cn(
          "flex flex-col flex-1 gap-1 min-h-0 overflow-y-auto",
          expanded ? "items-stretch" : "items-center",
        )}
      >
        {navItems.map((item) => {
          if (!expanded) {
            return <CollapsedNavItem key={item.to} {...item} />;
          }

          const isCollections = item.to === "/app/collections";
          const isMonitor = item.to === "/app/monitor";

          return (
            <div key={item.to}>
              <ExpandedNavItem {...item} />
              {isCollections && topCollections.length > 0 && (
                <div className="mt-0.5 flex flex-col gap-0.5">
                  {topCollections.map((c) => (
                    <SubItem
                      key={c.guid}
                      to={`/app/collections/${c.guid}/bins`}
                      label={c.name}
                    />
                  ))}
                </div>
              )}
              {isMonitor && topMonitor.length > 0 && (
                <div className="mt-0.5 flex flex-col gap-0.5">
                  {topMonitor.map((c) => (
                    <SubItem
                      key={c.guid}
                      to={`/app/monitor/${c.guid}`}
                      label={c.name}
                      badge={!!locks[c.guid]}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={toggle}
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          expanded ? "self-end" : "",
        )}
        title={expanded ? "Collapse sidebar" : "Expand sidebar"}
      >
        {expanded ? (
          <IconLayoutSidebarLeftCollapse size={16} />
        ) : (
          <IconLayoutSidebarLeftExpand size={16} />
        )}
      </button>

      <Separator />

      {/* Bottom controls */}
      <div
        className={cn(
          "flex gap-2",
          expanded ? "flex-row items-center" : "flex-col items-center",
        )}
      >
        <OrgSwitcher side="right" />
        <ThemeToggle />
        <UserButton size="icon" side="right" />
      </div>
    </aside>
  );
}
