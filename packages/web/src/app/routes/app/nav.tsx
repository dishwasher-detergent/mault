import { LanguageSwitcherIcon } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserMenu } from "@/features/account/components/user-menu";
import { useCollectionLocks } from "@/features/collections/api/use-collection-locks";
import { useCollections } from "@/features/collections/api/use-collections";
import { useLiveSessionCounts } from "@/features/collections/api/use-live-counts";
import { OrgSwitcher } from "@/features/companies/components/org-switcher";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useRole } from "@/hooks/use-role";
import { DISCORD_URL } from "@/lib/links";
import { cn } from "@/lib/utils";
import {
  IconAdjustments,
  IconAlbum,
  IconBrandDiscord,
  IconCameraSpark,
  IconDatabaseCog,
  IconHeartRateMonitor,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconPigFilled,
  IconShoppingCart,
} from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";

const EXPANDED_KEY = "sidebarExpanded";

interface NavItemDef {
  to: string;
  icon: React.ReactNode;
  label: string;
  end?: boolean;
  badge?: boolean;
  desktopOnly?: boolean;
  disabled?: boolean;
  tooltip?: string;
}

function CollapsedNavItem({
  icon,
  label,
  to,
  end,
  badge,
  disabled,
  tooltip,
}: NavItemDef) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          disabled ? (
            <span
              aria-disabled="true"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon-lg" }),
                "cursor-not-allowed text-muted-foreground/40 hover:bg-transparent hover:text-muted-foreground/40",
              )}
            />
          ) : (
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
          )
        }
      >
        <span className="relative">
          {icon}
          {badge && (
            <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-green-500 ring-1 ring-background" />
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent side="right">{disabled ? tooltip : label}</TooltipContent>
    </Tooltip>
  );
}

function ExpandedNavItem({
  to,
  icon,
  label,
  end,
  badge,
  disabled,
  tooltip,
}: NavItemDef) {
  const inner = (
    <>
      <span className="relative shrink-0">
        {icon}
        {badge && (
          <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-green-500 ring-1 ring-background" />
        )}
      </span>
      <span className="truncate text-sm">{label}</span>
    </>
  );

  if (disabled) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <span
              aria-disabled="true"
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "w-full justify-start gap-2.5 px-2.5 border-0 cursor-not-allowed text-muted-foreground/40 hover:bg-transparent hover:text-muted-foreground/40",
              )}
            />
          }
        >
          {inner}
        </TooltipTrigger>
        <TooltipContent side="right">{tooltip}</TooltipContent>
      </Tooltip>
    );
  }

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
      {inner}
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

function BottomNavItem({
  to,
  icon,
  label,
  end,
  badge,
  disabled,
  tooltip,
}: NavItemDef) {
  const inner = (
    <>
      <span className="relative">
        {icon}
        {badge && (
          <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-green-500 ring-1 ring-background" />
        )}
      </span>
      <span className="text-[10px] leading-none font-medium">{label}</span>
    </>
  );

  if (disabled) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <span
              aria-disabled="true"
              className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-md cursor-not-allowed text-muted-foreground/40"
            />
          }
        >
          {inner}
        </TooltipTrigger>
        <TooltipContent side="top">{tooltip}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "flex flex-col items-center gap-0.5 px-2 py-1 rounded-md transition-all active:scale-90 text-muted-foreground",
          isActive && "text-foreground",
        )
      }
    >
      {inner}
    </NavLink>
  );
}

export function AppNav() {
  const { t } = useTranslation("common");
  const { isAdmin } = useRole();
  const isMobile = useIsMobile();
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "[" || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      )
        return;
      toggle();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [toggle]);

  const liveCounts = useLiveSessionCounts();

  const hasLiveSessions = !!(
    currentUserId &&
    Object.entries(liveCounts).some(
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
      icon: <IconCameraSpark size={20} />,
      label: t("nav.scanner"),
      end: true,
      desktopOnly: true,
    },
    {
      to: "/app/collections",
      icon: <IconAlbum size={20} />,
      label: t("nav.collections"),
      desktopOnly: true,
    },
    {
      to: "/app/monitor",
      icon: <IconHeartRateMonitor size={20} />,
      label: t("nav.monitor"),
      badge: hasLiveSessions,
    },
    {
      to: "/app/calibrate",
      icon: <IconAdjustments size={20} />,
      label: t("nav.calibrate"),
      desktopOnly: true,
    },
    {
      to: "",
      icon: <IconShoppingCart size={20} />,
      label: t("nav.cart"),
      disabled: true,
      tooltip: t("nav.comingSoon"),
    },
    ...(isAdmin
      ? [
          {
            to: "/app/admin",
            icon: <IconDatabaseCog size={20} />,
            label: t("nav.admin"),
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
        <OrgSwitcher variant="tab" side="top" />
        <UserMenu variant="tab" side="top" />
      </nav>
    );
  }

  return (
    <aside
      className={cn(
        "py-2 flex-none flex flex-col bg-secondary/70 dark:bg-secondary/50 h-full border-r gap-2 overflow-hidden transition-[width] duration-200",
        expanded ? "w-55 items-stretch" : "w-12 items-center",
      )}
    >
      <Tooltip>
        <TooltipTrigger
          className={cn(
            "flex items-center gap-2 cursor-default shrink-0",
            expanded ? "h-8 mx-2" : "size-8 justify-center",
          )}
        >
          <span className="bg-primary grid size-8 shrink-0 place-items-center rounded-lg text-primary-foreground">
            <IconPigFilled className="size-4" />
          </span>
          {expanded && (
            <span className="font-bold font-heading text-sm">Mault</span>
          )}
        </TooltipTrigger>
        <TooltipContent side="right">v{__APP_VERSION__}</TooltipContent>
      </Tooltip>
      <Separator />
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
            <div key={item.to} className="mx-1">
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
      <a
        href={DISCORD_URL}
        target="_blank"
        rel="noreferrer"
        title={t("nav.discordAriaLabel")}
        aria-label={t("nav.discordAriaLabel")}
        className={cn(
          buttonVariants({ variant: "ghost" }),
          expanded
            ? "h-8 mx-2 justify-start gap-2.5 px-2.5 border-0"
            : "size-8",
        )}
      >
        <IconBrandDiscord size={16} />
        {expanded && (
          <span className="truncate text-sm">{t("nav.discord")}</span>
        )}
      </a>
      <Button
        onClick={toggle}
        className={cn(expanded ? "h-8 mx-2" : "size-8")}
        variant="ghost"
        title={expanded ? t("nav.collapseSidebar") : t("nav.expandSidebar")}
      >
        {expanded ? (
          <>
            {t("nav.collapse")}
            <IconLayoutSidebarLeftCollapse size={16} />
          </>
        ) : (
          <IconLayoutSidebarLeftExpand size={16} />
        )}
      </Button>
      <Separator />
      <div
        className={cn(
          "flex gap-2",
          expanded ? "flex-row items-center px-2" : "flex-col items-center",
        )}
      >
        <OrgSwitcher side="right" />
        <LanguageSwitcherIcon side="right" />
        <ThemeToggle />
        <UserMenu side="right" />
      </div>
    </aside>
  );
}
