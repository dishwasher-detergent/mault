import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials } from "@/components/ui/initials-avatar";
import { neon } from "@/lib/auth/client";
import { IconLogout, IconUserCircle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export function UserMenu({
  size = "icon",
  side = "right",
}: {
  size?: "icon" | "icon-lg";
  side?: "top" | "right";
}) {
  const { t } = useTranslation("common");
  const { data } = neon.auth.useSession();
  const navigate = useNavigate();

  const name = data?.user?.name;
  const email = data?.user?.email;

  async function handleSignOut() {
    await neon.auth.signOut();
    navigate("/", { replace: true });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size={size}>
            <span className="text-[10px] font-semibold">
              {getInitials(name)}
            </span>
            <span className="sr-only">{t("userMenu.trigger")}</span>
          </Button>
        }
      />
      <DropdownMenuContent
        side={side}
        align="end"
        sideOffset={8}
        className="w-56"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="truncate text-sm font-medium text-foreground">
              {name || email}
            </span>
            {name && email && (
              <span className="truncate text-xs text-muted-foreground">
                {email}
              </span>
            )}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/app/account/settings")}>
          <IconUserCircle size={14} />
          {t("breadcrumb.account")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
          <IconLogout size={14} />
          {t("userMenu.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
