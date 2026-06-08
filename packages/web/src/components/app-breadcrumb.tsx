import { useCollections } from "@/features/collections/api/use-collections";
import { cn } from "@/lib/utils";
import { IconChevronRight } from "@tabler/icons-react";
import { Link, useLocation } from "react-router-dom";

type Crumb = { label: string; to?: string };

function useBreadcrumbs(): Crumb[] {
  const { pathname } = useLocation();
  const { collections } = useCollections();

  if (pathname === "/app") return [{ label: "Scanner" }];
  if (pathname === "/app/collections") return [{ label: "Collections" }];
  if (pathname === "/app/calibrate") return [{ label: "Calibrate" }];
  if (pathname === "/app/settings") return [{ label: "Settings" }];
  if (pathname === "/app/admin") return [{ label: "Admin" }];
  if (pathname === "/app/monitor") return [{ label: "Monitor" }];
  if (pathname.startsWith("/app/account/")) return [{ label: "Account" }];

  const binsMatch = pathname.match(/^\/app\/collections\/([^/]+)\/bins$/);
  if (binsMatch) {
    const collection = collections.find((c) => c.guid === binsMatch[1]);
    return [
      { label: "Collections", to: "/app/collections" },
      { label: collection?.name ?? "…" },
      { label: "Sorting Logic" },
    ];
  }

  const monitorMatch = pathname.match(/^\/app\/monitor\/([^/]+)$/);
  if (monitorMatch) {
    const collection = collections.find((c) => c.guid === monitorMatch[1]);
    return [
      { label: "Monitor", to: "/app/monitor" },
      { label: collection?.name ?? "…" },
    ];
  }

  return [];
}

export function AppBreadcrumb() {
  const crumbs = useBreadcrumbs();

  if (crumbs.length === 0) return null;

  return (
    <nav className="flex items-center gap-1 text-xs text-muted-foreground">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <IconChevronRight size={10} className="shrink-0" />}
            {crumb.to && !isLast ? (
              <Link
                to={crumb.to}
                className="hover:text-foreground transition-colors"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className={cn(isLast && "text-foreground")}>{crumb.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
