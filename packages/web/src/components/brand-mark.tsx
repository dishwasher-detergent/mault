import { cn } from "@/lib/utils";
import { IconPigFilled } from "@tabler/icons-react";
import { Link } from "react-router-dom";

export function BrandMark({
  size = "md",
  className,
}: {
  size?: "sm" | "md";
  className?: string;
}) {
  const isSmall = size === "sm";

  return (
    <Link to="/" className={cn("flex shrink-0 items-center gap-2", className)}>
      <span
        className={cn(
          "grid shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm shadow-primary/30",
          isSmall ? "size-6 rounded-md" : "size-7",
        )}
      >
        <IconPigFilled className={isSmall ? "size-3.5" : "size-4"} />
      </span>
      <span
        className={cn(
          "font-heading font-semibold",
          isSmall ? "text-xs" : "text-sm",
        )}
      >
        Mault
      </span>
    </Link>
  );
}
